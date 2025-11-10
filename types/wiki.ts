/**
 * Wiki entry types for the Poor Man's Evernote feature
 */

export interface WikiEntry {
  id: string;
  title: string;
  filename: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

export interface WikiSearchResult {
  entry: WikiEntry;
  matchedContent?: string;
  matchedTitle?: string;
}
