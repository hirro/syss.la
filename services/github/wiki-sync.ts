import type { WikiEntry } from '@/types/wiki';
import { getSyncConfig } from '../sync-service';
import { getOctokit } from './api-client';

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
 * Recursively get all .md files from a directory and its subdirectories
 */
async function getAllMarkdownFiles(
  client: any,
  owner: string,
  repo: string,
  path: string
): Promise<{ path: string; name: string }[]> {
  const files: { path: string; name: string }[] = [];

  try {
    const { data } = await client.repos.getContent({
      owner,
      repo,
      path,
    });

    if (!Array.isArray(data)) {
      return files;
    }

    for (const item of data) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        files.push({ path: item.path, name: item.name });
      } else if (item.type === 'dir') {
        // Recursively get files from subdirectory
        const subFiles = await getAllMarkdownFiles(client, owner, repo, item.path);
        files.push(...subFiles);
      }
    }
  } catch (error: any) {
    if (error.status !== 404) {
      console.error(`Failed to read directory ${path}:`, error);
    }
  }

  return files;
}

/**
 * Download all wiki entries from GitHub (including subdirectories)
 */
export async function downloadWikiEntries(): Promise<WikiEntry[]> {
  try {
    const config = await getSyncConfig();
    if (!config) {
      throw new Error('Sync not configured');
    }

    const client = await getOctokit();
    
    // Get all .md files recursively from wiki directory
    const files = await getAllMarkdownFiles(client, config.owner, config.repo, WIKI_PATH);

    const entries: WikiEntry[] = [];

    // Download each .md file
    for (const file of files) {
      try {
        const { data: fileData } = await client.repos.getContent({
          owner: config.owner,
          repo: config.repo,
          path: file.path,
        });

        if ('content' in fileData) {
          const content = fromBase64(fileData.content);
          
          // Store relative path from wiki directory
          const relativePath = file.path.replace(`${WIKI_PATH}/`, '');
          
          // Extract title from filename (last part without .md extension)
          const filenameParts = relativePath.split('/');
          const lastPart = filenameParts[filenameParts.length - 1];
          const title = lastPart.replace(/\.md$/, '');
          
          entries.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title,
            filename: relativePath,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to download ${file.path}:`, error);
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
