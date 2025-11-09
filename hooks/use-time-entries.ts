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

export function useTimeEntries(customerId?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entriesByDate, setEntriesByDate] = useState<Map<string, TimeEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
    loadEntries();
  }, [loadEntries]);

  const addEntry = useCallback(async (entry: TimeEntry) => {
    try {
      await insertTimeEntry(entry);
      await loadEntries();
    } catch (err) {
      console.error('Failed to add time entry:', err);
      throw err;
    }
  }, [loadEntries]);

  const editEntry = useCallback(async (entry: TimeEntry) => {
    try {
      await updateTimeEntry(entry);
      await loadEntries();
    } catch (err) {
      console.error('Failed to update time entry:', err);
      throw err;
    }
  }, [loadEntries]);

  const removeEntry = useCallback(async (id: string) => {
    try {
      await deleteTimeEntry(id);
      await loadEntries();
    } catch (err) {
      console.error('Failed to delete time entry:', err);
      throw err;
    }
  }, [loadEntries]);

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
  };
}
