import { useState, useEffect, useCallback } from 'react';
import type { ActiveTimer, TimeEntry } from '@/types/time';
import { getDatabase } from '@/lib/db/client';
import { insertTimeEntry } from '@/lib/db/time-entries';

export function useTimer() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Load active timer from database on mount
  useEffect(() => {
    loadActiveTimer();
  }, []);

  // Update elapsed time every second when running
  useEffect(() => {
    if (!isRunning || !activeTimer) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(activeTimer.startTime).getTime();
      const elapsed = Math.floor((now - startTime - activeTimer.pausedDuration) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  const loadActiveTimer = async () => {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>(
        'SELECT * FROM active_timer WHERE id = 1'
      );

      if (row) {
        const timer: ActiveTimer = {
          customerId: row.customer_id,
          projectId: row.project_id,
          note: row.note,
          startTime: row.start_time,
          pausedAt: row.paused_at,
          pausedDuration: row.paused_duration || 0,
        };
        
        setActiveTimer(timer);
        setIsPaused(!!row.paused_at);
        setIsRunning(!row.paused_at);

        // Calculate elapsed time
        if (!row.paused_at) {
          const now = new Date().getTime();
          const startTime = new Date(row.start_time).getTime();
          const elapsed = Math.floor((now - startTime - timer.pausedDuration) / 1000);
          setElapsedSeconds(elapsed);
        } else {
          const pausedAt = new Date(row.paused_at).getTime();
          const startTime = new Date(row.start_time).getTime();
          const elapsed = Math.floor((pausedAt - startTime - timer.pausedDuration) / 1000);
          setElapsedSeconds(elapsed);
        }
      }
    } catch (error) {
      console.error('Failed to load active timer:', error);
    }
  };

  const startTimer = useCallback(async (customerId: string, projectId?: string, note?: string) => {
    try {
      const db = await getDatabase();
      const startTime = new Date().toISOString();

      // Clear any existing timer first
      await db.runAsync('DELETE FROM active_timer WHERE id = 1');

      // Insert new timer
      await db.runAsync(
        'INSERT INTO active_timer (id, customer_id, project_id, note, start_time, paused_duration) VALUES (?, ?, ?, ?, ?, ?)',
        [1, customerId, projectId || null, note || null, startTime, 0]
      );

      const timer: ActiveTimer = {
        customerId,
        projectId,
        note,
        startTime,
        pausedDuration: 0,
      };

      setActiveTimer(timer);
      setIsRunning(true);
      setIsPaused(false);
      setElapsedSeconds(0);
    } catch (error) {
      console.error('Failed to start timer:', error);
      throw error;
    }
  }, []);

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;

    try {
      const db = await getDatabase();
      const endTime = new Date().toISOString();
      const startTime = new Date(activeTimer.startTime).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const durationMinutes = Math.floor((endTimeMs - startTime - activeTimer.pausedDuration) / 60000);

      // Create time entry
      const timeEntry: TimeEntry = {
        id: Date.now().toString(),
        customerId: activeTimer.customerId,
        projectId: activeTimer.projectId,
        start: activeTimer.startTime,
        end: endTime,
        durationMinutes,
        note: activeTimer.note,
      };

      await insertTimeEntry(timeEntry);

      // Clear active timer
      await db.runAsync('DELETE FROM active_timer WHERE id = 1');

      setActiveTimer(null);
      setIsRunning(false);
      setIsPaused(false);
      setElapsedSeconds(0);

      return timeEntry;
    } catch (error) {
      console.error('Failed to stop timer:', error);
      throw error;
    }
  }, [activeTimer]);

  const pauseTimer = useCallback(async () => {
    if (!activeTimer || isPaused) return;

    try {
      const db = await getDatabase();
      const pausedAt = new Date().toISOString();

      await db.runAsync(
        'UPDATE active_timer SET paused_at = ? WHERE id = 1',
        [pausedAt]
      );

      setActiveTimer({ ...activeTimer, pausedAt });
      setIsRunning(false);
      setIsPaused(true);
    } catch (error) {
      console.error('Failed to pause timer:', error);
      throw error;
    }
  }, [activeTimer, isPaused]);

  const resumeTimer = useCallback(async () => {
    if (!activeTimer || !isPaused || !activeTimer.pausedAt) return;

    try {
      const db = await getDatabase();
      const now = new Date().getTime();
      const pausedAt = new Date(activeTimer.pausedAt).getTime();
      const additionalPausedDuration = now - pausedAt;
      const newPausedDuration = activeTimer.pausedDuration + additionalPausedDuration;

      await db.runAsync(
        'UPDATE active_timer SET paused_at = NULL, paused_duration = ? WHERE id = 1',
        [newPausedDuration]
      );

      setActiveTimer({
        ...activeTimer,
        pausedAt: undefined,
        pausedDuration: newPausedDuration,
      });
      setIsRunning(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume timer:', error);
      throw error;
    }
  }, [activeTimer, isPaused]);

  const formatElapsedTime = useCallback(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  return {
    activeTimer,
    isRunning,
    isPaused,
    elapsedSeconds,
    elapsedTime: formatElapsedTime(),
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
  };
}
