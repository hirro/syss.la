import { Octokit } from '@octokit/rest';
import { getAuthState } from './auth';
import { Buffer } from 'buffer';

let octokitInstance: Octokit | null = null;
let currentToken: string | null = null;

export async function getOctokit(): Promise<Octokit> {
  const { token } = await getAuthState();

  if (!token) {
    throw new Error('Not authenticated. Please sign in first.');
  }

  if (!octokitInstance || currentToken !== token) {
    octokitInstance = new Octokit({
      auth: token,
      userAgent: 'Syssla v1.0.0',
    });
    currentToken = token;
  }

  return octokitInstance;
}

export async function getCurrentUser() {
  const octokit = await getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listUserRepos() {
  const octokit = await getOctokit();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
  });
  return data;
}

export async function getRepo(owner: string, repo: string) {
  const octokit = await getOctokit();
  const { data } = await octokit.repos.get({
    owner,
    repo,
  });
  return data;
}

export interface FileContent {
  content: string;
  sha: string;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && data.type === 'file') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getFileWithSha(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<FileContent | null> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && data.type === 'file') {
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
      };
    }

    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const octokit = await getOctokit();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
  });
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[]
): Promise<{ number: number; html_url: string }> {
  const octokit = await getOctokit();
  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });
  return {
    number: data.number,
    html_url: data.html_url,
  };
}
