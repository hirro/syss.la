import { getOctokit } from './api-client';
import { getSyncConfig } from '../sync-service';
import type { WikiEntry } from '@/types/wiki';
import { extractTitleFromMarkdown } from '@/lib/db/wiki';

/**
 * Convert string to base64 (React Native compatible)
 */
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Convert base64 to string (React Native compatible)
 */
function fromBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

const WIKI_PATH = 'wiki';

/**
 * Download all wiki entries from GitHub
 */
export async function downloadWikiEntries(): Promise<WikiEntry[]> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    
    // Get all files in the wiki directory
    const { data } = await client.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: WIKI_PATH,
    });

    if (!Array.isArray(data)) {
      console.log('ℹ️ Wiki path is not a directory');
      return [];
    }

    const entries: WikiEntry[] = [];

    // Download each .md file
    for (const file of data) {
      if (file.type === 'file' && file.name.endsWith('.md')) {
        try {
          const { data: fileData } = await client.repos.getContent({
            owner: config.owner,
            repo: config.repo,
            path: `${WIKI_PATH}/${file.name}`,
          });

          if ('content' in fileData) {
            const content = fromBase64(fileData.content);
            const title = extractTitleFromMarkdown(content);
            
            entries.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              title,
              filename: file.name,
              content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              syncedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Failed to download ${file.name}:`, error);
        }
      }
    }

    console.log(`✅ Downloaded ${entries.length} wiki entries from GitHub`);
    return entries;
  } catch (error: any) {
    if (error.status === 404) {
      console.log('ℹ️ No wiki directory found in GitHub');
      return [];
    }
    console.error('❌ Failed to download wiki entries:', error);
    throw error;
  }
}

/**
 * Upload a wiki entry to GitHub
 */
export async function uploadWikiEntry(entry: WikiEntry): Promise<void> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${WIKI_PATH}/${entry.filename}`;
    const encodedContent = toBase64(entry.content);

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
      message: sha ? `Update ${entry.title}` : `Create ${entry.title}`,
      content: encodedContent,
      sha,
    });

    console.log(`✅ Uploaded wiki entry: ${entry.title}`);
  } catch (error) {
    console.error('❌ Failed to upload wiki entry:', error);
    throw error;
  }
}

/**
 * Delete a wiki entry from GitHub
 */
export async function deleteWikiEntry(filename: string): Promise<void> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    const path = `${WIKI_PATH}/${filename}`;

    // Get file SHA
    const { data: file } = await client.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
    });

    if ('sha' in file) {
      await client.repos.deleteFile({
        owner: config.owner,
        repo: config.repo,
        path,
        message: `Delete ${filename}`,
        sha: file.sha,
      });

      console.log(`✅ Deleted wiki entry: ${filename}`);
    }
  } catch (error) {
    console.error('❌ Failed to delete wiki entry:', error);
    throw error;
  }
}
