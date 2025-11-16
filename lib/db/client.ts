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
  await initDatabase();
}
