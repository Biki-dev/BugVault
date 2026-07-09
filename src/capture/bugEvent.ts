export type BugSource = 'terminal' | 'diagnostics' | 'task';

export interface BugEvent {
  source: BugSource;
  rawText: string;          // full error/stack text as captured
  filePath?: string;        // file the error is associated with, if known
  line?: number;
  language?: string;
  timestamp: number;
  projectName: string;
  cwd: string;
}

export function createBugEvent(params: {
  source: BugSource;
  rawText: string;
  filePath?: string;
  line?: number;
  language?: string;
  projectName: string;
  cwd: string;
}): BugEvent {
  return {
    source: params.source,
    rawText: params.rawText,
    filePath: params.filePath,
    line: params.line,
    language: params.language,
    timestamp: Date.now(),
    projectName: params.projectName,
    cwd: params.cwd
  };
}