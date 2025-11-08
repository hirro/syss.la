import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '@/types/todo';
import { getActiveTodos, insertTodo, updateTodo, deleteTodo } from '@/lib/db/todos';
import { initDatabase } from '@/lib/db/client';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await initDatabase();
      const data = await getActiveTodos();
      setTodos(data);
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
        const todo = todos.find((t) => t.id === id);
        if (todo) {
          await updateTodo({
            ...todo,
            completedAt: new Date().toISOString(),
          });
          await loadTodos();
        }
      } catch (err) {
        console.error('Failed to complete todo:', err);
        throw err;
      }
    },
    [todos, loadTodos]
  );

  return {
    todos,
    loading,
    error,
    refresh: loadTodos,
    addTodo,
    editTodo,
    removeTodo,
    completeTodo,
  };
}
