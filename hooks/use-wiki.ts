import {
    deleteWikiEntry as deleteWikiEntryDb,
    generateFilename,
    getWikiEntries,
    getWikiEntry,
    getWikiEntryByFilename,
    insertWikiEntry,
    searchWikiEntries,
    updateWikiEntry
} from '@/lib/db/wiki';
import {
    deleteWikiEntry as deleteWikiEntryGh,
    downloadWikiEntries,
    uploadWikiEntry as uploadWikiEntryGh,
} from '@/services/github/wiki-sync';
import type { WikiEntry, WikiSearchResult } from '@/types/wiki';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';

export function useWiki() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const syncFromGitHub = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const githubEntries = await downloadWikiEntries();

      // Merge GitHub entries with local ones
      for (const entry of githubEntries) {
        // Check if entry already exists by filename
        const existingByFilename = await getWikiEntryByFilename(entry.filename);
        
        if (existingByFilename) {
          // Update existing entry, preserving the local ID
          await updateWikiEntry({
            ...entry,
            id: existingByFilename.id,
            createdAt: existingByFilename.createdAt,
          });
        } else {
          // Insert new entry
          await insertWikiEntry(entry);
        }
      }

      console.log('✅ Wiki entries synced from GitHub');
    } catch (err) {
      console.error('Failed to sync wiki entries from GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

  const syncToGitHub = useCallback(async (entry: WikiEntry) => {
    if (!isAuthenticated) return;

    try {
      await uploadWikiEntryGh(entry);
      console.log('✅ Wiki entry synced to GitHub');
    } catch (err) {
      console.error('Failed to sync wiki entry to GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWikiEntries();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load wiki entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadEntries();
      await syncFromGitHub();
      await loadEntries(); // Reload after sync
    };
    init();
  }, [loadEntries, syncFromGitHub]);

  const addEntry = useCallback(async (title: string, content: string) => {
    try {
      // Extract just the filename part if title contains path separators
      const displayTitle = title.includes('/') 
        ? title.split('/').filter(p => p.trim()).pop() || title
        : title;
      
      const entry: WikiEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: displayTitle,
        filename: generateFilename(title),
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await insertWikiEntry(entry);
      await loadEntries();
      await syncToGitHub(entry);
    } catch (err) {
      console.error('Failed to add wiki entry:', err);
      throw err;
    }
  }, [loadEntries, syncToGitHub]);

  const editEntry = useCallback(async (id: string, title: string, content: string) => {
    try {
      const existing = await getWikiEntry(id);
      if (!existing) {
        throw new Error('Entry not found');
      }

      const updated: WikiEntry = {
        ...existing,
        title,
        content,
        updatedAt: new Date().toISOString(),
      };

      await updateWikiEntry(updated);
      await loadEntries();
      await syncToGitHub(updated);
    } catch (err) {
      console.error('Failed to update wiki entry:', err);
      throw err;
    }
  }, [loadEntries, syncToGitHub]);

  const removeEntry = useCallback(async (id: string) => {
    try {
      const entry = await getWikiEntry(id);
      if (!entry) {
        throw new Error('Entry not found');
      }

      await deleteWikiEntryDb(id);
      await loadEntries();
      
      if (isAuthenticated) {
        await deleteWikiEntryGh(entry.filename);
      }
    } catch (err) {
      console.error('Failed to delete wiki entry:', err);
      throw err;
    }
  }, [loadEntries, isAuthenticated]);

  const search = useCallback(async (query: string): Promise<WikiSearchResult[]> => {
    try {
      return await searchWikiEntries(query);
    } catch (err) {
      console.error('Failed to search wiki entries:', err);
      return [];
    }
  }, []);

  const refresh = useCallback(() => {
    loadEntries();
  }, [loadEntries]);

  const syncWithGitHub = useCallback(async () => {
    await syncFromGitHub();
    await loadEntries();
  }, [syncFromGitHub, loadEntries]);

  return {
    entries,
    loading,
    error,
    addEntry,
    editEntry,
    removeEntry,
    search,
    refresh,
    syncWithGitHub,
  };
}
