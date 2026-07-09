import * as vscode from 'vscode';
import { getDatabase, closeDatabase } from './db/database';
import { BugRepository } from './db/bugRepository';
import { SupermemoryClient } from './memory/supermemoryClient';
import { MatchEngine } from './memory/matchEngine';
import { startTerminalWatcher } from './capture/terminalWatcher';
import { startDiagnosticsWatcher } from './capture/diagnosticsWatcher';
import { startTaskWatcher } from './capture/taskWatcher';
import { BugTracker } from './lifecycle/bugTracker';
import { promptFixCapture } from './lifecycle/fixCapture';
import { showRepeatedBugPopup } from './ui/popupNotifier';
import { BugVaultTreeProvider } from './ui/bugVaultPanel';
import { StatusBarIndicator } from './ui/statusBarIndicator';
import { registerCommands } from './commands/registerCommands';
import { getSupermemoryUrl, getSimilarityThreshold, isAutoCaptureEnabled } from './utils/config';
import { log, logError } from './utils/logger';
import { BugEvent } from './capture/bugEvent';

export function activate(context: vscode.ExtensionContext): void {
  log('BugVault AI activating...');

  const db = getDatabase(context.globalStorageUri.fsPath);
  const repo = new BugRepository(db);
  const supermemory = new SupermemoryClient(getSupermemoryUrl());
  const matchEngine = new MatchEngine(supermemory, repo, getSimilarityThreshold());

  const treeProvider = new BugVaultTreeProvider(repo);
  vscode.window.registerTreeDataProvider('bugvault.recentBugs', treeProvider);

  const statusBar = new StatusBarIndicator(repo);
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  registerCommands(context, repo, supermemory, treeProvider);

  const tracker = new BugTracker(repo, async bugId => {
    await promptFixCapture(bugId, repo, supermemory);
    treeProvider.refresh();
    statusBar.refresh();
  });

  async function handleBugEvent(event: BugEvent) {
    if (!isAutoCaptureEnabled()) return;

    try {
      const outcome = await matchEngine.processBugEvent(event);

      if (outcome.kind === 'repeated') {
        await showRepeatedBugPopup(outcome.bugId, repo, outcome.via, outcome.score);
        tracker.registerActiveBug(outcome.bugId, event.filePath, event.taskName, event.exitCode);
      } else {
        // Newly stored bug — find it again so we can track it until solved.
        const recent = repo.listRecent(1)[0];
        if (recent) {
          tracker.registerActiveBug(recent.id, event.filePath, event.taskName, event.exitCode);
        }
      }

      treeProvider.refresh();
      statusBar.refresh();
    } catch (err) {
      logError('Failed to process bug event', err);
    }
  }

  context.subscriptions.push(startTerminalWatcher(handleBugEvent));
  context.subscriptions.push(startDiagnosticsWatcher(handleBugEvent));
  context.subscriptions.push(
    startTaskWatcher(handleBugEvent, (taskName, exitCode) => tracker.handleTaskExit(taskName, exitCode))
  );
  context.subscriptions.push(tracker.watchDiagnosticsClear());

  log('BugVault AI activated.');
}

export function deactivate(): void {
  closeDatabase();
}