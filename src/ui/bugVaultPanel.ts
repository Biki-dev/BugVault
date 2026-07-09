import * as vscode from 'vscode';
import { BugRepository, BugRecord } from '../db/bugRepository';

class BugItem extends vscode.TreeItem {
  constructor(public bug: BugRecord) {
    super(
      bug.error_message.slice(0, 60),
      vscode.TreeItemCollapsibleState.None
    );
    this.description = `${bug.status} · seen ${bug.occurrence_count}x`;
    this.tooltip = bug.error_message;
    this.iconPath = new vscode.ThemeIcon(
      bug.status === 'solved' ? 'check' : 'warning'
    );
    this.command = {
      command: 'bugvault.showRelatedBugs',
      title: 'View Bug',
      arguments: [bug.id]
    };
  }
}

export class BugVaultTreeProvider implements vscode.TreeDataProvider<BugItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private repo: BugRepository) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BugItem): vscode.TreeItem {
    return element;
  }

  getChildren(): BugItem[] {
    return this.repo.listRecent(30).map(bug => new BugItem(bug));
  }
}