import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';

export function showBugDetail(bugId: number, repo: BugRepository, context: vscode.ExtensionContext): void {
  const bug = repo.findById(bugId);
  if (!bug) {
    vscode.window.showErrorMessage('BugVault: Bug not found.');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'bugvaultDetail',
    `Bug #${bug.id} — ${bug.project_name}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = renderHtml(bug, panel.webview, context);

  panel.webview.onDidReceiveMessage(message => {
    if (message.command === 'markSolved') {
      vscode.commands.executeCommand('bugvault.markSolved', bug.id);
    } else if (message.command === 'saveFix') {
      vscode.commands.executeCommand('bugvault.saveFix', bug.id);
    } else if (message.command === 'showRelated') {
      vscode.commands.executeCommand('bugvault.showRelatedBugs', bug.id);
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderHtml(bug: any, webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'bugDetail.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'bugDetail.js')
  );

  return `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="header">
    <h2>Bug #${bug.id}</h2>
  </div>
  <div class="meta">
    <span class="status ${bug.status}">${bug.status.toUpperCase()}</span>
    &nbsp; seen ${bug.occurrence_count} time(s)
  </div>
  <div class="field"><div class="label">Project / Branch / Commit</div>
    ${escapeHtml(bug.project_name)} · ${escapeHtml(bug.branch ?? 'n/a')} · ${escapeHtml(bug.commit_hash ?? 'n/a')}
  </div>
  <div class="field"><div class="label">Error</div><pre>${escapeHtml(bug.error_message)}</pre></div>
  <div class="field"><div class="label">Root Cause</div><pre>${escapeHtml(bug.root_cause ?? 'Not recorded')}</pre></div>
  <div class="field"><div class="label">Fix</div><pre>${escapeHtml(bug.fix ?? 'Not recorded')}</pre></div>
  <div class="field"><div class="label">Dev Notes</div><pre>${escapeHtml(bug.dev_notes ?? '—')}</pre></div>

  <div class="actions">
    <button id="mark-solved-btn" ${bug.status === 'solved' ? 'disabled' : ''}>
      ${bug.status === 'solved' ? 'Solved' : 'Mark as Solved'}
    </button>
    <button id="save-fix-btn" class="secondary">Edit Fix</button>
    <button id="show-related-btn" class="secondary">Show Related</button>
  </div>

  <script src="${scriptUri}"></script>
</body>
</html>`;
}