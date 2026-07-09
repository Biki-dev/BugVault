import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';
import { StatsRepository } from '../db/statsRepository';
import { isSharedMemoryEnabled } from '../utils/config';

export class StatusBarIndicator {
  private bugItem: vscode.StatusBarItem;
  private timeSavedItem: vscode.StatusBarItem;

  constructor(
    private repo: BugRepository,
    private stats: StatsRepository
  ) {
    this.bugItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.bugItem.command = 'bugvault.openPanel';
    this.bugItem.show();

    this.timeSavedItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.timeSavedItem.command = 'bugvault.openPanel';
    this.timeSavedItem.show();

    this.refresh();
  }

  refresh(): void {
    const activeCount = this.repo.listActive().length;
    const sharedIcon = isSharedMemoryEnabled() ? ' 👥' : '';
    this.bugItem.text = `$(bug) BugVault: ${activeCount}${sharedIcon}`;
    this.bugItem.tooltip = isSharedMemoryEnabled()
      ? `${activeCount} active bug(s) tracked — Team Memory ON — click to open BugVault panel`
      : `${activeCount} active bug(s) tracked — click to open BugVault panel`;

    const totalMinutes = this.stats.getTotalMinutesSaved();
    const repeats = this.stats.getRepeatsCaught();
    const display = this.formatTime(totalMinutes);
    this.timeSavedItem.text = `$(watch) Saved ~${display}`;
    this.timeSavedItem.tooltip = `BugVault has caught ${repeats} repeat bug(s), saving you ~${display} of debugging time`;
  }

  private formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = (minutes / 60).toFixed(1);
    return `${hours} hrs`;
  }

  dispose(): void {
    this.bugItem.dispose();
    this.timeSavedItem.dispose();
  }
}