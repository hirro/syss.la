import type { Todo } from '@/types/todo';
import { getOctokit } from './api-client';
import { insertTodo, updateTodo, getTodoById } from '@/lib/db/todos';

export async function fetchUserIssues(): Promise<Todo[]> {
  const octokit = await getOctokit();
  
  const { data: issues } = await octokit.issues.listForAuthenticatedUser({
    filter: 'assigned',
    state: 'open',
    sort: 'updated',
    per_page: 100,
  });

  const todos: Todo[] = issues.map((issue) => {
    const repoUrl = issue.repository_url;
    const [owner, repo] = repoUrl.split('/').slice(-2);

    return {
      id: `github-${owner}-${repo}-${issue.number}`,
      source: 'github-issue',
      title: issue.title,
      description: issue.body || undefined,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
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
  });

  return todos;
}

export async function syncGitHubIssues(): Promise<void> {
  console.log('📥 Syncing GitHub issues...');
  const issues = await fetchUserIssues();
  console.log(`✅ Found ${issues.length} assigned GitHub issues`);

  let updated = 0;
  let inserted = 0;

  for (const issue of issues) {
    const existing = await getTodoById(issue.id);
    
    if (existing) {
      await updateTodo(issue);
      updated++;
    } else {
      await insertTodo(issue);
      inserted++;
    }
  }
  
  console.log(`✅ GitHub issues synced: ${inserted} new, ${updated} updated`);
}

export async function fetchRepoIssues(owner: string, repo: string): Promise<Todo[]> {
  const octokit = await getOctokit();
  
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
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
