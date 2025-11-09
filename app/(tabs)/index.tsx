import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useTodos } from '@/hooks/use-todos';
import { useThemeColor } from '@/hooks/use-theme-color';
import { syncGitHubIssues } from '@/services/github/issues';
import { fullSync } from '@/services/sync-service';
import type { Todo } from '@/types/todo';
import React, { useState, useEffect } from 'react';
import { Octicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TodosScreen() {
  const router = useRouter();
  const { todos, completedTodos, loading, error, refresh, addTodo, completeTodo } = useTodos();
  const { isAuthenticated } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const insets = useSafeAreaInsets();

  // Refresh todos when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Todos screen focused, refreshing list...');
      refresh();
    }, [refresh])
  );

  // Refresh todos when authentication state changes
  useEffect(() => {
    console.log('🔐 Authentication state changed, refreshing todos...');
    refresh();
  }, [isAuthenticated, refresh]);
  
  const cardBackground = useThemeColor({}, 'background');

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
    router.push(`/todo/${todo.id}`);
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

  // Show auth required message if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.authRequired}>
          <ThemedText type="title" style={styles.authRequiredTitle}>
            Authentication Required
          </ThemedText>
          <ThemedText style={styles.authRequiredText}>
            Please sign in to GitHub in the Settings tab to use the todo list.
          </ThemedText>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login-wizard')}>
            <ThemedText style={styles.authButtonText}>Sign In to GitHub</ThemedText>
          </TouchableOpacity>
        </View>
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
              <View key={item.id} style={[styles.todoItem, { backgroundColor: cardBackground }]}>
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
                  <ThemedText style={styles.todoTitle}>{item.title}</ThemedText>
                </TouchableOpacity>
                
                {item.source === 'github-issue' ? (
                  <View style={styles.githubBadge}>
                    <Octicons name="mark-github" size={16} color="#666" />
                  </View>
                ) : item.icon ? (() => {
                  const iconData = availableIcons.find(i => i.name === item.icon);
                  if (iconData) {
                    const IconComponent = iconData.component;
                    return (
                      <View style={styles.customIconBadge}>
                        <IconComponent name={iconData.name as any} size={16} color="#666" />
                      </View>
                    );
                  }
                  return null;
                })() : null}
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
              <View key={item.id} style={[styles.completedItem, { backgroundColor: cardBackground }]}>
                <View style={styles.checkboxCompleted}>
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleTodoPress(item)}
                  activeOpacity={0.7}>
                  <ThemedText style={styles.completedText}>{item.title}</ThemedText>
                </TouchableOpacity>
                
                {item.source === 'github-issue' ? (
                  <View style={styles.githubBadge}>
                    <Octicons name="mark-github" size={16} color="#666" />
                  </View>
                ) : item.icon ? (() => {
                  const iconData = availableIcons.find(i => i.name === item.icon);
                  if (iconData) {
                    const IconComponent = iconData.component;
                    return (
                      <View style={styles.customIconBadge}>
                        <IconComponent name={iconData.name as any} size={16} color="#666" />
                      </View>
                    );
                  }
                  return null;
                })() : null}
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
              <View key={item.id} style={[styles.completedItem, { backgroundColor: cardBackground }]}>
                <View style={styles.checkboxCompleted}>
                  <ThemedText style={styles.checkmark}>✓</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.todoContent}
                  onPress={() => handleTodoPress(item)}
                  activeOpacity={0.7}>
                  <ThemedText style={styles.completedText}>{item.title}</ThemedText>
                </TouchableOpacity>
                
                {item.source === 'github-issue' ? (
                  <View style={styles.githubBadge}>
                    <Octicons name="mark-github" size={16} color="#666" />
                  </View>
                ) : item.icon ? (() => {
                  const iconData = availableIcons.find(i => i.name === item.icon);
                  if (iconData) {
                    const IconComponent = iconData.component;
                    return (
                      <View style={styles.customIconBadge}>
                        <IconComponent name={iconData.name as any} size={16} color="#666" />
                      </View>
                    );
                  }
                  return null;
                })() : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.addInputButton, { backgroundColor: cardBackground }]} onPress={() => setShowAddModal(true)}>
        <ThemedText style={styles.addInputText}>+ Add a task</ThemedText>
      </TouchableOpacity>

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
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  authRequiredTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  authRequiredText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
    paddingBottom: 80,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 6,
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
  todoTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  editTitleInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 24,
    fontWeight: 'bold',
  },
  githubBadge: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIconBadge: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIcon: {
    fontSize: 16,
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
    padding: 8,
    backgroundColor: '#fff',
    minWidth: 100,
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
});
