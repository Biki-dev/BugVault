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
    private similarityThreshold: number
  ) {}

  async processBugEvent(event: BugEvent): Promise<MatchOutcome> {
    const fingerprint = fingerprintError(event.rawText);
    const normalizedText = getNormalizedText(event.rawText);

    // Stage A: exact fingerprint match
    const exactMatch = this.repo.findByFingerprint(fingerprint);
    if (exactMatch) {
      this.repo.incrementOccurrence(exactMatch.id);
      return { kind: 'repeated', via: 'fingerprint', bugId: exactMatch.id };
    }

    // Stage B: semantic match via Supermemory
    const alive = await this.supermemory.isAlive();
    if (alive) {
      const results = await this.supermemory.search(normalizedText, 3);
      const topMatch = results[0];

      if (topMatch && topMatch.score >= this.similarityThreshold) {
        const existingBug = this.repo.findByMemoryId(topMatch.memoryId);
        if (existingBug) {
          this.repo.incrementOccurrence(existingBug.id);
          return {
            kind: 'repeated',
            via: 'semantic',
            bugId: existingBug.id,
            score: topMatch.score
          };
        }
      }
    }

    // No match -> new bug. Store in both SQLite and Supermemory.
    const gitInfo = await getGitInfo(event.cwd);

    let memoryId: string | null = null;
    if (alive) {
      memoryId = await this.supermemory.addMemory(normalizedText, {
        project: event.projectName,
        source: event.source,
        rawText: event.rawText
      });
    }

    const bugId = this.repo.create({
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