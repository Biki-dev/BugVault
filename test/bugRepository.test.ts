import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { BugRepository } from '../src/db/bugRepository';

describe('BugRepository', () => {
  let db: Database.Database;
  let repo: BugRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    const schema = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf-8');
    db.exec(schema);
    repo = new BugRepository(db);
  });

  it('creates and retrieves a bug by fingerprint', () => {
    const id = repo.create({
      fingerprint: 'abc123',
      memory_id: 'mem-1',
      project_name: 'proj',
      branch: 'main',
      commit_hash: 'deadbee',
      language: 'typescript',
      os: 'darwin',
      file_path: 'index.ts',
      error_message: 'TypeError: x is undefined'
    });

    const found = repo.findByFingerprint('abc123');
    expect(found?.id).toBe(id);
    expect(found?.status).toBe('active');
  });

  it('increments occurrence count', () => {
    const id = repo.create({
      fingerprint: 'abc123', memory_id: null, project_name: 'proj',
      branch: null, commit_hash: null, language: null, os: null,
      file_path: null, error_message: 'err'
    });

    repo.incrementOccurrence(id);
    repo.incrementOccurrence(id);

    const found = repo.findById(id);
    expect(found?.occurrence_count).toBe(3);
  });

  it('marks a bug solved with fix', () => {
    const id = repo.create({
      fingerprint: 'abc123', memory_id: null, project_name: 'proj',
      branch: null, commit_hash: null, language: null, os: null,
      file_path: null, error_message: 'err'
    });

    repo.markSolved(id, 'Added null check', 'Missing guard clause');

    const found = repo.findById(id);
    expect(found?.status).toBe('solved');
    expect(found?.fix).toBe('Added null check');
    expect(found?.root_cause).toBe('Missing guard clause');
  });
});