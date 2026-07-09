import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

let db: Database.Database | null = null;

export function getDatabase(storagePath: string): Database.Database {
  if (db) return db;

  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const dbPath = path.join(storagePath, 'bugvault.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const schema = `
CREATE TABLE IF NOT EXISTS bugs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  memory_id TEXT,                    -- id of the corresponding Supermemory entry
  project_name TEXT NOT NULL,
  branch TEXT,
  commit_hash TEXT,
  language TEXT,
  framework TEXT,
  os TEXT,
  file_path TEXT,
  error_message TEXT NOT NULL,
  root_cause TEXT,
  fix TEXT,
  dev_notes TEXT,
  severity TEXT DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'solved'
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  solved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_bugs_fingerprint ON bugs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_project ON bugs(project_name);
  `;
  db.exec(schema);

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}