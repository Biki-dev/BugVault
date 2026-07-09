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
        contextStr += `Project Path: ${vscode.workspace.workspaceFolders[0].uri.fsPath}\n`;
      }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        contextStr += `\nCurrently Active File: ${editor.document.fileName}\n`;
        const code = editor.document.getText();
        if (code) {
          contextStr += `\nCurrently Active File Content:\n${code.substring(0, 3000)}\n`;
        }
      }

      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        try {
          const cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
          const { stdout } = await exec('git diff HEAD', { cwd, timeout: 5000 });
          if (stdout && stdout.trim().length > 0) {
            contextStr += `\nRecent Git Changes (Potential Fix):\n${stdout.substring(0, 3000)}\n`;
          }
        } catch (e) {
          console.error('Failed to get git diff:', e);
        }
      }

      const prompt = `Please provide a concise solution for this bug based on the following context. Pay special attention to the Git Changes as they likely contain the user's actual fix:\n\n${contextStr}`;

      const messages = [
        vscode.LanguageModelChatMessage.User(prompt)
      ];
      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
      let solution = '';
      for await (const chunk of response.text) {
        solution += chunk;
      }
      return solution.trim() || 'AI returned an empty response.';
    } else {
      return 'No AI models available. Please ensure an AI extension (like GitHub Copilot) is installed and active.';
    }
  } catch (error: any) {
    console.error('AI generation failed:', error);
    return `AI generation failed: ${error.message || 'Unknown error'}`;
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
   * In shared mode: shared first, then fall back to personal.
   * If the bug has no memory_id yet, add a new entry and back-fill it.
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
        // Bug was captured before memory was available — add it now
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
    vscode.commands.registerCommand('bugvault.markSolved', async (bugId: number) => {
      const bug = repo.findById(bugId);
      if (!bug) return;

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'BugVault: Auto-generating solution with AI...',
        cancellable: false
      }, async () => {
        const fix = await generateSolutionWithAI(bug);
        repo.markSolved(bugId, fix);
        await syncFixToMemory(bug, fix);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          isSharedMemoryEnabled()
            ? 'BugVault: Bug marked as solved — fix saved to Team Memory.'
            : 'BugVault: Bug marked as solved with AI generated solution.'
        );
      });
    }),

    vscode.commands.registerCommand('bugvault.saveFix', async (bugId: number) => {
      const bug = repo.findById(bugId);
      if (!bug) return;

      const fix = await vscode.window.showInputBox({ 
        prompt: 'Edit Fix description', 
        value: bug.fix || ''
      });
      
      if (!fix) return;

      repo.markSolved(bugId, fix);
      await syncFixToMemory(bug, fix);

      treeProvider.refresh();
      vscode.window.showInformationMessage(
        isSharedMemoryEnabled()
          ? 'BugVault: Fix updated and synced to Team Memory.'
          : 'BugVault: Fix updated successfully.'
      );
    }),

    vscode.commands.registerCommand('bugvault.showRelatedBugs', (bugId: number) => {
      showBugDetail(bugId, repo, context);
    }),

    vscode.commands.registerCommand('bugvault.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.bugvault-sidebar');
    })
  );
}