import { getDatabase } from './client';
import type { WikiEntry, WikiSearchResult } from '@/types/wiki';

/**
 * Get all wiki entries, sorted by updated date (newest first)
 */
export async function getWikiEntries(): Promise<WikiEntry[]> {
  const db = await getDatabase();
  const result = await db.getAllAsync<WikiEntry>(
    'SELECT * FROM wiki_entries ORDER BY updated_at DESC'
  );
  return result;
}

/**
 * Get a single wiki entry by ID
 */
export async function getWikiEntry(id: string): Promise<WikiEntry | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<WikiEntry>(
    'SELECT * FROM wiki_entries WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Get a wiki entry by filename
 */
export async function getWikiEntryByFilename(filename: string): Promise<WikiEntry | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<WikiEntry>(
    'SELECT * FROM wiki_entries WHERE filename = ?',
    [filename]
  );
  return result || null;
}

/**
 * Insert a new wiki entry
 */
export async function insertWikiEntry(entry: WikiEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO wiki_entries (id, title, filename, content, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.title,
      entry.filename,
      entry.content,
      entry.createdAt,
      entry.updatedAt,
      entry.syncedAt || null,
    ]
  );
}

/**
 * Update an existing wiki entry
 */
export async function updateWikiEntry(entry: WikiEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE wiki_entries
     SET title = ?, filename = ?, content = ?, updated_at = ?, synced_at = ?
     WHERE id = ?`,
    [
      entry.title,
      entry.filename,
      entry.content,
      entry.updatedAt,
      entry.syncedAt || null,
      entry.id,
    ]
  );
}

/**
 * Delete a wiki entry
 */
export async function deleteWikiEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM wiki_entries WHERE id = ?', [id]);
}

/**
 * Search wiki entries using full-text search
 */
export async function searchWikiEntries(query: string): Promise<WikiSearchResult[]> {
  if (!query.trim()) {
    const entries = await getWikiEntries();
    return entries.map(entry => ({ entry }));
  }

  const db = await getDatabase();
  
  // Use FTS5 MATCH for full-text search
  const result = await db.getAllAsync<{
    id: string;
    title: string;
    filename: string;
    content: string;
    created_at: string;
    updated_at: string;
    synced_at: string | null;
    matched_title: string;
    matched_content: string;
  }>(
    `SELECT 
      w.*,
      snippet(wiki_fts, 0, '<mark>', '</mark>', '...', 32) as matched_title,
      snippet(wiki_fts, 1, '<mark>', '</mark>', '...', 64) as matched_content
     FROM wiki_entries w
     JOIN wiki_fts ON wiki_fts.rowid = w.rowid
     WHERE wiki_fts MATCH ?
     ORDER BY rank`,
    [query]
  );

  return result.map(row => ({
    entry: {
      id: row.id,
      title: row.title,
      filename: row.filename,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at || undefined,
    },
    matchedTitle: row.matched_title,
    matchedContent: row.matched_content,
  }));
}

/**
 * Extract title from markdown content (first # heading)
 */
export function extractTitleFromMarkdown(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return 'Untitled';
}

/**
 * Generate filename from title
 */
export function generateFilename(title: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${date}-${slug}.md`;
}
