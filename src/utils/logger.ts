import * as vscode from 'vscode';

let channel: vscode.OutputChannel | null = null;

export function getLogger(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('BugVault AI');
  }
  return channel;
}

export function log(message: string): void {
  const ts = new Date().toISOString();
  getLogger().appendLine(`[${ts}] ${message}`);
}

export function logError(message: string, err?: unknown): void {
  const ts = new Date().toISOString();
  getLogger().appendLine(`[${ts}] ERROR: ${message} ${err ? String(err) : ''}`);
}