import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTodos } from '@/hooks/use-todos';
import { closeIssue, createIssue, createIssueComment, getCurrentUser, listIssueComments, listUserRepos, type IssueComment } from '@/services/github/api-client';
import { fullSync } from '@/services/sync-service';
import type { Todo } from '@/types/todo';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { todos, completedTodos, editTodo, completeTodo, reopenTodo, removeTodo, addTodo } = useTodos();
  
  const [todo, setTodo] = useState<Todo | null>(null);
  const [originalTodo, setOriginalTodo] = useState<Todo | null>(null);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepoForConvert, setSelectedRepoForConvert] = useState<any | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [converting, setConverting] = useState(false);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [currentUserLogin, setCurrentUserLogin] = useState<string>('');

  // Available icons for personal todos
  const availableIcons = [
    { name: 'work', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'home', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'shopping-cart', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'lightbulb', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'flag', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'book', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'palette', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'build', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'phone-iphone', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'laptop', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'music-note', library: 'MaterialIcons', component: MaterialIcons },
    { name: 'restaurant', library: 'MaterialIcons', component: MaterialIcons },
  ];

  useEffect(() => {
    const allTodos = [...todos, ...completedTodos];
    const foundTodo = allTodos.find(t => t.id === id);
    if (foundTodo) {
      setTodo(foundTodo);
      setOriginalTodo(foundTodo);
    }
  }, [id, todos, completedTodos]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated) {
        try {
          const user = await getCurrentUser();
          setCurrentUserLogin(user.login);
        } catch (error) {
          console.error('Failed to load current user:', error);
        }
      }
    };
    loadUser();
  }, [isAuthenticated]);

  // Load comments for GitHub issues
  useEffect(() => {
    const loadComments = async () => {
      if (todo?.github && isAuthenticated) {
        setLoadingComments(true);
        try {
          const fetchedComments = await listIssueComments(
            todo.github.owner,
            todo.github.repo,
            todo.github.issueNumber
          );
          setComments(fetchedComments);
        } catch (error) {
          console.error('Failed to load comments:', error);
        } finally {
          setLoadingComments(false);
        }
      }
    };
    loadComments();
  }, [todo?.github, isAuthenticated]);

  // Save changes when navigating away
  useEffect(() => {
    return () => {
      if (todo && originalTodo && todo.source === 'personal' && !todo.completedAt) {
        const hasChanges = 
          todo.title !== originalTodo.title ||
          todo.description !== originalTodo.description ||
          todo.icon !== originalTodo.icon;

        if (hasChanges) {
          console.log('📝 Changes detected:', {
            title: todo.title !== originalTodo.title,
            description: todo.description !== originalTodo.description,
            icon: todo.icon !== originalTodo.icon,
            newIcon: todo.icon,
            oldIcon: originalTodo.icon,
          });

          const updatedTodo: Todo = {
            ...todo,
            updatedAt: new Date().toISOString(),
          };
          
          console.log('💾 Saving todo changes...');
          editTodo(updatedTodo).then(() => {
            console.log('✅ Todo saved successfully:', {
              id: updatedTodo.id,
              title: updatedTodo.title,
              updatedAt: updatedTodo.updatedAt
            });
          }).catch(err => {
            console.error('❌ Failed to save todo:', err);
          });
        } else {
          console.log('ℹ️ No changes detected, skipping save');
        }
      }
    };
  }, [todo, originalTodo, editTodo]);

  const handleUpdateTodoField = (field: 'title' | 'description' | 'icon', value: string) => {
    if (!todo || todo.source !== 'personal' || todo.completedAt) return;
    
    if (field === 'title' && !value.trim()) {
      return;
    }

    // Just update local state, don't save to DB yet
    let fieldValue: string | undefined;
    if (field === 'description') {
      fieldValue = value || undefined;
    } else {
      fieldValue = value.trim() || undefined;
    }

    const updatedTodo: Todo = {
      ...todo,
      [field]: fieldValue,
    };

    setTodo(updatedTodo);
  };

  const loadRepositories = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoadingRepos(true);
    try {
      console.log('📥 Loading repositories...');
      const repos = await listUserRepos();
      setRepositories(repos);
      console.log(`✅ Loaded ${repos.length} repositories`);
    } catch (error) {
      console.error('❌ Failed to load repositories:', error);
      alert('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  }, [isAuthenticated]);

  const handleCompleteTodo = () => {
    if (!todo || todo.completedAt) return;
    
    Alert.alert(
      'Complete Todo?',
      `Mark "${todo.title}" as complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              console.log('✅ Completing todo:', todo.id);
              await completeTodo(todo.id);
              router.back();
            } catch (error) {
              console.error('❌ Failed to complete todo:', error);
              alert('Failed to complete todo');
            }
          },
        },
      ]
    );
  };

  const handleReopenTodo = () => {
    if (!todo || !todo.completedAt || todo.source !== 'personal') return;
    
    Alert.alert(
      'Reopen Todo?',
      `Reopen "${todo.title}"? This will create a new todo with a new ID.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: async () => {
            try {
              console.log('🔄 Reopening todo:', todo.id);
              await reopenTodo(todo.id);
              router.back();
            } catch (error) {
              console.error('❌ Failed to reopen todo:', error);
              alert('Failed to reopen todo');
            }
          },
        },
      ]
    );
  };

  const handleConvertToIssue = async () => {
    if (!todo || !selectedRepoForConvert || converting) return;

    setConverting(true);
    try {
      const [owner, repo] = selectedRepoForConvert.full_name.split('/');
      
      const issue = await createIssue(
        owner,
        repo,
        todo.title,
        todo.description || ''
      );

      // Create new todo with GitHub issue ID
      const newTodo: Todo = {
        id: `github-${owner}-${repo}-${issue.number}`,
        source: 'github-issue',
        title: todo.title,
        description: todo.description,
        createdAt: todo.createdAt,
        updatedAt: new Date().toISOString(),
        status: 'open',
        icon: undefined, // GitHub issues don't have custom icons
        github: {
          owner,
          repo,
          issueNumber: issue.number,
          state: 'open',
          url: issue.html_url,
        },
      };

      // Delete old personal todo and add new GitHub issue todo
      await removeTodo(todo.id);
      await addTodo(newTodo);
      
      // Navigate back since the ID changed
      router.back();
      
      if (isAuthenticated) {
        await fullSync();
      }

      setSelectedRepoForConvert(null);
      setShowRepoDropdown(false);
      console.log('✅ Converted to GitHub issue successfully');
    } catch (error) {
      console.error('❌ Failed to convert to GitHub issue:', error);
      alert('Failed to convert to GitHub issue');
    } finally {
      setConverting(false);
    }
  };

  const handleAddComment = async () => {
    if (!todo?.github || !newComment.trim() || postingComment) return;

    setPostingComment(true);
    try {
      const comment = await createIssueComment(
        todo.github.owner,
        todo.github.repo,
        todo.github.issueNumber,
        newComment
      );
      
      setComments([...comments, comment]);
      setNewComment('');
      console.log('✅ Comment added successfully');
    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      alert('Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleCloseWithComment = async () => {
    if (!todo?.github) return;

    const github = todo.github; // Capture for closure

    Alert.alert(
      'Close Issue?',
      newComment.trim() 
        ? `Close this issue with comment?`
        : `Close this issue without a comment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            setPostingComment(true);
            try {
              // Add comment if there's text
              if (newComment.trim()) {
                const comment = await createIssueComment(
                  github.owner,
                  github.repo,
                  github.issueNumber,
                  newComment
                );
                setComments([...comments, comment]);
                setNewComment('');
              }

              // Close the issue on GitHub
              await closeIssue(
                github.owner,
                github.repo,
                github.issueNumber
              );

              // Mark todo as complete locally
              await completeTodo(todo.id);
              
              console.log('✅ Issue closed successfully');
              router.back();
            } catch (error) {
              console.error('❌ Failed to close issue:', error);
              alert('Failed to close issue');
            } finally {
              setPostingComment(false);
            }
          },
        },
      ]
    );
  };

  if (!todo) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.titleRow}>
          {!todo.completedAt && (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={handleCompleteTodo}
              activeOpacity={0.7}>
              <View style={styles.checkboxCircle} />
            </TouchableOpacity>
          )}
          {todo.source === 'personal' && !todo.completedAt ? (
            <TextInput
              style={[styles.input, styles.titleInput]}
              value={todo.title}
              onChangeText={(text) => handleUpdateTodoField('title', text)}
              placeholder="Title"
            />
          ) : (
            <ThemedText type="title" style={styles.title}>
              {todo.title}
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Description</ThemedText>
          {todo.source === 'personal' && !todo.completedAt ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={todo.description || ''}
              onChangeText={(text) => handleUpdateTodoField('description', text)}
              placeholder="Add description..."
              multiline
              numberOfLines={4}
            />
          ) : (
            <ThemedText>{todo.description || 'No description'}</ThemedText>
          )}
        </View>

        {todo.source === 'personal' && !todo.completedAt && (
          <View style={styles.section}>
            <View style={styles.iconSectionHeader}>
              <ThemedText style={styles.sectionTitle}>Custom icon</ThemedText>
              <TouchableOpacity
                style={styles.iconDropdownButton}
                onPress={() => setShowIconDropdown(!showIconDropdown)}>
                {todo.icon ? (() => {
                  const iconData = availableIcons.find(i => i.name === todo.icon);
                  if (iconData) {
                    const IconComponent = iconData.component;
                    return <IconComponent name={iconData.name as any} size={20} color="#333" />;
                  }
                  return <ThemedText></ThemedText>;
                })() : <ThemedText></ThemedText>}
                <ThemedText style={styles.dropdownArrow}>▼</ThemedText>
              </TouchableOpacity>
            </View>

            {showIconDropdown && (
              <ScrollView style={styles.iconDropdownList} nestedScrollEnabled>
                <TouchableOpacity
                  style={[
                    styles.iconDropdownItem,
                    !todo.icon && styles.iconDropdownItemSelected
                  ]}
                  onPress={() => {
                    handleUpdateTodoField('icon', '');
                    setShowIconDropdown(false);
                  }}>
                  <ThemedText>None</ThemedText>
                </TouchableOpacity>
                {availableIcons.map((icon) => {
                  const IconComponent = icon.component;
                  return (
                    <TouchableOpacity
                      key={icon.name}
                      style={[
                        styles.iconDropdownItem,
                        todo.icon === icon.name && styles.iconDropdownItemSelected
                      ]}
                      onPress={() => {
                        handleUpdateTodoField('icon', icon.name);
                        setShowIconDropdown(false);
                      }}>
                      <IconComponent name={icon.name as any} size={20} color="#333" />
                      <ThemedText style={styles.iconDropdownItemLabel}>{icon.name}</ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}


        {todo.completedAt && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Status</ThemedText>
            <ThemedText>✅ Completed</ThemedText>
            {todo.source === 'personal' && (
              <TouchableOpacity
                style={styles.reopenButton}
                onPress={handleReopenTodo}>
                <ThemedText style={styles.reopenButtonText}>Reopen Todo</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
          
        {todo.source === 'personal' && !todo.completedAt && isAuthenticated && (
          <View style={styles.section}>
            <View style={styles.convertSection}>
              <ThemedText style={styles.convertLabel}>Convert to GitHub Issue:</ThemedText>
              
              <TouchableOpacity
                style={styles.repoSelector}
                onPress={() => {
                  if (repositories.length === 0) {
                    loadRepositories();
                  }
                  setShowRepoDropdown(!showRepoDropdown);
                }}>
                <ThemedText style={styles.repoSelectorText}>
                  {selectedRepoForConvert 
                    ? selectedRepoForConvert.full_name 
                    : loadingRepos 
                      ? 'Loading repositories...' 
                      : 'Select Repository'}
                </ThemedText>
                <ThemedText>▼</ThemedText>
              </TouchableOpacity>

              {showRepoDropdown && (
                <ScrollView style={styles.repoDropdown} nestedScrollEnabled>
                  {repositories.map((repo) => (
                    <TouchableOpacity
                      key={repo.id}
                      style={styles.repoDropdownItem}
                      onPress={() => {
                        setSelectedRepoForConvert(repo);
                        setShowRepoDropdown(false);
                      }}>
                      <ThemedText style={styles.repoName}>{repo.full_name}</ThemedText>
                      {repo.description && (
                        <ThemedText style={styles.repoDescription}>{repo.description}</ThemedText>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[
                  styles.convertButton,
                  (!selectedRepoForConvert || converting) && styles.convertButtonDisabled
                ]}
                onPress={handleConvertToIssue}
                disabled={!selectedRepoForConvert || converting}>
                <ThemedText style={styles.convertButtonText}>
                  {converting ? 'Converting...' : 'Convert to Issue'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {todo.github && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>GitHub</ThemedText>
            <ThemedText>
              {todo.github.owner}/{todo.github.repo} #{todo.github.issueNumber}
            </ThemedText>
            <ThemedText style={styles.link}>{todo.github.url}</ThemedText>
            
            <TouchableOpacity
              style={styles.openGitHubButton}
              onPress={() => {
                if (todo.github?.url) {
                  Linking.openURL(todo.github.url);
                }
              }}>
              <ThemedText style={styles.openGitHubButtonText}>
                Open in GitHub client
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {todo.github && isAuthenticated && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Comments</ThemedText>
            
            {loadingComments ? (
              <ActivityIndicator size="small" style={styles.commentsLoader} />
            ) : (
              <>
                {comments.length === 0 ? (
                  <ThemedText style={styles.noComments}>No comments yet</ThemedText>
                ) : (
                  <View style={styles.commentsContainer}>
                    {comments.map((comment) => {
                      const isCurrentUser = comment.user.login === currentUserLogin;
                      return (
                        <View
                          key={comment.id}
                          style={[
                            styles.commentCard,
                            isCurrentUser ? styles.commentCardRight : styles.commentCardLeft
                          ]}>
                          <View style={styles.commentHeader}>
                            <ThemedText style={styles.commentAuthor}>
                              {comment.user.login}
                            </ThemedText>
                            <ThemedText style={styles.commentDate}>
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.commentBody}>{comment.body}</ThemedText>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.commentInputSection}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.commentButtons}>
                    <TouchableOpacity
                      style={[
                        styles.commentButton,
                        styles.commentButtonAdd,
                        !newComment.trim() && styles.commentButtonDisabled
                      ]}
                      onPress={handleAddComment}
                      disabled={!newComment.trim() || postingComment}>
                      <ThemedText style={[
                        styles.commentButtonText,
                        styles.commentButtonTextAdd,
                        !newComment.trim() && styles.commentButtonTextDisabled
                      ]}>
                        {postingComment ? 'Adding...' : 'Add comment'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.commentButton,
                        styles.commentButtonClose
                      ]}
                      onPress={handleCloseWithComment}
                      disabled={postingComment}>
                      <ThemedText style={[
                        styles.commentButtonText,
                        styles.commentButtonTextClose
                      ]}>
                        {postingComment ? 'Closing...' : 'Close issue'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Created</ThemedText>
          <ThemedText>{new Date(todo.createdAt).toLocaleString()}</ThemedText>
        </View>

        {todo.updatedAt && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Updated</ThemedText>
            <ThemedText>{new Date(todo.updatedAt).toLocaleString()}</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    flex: 1,
  },
  titleInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  iconSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  dropdownArrow: {
    fontSize: 12,
    opacity: 0.6,
  },
  iconDropdownList: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  iconDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconDropdownItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  iconDropdownItemLabel: {
    fontSize: 14,
  },
  convertSection: {
    marginTop: 12,
  },
  convertLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  repoSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  repoSelectorText: {
    flex: 1,
  },
  repoDropdown: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  repoDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  repoName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  repoDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  convertButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  convertButtonDisabled: {
    backgroundColor: '#ccc',
  },
  convertButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  link: {
    color: '#007AFF',
    marginTop: 4,
  },
  openGitHubButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  openGitHubButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reopenButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  reopenButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsLoader: {
    marginVertical: 12,
  },
  noComments: {
    fontStyle: 'italic',
    opacity: 0.6,
    marginVertical: 8,
  },
  commentsContainer: {
    marginTop: 8,
    gap: 12,
  },
  commentCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    maxWidth: '85%',
  },
  commentCardLeft: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  commentCardRight: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 13,
  },
  commentDate: {
    fontSize: 11,
    opacity: 0.6,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputSection: {
    marginTop: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  commentButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  commentButtonClose: {
    backgroundColor: '#fff',
    borderColor: '#FF3B30',
  },
  commentButtonAdd: {
    backgroundColor: '#007AFF',
  },
  commentButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  commentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  commentButtonTextAdd: {
    color: '#fff',
  },
  commentButtonTextClose: {
    color: '#FF3B30',
  },
  commentButtonTextDisabled: {
    color: '#999',
  },
});
