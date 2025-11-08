import {
  StyleSheet,
  FlatList,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTodos } from '@/hooks/use-todos';
import { useAuth } from '@/hooks/use-auth';
import { syncGitHubIssues } from '@/services/github/issues';
import { useState } from 'react';
import type { Todo } from '@/types/todo';

export default function TodosScreen() {
  const { todos, loading, error, refresh, completeTodo, addTodo } = useTodos();
  const { isAuthenticated } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const insets = useSafeAreaInsets();

  const handleSync = async () => {
    if (!isAuthenticated) {
      alert('Please authenticate first in the Settings tab');
      return;
    }

    try {
      setSyncing(true);
      await syncGitHubIssues();
      await refresh();
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Failed to sync GitHub issues');
    } finally {
      setSyncing(false);
    }
  };

  const handleTodoPress = (id: string, title: string) => {
    Alert.alert(
      'Complete Todo?',
      `Mark "${title}" as complete?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeTodo(id);
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
                onPress={() => handleTodoPress(item.id, item.title)}
                activeOpacity={0.7}>
                <View style={styles.checkboxCircle} />
              </TouchableOpacity>
              
              <View style={styles.todoContent}>
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                {item.description && (
                  <ThemedText style={styles.todoDescription} numberOfLines={2}>
                    {item.description}
                  </ThemedText>
                )}
                <View style={styles.todoMeta}>
                  <ThemedText style={styles.metaText}>
                    {item.source === 'github-issue' ? '🔗 GitHub' : '📝 Personal'}
                  </ThemedText>
                  {item.github && (
                    <ThemedText style={styles.metaText}>
                      {item.github.owner}/{item.github.repo}#{item.github.issueNumber}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity style={styles.addInputButton} onPress={() => setShowAddModal(true)}>
        <ThemedText style={styles.addInputText}>+ Add a task</ThemedText>
      </TouchableOpacity>

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
