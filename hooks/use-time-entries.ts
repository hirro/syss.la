import { useState, useEffect, useCallback } from 'react';
import type { TimeEntry } from '@/types/time';
import {
  getTimeEntries,
  getTimeEntriesByDate,
  insertTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  calculateTotalDuration,
  formatDuration,
} from '@/lib/db/time-entries';
import { uploadTimeEntries, downloadTimeEntries } from '@/services/github/time-sync';
import { useAuth } from './use-auth';

export function useTimeEntries(customerId?: string) {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Map<string, TimeEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const syncToGitHub = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const allEntries = await getTimeEntries();
      await uploadTimeEntries(allEntries);
      console.log('✅ Time entries synced to GitHub');
    } catch (err) {
      console.error('Failed to sync time entries to GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

  const syncFromGitHub = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const githubEntries = await downloadTimeEntries();
      
      // Merge GitHub entries with local ones
      for (const entry of githubEntries) {
        try {
          await insertTimeEntry(entry);
        } catch (err) {
          // Entry might already exist, try update
          await updateTimeEntry(entry);
        }
      }
      
      console.log('✅ Time entries synced from GitHub');
    } catch (err) {
      console.error('Failed to sync time entries from GitHub:', err);
      // Don't throw - sync is optional
    }
  }, [isAuthenticated]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimeEntries(customerId);
      setEntries(data);
      
      const grouped = await getTimeEntriesByDate(customerId);
      setEntriesByDate(grouped);
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load time entries:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const init = async () => {
      await loadEntries();
      await syncFromGitHub();
      await loadEntries(); // Reload after sync
    };
    init();
  }, [loadEntries, syncFromGitHub]);

  const addEntry = useCallback(async (entry: TimeEntry) => {
    try {
      await insertTimeEntry(entry);
      await loadEntries();
      await syncToGitHub();
    } catch (err) {
      console.error('Failed to add time entry:', err);
      throw err;
    }
  }, [loadEntries, syncToGitHub]);

  const editEntry = useCallback(async (entry: TimeEntry) => {
    try {
      await updateTimeEntry(entry);
      await loadEntries();
      await syncToGitHub();
    } catch (err) {
      console.error('Failed to update time entry:', err);
      throw err;
    }
  }, [loadEntries, syncToGitHub]);

  const removeEntry = useCallback(async (id: string) => {
    try {
      await deleteTimeEntry(id);
      await loadEntries();
      await syncToGitHub();
    } catch (err) {
      console.error('Failed to delete time entry:', err);
      throw err;
    }
  }, [loadEntries, syncToGitHub]);

  const getTotalDuration = useCallback((date?: string) => {
    if (date && entriesByDate.has(date)) {
      return calculateTotalDuration(entriesByDate.get(date)!);
    }
    return calculateTotalDuration(entries);
  }, [entries, entriesByDate]);

  const formatTotalDuration = useCallback((date?: string) => {
    const minutes = getTotalDuration(date);
    return formatDuration(minutes);
  }, [getTotalDuration]);

  const refresh = useCallback(() => {
    loadEntries();
  }, [loadEntries]);

  const syncWithGitHub = useCallback(async () => {
    await syncToGitHub();
    await syncFromGitHub();
    await loadEntries();
  }, [syncToGitHub, syncFromGitHub, loadEntries]);

  return {
    entries,
    entriesByDate,
    loading,
    error,
    addEntry,
    editEntry,
    removeEntry,
    getTotalDuration,
    formatTotalDuration,
    refresh,
    syncWithGitHub,
  };
}
