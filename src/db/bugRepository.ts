import Database from 'better-sqlite3';

export interface BugRecord {
  id: number;
  fingerprint: string;
  memory_id: string | null;
  project_name: string;
  branch: string | null;
  commit_hash: string | null;
  language: string | null;
  framework: string | null;
  os: string | null;
  file_path: string | null;
  error_message: string;
  root_cause: string | null;
  fix: string | null;
  dev_notes: string | null;
  severity: string;
  status: 'active' | 'solved';
  occurrence_count: number;
  first_seen: number;
  last_seen: number;
  solved_at: number | null;
}

export class BugRepository {
  constructor(private db: Database.Database) {}

  findByFingerprint(fingerprint: string): BugRecord | undefined {
    return this.db
      .prepare('SELECT * FROM bugs WHERE fingerprint = ? ORDER BY last_seen DESC LIMIT 1')
      .get(fingerprint) as BugRecord | undefined;
  }

  findById(id: number): BugRecord | undefined {
    return this.db.prepare('SELECT * FROM bugs WHERE id = ?').get(id) as BugRecord | undefined;
  }

  findByMemoryId(memoryId: string): BugRecord | undefined {
    return this.db
      .prepare('SELECT * FROM bugs WHERE memory_id = ?')
      .get(memoryId) as BugRecord | undefined;
  }

  create(params: {
    fingerprint: string;
    memory_id: string | null;
    project_name: string;
    branch: string | null;
    commit_hash: string | null;
    language: string | null;
    framework: string | null;
    os: string | null;
    file_path: string | null;
    error_message: string;
  }): number {
    const now = Date.now();
    const result = this.db
      .prepare(
        `INSERT INTO bugs
         (fingerprint, memory_id, project_name, branch, commit_hash, language, framework, os,
          file_path, error_message, status, occurrence_count, first_seen, last_seen)
         VALUES (@fingerprint, @memory_id, @project_name, @branch, @commit_hash, @language, @framework, @os,
                 @file_path, @error_message, 'active', 1, @now, @now)`
      )
      .run({ ...params, now });

    return Number(result.lastInsertRowid);
  }

  incrementOccurrence(id: number): void {
    this.db
      .prepare('UPDATE bugs SET occurrence_count = occurrence_count + 1, last_seen = ? WHERE id = ?')
      .run(Date.now(), id);
  }

  markSolved(id: number, fix: string, rootCause?: string, devNotes?: string): void {
    this.db
      .prepare(
        `UPDATE bugs SET status = 'solved', fix = ?, root_cause = COALESCE(?, root_cause),
         dev_notes = COALESCE(?, dev_notes), solved_at = ? WHERE id = ?`
      )
      .run(fix, rootCause ?? null, devNotes ?? null, Date.now(), id);
  }

  listActive(projectName?: string): BugRecord[] {
    if (projectName) {
      return this.db
        .prepare('SELECT * FROM bugs WHERE status = ? AND project_name = ? ORDER BY last_seen DESC')
        .all('active', projectName) as BugRecord[];
    }
    return this.db
      .prepare('SELECT * FROM bugs WHERE status = ? ORDER BY last_seen DESC')
      .all('active') as BugRecord[];
  }

  listRecent(limit = 20): BugRecord[] {
    return this.db
      .prepare('SELECT * FROM bugs ORDER BY last_seen DESC LIMIT ?')
      .all(limit) as BugRecord[];
  }

  /** Back-fill a memory_id after the entry is pushed to (shared) Supermemory. */
  updateMemoryId(id: number, memoryId: string): void {
    this.db
      .prepare('UPDATE bugs SET memory_id = ? WHERE id = ?')
      .run(memoryId, id);
  }
}