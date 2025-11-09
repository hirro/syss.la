import { getCustomers } from '@/lib/db/customers';
import { getProjects } from '@/lib/db/projects';
import { getTimeEntries } from '@/lib/db/time-entries';
import type { Customer, Project, TimeEntry } from '@/types/time';
import { getSyncConfig } from './sync-service';
import { getOctokit } from './github/api-client';

/**
 * Sync time data (customers, projects, entries) to GitHub
 */
export async function syncTimeDataToGitHub(): Promise<void> {
  const config = await getSyncConfig();
  if (!config) {
    throw new Error('Sync configuration not set');
  }

  console.log('📤 Syncing time data to GitHub...');

  // Get all time data from local database
  const customers = await getCustomers(false); // Exclude archived
  const projects = await getProjects();
  const entries = await getTimeEntries();

  // Group entries by month (YYYY-MM)
  const entriesByMonth = new Map<string, TimeEntry[]>();
  entries.forEach(entry => {
    const month = entry.start.substring(0, 7); // Get YYYY-MM
    if (!entriesByMonth.has(month)) {
      entriesByMonth.set(month, []);
    }
    entriesByMonth.get(month)!.push(entry);
  });

  const octokit = await getOctokit();

  // Sync customers
  await syncFileToGitHub(
    octokit,
    config.owner,
    config.repo,
    config.branch || 'main',
    'time/customers.json',
    JSON.stringify(customers, null, 2)
  );

  // Sync projects
  await syncFileToGitHub(
    octokit,
    config.owner,
    config.repo,
    config.branch || 'main',
    'time/projects.json',
    JSON.stringify(projects, null, 2)
  );

  // Sync time entries by month
  for (const [month, monthEntries] of entriesByMonth.entries()) {
    await syncFileToGitHub(
      octokit,
      config.owner,
      config.repo,
      config.branch || 'main',
      `time/entries/${month}.json`,
      JSON.stringify(monthEntries, null, 2)
    );
  }

  console.log('✅ Time data synced to GitHub');
}

/**
 * Fetch time data from GitHub and merge with local
 */
export async function syncTimeDataFromGitHub(): Promise<void> {
  const config = await getSyncConfig();
  if (!config) {
    throw new Error('Sync configuration not set');
  }

  console.log('📥 Syncing time data from GitHub...');

  const octokit = await getOctokit();

  try {
    // Fetch customers
    await fetchFileFromGitHub(
      octokit,
      config.owner,
      config.repo,
      config.branch || 'main',
      'time/customers.json'
    );

    // Fetch projects
    await fetchFileFromGitHub(
      octokit,
      config.owner,
      config.repo,
      config.branch || 'main',
      'time/projects.json'
    );

    // TODO: Implement merge logic with local database
    // For now, this is a placeholder for future implementation
    console.log('⚠️ Time data fetch from GitHub not fully implemented yet');
    
  } catch {
    console.log('⚠️ No time data found in GitHub (this is normal for first sync)');
  }
}

/**
 * Helper: Sync a single file to GitHub
 */
async function syncFileToGitHub(
  octokit: any,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string
): Promise<void> {
  try {
    // Check if file exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
      // File doesn't exist, will create it
    }

    // Create or update file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha,
    });

    console.log(`✅ Synced ${path}`);
  } catch (error) {
    console.error(`❌ Failed to sync ${path}:`, error);
    throw error;
  }
}

/**
 * Helper: Fetch a file from GitHub
 */
async function fetchFileFromGitHub(
  octokit: any,
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    throw new Error('File content not found');
  } catch (error: any) {
    if (error.status === 404) {
      return '[]'; // Return empty array if file doesn't exist
    }
    throw error;
  }
}
