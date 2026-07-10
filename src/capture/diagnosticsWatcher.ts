import * as vscode from 'vscode';
import { createBugEvent, BugEvent } from './bugEvent';
import { getProjectName } from '../utils/config';

const DEBOUNCE_MS = 2000;

export function startDiagnosticsWatcher(
  onBug: (event: BugEvent) => void
): vscode.Disposable {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  const listener = vscode.languages.onDidChangeDiagnostics(e => {
    for (const uri of e.uris) {
      const uriString = uri.toString();

      if (timeouts.has(uriString)) {
        clearTimeout(timeouts.get(uriString)!);
      }

      const timeout = setTimeout(() => {
        timeouts.delete(uriString);

        const diagnostics = vscode.languages.getDiagnostics(uri)
          .filter(d => d.severity === vscode.DiagnosticSeverity.Error)
          // Sort by range so we process the topmost error first
          .sort((a, b) => a.range.start.line - b.range.start.line)
          // Only process the first error per file to avoid spam on cascading errors
          .slice(0, 1);

        if (diagnostics.length === 0) return;

        for (const diag of diagnostics) {
          const bugEvent = createBugEvent({
            source: 'diagnostics',
            rawText: diag.message,
            filePath: uri.fsPath,
            line: diag.range.start.line + 1,
            language: vscode.workspace.textDocuments
              .find(doc => doc.uri.toString() === uriString)?.languageId,
            projectName: getProjectName(),
            cwd: vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? ''
          });

          onBug(bugEvent);
        }
      }, DEBOUNCE_MS);

      timeouts.set(uriString, timeout);
    }
  });

  return {
    dispose: () => {
      listener.dispose();
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      timeouts.clear();
    }
  };
}