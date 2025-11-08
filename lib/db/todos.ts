import type { Todo } from '@/types/todo';
import { getDatabase } from './client';

interface TodoRow {
  id: string;
  source: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  status: string | null;
  labels: string | null;
  due_date: string | null;
  github_owner: string | null;
  github_repo: string | null;
  github_issue_number: number | null;
  github_state: string | null;
  github_url: string | null;
}

function rowToTodo(row: TodoRow): Todo {
  const todo: Todo = {
    id: row.id,
    source: row.source as Todo['source'],
    title: row.title,
    createdAt: row.created_at,
  };

  if (row.description) todo.description = row.description;
  if (row.updated_at) todo.updatedAt = row.updated_at;
  if (row.completed_at) todo.completedAt = row.completed_at;
  if (row.status) todo.status = row.status as Todo['status'];
  if (row.labels) todo.labels = JSON.parse(row.labels);
  if (row.due_date) todo.dueDate = row.due_date;

  if (row.github_owner && row.github_repo && row.github_issue_number) {
    todo.github = {
      owner: row.github_owner,
      repo: row.github_repo,
      issueNumber: row.github_issue_number,
      state: row.github_state as 'open' | 'closed' | undefined,
      url: row.github_url || undefined,
    };
  }

  return todo;
}

export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TodoRow>('SELECT * FROM todos ORDER BY created_at DESC');
  return rows.map(rowToTodo);
}

export async function getActiveTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TodoRow>(
    'SELECT * FROM todos WHERE completed_at IS NULL ORDER BY created_at DESC'
  );
  return rows.map(rowToTodo);
}

export async function getCompletedTodos(): Promise<Todo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TodoRow>(
    'SELECT * FROM todos WHERE completed_at IS NOT NULL ORDER BY completed_at DESC'
  );
  return rows.map(rowToTodo);
}

export async function getTodoById(id: string): Promise<Todo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TodoRow>('SELECT * FROM todos WHERE id = ?', [id]);
  return row ? rowToTodo(row) : null;
}

export async function insertTodo(todo: Todo): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO todos (
      id, source, title, description, created_at, updated_at, completed_at,
      status, labels, due_date, github_owner, github_repo, github_issue_number,
      github_state, github_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      todo.id,
      todo.source,
      todo.title,
      todo.description || null,
      todo.createdAt,
      todo.updatedAt || null,
      todo.completedAt || null,
      todo.status || null,
      todo.labels ? JSON.stringify(todo.labels) : null,
      todo.dueDate || null,
      todo.github?.owner || null,
      todo.github?.repo || null,
      todo.github?.issueNumber || null,
      todo.github?.state || null,
      todo.github?.url || null,
    ]
  );
}

export async function updateTodo(todo: Todo): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE todos SET
      source = ?, title = ?, description = ?, updated_at = ?, completed_at = ?,
      status = ?, labels = ?, due_date = ?, github_owner = ?, github_repo = ?,
      github_issue_number = ?, github_state = ?, github_url = ?
    WHERE id = ?`,
    [
      todo.source,
      todo.title,
      todo.description || null,
      todo.updatedAt || null,
      todo.completedAt || null,
      todo.status || null,
      todo.labels ? JSON.stringify(todo.labels) : null,
      todo.dueDate || null,
      todo.github?.owner || null,
      todo.github?.repo || null,
      todo.github?.issueNumber || null,
      todo.github?.state || null,
      todo.github?.url || null,
      todo.id,
    ]
  );
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todos WHERE id = ?', [id]);
}

export async function clearAllTodos(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM todos');
}
