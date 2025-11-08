import type { Todo } from '@/types/todo';
import { getFileWithSha, getFileContent, createOrUpdateFile } from './api-client';

export interface SyncConfig {
  owner: string;
  repo: string;
  branch?: string;
}

const DEFAULT_BRANCH = 'main';

export async function fetchTodosFromGitHub(config: SyncConfig): Promise<Todo[]> {
  const { owner, repo, branch = DEFAULT_BRANCH } = config;
  console.log(`📥 Fetching from GitHub: ${owner}/${repo}/todos/active.json (branch: ${branch})`);
  
  const fileData = await getFileWithSha(owner, repo, 'todos/active.json', branch);
  
  if (!fileData) {
    console.log('⚠️ File not found on GitHub (this is OK for first sync)');
    return [];
  }

  try {
    const todos: Todo[] = JSON.parse(fileData.content);
    console.log(`✅ Parsed ${todos.length} todos from GitHub`);
    return todos;
  } catch (error) {
    console.error('❌ Failed to parse todos from GitHub:', error);
    return [];
  }
}

export async function pushTodosToGitHub(
  config: SyncConfig,
  todos: Todo[]
): Promise<void> {
  const { owner, repo, branch = DEFAULT_BRANCH } = config;
  
  // Separate active and completed todos
  const activeTodos = todos.filter(t => !t.completedAt);
  const completedTodos = todos.filter(t => t.completedAt);
  
  console.log(`📤 Pushing ${activeTodos.length} active and ${completedTodos.length} completed todos to GitHub`);
  
  // Push active todos
  if (activeTodos.length > 0 || todos.length === 0) {
    console.log(`📤 Pushing ${activeTodos.length} active todos to ${owner}/${repo}/todos/active.json`);
    const existingFile = await getFileWithSha(owner, repo, 'todos/active.json', branch);
    
    const content = JSON.stringify(activeTodos, null, 2);
    const message = `Update active todos (${new Date().toISOString()})`;

    await createOrUpdateFile(
      owner,
      repo,
      'todos/active.json',
      content,
      message,
      existingFile?.sha
    );
    console.log('✅ Active todos pushed');
  }
  
  // Group completed todos by month and push each
  if (completedTodos.length > 0) {
    const todosByMonth = new Map<string, Todo[]>();
    
    for (const todo of completedTodos) {
      const date = new Date(todo.completedAt!);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!todosByMonth.has(yearMonth)) {
        todosByMonth.set(yearMonth, []);
      }
      todosByMonth.get(yearMonth)!.push(todo);
    }
    
    for (const [yearMonth, monthTodos] of todosByMonth) {
      console.log(`📤 Pushing ${monthTodos.length} completed todos to todos/completed/${yearMonth}.json`);
      
      const path = `todos/completed/${yearMonth}.json`;
      const existingFile = await getFileWithSha(owner, repo, path, branch);
      
      // Merge with existing completed todos for this month
      let allMonthTodos = [...monthTodos];
      if (existingFile) {
        try {
          const existing: Todo[] = JSON.parse(existingFile.content);
          // Add existing todos that aren't in our new list
          const newIds = new Set(monthTodos.map(t => t.id));
          allMonthTodos = [...monthTodos, ...existing.filter(t => !newIds.has(t.id))];
        } catch (error) {
          console.error('Failed to parse existing completed todos:', error);
        }
      }
      
      const content = JSON.stringify(allMonthTodos, null, 2);
      const message = `Update completed todos for ${yearMonth} (${new Date().toISOString()})`;

      await createOrUpdateFile(
        owner,
        repo,
        path,
        content,
        message,
        existingFile?.sha
      );
      console.log(`✅ Completed todos for ${yearMonth} pushed`);
    }
  }
}

export async function fetchCompletedTodosFromGitHub(
  config: SyncConfig,
  yearMonth: string
): Promise<Todo[]> {
  const { owner, repo, branch = DEFAULT_BRANCH } = config;
  
  const content = await getFileContent(
    owner,
    repo,
    `todos/completed/${yearMonth}.json`,
    branch
  );
  
  if (!content) {
    return [];
  }

  try {
    const todos: Todo[] = JSON.parse(content);
    return todos;
  } catch (error) {
    console.error('Failed to parse completed todos from GitHub:', error);
    return [];
  }
}
