import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { SupermemoryClient } from '../memory/supermemoryClient';
import { isSharedMemoryEnabled } from '../utils/config';

export async function promptFixCapture(
  bugId: number,
  repo: BugRepository,
  personalSupermemory: SupermemoryClient,
  sharedSupermemory?: SupermemoryClient
): Promise<void> {
  const bug = repo.findById(bugId);
  // Skip if already solved (e.g. markSolved was called via AI)
  if (!bug || bug.status === 'solved') return;

  const choice = await vscode.window.showInformationMessage(
    `BugVault: Looks like a bug in "${bug.project_name}" was just resolved. Save the fix for next time?`,
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

  // Sync to the active memory client (shared if enabled, personal otherwise)
  const client = (isSharedMemoryEnabled() && sharedSupermemory)
    ? sharedSupermemory
    : personalSupermemory;

  if (bug.memory_id) {
    try {
      await client.updateMemory(bug.memory_id, bug.error_message, {
        project: bug.project_name,
        fix,
        rootCause: rootCause || ''
      });
    } catch (err) {
      // Non-fatal: fix is stored locally, memory sync failed
      console.error('BugVault: failed to sync fix to memory', err);
    }
  }

  const memLabel = (isSharedMemoryEnabled() && sharedSupermemory)
    ? ' and synced to Team Memory'
    : '';
  vscode.window.showInformationMessage(`BugVault: Fix saved${memLabel}.`);
}