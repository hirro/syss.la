import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTodos } from '@/hooks/use-todos';
import { createIssue, listUserRepos } from '@/services/github/api-client';
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

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Source</ThemedText>
          <ThemedText>
            {todo.source === 'github-issue' ? '🔗 GitHub Issue' : '📝 Personal Todo'}
          </ThemedText>
        </View>

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
                Open in GitHub
              </ThemedText>
            </TouchableOpacity>
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
    paddingTop: 0,
    paddingBottom: 20,
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
    marginTop: 12,
    backgroundColor: '#24292e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  openGitHubButtonText: {
    color: '#007AFF',
    fontSize: 14,
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
});
