import * as vscode from 'vscode';
import { BugRepository, BugRecord } from '../db/bugRepository';
import { SupermemoryClient } from '../memory/supermemoryClient';
import { showBugDetail } from '../ui/bugDetailView';
import { BugVaultTreeProvider } from '../ui/bugVaultPanel';
import { isSharedMemoryEnabled } from '../utils/config';
import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

async function generateSolutionWithAI(bug: BugRecord): Promise<string> {
  try {
    const models = await vscode.lm.selectChatModels();
    if (models && models.length > 0) {
      const model = models[0];

      let contextStr = `Error Message:\n${bug.error_message}\n\n`;

      if (bug.file_path) {
        contextStr += `File Path: ${bug.file_path}\n`;
      }

      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        contextStr += `Project: ${vscode.workspace.workspaceFolders[0].uri.fsPath}\n`;
      }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        contextStr += `\nActive File: ${editor.document.fileName}\n`;
        const code = editor.document.getText();
        if (code) {
          contextStr += `\nFile Content (first 3000 chars):\n${code.substring(0, 3000)}\n`;
        }
      }

      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        try {
          const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
          const { stdout } = await exec('git diff HEAD', { cwd, timeout: 5000 });
          if (stdout && stdout.trim().length > 0) {
            contextStr += `\nRecent Git Changes (likely the fix):\n${stdout.substring(0, 3000)}\n`;
          }
        } catch {
          // git not available or not a repo — that's fine
        }
      }

      const prompt = `You are a debugging assistant. Provide a concise, actionable fix for this bug. Focus on what changed and why. Be specific.

${contextStr}

Respond in 1-3 short paragraphs. No markdown headers.`;

      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      let solution = '';
      for await (const chunk of response.text) {
        solution += chunk;
      }
      return solution.trim() || 'AI returned an empty response.';
    } else {
      return 'No AI model available. Install GitHub Copilot or another VS Code AI extension, then try again.';
    }
  } catch (error: any) {
    console.error('BugVault: AI generation failed:', error);
    return `AI generation failed: ${error.message ?? 'Unknown error'}`;
  }
}

export function registerCommands(
  context: vscode.ExtensionContext,
  repo: BugRepository,
  supermemory: SupermemoryClient,
  treeProvider: BugVaultTreeProvider,
  sharedSupermemory?: SupermemoryClient
): void {

  /**
   * Push a fix to the correct Supermemory endpoint.
   * Shared memory wins when enabled; falls back to personal.
   * If the bug has no memory_id yet, adds a new entry and back-fills it.
   */
  async function syncFixToMemory(bug: BugRecord, fix: string): Promise<void> {
    const client = (isSharedMemoryEnabled() && sharedSupermemory) ? sharedSupermemory : supermemory;
    try {
      if (bug.memory_id) {
        await client.updateMemory(bug.memory_id, bug.error_message, {
          project: bug.project_name,
          fix
        });
      } else {
        const newId = await client.addMemory(bug.error_message, {
          project: bug.project_name,
          fix
        });
        repo.updateMemoryId(bug.id, newId);
      }
    } catch (err) {
      console.error('BugVault: failed to sync fix to memory', err);
    }
  }

  context.subscriptions.push(
    // ── Mark as Solved with AI ───────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.markSolved', async (bugId: number) => {
      const bug = repo.findById(bugId);
      if (!bug) return;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '$(bug) BugVault: Generating AI solution…',
        cancellable: false
      }, async () => {
        const fix = await generateSolutionWithAI(bug);
        repo.markSolved(bugId, fix);
        await syncFixToMemory(bug, fix);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          isSharedMemoryEnabled()
            ? '$(check) BugVault: Bug solved — fix saved to Team Memory.'
            : '$(check) BugVault: Bug solved with AI-generated solution.'
        );
      });
    }),

    // ── Edit Fix ─────────────────────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.saveFix', async (bugId: number) => {
      const bug = repo.findById(bugId);
      if (!bug) return;

      const fix = await vscode.window.showInputBox({
        prompt: 'Edit fix description',
        value: bug.fix || '',
        placeHolder: 'Describe what fixed this bug…'
      });

      // undefined = user pressed Escape; empty string = user cleared it intentionally
      if (fix === undefined) return;
      if (fix.trim() === '') {
        vscode.window.showWarningMessage('BugVault: Fix description cannot be empty.');
        return;
      }

      repo.markSolved(bugId, fix.trim());
      await syncFixToMemory(bug, fix.trim());

      treeProvider.refresh();
      vscode.window.showInformationMessage(
        isSharedMemoryEnabled()
          ? '$(check) BugVault: Fix updated and synced to Team Memory.'
          : '$(check) BugVault: Fix updated successfully.'
      );
    }),

    // ── View Bug Details ──────────────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.showRelatedBugs', (bugId: number) => {
      showBugDetail(bugId, repo, context);
    }),

    // ── Open sidebar panel ────────────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.bugvault-sidebar');
    }),

    // ── Clear solved bugs from the list ──────────────────────────────────────
    vscode.commands.registerCommand('bugvault.clearSolved', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'BugVault: Remove all solved bugs from the recent list? (They remain in the database.)',
        { modal: true },
        'Clear Solved'
      );
      if (confirm !== 'Clear Solved') return;
      // The tree just re-queries; to "hide" solved, we just refresh —
      // the listRecent call already includes all bugs, so expose a filtered view
      treeProvider.showOnlyActive(true);
      treeProvider.refresh();
      vscode.window.showInformationMessage('BugVault: Solved bugs hidden from the panel.');
    }),

    // ── Export Bug Memory ───────────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.exportData', async () => {
      const defaultUri = vscode.Uri.file(
        vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
          ? vscode.workspace.workspaceFolders[0].uri.fsPath + '/bugvault-export.json'
          : 'bugvault-export.json'
      );

      const uri = await vscode.window.showSaveDialog({
        defaultUri,
        title: 'Export BugVault Data',
        filters: { 'JSON Files': ['json'] },
        saveLabel: 'Export'
      });
      if (!uri) return;

      try {
        let filePath = uri.fsPath;
        if (!filePath.toLowerCase().endsWith('.json')) {
          filePath += '.json';
        }
        const finalUri = vscode.Uri.file(filePath);

        const data = repo.exportAll();
        const content = new Uint8Array(Buffer.from(JSON.stringify(data, null, 2), 'utf-8'));
        await vscode.workspace.fs.writeFile(finalUri, content);
        vscode.window.showInformationMessage(`BugVault: Exported ${data.length} bugs successfully to ${filePath}.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`BugVault Export Failed: ${err.message}`);
      }
    }),

    // ── Import Bug Memory ───────────────────────────────────────────────────
    vscode.commands.registerCommand('bugvault.importData', async () => {
      const uris = await vscode.window.showOpenDialog({
        title: 'Import BugVault Data',
        canSelectMany: false,
        filters: { 'JSON Files': ['json'] },
        openLabel: 'Import'
      });
      if (!uris || uris.length === 0) return;

      try {
        const fileData = await vscode.workspace.fs.readFile(uris[0]);
        const jsonStr = Buffer.from(fileData).toString('utf-8');
        const data = JSON.parse(jsonStr);

        if (!Array.isArray(data)) {
          vscode.window.showErrorMessage('BugVault Import Failed: Invalid data format (expected an array).');
          return;
        }

        const result = repo.importData(data);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`BugVault: Imported ${result.imported} new bugs, updated ${result.updated}, skipped ${result.skipped} existing.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`BugVault Import Failed: ${err.message}`);
      }
    })
  );
}