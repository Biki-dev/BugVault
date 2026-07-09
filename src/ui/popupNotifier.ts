import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';

export async function showRepeatedBugPopup(
  bugId: number,
  repo: BugRepository,
  matchedVia: 'fingerprint' | 'semantic',
  score?: number
): Promise<void> {
  const bug = repo.findById(bugId);
  if (!bug) return;

  const confidenceNote = matchedVia === 'semantic' && score
    ? ` (similar bug, ${Math.round(score * 100)}% match)`
    : '';

  if (!bug.fix) {
    vscode.window.showWarningMessage(
      `Bug repeated${confidenceNote} — seen ${bug.occurrence_count} time(s) before, but no fix was saved last time.`,
      'View Bug'
    ).then(choice => {
      if (choice === 'View Bug') {
        vscode.commands.executeCommand('bugvault.showRelatedBugs', bug.id);
      }
    });
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    `Bug repeated${confidenceNote} — this is the fix you used last time: "${bug.fix}"`,
    'View Details',
    'Dismiss'
  );

  if (choice === 'View Details') {
    vscode.commands.executeCommand('bugvault.showRelatedBugs', bug.id);
  }
}