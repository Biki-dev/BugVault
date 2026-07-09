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

    // Prefer shared memory for storage when it's available
    const activeClient = this.sharedSupermemory ?? this.supermemory;
    const activeAlive = this.sharedSupermemory
      ? await this.sharedSupermemory.isAlive()
      : personalAlive;

    let memoryId: string | null = null;
    if (activeAlive) {
      memoryId = await activeClient.addMemory(normalizedText, {
        project: event.projectName,
        source: event.source,
        rawText: event.rawText
      });
    }

    this.repo.create({
      fingerprint,
      memory_id: memoryId,
      project_name: event.projectName,
      branch: gitInfo.branch,
      commit_hash: gitInfo.commit,
      language: event.language ?? null,
      os: os.platform(),
      file_path: event.filePath ?? null,
      error_message: event.rawText.slice(0, 4000)
    });

    return { kind: 'new' };
  }
}