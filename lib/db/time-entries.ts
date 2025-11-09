import type { TimeEntry } from '@/types/time';
import { getDatabase } from './client';

export async function getTimeEntries(
  customerId?: string,
  startDate?: string,
  endDate?: string
): Promise<TimeEntry[]> {
  const db = await getDatabase();
  
  let query = 'SELECT * FROM time_entries WHERE 1=1';
  const params: any[] = [];
  
  if (customerId) {
    query += ' AND customer_id = ?';
    params.push(customerId);
  }
  
  if (startDate) {
    query += ' AND start >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND start <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY start DESC';
  
  const rows = await db.getAllAsync<any>(query, params);
  
  return rows.map(row => ({
    id: row.id,
    customerId: row.customer_id,
    projectId: row.project_id,
    start: row.start,
    end: row.end,
    durationMinutes: row.duration_minutes,
    note: row.note,
  }));
}

export async function getTimeEntry(id: string): Promise<TimeEntry | null> {
  const db = await getDatabase();
  
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM time_entries WHERE id = ?',
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    customerId: row.customer_id,
    projectId: row.project_id,
    start: row.start,
    end: row.end,
    durationMinutes: row.duration_minutes,
    note: row.note,
  };
}

export async function insertTimeEntry(entry: TimeEntry): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'INSERT INTO time_entries (id, customer_id, project_id, start, end, duration_minutes, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      entry.id,
      entry.customerId,
      entry.projectId || null,
      entry.start,
      entry.end || null,
      entry.durationMinutes || null,
      entry.note || null,
    ]
  );
}

export async function updateTimeEntry(entry: TimeEntry): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'UPDATE time_entries SET customer_id = ?, project_id = ?, start = ?, end = ?, duration_minutes = ?, note = ? WHERE id = ?',
    [
      entry.customerId,
      entry.projectId || null,
      entry.start,
      entry.end || null,
      entry.durationMinutes || null,
      entry.note || null,
      entry.id,
    ]
  );
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    'DELETE FROM time_entries WHERE id = ?',
    [id]
  );
}

// Get time entries grouped by date
export async function getTimeEntriesByDate(
  customerId?: string
): Promise<Map<string, TimeEntry[]>> {
  const entries = await getTimeEntries(customerId);
  const grouped = new Map<string, TimeEntry[]>();
  
  entries.forEach(entry => {
    const date = entry.start.split('T')[0]; // Get YYYY-MM-DD
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(entry);
  });
  
  return grouped;
}

// Calculate total duration for a set of entries
export function calculateTotalDuration(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => {
    return total + (entry.durationMinutes || 0);
  }, 0);
}

// Format duration in hours (e.g., "02.45 h")
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const decimal = (mins / 60).toFixed(2).substring(2);
  return `${hours.toString().padStart(2, '0')}.${decimal} h`;
}
