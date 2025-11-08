import { Octokit } from '@octokit/rest';
import { getAuthState } from './auth';

let octokitInstance: Octokit | null = null;
let currentToken: string | null = null;

export function getOctokit(): Octokit {
  const { token } = getAuthState();

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
  const octokit = getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listUserRepos() {
  const octokit = getOctokit();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
  });
  return data;
}

export async function getRepo(owner: string, repo: string) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.get({
    owner,
    repo,
  });
  return data;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<string | null> {
  try {
    const octokit = getOctokit();
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

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const octokit = getOctokit();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
  });
}
