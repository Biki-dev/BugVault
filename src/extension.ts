import * as vscode from 'vscode';
import { getDatabase, closeDatabase } from './db/database';
import { BugRepository } from './db/bugRepository';
import { StatsRepository } from './db/statsRepository';
import { SupermemoryClient } from './memory/supermemoryClient';
import { MatchEngine } from './memory/matchEngine';
import { startTerminalWatcher } from './capture/terminalWatcher';
import { startDiagnosticsWatcher } from './capture/diagnosticsWatcher';
import { startTaskWatcher } from './capture/taskWatcher';
import { BugTracker } from './lifecycle/bugTracker';
import { promptFixCapture } from './lifecycle/fixCapture';
import { showRepeatedBugPopup } from './ui/popupNotifier';
import { showConfidencePopup } from './ui/confidencePopup';
import { BugVaultTreeProvider } from './ui/bugVaultPanel';
import { StatusBarIndicator } from './ui/statusBarIndicator';
import { BugCodeLensProvider } from './ui/bugCodeLens';
import { registerCommands } from './commands/registerCommands';
import { getSupermemoryUrl, getSimilarityThreshold, isAutoCaptureEnabled,
         isSharedMemoryEnabled, getSharedMemoryUrl } from './utils/config';
import { log, logError } from './utils/logger';
import { BugEvent } from './capture/bugEvent';

export function activate(context: vscode.ExtensionContext): void {
  log('BugVault AI activating...');

  const db = getDatabase(context.globalStorageUri.fsPath);
  const repo = new BugRepository(db);
  const stats = new StatsRepository(db);

  // Personal Supermemory (always instantiated)
  const supermemory = new SupermemoryClient(getSupermemoryUrl());

  // Shared/team Supermemory — only created when the feature is enabled.
  // Re-read the setting at event-handling time so toggling it mid-session works.
  const sharedSupermemory = isSharedMemoryEnabled()
    ? new SupermemoryClient(getSharedMemoryUrl())
    : undefined;

  const matchEngine = new MatchEngine(
    supermemory,
    repo,
    getSimilarityThreshold(),
    sharedSupermemory
  );

  const treeProvider = new BugVaultTreeProvider(repo);
  vscode.window.registerTreeDataProvider('bugvault.recentBugs', treeProvider);

  const codeLens = new BugCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: 'file' }, codeLens)
  );

  const statusBar = new StatusBarIndicator(repo, stats);
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  registerCommands(context, repo, supermemory, treeProvider, sharedSupermemory);

  const tracker = new BugTracker(repo, async bugId => {
    codeLens.removeLensForBug(bugId);   // clear gutter annotation on resolve
    await promptFixCapture(bugId, repo, supermemory, sharedSupermemory);
    treeProvider.refresh();
    statusBar.refresh();
  });

  async function handleBugEvent(event: BugEvent) {
    if (!isAutoCaptureEnabled()) return;

    try {
      const outcome = await matchEngine.processBugEvent(event);

      if (outcome.kind === 'repeated') {
        // --- Feature 4: Confidence bar WebView for semantic, plain toast for fingerprint ---
        if (outcome.via === 'semantic' && outcome.score !== undefined) {
          const bug = repo.findById(outcome.bugId);
          if (bug) showConfidencePopup(context, bug, outcome.score, outcome.fromShared, outcome.teamFix);
        } else {
          await showRepeatedBugPopup(outcome.bugId, repo, outcome.via, outcome.score,
            outcome.fromShared, outcome.teamFix);
        }

        tracker.registerActiveBug(outcome.bugId, event.filePath, event.taskName, event.exitCode);

        // --- Feature 1: CodeLens gutter hint ---
        const bug = repo.findById(outcome.bugId);
        if (bug && event.filePath && event.line !== undefined) {
          const uri = vscode.Uri.file(event.filePath);
          codeLens.addLens(uri, event.line, bug);
        }

        // --- Feature 2: Time-saved counter ---
        stats.recordRepeat();
        statusBar.refresh();
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