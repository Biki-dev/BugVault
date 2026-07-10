import { BugEvent } from '../capture/bugEvent';
import { fingerprintError, getNormalizedText } from '../normalize/fingerprint';
import { SupermemoryClient } from './supermemoryClient';
import { BugRepository } from '../db/bugRepository';
import { MatchOutcome } from './memoryTypes';
import { getGitInfo } from '../utils/gitInfo';
import * as os from 'os';

export class MatchEngine {
  constructor(
    private supermemory: SupermemoryClient,
    private repo: BugRepository,
    private similarityThreshold: number,
    /** Optional separate shared-memory client. When present it is searched first. */
    private sharedSupermemory?: SupermemoryClient
  ) {}

  async processBugEvent(event: BugEvent): Promise<MatchOutcome> {
    const fingerprint = fingerprintError(event.rawText);
    const normalizedText = getNormalizedText(event.rawText);

    // ── Stage A: exact fingerprint match (local DB) ────────────────────────
    const exactMatch = this.repo.findByFingerprint(fingerprint);
    if (exactMatch) {
      this.repo.incrementOccurrence(exactMatch.id);
      return { kind: 'repeated', via: 'fingerprint', bugId: exactMatch.id };
    }

    // ── Stage B: semantic search — shared memory first, personal second ────
    // Try shared memory
    if (this.sharedSupermemory) {
      const sharedAlive = await this.sharedSupermemory.isAlive();
      if (sharedAlive) {
        const results = await this.sharedSupermemory.search(normalizedText, 3);
        const top = results[0];
        if (top && top.score >= this.similarityThreshold) {
          // Find the local record that mirrors this shared memory entry
          const localBug = this.repo.findByMemoryId(top.memoryId);
          if (localBug) {
            this.repo.incrementOccurrence(localBug.id);
            return {
              kind: 'repeated',
              via: 'semantic',
              bugId: localBug.id,
              score: top.score,
              fromShared: true,
              teamFix: (top.metadata['fix'] as string) ?? undefined
            };
          }
        }
      }
    }

    // Try personal/local memory
    const personalAlive = await this.supermemory.isAlive();
    if (personalAlive) {
      const results = await this.supermemory.search(normalizedText, 3);
      const top = results[0];
      if (top && top.score >= this.similarityThreshold) {
        const existingBug = this.repo.findByMemoryId(top.memoryId);
        if (existingBug) {
          this.repo.incrementOccurrence(existingBug.id);
          return {
            kind: 'repeated',
            via: 'semantic',
            bugId: existingBug.id,
            score: top.score,
            fromShared: false
          };
        }
      }
    }

    // ── Stage C: new bug — store locally and in the active Supermemory ─────
    const gitInfo = await getGitInfo(event.cwd);

    // Determine the best available client for storing new bugs.
    // Prefer shared; fall back to personal if shared is down.
    let storageClient: SupermemoryClient;
    let storageAlive: boolean;
    if (this.sharedSupermemory) {
      const sharedOk = await this.sharedSupermemory.isAlive();
      if (sharedOk) {
        storageClient = this.sharedSupermemory;
        storageAlive = true;
      } else {
        // Shared is configured but unreachable — use personal
        storageClient = this.supermemory;
        storageAlive = personalAlive;
      }
    } else {
      storageClient = this.supermemory;
      storageAlive = personalAlive;
    }

    let memoryId: string | null = null;
    if (storageAlive) {
      try {
        memoryId = await storageClient.addMemory(normalizedText, {
          project: event.projectName,
          source: event.source,
          rawText: event.rawText.slice(0, 1000)
        });
      } catch {
        // Memory storage failed — still create the local DB record
      }
    }

    this.repo.create({
      fingerprint,
      memory_id: memoryId,
      project_name: event.projectName,
      branch: gitInfo.branch,
      commit_hash: gitInfo.commit,
      language: event.language ?? null,
      framework: null,
      os: os.platform(),
      file_path: event.filePath ?? null,
      error_message: event.rawText.slice(0, 4000)
    });

    return { kind: 'new' };
  }
}