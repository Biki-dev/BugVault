import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';

export class StatusBarIndicator {
  private item: vscode.StatusBarItem;

  constructor(private repo: BugRepository) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'bugvault.openPanel';
    this.item.show();
    this.refresh();
  }

  refresh(): void {
    const activeCount = this.repo.listActive().length;
    this.item.text = `$(bug) BugVault: ${activeCount}`;
    this.item.tooltip = `${activeCount} active bug(s) tracked`;
  }

  dispose(): void {
    this.item.dispose();
  }
}