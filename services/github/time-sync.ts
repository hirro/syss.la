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
 * Get file name for a specific date
 */
function getDateFile(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.json`;
}

/**
 * Get date string (YYYY-MM-DD) from ISO timestamp
 * Uses UTC to ensure consistent date calculation regardless of timezone
 */
function getDateFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Group time entries by their start date
 */
function groupEntriesByDate(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const grouped = new Map<string, TimeEntry[]>();
  
  for (const entry of entries) {
    const dateKey = getDateFromTimestamp(entry.start);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(entry);
  }
  
  return grouped;
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
 * Upload time entries to GitHub, partitioned by date
 */
export async function uploadTimeEntries(entries: TimeEntry[]): Promise<void> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    
    // Group entries by their start date
    const entriesByDate = groupEntriesByDate(entries);
    
    // Upload each date's entries to its own file
    for (const [dateKey, dateEntries] of entriesByDate) {
      const path = `${TIMEENTRIES_PATH}/${dateKey}.json`;
      const content = JSON.stringify(dateEntries, null, 2);
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
        message: `Update time entries for ${dateKey}`,
        content: encodedContent,
        sha,
      });

      console.log(`✅ Uploaded ${dateEntries.length} entries for ${dateKey}`);
    }

    console.log('✅ All time entries uploaded to GitHub');
  } catch (error) {
    console.error('❌ Failed to upload time entries:', error);
    throw error;
  }
}

/**
 * Download time entries from GitHub (last 30 days)
 */
export async function downloadTimeEntries(): Promise<TimeEntry[]> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const allEntries: TimeEntry[] = [];
    
    // Download entries for the last 30 days
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateFile = getDateFile(date);
      const path = `${TIMEENTRIES_PATH}/${dateFile}`;

      try {
        const { data } = await client.repos.getContent({
          owner: config.owner,
          repo: config.repo,
          path,
        });

        if ('content' in data) {
          const content = fromBase64(data.content);
          const entries = JSON.parse(content) as TimeEntry[];
          allEntries.push(...entries);
          console.log(`✅ Downloaded ${entries.length} entries from ${dateFile}`);
        }
      } catch (error: any) {
        // File doesn't exist for this date, skip it
        if (error.status !== 404) {
          console.error(`Failed to download ${dateFile}:`, error);
        }
      }
    }

    console.log(`✅ Downloaded total of ${allEntries.length} time entries from GitHub`);
    return allEntries;
  } catch (error: any) {
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
