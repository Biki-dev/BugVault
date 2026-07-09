export interface MemoryEntry {
  id: string;
  content: string;
  metadata: Record<string, string | number>;
}

export interface SemanticMatch {
  memoryId: string;
  score: number;
  content: string;
  metadata: Record<string, string | number>;
}

/**
 * fromShared — true when the match was found in the shared/team Supermemory.
 * teamFix    — fix text pulled from shared-memory metadata (if stored there).
 */
export type MatchOutcome =
  | {
      kind: 'repeated';
      via: 'fingerprint' | 'semantic';
      bugId: number;
      score?: number;
      fromShared?: boolean;
      teamFix?: string;
    }
  | { kind: 'new' };