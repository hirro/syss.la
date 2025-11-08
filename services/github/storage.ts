import type { Todo } from '@/types/todo';
import { getFileContent, createOrUpdateFile } from './api-client';

export interface SyncConfig {
  owner: string;
  repo: string;
  branch?: string;
}

const DEFAULT_BRANCH = 'main';

export async function fetchTodosFromGitHub(config: SyncConfig): Promise<Todo[]> {
  const { owner, repo, branch = DEFAULT_BRANCH } = config;
  
  const content = await getFileContent(owner, repo, 'todos/active.json', branch);
  
  if (!content) {
    return [];
  }

  try {
    const todos: Todo[] = JSON.parse(content);
    return todos;
  } catch (error) {
    console.error('Failed to parse todos from GitHub:', error);
    return [];
  }
}

export async function pushTodosToGitHub(
  config: SyncConfig,
  todos: Todo[]
): Promise<void> {
  const { owner, repo, branch = DEFAULT_BRANCH } = config;
  
  // Get current file SHA if it exists
  const existingContent = await getFileContent(owner, repo, 'todos/active.json', branch);
  
  const content = JSON.stringify(todos, null, 2);
  const message = `Update active todos (${new Date().toISOString()})`;

  await createOrUpdateFile(
    owner,
    repo,
    'todos/active.json',
    content,
    message,
    existingContent ? undefined : undefined // TODO: Get SHA from file metadata
  );
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
