import type { Todo } from '@/types/todo';
import { getOctokit } from './api-client';
import { insertTodo, updateTodo, getTodoById } from '@/lib/db/todos';

export async function fetchUserIssues(): Promise<Todo[]> {
  const octokit = await getOctokit();
  
  // Fetch both open and closed issues
  const { data: issues } = await octokit.issues.listForAuthenticatedUser({
    filter: 'assigned',
    state: 'all',
    sort: 'updated',
    per_page: 100,
  });

  const todos: Todo[] = issues.map((issue) => {
    const repoUrl = issue.repository_url;
    const [owner, repo] = repoUrl.split('/').slice(-2);

    const todo: Todo = {
      id: `github-${owner}-${repo}-${issue.number}`,
      source: 'github-issue' as const,
      title: issue.title,
      description: issue.body || undefined,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      completedAt: issue.state === 'closed' ? issue.closed_at || issue.updated_at : undefined,
      status: 'open',
      labels: issue.labels.map((label) =>
        typeof label === 'string' ? label : label.name || ''
      ),
      github: {
        owner,
        repo,
        issueNumber: issue.number,
        state: issue.state as 'open' | 'closed',
        url: issue.html_url,
      },
    };
    
    console.log(`📋 Issue #${issue.number}: state=${issue.state}, completedAt=${todo.completedAt}`);
    return todo;
  });

  return todos;
}

export async function syncGitHubIssues(): Promise<void> {
  console.log('📥 Syncing GitHub issues...');
  const issues = await fetchUserIssues();
  console.log(`✅ Found ${issues.length} assigned GitHub issues`);

  let updated = 0;
  let inserted = 0;
  let completed = 0;

  for (const issue of issues) {
    let existing = await getTodoById(issue.id);
    
    // Migration: Check if there's an old todo with personal ID but github metadata
    if (!existing && issue.github) {
      const { owner, repo, issueNumber } = issue.github;
      const allTodos = await import('@/lib/db/todos').then(m => m.getActiveTodos());
      const oldTodo = allTodos.find(t => 
        t.source === 'github-issue' && 
        t.github?.owner === owner &&
        t.github?.repo === repo &&
        t.github?.issueNumber === issueNumber
      );
      
      if (oldTodo) {
        console.log(`🔄 Migrating old todo ${oldTodo.id} to ${issue.id}`);
        const { deleteTodo } = await import('@/lib/db/todos');
        await deleteTodo(oldTodo.id);
        existing = null; // Force insert with new ID
      }
    }
    
    if (existing) {
      // Check if issue was closed
      if (issue.completedAt && !existing.completedAt) {
        console.log(`✅ Issue closed on GitHub: ${issue.title}`);
        completed++;
      }
      await updateTodo(issue);
      updated++;
    } else {
      await insertTodo(issue);
      inserted++;
    }
  }
  
  console.log(`✅ GitHub issues synced: ${inserted} new, ${updated} updated, ${completed} completed`);
}

export async function fetchRepoIssues(owner: string, repo: string): Promise<Todo[]> {
  const octokit = await getOctokit();
  
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    per_page: 100,
  });

  const todos: Todo[] = issues.map((issue) => ({
    id: `github-${owner}-${repo}-${issue.number}`,
    source: 'github-issue',
    title: issue.title,
    description: issue.body || undefined,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    completedAt: issue.state === 'closed' ? issue.closed_at || issue.updated_at : undefined,
    status: 'open',
    labels: issue.labels.map((label) =>
      typeof label === 'string' ? label : label.name || ''
    ),
    github: {
      owner,
      repo,
      issueNumber: issue.number,
      state: issue.state as 'open' | 'closed',
      url: issue.html_url,
    },
  }));

  return todos;
}
