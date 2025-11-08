export const SCHEMA_VERSION = 1;

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
  project_id TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT,
  duration_minutes INTEGER,
  note TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start);

-- Metadata table
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
