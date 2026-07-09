import * as vscode from 'vscode';
import { createBugEvent, BugEvent } from './bugEvent';
import { getProjectName } from '../utils/config';

const ERROR_PATTERNS = [
  /error/i,
  /exception/i,
  /traceback \(most recent call last\)/i,
  /fatal/i,
  /failed to compile/i,
  /unhandled rejection/i,
  /\bERR!\b/,
  /at .+\(.+:\d+:\d+\)/ // JS stack trace frame
];

function looksLikeError(text: string): boolean {
  return ERROR_PATTERNS.some(p => p.test(text));
}

export function startTerminalWatcher(
  onBug: (event: BugEvent) => void
): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];

  if (!('onDidStartTerminalShellExecution' in vscode.window)) {
    // Shell integration API not available in this VS Code version.
    return vscode.Disposable.from(...disposables);
  }

  const startDisposable = (vscode.window as any).onDidStartTerminalShellExecution(
    async (event: any) => {
      try {
        const stream = event.execution.read();
        let buffer = '';

        for await (const chunk of stream) {
          buffer += chunk;
          // Cap buffer so we don't hold huge output in memory
          if (buffer.length > 20000) {
            buffer = buffer.slice(-20000);
          }
        }

        if (looksLikeError(buffer)) {
          const cwd = event.terminal?.shellIntegration?.cwd?.fsPath
            ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            ?? '';

          const bugEvent = createBugEvent({
            source: 'terminal',
            rawText: buffer,
            projectName: getProjectName(),
            cwd
          });

          onBug(bugEvent);
        }
      } catch (err) {
        console.error('[BugVault] terminalWatcher error:', err);
      }
    }
  );

  disposables.push(startDisposable);
  return vscode.Disposable.from(...disposables);
}