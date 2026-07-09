import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';

export async function showRepeatedBugPopup(
  bugId: number,
  repo: BugRepository,
  matchedVia: 'fingerprint' | 'semantic',
  score?: number,
  fromShared?: boolean,
  teamFix?: string
): Promise<void> {
  const bug = repo.findById(bugId);
  if (!bug) return;

  const sourceLabel = fromShared ? ' [Team Memory]' : '';
  const confidenceNote = matchedVia === 'semantic' && score
    ? ` (similar bug, ${Math.round(score * 100)}% match${sourceLabel})`
    : sourceLabel;

  // Prefer the team fix if it exists and differs from local
  const effectiveFix = teamFix || bug.fix;

  if (!effectiveFix) {
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

  const fixOrigin = (fromShared && teamFix) ? '👥 Team fix' : 'Last fix';
  const choice = await vscode.window.showWarningMessage(
    `Bug repeated${confidenceNote} — ${fixOrigin}: "${effectiveFix}"`,
    'View Details',
    'Dismiss'
  );

  if (choice === 'View Details') {
    vscode.commands.executeCommand('bugvault.showRelatedBugs', bug.id);
  }
}