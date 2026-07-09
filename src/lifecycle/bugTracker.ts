import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { log } from '../utils/logger';

export class BugTracker {
  // Maps file path -> active bug id, for diagnostics-sourced bugs
  private activeByFile = new Map<string, number>();
  // Maps task name -> active bug id, for task-sourced bugs
  private activeByTask = new Map<string, number>();

  constructor(
    private repo: BugRepository,
    private onResolved: (bugId: number) => void
  ) {}

  registerActiveBug(bugId: number, filePath?: string, taskName?: string): void {
    if (filePath) this.activeByFile.set(filePath, bugId);
    if (taskName) this.activeByTask.set(taskName, bugId);
  }

  watchDiagnosticsClear(): vscode.Disposable {
    return vscode.languages.onDidChangeDiagnostics(e => {
      for (const uri of e.uris) {
        const filePath = uri.fsPath;
        const bugId = this.activeByFile.get(filePath);
        if (bugId === undefined) continue;

        const stillHasErrors = vscode.languages
          .getDiagnostics(uri)
          .some(d => d.severity === vscode.DiagnosticSeverity.Error);

        if (!stillHasErrors) {
          log(`Bug ${bugId} appears resolved (diagnostics cleared for ${filePath})`);
          this.activeByFile.delete(filePath);
          this.onResolved(bugId);
        }
      }
    });
  }

  handleTaskExit(taskName: string, exitCode: number | undefined): void {
    const bugId = this.activeByTask.get(taskName);
    if (bugId === undefined) return;

    if (exitCode === 0) {
      log(`Bug ${bugId} appears resolved (task "${taskName}" now exits 0)`);
      this.activeByTask.delete(taskName);
      this.onResolved(bugId);
    }
  }
}