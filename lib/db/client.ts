import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, SCHEMA_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync('syss.la.db');

  // Create tables
  await db.execAsync(CREATE_TABLES);

  // Check and set schema version
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM metadata WHERE key = ?',
    ['schema_version']
  );

  if (!result) {
    await db.runAsync(
      'INSERT INTO metadata (key, value) VALUES (?, ?)',
      ['schema_version', SCHEMA_VERSION.toString()]
    );
  }

  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
