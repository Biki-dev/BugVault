import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { SupermemoryClient } from '../memory/supermemoryClient';

export async function promptFixCapture(
  bugId: number,
  repo: BugRepository,
  supermemory: SupermemoryClient
): Promise<void> {
  const bug = repo.findById(bugId);
  if (!bug || bug.status === 'solved') return;

  const choice = await vscode.window.showInformationMessage(
    `BugVault: Looks like a bug in ${bug.project_name} was just resolved. Save the fix for next time?`,
    'Save Fix',
    'Not Now'
  );

  if (choice !== 'Save Fix') return;

  const fix = await vscode.window.showInputBox({
    prompt: 'What fixed it? (stored so BugVault can show this next time this bug repeats)',
    placeHolder: 'e.g. Added null check before accessing user.profile'
  });

  if (!fix) return;

  const rootCause = await vscode.window.showInputBox({
    prompt: 'Root cause (optional)',
    placeHolder: 'e.g. user.profile was undefined on first load'
  });

  repo.markSolved(bugId, fix, rootCause || undefined);

  if (bug.memory_id) {
    await supermemory.updateMemory(bug.memory_id, bug.error_message, {
      project: bug.project_name,
      fix,
      rootCause: rootCause || ''
    });
  }

  vscode.window.showInformationMessage('BugVault: Fix saved.');
}