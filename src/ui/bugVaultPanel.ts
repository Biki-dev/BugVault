import * as vscode from 'vscode';
import { BugRepository, BugRecord } from '../db/bugRepository';

class BugItem extends vscode.TreeItem {
  constructor(public bug: BugRecord) {
    super(
      bug.error_message.slice(0, 60),
      vscode.TreeItemCollapsibleState.None
    );

    const isSolved = bug.status === 'solved';

    this.description = isSolved
      ? `✓ solved · ${bug.occurrence_count}x`
      : `● active · ${bug.occurrence_count}x`;

    this.tooltip = new vscode.MarkdownString(
      `**Bug #${bug.id}** — ${bug.project_name}\n\n` +
      `\`\`\`\n${bug.error_message.slice(0, 200)}\n\`\`\`\n\n` +
      (bug.fix ? `**Fix:** ${bug.fix.slice(0, 150)}` : '_No fix saved yet_')
    );

    this.iconPath = new vscode.ThemeIcon(
      isSolved ? 'pass-filled' : 'bug',
      isSolved
        ? new vscode.ThemeColor('testing.iconPassed')
        : new vscode.ThemeColor('list.errorForeground')
    );

    this.command = {
      command: 'bugvault.showRelatedBugs',
      title: 'View Bug Details',
      arguments: [bug.id]
    };

    // Context value lets us show command in right-click menu
    this.contextValue = isSolved ? 'bugvault.solvedBug' : 'bugvault.activeBug';
  }
}

export class BugVaultTreeProvider implements vscode.TreeDataProvider<BugItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _onlyActive = false;

  constructor(private repo: BugRepository) {}

  showOnlyActive(value: boolean): void {
    this._onlyActive = value;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BugItem): vscode.TreeItem {
    return element;
  }

  getChildren(): BugItem[] {
    const bugs = this._onlyActive
      ? this.repo.listActive()
      : this.repo.listRecent(50);
    return bugs.map(bug => new BugItem(bug));
  }
}