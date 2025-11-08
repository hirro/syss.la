import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTodos } from '@/hooks/use-todos';
import { createIssue, listUserRepos } from '@/services/github/api-client';
import { syncGitHubIssues } from '@/services/github/issues';
import { fullSync } from '@/services/sync-service';
import type { Todo } from '@/types/todo';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TodosScreen() {
  const { todos, loading, error, refresh, completeTodo, addTodo, editTodo, completedTodos } = useTodos();
  const { isAuthenticated } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepoForConvert, setSelectedRepoForConvert] = useState<any | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [converting, setConverting] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSync = async () => {
    console.log('🔄 Sync button pressed');
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated');
      alert('Please authenticate first in the Settings tab');
      return;
    }

    try {
      setSyncing(true);
      console.log('✅ Starting sync process...');
      
      // Sync GitHub issues
      console.log('📥 Syncing GitHub issues...');
      await syncGitHubIssues();
      console.log('✅ GitHub issues synced');
      
      // Full bidirectional sync with GitHub storage
      console.log('🔄 Starting full bidirectional sync...');
      await fullSync();
      console.log('✅ Full sync completed');
      
      // Refresh local list
      console.log('🔄 Refreshing local todo list...');
      await refresh();
      console.log('✅ Local list refreshed');
      
      console.log('🎉 Sync completed successfully!');
    } catch (err: any) {
      console.error('❌ Sync failed:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      const message = err.message || 'Failed to sync';
      alert(`Sync failed: ${message}`);
    } finally {
      setSyncing(false);
      console.log('🔄 Sync process ended');
    }
  };

  const handleTodoPress = (todo: Todo) => {
    setSelectedTodo(todo);
    setShowDetailModal(true);
  };

  const handleUpdateTodoField = async (field: 'title' | 'description', value: string) => {
    if (!selectedTodo || selectedTodo.source !== 'personal') return;
    
    if (field === 'title' && !value.trim()) {
      alert('Title cannot be empty');
      return;
    }

    try {
      const updatedTodo: Todo = {
        ...selectedTodo,
        [field]: value.trim() || (field === 'description' ? undefined : value),
        updatedAt: new Date().toISOString(),
      };

      await editTodo(updatedTodo);
      setSelectedTodo(updatedTodo);
      
      // Sync to GitHub if authenticated
      if (isAuthenticated) {
        await fullSync();
      }
      
      console.log(`✅ Todo ${field} updated successfully`);
    } catch (error) {
      console.error(`❌ Failed to update todo ${field}:`, error);
      alert(`Failed to update ${field}`);
    }
  };

  const handleCompletePress = (id: string, title: string) => {
    Alert.alert(
      'Complete Todo?',
      `Mark "${title}" as complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              console.log('✅ Completing todo:', id);
              await completeTodo(id);
              
              if (showDetailModal) {
                setShowDetailModal(false);
              }
              
              // Sync to GitHub immediately after completing
              if (isAuthenticated) {
                console.log('🔄 Auto-syncing after completion...');
                try {
                  await fullSync();
                  console.log('✅ Auto-sync completed');
                } catch (err) {
                  console.error('⚠️ Auto-sync failed:', err);
                  // Don't show error to user - they can manually sync later
                }
              }
            } catch {
              alert('Failed to complete todo');
            }
          },
        },
      ]
    );
  };

  const loadRepositories = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingRepos(true);
      console.log('📥 Loading repositories...');
      const repos = await listUserRepos();
      console.log(`✅ Loaded ${repos.length} repositories`);
      console.log('First 5 repositories:', repos.slice(0, 5).map(r => ({
        name: r.full_name,
        description: r.description,
        id: r.id
      })));
      setRepositories(repos);
    } catch (error) {
      console.error('❌ Failed to load repositories:', error);
    } finally {
      setLoadingRepos(false);
    }
  }, [isAuthenticated]);

  // Load repositories on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadRepositories();
    }
  }, [isAuthenticated, loadRepositories]);

  const handleConvertToIssue = async () => {
    if (!selectedTodo || !selectedRepoForConvert) {
      alert('Please select a repository first');
      return;
    }
    
    try {
      setConverting(true);
      console.log(`🔄 Converting todo "${selectedTodo.title}" to GitHub issue in ${selectedRepoForConvert.owner.login}/${selectedRepoForConvert.name}...`);
      
      // Create the issue
      const issue = await createIssue(
        selectedRepoForConvert.owner.login,
        selectedRepoForConvert.name,
        selectedTodo.title,
        selectedTodo.description,
        selectedTodo.labels
      );
      
      console.log(`✅ Issue created: ${selectedRepoForConvert.owner.login}/${selectedRepoForConvert.name}#${issue.number}`);
      console.log(`🔗 Issue URL: ${issue.html_url}`);
      
      // Update the todo with GitHub metadata
      const updatedTodo: Todo = {
        ...selectedTodo,
        source: 'github-issue',
        github: {
          owner: selectedRepoForConvert.owner.login,
          repo: selectedRepoForConvert.name,
          issueNumber: issue.number,
          state: 'open',
          url: issue.html_url,
        },
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Updating local todo with GitHub metadata...');
      await editTodo(updatedTodo);
      
      // Sync to GitHub storage
      if (isAuthenticated) {
        console.log('🔄 Syncing to GitHub storage...');
        await fullSync();
        console.log('✅ Synced to GitHub storage');
      }
      
      setShowDetailModal(false);
      setSelectedTodo(null);
      setSelectedRepoForConvert(null);
      setShowRepoDropdown(false);
      
      console.log('🎉 Conversion complete!');
    } catch (error: any) {
      console.error('❌ Failed to convert to issue:', error);
      alert(`Failed to create GitHub issue: ${error.message || 'Unknown error'}`);
    } finally {
      setConverting(false);
    }
  };

  // Filter completed todos by date
  const getCompletedTodosForDate = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return completedTodos.filter((todo: Todo) => {
      if (!todo.completedAt) return false;
      const completedDate = new Date(todo.completedAt);
      return completedDate >= startOfDay && completedDate <= endOfDay;
    });
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayCompleted = getCompletedTodosForDate(today);
  const yesterdayCompleted = getCompletedTodosForDate(yesterday);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const newTodo: Todo = {
        id: `personal-${Date.now()}`,
        source: 'personal',
        title: newTodoTitle.trim(),
        description: newTodoDescription.trim() || undefined,
        createdAt: new Date().toISOString(),
        status: 'open',
      };

      await addTodo(newTodo);
      setNewTodoTitle('');
      setNewTodoDescription('');
      setShowAddModal(false);
    } catch {
      alert('Failed to add todo');
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText>Error loading todos: {error.message}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="title">Todos</ThemedText>
        <TouchableOpacity onPress={handleSync} disabled={syncing || !isAuthenticated}>
          <ThemedText type="link">{syncing ? 'Syncing...' : 'Sync'}</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Active Todos */}
        {todos.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText>No active todos</ThemedText>
            {isAuthenticated && (
              <ThemedText>Tap &quot;Sync GitHub&quot; to fetch your issues</ThemedText>
            )}
          </View>
        ) : (
          <View>
            {todos.map((item) => (
              <View key={item.id} style={styles.todoItem}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleCompletePress(item.id, item.title)}
                  activeOpacity={0.7}>
                  <View style={styles.checkboxCircle} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleTodoPress(item)}
                  activeOpacity={0.7}>
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Finished Today */}
        {todayCompleted.length > 0 && (
          <View style={styles.completedSection}>
            <TouchableOpacity style={styles.completedHeader}>
              <ThemedText style={styles.completedHeaderText}>Finished Today</ThemedText>
            </TouchableOpacity>
            {todayCompleted.map((item: Todo) => (
              <View key={item.id} style={styles.completedItem}>
                <View style={styles.checkboxCompleted}>
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleTodoPress(item)}
                  activeOpacity={0.7}>
                  <ThemedText style={styles.completedText}>{item.title}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Finished Yesterday */}
        {yesterdayCompleted.length > 0 && (
          <View style={styles.completedSection}>
            <TouchableOpacity style={styles.completedHeader}>
              <ThemedText style={styles.completedHeaderText}>Finished Yesterday</ThemedText>
            </TouchableOpacity>
            {yesterdayCompleted.map((item: Todo) => (
              <View key={item.id} style={styles.completedItem}>
                <View style={styles.checkboxCompleted}>
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleTodoPress(item)}
                  activeOpacity={0.7}>
                  <ThemedText style={styles.completedText}>{item.title}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addInputButton} onPress={() => setShowAddModal(true)}>
        <ThemedText style={styles.addInputText}>+ Add a task</ThemedText>
      </TouchableOpacity>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}>
        <ThemedView style={[styles.detailContainer, { paddingTop: insets.top }]}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <ThemedText type="link">← Back</ThemedText>
            </TouchableOpacity>
          </View>

          {selectedTodo && (
            <ScrollView style={styles.detailContent}>
              <View style={styles.detailTitleRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleCompletePress(selectedTodo.id, selectedTodo.title)}
                  activeOpacity={0.7}>
                  <View style={styles.checkboxCircle} />
                </TouchableOpacity>
                
                {selectedTodo.source === 'personal' ? (
                  <TextInput
                    style={[styles.input, styles.editTitleInput]}
                    value={selectedTodo.title}
                    onChangeText={(text) => handleUpdateTodoField('title', text)}
                    placeholder="Title"
                  />
                ) : (
                  <ThemedText type="title" style={styles.detailTitle}>
                    {selectedTodo.title}
                  </ThemedText>
                )}
              </View>

              <View style={styles.detailSection}>
                <ThemedText style={styles.detailSectionTitle}>Description</ThemedText>
                {selectedTodo.source === 'personal' ? (
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={selectedTodo.description || ''}
                    onChangeText={(text) => handleUpdateTodoField('description', text)}
                    placeholder="Add description..."
                    multiline
                    numberOfLines={4}
                  />
                ) : (
                  <ThemedText>{selectedTodo.description || 'No description'}</ThemedText>
                )}
              </View>

              <View style={styles.detailSection}>
                <ThemedText style={styles.detailSectionTitle}>Source</ThemedText>
                <ThemedText>
                  {selectedTodo.source === 'github-issue' ? '🔗 GitHub Issue' : '📝 Personal Todo'}
                </ThemedText>
                
                {selectedTodo.source === 'personal' && isAuthenticated && (
                  <View style={styles.convertSection}>
                    <ThemedText style={styles.convertLabel}>Convert to GitHub Issue:</ThemedText>
                    
                    {/* Repository Dropdown */}
                    <TouchableOpacity
                      style={styles.repoSelector}
                      onPress={() => setShowRepoDropdown(!showRepoDropdown)}>
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
                      <ScrollView style={styles.repoDropdown}>
                        {loadingRepos ? (
                          <ActivityIndicator style={styles.loader} />
                        ) : repositories.length === 0 ? (
                          <ThemedText style={styles.emptyRepoText}>
                            No repositories found
                          </ThemedText>
                        ) : (
                          repositories.map((repo) => (
                            <TouchableOpacity
                              key={repo.id}
                              style={styles.repoDropdownItem}
                              onPress={() => {
                                setSelectedRepoForConvert(repo);
                                setShowRepoDropdown(false);
                              }}>
                              <ThemedText>{repo.full_name}</ThemedText>
                              {repo.description && (
                                <ThemedText style={styles.repoDescriptionSmall}>
                                  {repo.description}
                                </ThemedText>
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )}

                    {/* Convert Button */}
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
                )}
              </View>

              {selectedTodo.github && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailSectionTitle}>GitHub</ThemedText>
                  <ThemedText>
                    {selectedTodo.github.owner}/{selectedTodo.github.repo} #{selectedTodo.github.issueNumber}
                  </ThemedText>
                  <ThemedText style={styles.detailLink}>{selectedTodo.github.url}</ThemedText>
                  
                  <TouchableOpacity
                    style={styles.openGitHubButton}
                    onPress={() => {
                      if (selectedTodo.github?.url) {
                        console.log('🔗 Opening GitHub issue:', selectedTodo.github.url);
                        Linking.openURL(selectedTodo.github.url);
                      }
                    }}>
                    <ThemedText style={styles.openGitHubButtonText}>
                      Open in GitHub
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {selectedTodo.labels && selectedTodo.labels.length > 0 && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Labels</ThemedText>
                  <View style={styles.labelContainer}>
                    {selectedTodo.labels.map((label, index) => (
                      <View key={index} style={styles.label}>
                        <ThemedText style={styles.labelText}>{label}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <ThemedText style={styles.detailSectionTitle}>Created</ThemedText>
                <ThemedText>{new Date(selectedTodo.createdAt).toLocaleString()}</ThemedText>
              </View>

              {selectedTodo.updatedAt && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Updated</ThemedText>
                  <ThemedText>{new Date(selectedTodo.updatedAt).toLocaleString()}</ThemedText>
                </View>
              )}
            </ScrollView>
          )}
        </ThemedView>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}>
        <ThemedView style={[styles.addModalContainer, { paddingTop: insets.top }]}>
            <ThemedText type="subtitle">Add New Todo</ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newTodoTitle}
              onChangeText={setNewTodoTitle}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newTodoDescription}
              onChangeText={setNewTodoDescription}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewTodoTitle('');
                  setNewTodoDescription('');
                }}>
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleAddTodo}>
                <ThemedText style={styles.buttonPrimaryText}>Add Todo</ThemedText>
              </TouchableOpacity>
            </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  listContent: {
    gap: 8,
    paddingBottom: 80,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: 'transparent',
  },
  todoContent: {
    flex: 1,
    gap: 4,
  },
  todoDescription: {
    opacity: 0.7,
    marginTop: 4,
  },
  todoMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.5,
  },
  addInputButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addInputText: {
    fontSize: 16,
    opacity: 0.5,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailTitle: {
    flex: 1,
    marginLeft: 12,
  },
  detailSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailLink: {
    color: '#007AFF',
    marginTop: 4,
  },
  labelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  labelText: {
    fontSize: 12,
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    gap: 16,
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
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  convertButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  convertButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    opacity: 0.7,
  },
  repoList: {
    maxHeight: 300,
  },
  repoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  repoDescription: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  loader: {
    padding: 20,
  },
  convertingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  convertingText: {
    marginTop: 12,
    fontSize: 16,
  },
  convertModalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  convertModalTitle: {
    marginBottom: 16,
  },
  convertSection: {
    marginTop: 16,
    gap: 12,
  },
  convertLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
    fontSize: 14,
  },
  repoDropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  repoDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  repoDescriptionSmall: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  emptyRepoText: {
    padding: 20,
    textAlign: 'center',
    opacity: 0.6,
  },
  convertButtonDisabled: {
    opacity: 0.5,
  },
  openGitHubButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#24292e',
    alignItems: 'center',
  },
  openGitHubButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addModalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  completedSection: {
    marginTop: 24,
  },
  completedHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  completedHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  editTitleInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 24,
    fontWeight: 'bold',
  },
});
