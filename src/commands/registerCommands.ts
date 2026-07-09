import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { SupermemoryClient } from '../memory/supermemoryClient';
import { showBugDetail } from '../ui/bugDetailView';
import { BugVaultTreeProvider } from '../ui/bugVaultPanel';

async function generateSolutionWithAI(bugErrorMessage: string): Promise<string> {
  try {
    const models = await vscode.lm.selectChatModels();
    if (models && models.length > 0) {
      const model = models[0];
      const messages = [
        vscode.LanguageModelChatMessage.User(`Please provide a concise solution for this error: ${bugErrorMessage}`)
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
  treeProvider: BugVaultTreeProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('bugvault.markSolved', async (bugId: number) => {
      const bug = repo.findById(bugId);
      if (!bug) return;

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'BugVault: Auto-generating solution with AI...',
        cancellable: false
      }, async () => {
        const fix = await generateSolutionWithAI(bug.error_message);
        repo.markSolved(bugId, fix);
        
        if (bug.memory_id) {
          await supermemory.updateMemory(bug.memory_id, bug.error_message, {
            project: bug.project_name,
            fix
          });
        }
        
        treeProvider.refresh();
        vscode.window.showInformationMessage('BugVault: Bug marked as solved with AI generated solution.');
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

      if (bug.memory_id) {
        await supermemory.updateMemory(bug.memory_id, bug.error_message, {
          project: bug.project_name,
          fix
        });
      }

      treeProvider.refresh();
      vscode.window.showInformationMessage('BugVault: Fix updated successfully.');
    }),

    vscode.commands.registerCommand('bugvault.showRelatedBugs', (bugId: number) => {
      showBugDetail(bugId, repo, context);
    }),

    vscode.commands.registerCommand('bugvault.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.bugvault-sidebar');
    })
  );
}