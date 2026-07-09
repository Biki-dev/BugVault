import * as vscode from 'vscode';
import * as path from 'path';

export function getConfig() {
  return vscode.workspace.getConfiguration('bugvault');
}

export function getSupermemoryUrl(): string {
  return getConfig().get<string>('supermemoryUrl', 'http://localhost:6767');
}

export function getSimilarityThreshold(): number {
  return getConfig().get<number>('similarityThreshold', 0.82);
}

export function isAutoCaptureEnabled(): boolean {
  return getConfig().get<boolean>('enableAutoCapture', true);
}

export function getProjectName(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? path.basename(folder.uri.fsPath) : 'unknown-project';
}