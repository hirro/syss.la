import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, MIGRATIONS, SCHEMA_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let migrationRun = false;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initializing, wait for that to complete
  if (initPromise) {
    return initPromise;
  }

  if (db && migrationRun) {
    return db;
  }

  // Create initialization promise to prevent parallel initialization
  initPromise = (async () => {
    if (!db) {
      db = await SQLite.openDatabaseAsync('syss.la.db');
    }

  // Create tables
  await db.execAsync(CREATE_TABLES);

  // Check current schema version
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM metadata WHERE key = ?',
    ['schema_version']
  );

  let currentVersion = result ? parseInt(result.value, 10) : 0;
  
  // TEMPORARY: Force migration to run if archived column doesn't exist
  if (currentVersion === 2) {
    try {
      await db.getFirstAsync('SELECT archived FROM customers LIMIT 1');
    } catch {
      console.log('⚠️ Archived column missing, forcing migration...');
      currentVersion = 1; // Force migration to run
    }
  }
  
  // TEMPORARY: Force migration to run if rate column doesn't exist
  if (currentVersion >= 2 && currentVersion < 5) {
    try {
      await db.getFirstAsync('SELECT rate FROM customers LIMIT 1');
    } catch {
      console.log('⚠️ Rate column missing, forcing migration from version 4...');
      currentVersion = 4; // Force migration 4 to 5 to run
    }
  }
  
  console.log(`📊 Current database schema version: ${currentVersion}, target: ${SCHEMA_VERSION}`);

  // Run migrations if needed
  if (currentVersion < SCHEMA_VERSION) {
    console.log(`📦 Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);
    
    for (let i = currentVersion; i < SCHEMA_VERSION; i++) {
      const migration = MIGRATIONS[i];
      if (migration && migration.trim() !== '' && !migration.includes('SELECT 1')) {
        console.log(`  Running migration ${i} to ${i + 1}: ${migration.substring(0, 50)}...`);
        try {
          await db.execAsync(migration);
          console.log(`  ✅ Migration ${i} to ${i + 1} complete`);
        } catch (error) {
          console.error(`  ❌ Migration ${i} to ${i + 1} failed:`, error);
          // Continue anyway - migration might not be needed for fresh installs
        }
      } else {
        console.log(`  ⏭️  Skipping migration ${i} to ${i + 1} (no-op or fresh install)`);
      }
    }

    // Update schema version
    if (currentVersion === 0) {
      await db.runAsync(
        'INSERT INTO metadata (key, value) VALUES (?, ?)',
        ['schema_version', SCHEMA_VERSION.toString()]
      );
    } else {
      await db.runAsync(
        'UPDATE metadata SET value = ? WHERE key = ?',
        [SCHEMA_VERSION.toString(), 'schema_version']
      );
    }
    
    console.log(`✅ Database migrated to version ${SCHEMA_VERSION}`);
  }

    migrationRun = true;
    initPromise = null;
    return db!;
  })();

  return initPromise;
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

export async function resetDatabase(): Promise<void> {
  await closeDatabase();
  db = null;
  migrationRun = false;
  await initDatabase();
}

/**
 * Force database migration to run again
 * Useful when schema changes are detected at runtime
 */
export async function forceMigration(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  console.log('🔄 Forcing migration check...');
  
  // Check if rate column exists
  try {
    await db.getFirstAsync('SELECT rate FROM customers LIMIT 1');
    console.log('✅ Rate column exists, no migration needed');
    return;
  } catch (error) {
    console.log('⚠️ Rate column missing, running migration 4→5...');
  }
  
  // Run the migration for version 4 to 5
  const migration = MIGRATIONS[4]; // Migration from version 4 to 5
  if (migration) {
    try {
      await db.execAsync(migration);
      console.log('✅ Migration 4→5 completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
}

/**
 * Clear all data from all tables in the database
 * This preserves the schema but removes all user data
 */
export async function clearAllDatabaseTables(): Promise<void> {
  const db = await getDatabase();
  
  console.log('🗑️ Clearing all database tables...');
  
  // Clear all tables in order (respecting foreign key constraints)
  await db.runAsync('DELETE FROM active_timer');
  await db.runAsync('DELETE FROM time_entries');
  await db.runAsync('DELETE FROM projects');
  await db.runAsync('DELETE FROM customers');
  await db.runAsync('DELETE FROM todos');
  await db.runAsync('DELETE FROM wiki_entries');
  // Note: wiki_fts is automatically updated by triggers
  
  console.log('✅ All database tables cleared');
}
