import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTodos } from '@/hooks/use-todos';
import { useAuth } from '@/hooks/use-auth';
import { syncGitHubIssues } from '@/services/github/issues';
import { fullSync } from '@/services/sync-service';
import { useState } from 'react';
import type { Todo } from '@/types/todo';

export default function TodosScreen() {
  const { todos, loading, error, refresh, completeTodo, addTodo } = useTodos();
  const { isAuthenticated } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
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

      {todos.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText>No active todos</ThemedText>
          {isAuthenticated && (
            <ThemedText>Tap &quot;Sync GitHub&quot; to fetch your issues</ThemedText>
          )}
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.todoItem}>
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
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

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
                <ThemedText type="title" style={styles.detailTitle}>
                  {selectedTodo.title}
                </ThemedText>
              </View>

              {selectedTodo.description && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailSectionTitle}>Description</ThemedText>
                  <ThemedText>{selectedTodo.description}</ThemedText>
                </View>
              )}

              <View style={styles.detailSection}>
                <ThemedText style={styles.detailSectionTitle}>Source</ThemedText>
                <ThemedText>
                  {selectedTodo.source === 'github-issue' ? '🔗 GitHub Issue' : '📝 Personal Todo'}
                </ThemedText>
              </View>

              {selectedTodo.github && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.detailSectionTitle}>GitHub</ThemedText>
                  <ThemedText>
                    {selectedTodo.github.owner}/{selectedTodo.github.repo} #{selectedTodo.github.issueNumber}
                  </ThemedText>
                  <ThemedText style={styles.detailLink}>{selectedTodo.github.url}</ThemedText>
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
        transparent
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
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
        </View>
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
});
