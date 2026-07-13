const Database = require('better-sqlite3');
const { BugRepository } = require('./out/db/bugRepository');

const db = new Database(':memory:');
db.exec(`
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
`);

const repo = new BugRepository(db);

repo.create({
  fingerprint: '12345',
  memory_id: null,
  project_name: 'test',
  branch: 'main',
  commit_hash: 'abc',
  language: 'js',
  framework: 'node',
  os: 'linux',
  file_path: 'index.js',
  error_message: 'syntax error'
});

const exported = repo.exportAll();
console.log('Exported data length:', exported.length);

db.exec('DELETE FROM bugs'); // Clear db

try {
  const count = repo.importData(exported);
  console.log('Imported count:', count);
} catch (e) {
  console.error('Import Error:', e);
}
