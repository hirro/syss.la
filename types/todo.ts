export type TodoSource = 'personal' | 'github-issue';

export type TodoStatus = 'open' | 'in-progress' | 'blocked';

export type GitHubIssueState = 'open' | 'closed';

export interface GitHubIssueMetadata {
  owner: string;
  repo: string;
  issueNumber: number;
  state?: GitHubIssueState;
  url?: string;
}

export interface Todo {
  id: string;
  source: TodoSource;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  status?: TodoStatus;
  labels?: string[];
  dueDate?: string;
  icon?: string; // Custom icon for personal todos
  github?: GitHubIssueMetadata;
  reopenedFrom?: string; // ID of the completed todo this was reopened from
}

export interface ActiveTodo extends Todo {
  completedAt?: never;
}

export interface CompletedTodo extends Todo {
  completedAt: string;
}
