import Database from 'better-sqlite3';

/** How many minutes we credit per repeated-bug detection. */
export const MINUTES_PER_REPEAT = 15;

export class StatsRepository {
  constructor(private db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stats (
        key   TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
      );
      INSERT OR IGNORE INTO stats (key, value) VALUES ('minutes_saved', 0);
      INSERT OR IGNORE INTO stats (key, value) VALUES ('repeats_caught', 0);
    `);
  }

  /** Add one repeated-bug hit and return the new cumulative minutes saved. */
  recordRepeat(minutes = MINUTES_PER_REPEAT): number {
    this.db.prepare(`
      UPDATE stats SET value = value + ? WHERE key = 'minutes_saved'
    `).run(minutes);
    this.db.prepare(`
      UPDATE stats SET value = value + 1 WHERE key = 'repeats_caught'
    `).run();
    return this.getTotalMinutesSaved();
  }

  getTotalMinutesSaved(): number {
    const row = this.db.prepare(`SELECT value FROM stats WHERE key = 'minutes_saved'`).get() as { value: number } | undefined;
    return row?.value ?? 0;
  }

  getRepeatsCaught(): number {
    const row = this.db.prepare(`SELECT value FROM stats WHERE key = 'repeats_caught'`).get() as { value: number } | undefined;
    return row?.value ?? 0;
  }
}
