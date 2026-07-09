import * as vscode from 'vscode';
import { BugRecord } from '../db/bugRepository';

interface PendingLens {
  uri: vscode.Uri;
  line: number;
  bug: BugRecord;
}

export class BugCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private pending: PendingLens[] = [];

  /** Call this when a repeated bug is detected. */
  addLens(uri: vscode.Uri, line: number, bug: BugRecord): void {
    // Deduplicate: one lens per (uri + line)
    const key = `${uri.toString()}:${line}`;
    this.pending = this.pending.filter(p => `${p.uri.toString()}:${p.line}` !== key);
    this.pending.push({ uri, line, bug });
    this._onDidChangeCodeLenses.fire();
  }

  /** Clear all lenses for a given bug id (e.g. when it's resolved). */
  removeLensForBug(bugId: number): void {
    this.pending = this.pending.filter(p => p.bug.id !== bugId);
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    return this.pending
      .filter(p => p.uri.toString() === document.uri.toString())
      .map(p => {
        const lineIdx = Math.min(p.line, document.lineCount - 1);
        const range = document.lineAt(lineIdx).range;

        const occurrences = p.bug.occurrence_count;
        const hasFix = !!p.bug.fix;
        const label = hasFix
          ? `$(bug) Seen ${occurrences}x before · fix: "${p.bug.fix!.substring(0, 60)}${p.bug.fix!.length > 60 ? '…' : ''}"`
          : `$(bug) Seen ${occurrences}x before · no fix saved yet`;

        return new vscode.CodeLens(range, {
          title: label,
          command: 'bugvault.showRelatedBugs',
          arguments: [p.bug.id],
          tooltip: 'Click to view full bug details in BugVault'
        });
      });
  }
}
