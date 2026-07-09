import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { log } from '../utils/logger';

export class BugTracker {
  // Maps file path -> active bug id, for diagnostics-sourced bugs
  private activeByFile = new Map<string, number>();
  // Maps task name -> { bugId: number, exitCode: number }, for task-sourced bugs
  private activeByTask = new Map<string, { bugId: number, exitCode: number }>();

  constructor(
    private repo: BugRepository,
    private onResolved: (bugId: number) => void
  ) {}

  registerActiveBug(bugId: number, filePath?: string, taskName?: string, exitCode?: number): void {
    if (filePath) this.activeByFile.set(filePath, bugId);
    if (taskName && exitCode !== undefined) {
      this.activeByTask.set(taskName, { bugId, exitCode });
    }
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
    const active = this.activeByTask.get(taskName);
    if (!active) return;

    if (active.exitCode !== exitCode) {
      log(`Bug ${active.bugId} appears resolved (task "${taskName}" exited with ${exitCode} instead of ${active.exitCode})`);
      this.activeByTask.delete(taskName);
      this.onResolved(active.bugId);
    }
  }
}