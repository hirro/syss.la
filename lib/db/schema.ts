export const SCHEMA_VERSION = 4;

export const CREATE_TABLES = `
-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('personal', 'github-issue')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  completed_at TEXT,
  status TEXT CHECK(status IN ('open', 'in-progress', 'blocked')),
  labels TEXT,
  due_date TEXT,
  github_owner TEXT,
  github_repo TEXT,
  github_issue_number INTEGER,
  github_state TEXT,
  github_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_todos_source ON todos(source);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed_at);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  archived INTEGER DEFAULT 0,
  invoice_ref TEXT,
  notes TEXT
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  notes TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  project_id TEXT,
  start TEXT NOT NULL,
  end TEXT,
  duration_minutes INTEGER,
  note TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_customer ON time_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start);

-- Active timer table (single row for current timer)
CREATE TABLE IF NOT EXISTS active_timer (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  customer_id TEXT NOT NULL,
  project_id TEXT,
  note TEXT,
  start_time TEXT NOT NULL,
  paused_at TEXT,
  paused_duration INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Metadata table
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Wiki entries table
CREATE TABLE IF NOT EXISTS wiki_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_wiki_entries_title ON wiki_entries(title);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_updated ON wiki_entries(updated_at);

-- Full-text search for wiki entries
CREATE VIRTUAL TABLE IF NOT EXISTS wiki_fts USING fts5(
  title,
  content,
  content='wiki_entries',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS wiki_fts_insert AFTER INSERT ON wiki_entries BEGIN
  INSERT INTO wiki_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS wiki_fts_delete AFTER DELETE ON wiki_entries BEGIN
  INSERT INTO wiki_fts(wiki_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS wiki_fts_update AFTER UPDATE ON wiki_entries BEGIN
  INSERT INTO wiki_fts(wiki_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO wiki_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
`;

export const MIGRATIONS = [
  // Migration 0 to 1: Initial schema (no-op, tables created by CREATE_TABLES)
  `SELECT 1;`,
  
  // Migration 1 to 2: Add archived column to customers (if not exists)
  `
  -- Check if archived column exists, add if not
  -- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
  -- This will fail silently if column already exists
  `,
  
  // Migration 2 to 3: Update time_entries to link to customers, add active_timer
  `
  -- Check if time_entries already has customer_id column
  -- If not, we need to migrate the schema
  
  -- Create active_timer table (safe with IF NOT EXISTS)
  CREATE TABLE IF NOT EXISTS active_timer (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    customer_id TEXT NOT NULL,
    project_id TEXT,
    note TEXT,
    start_time TEXT NOT NULL,
    paused_at TEXT,
    paused_duration INTEGER DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );
  `,
  
  // Migration 3 to 4: Add wiki entries and FTS
  `
  -- Wiki entries table already created in CREATE_TABLES
  -- This migration is a no-op since we use IF NOT EXISTS
  SELECT 1;
  `,
];
