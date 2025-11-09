import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '@/types/todo';
import { getActiveTodos, getCompletedTodos, insertTodo, updateTodo, deleteTodo } from '@/lib/db/todos';
import { initDatabase } from '@/lib/db/client';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTodos = useCallback(async () => {
    try {
      console.log('🔄 Loading todos from database...');
      setLoading(true);
      setError(null);
      await initDatabase();
      const activeTodos = await getActiveTodos();
      const completed = await getCompletedTodos();
      console.log(`✅ Loaded ${activeTodos.length} active and ${completed.length} completed todos`);
      setTodos(activeTodos);
      setCompletedTodos(completed);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load todos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const addTodo = useCallback(
    async (todo: Todo) => {
      try {
        await insertTodo(todo);
        await loadTodos();
      } catch (err) {
        console.error('Failed to add todo:', err);
        throw err;
      }
    },
    [loadTodos]
  );

  const editTodo = useCallback(
    async (todo: Todo) => {
      try {
        await updateTodo(todo);
        await loadTodos();
      } catch (err) {
        console.error('Failed to update todo:', err);
        throw err;
      }
    },
    [loadTodos]
  );

  const removeTodo = useCallback(
    async (id: string) => {
      try {
        await deleteTodo(id);
        await loadTodos();
      } catch (err) {
        console.error('Failed to delete todo:', err);
        throw err;
      }
    },
    [loadTodos]
  );

  const completeTodo = useCallback(
    async (id: string) => {
      try {
        console.log('📝 Completing todo in database:', id);
        const todo = todos.find((t) => t.id === id);
        if (todo) {
          const completedTodo = {
            ...todo,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          console.log('💾 Updating todo with completedAt:', completedTodo.completedAt);
          await updateTodo(completedTodo);
          await loadTodos();
          console.log('✅ Todo completed in database');
        }
      } catch (err) {
        console.error('Failed to complete todo:', err);
        throw err;
      }
    },
    [todos, loadTodos]
  );

  const reopenTodo = useCallback(
    async (completedTodoId: string) => {
      try {
        console.log('🔄 Reopening todo:', completedTodoId);
        const completedTodo = completedTodos.find((t) => t.id === completedTodoId);
        if (completedTodo && completedTodo.source === 'personal') {
          // Create a new todo with a new ID
          const reopenedTodo: Todo = {
            ...completedTodo,
            id: `personal-${Date.now()}`,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
            reopenedFrom: completedTodoId,
          };
          await insertTodo(reopenedTodo);
          await loadTodos();
          console.log('✅ Todo reopened with new ID:', reopenedTodo.id);
        }
      } catch (err) {
        console.error('Failed to reopen todo:', err);
        throw err;
      }
    },
    [completedTodos, loadTodos]
  );

  return {
    todos,
    completedTodos,
    loading,
    error,
    refresh: loadTodos,
    addTodo,
    editTodo,
    removeTodo,
    completeTodo,
    reopenTodo,
  };
}
