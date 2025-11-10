import { getOctokit } from './api-client';
import { getSyncConfig } from '../sync-service';
import type { Customer, TimeEntry } from '@/types/time';

/**
 * Convert string to base64 (React Native compatible)
 */
function toBase64(str: string): string {
  // Use btoa for React Native
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Convert base64 to string (React Native compatible)
 */
function fromBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

/**
 * GitHub Time Data Sync Service
 * Syncs customers and time entries to/from GitHub repository
 */

const CUSTOMERS_PATH = 'customers';
const CUSTOMERS_FILE = 'customers.json';
const TIMEENTRIES_PATH = 'timeentries';

/**
 * Get current month's time entries file name
 */
function getCurrentMonthFile(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}.json`;
}

/**
 * Upload customers to GitHub
 */
export async function uploadCustomers(customers: Customer[]): Promise<void> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${CUSTOMERS_PATH}/${CUSTOMERS_FILE}`;
    const content = JSON.stringify(customers, null, 2);
    const encodedContent = toBase64(content);

    // Try to get existing file to get its SHA
    let sha: string | undefined;
    try {
      const { data: existingFile } = await client.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path,
      });

      if ('sha' in existingFile) {
        sha = existingFile.sha;
      }
    } catch (error: any) {
      // File doesn't exist yet, that's okay
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create or update file
    await client.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path,
      message: `Update customers - ${new Date().toISOString()}`,
      content: encodedContent,
      sha,
    });

    console.log('✅ Customers uploaded to GitHub');
  } catch (error) {
    console.error('❌ Failed to upload customers:', error);
    throw error;
  }
}

/**
 * Download customers from GitHub
 */
export async function downloadCustomers(): Promise<Customer[]> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${CUSTOMERS_PATH}/${CUSTOMERS_FILE}`;

    const { data } = await client.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
    });

    if ('content' in data) {
      const content = fromBase64(data.content);
      const customers = JSON.parse(content) as Customer[];
      console.log(`✅ Downloaded ${customers.length} customers from GitHub`);
      return customers;
    }

    return [];
  } catch (error: any) {
    if (error.status === 404) {
      console.log('ℹ️ No customers file found in GitHub');
      return [];
    }
    console.error('❌ Failed to download customers:', error);
    throw error;
  }
}

/**
 * Upload time entries for current month to GitHub
 */
export async function uploadTimeEntries(entries: TimeEntry[]): Promise<void> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${TIMEENTRIES_PATH}/${getCurrentMonthFile()}`;
    const content = JSON.stringify(entries, null, 2);
    const encodedContent = toBase64(content);

    // Try to get existing file to get its SHA
    let sha: string | undefined;
    try {
      const { data: existingFile } = await client.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path,
      });

      if ('sha' in existingFile) {
        sha = existingFile.sha;
      }
    } catch (error: any) {
      // File doesn't exist yet, that's okay
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create or update file
    await client.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path,
      message: `Update time entries - ${new Date().toISOString()}`,
      content: encodedContent,
      sha,
    });

    console.log('✅ Time entries uploaded to GitHub');
  } catch (error) {
    console.error('❌ Failed to upload time entries:', error);
    throw error;
  }
}

/**
 * Download time entries for current month from GitHub
 */
export async function downloadTimeEntries(): Promise<TimeEntry[]> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${TIMEENTRIES_PATH}/${getCurrentMonthFile()}`;

    const { data } = await client.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
    });

    if ('content' in data) {
      const content = fromBase64(data.content);
      const entries = JSON.parse(content) as TimeEntry[];
      console.log(`✅ Downloaded ${entries.length} time entries from GitHub`);
      return entries;
    }

    return [];
  } catch (error: any) {
    if (error.status === 404) {
      console.log('ℹ️ No time entries file found in GitHub for current month');
      return [];
    }
    console.error('❌ Failed to download time entries:', error);
    throw error;
  }
}

/**
 * Sync all time data (customers + entries) to GitHub
 */
export async function syncTimeDataToGitHub(
  customers: Customer[],
  entries: TimeEntry[]
): Promise<void> {
  console.log('🔄 Syncing time data to GitHub...');
  await uploadCustomers(customers);
  await uploadTimeEntries(entries);
  console.log('✅ Time data synced to GitHub');
}

/**
 * Sync all time data from GitHub
 */
export async function syncTimeDataFromGitHub(): Promise<{
  customers: Customer[];
  entries: TimeEntry[];
}> {
  console.log('🔄 Syncing time data from GitHub...');
  const [customers, entries] = await Promise.all([
    downloadCustomers(),
    downloadTimeEntries(),
  ]);
  console.log('✅ Time data synced from GitHub');
  return { customers, entries };
}
