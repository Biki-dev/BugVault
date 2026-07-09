import * as vscode from 'vscode';
import { createBugEvent, BugEvent } from './bugEvent';
import { getProjectName } from '../utils/config';

export function startTaskWatcher(
  onBug: (event: BugEvent) => void,
  onTaskExit: (taskName: string, exitCode: number | undefined) => void
): vscode.Disposable {
  return vscode.tasks.onDidEndTaskProcess(e => {
    const exitCode = e.exitCode;
    const taskName = e.execution.task.name;

    onTaskExit(taskName, exitCode);

    if (exitCode !== undefined && exitCode !== 0) {
      const bugEvent = createBugEvent({
        source: 'task',
        rawText: `Task "${taskName}" failed with exit code ${exitCode}`,
        projectName: getProjectName(),
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
        taskName,
        exitCode
      });

      onBug(bugEvent);
    }
  });
}