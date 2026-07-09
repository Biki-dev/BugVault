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

export type MatchOutcome =
  | { kind: 'repeated'; via: 'fingerprint' | 'semantic'; bugId: number; score?: number }
  | { kind: 'new' };