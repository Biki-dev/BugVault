import * as vscode from 'vscode';
import { BugRepository } from '../db/bugRepository';

// Track open panels per bug id so we don't open duplicates
const openPanels = new Map<number, vscode.WebviewPanel>();

export function showBugDetail(bugId: number, repo: BugRepository, context: vscode.ExtensionContext): void {
  const bug = repo.findById(bugId);
  if (!bug) {
    vscode.window.showErrorMessage('BugVault: Bug not found.');
    return;
  }

  // Re-use existing panel for the same bug
  const existing = openPanels.get(bugId);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Beside);
    // Refresh content in case status has changed
    existing.webview.html = renderHtml(bug, existing.webview, context);
    return;
  }

  let isDisposed = false;

  const panel = vscode.window.createWebviewPanel(
    'bugvaultDetail',
    `Bug #${bug.id} — ${bug.project_name}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ]
    }
  );

  openPanels.set(bugId, panel);
  panel.onDidDispose(() => {
    isDisposed = true;
    openPanels.delete(bugId);
  });

  panel.webview.html = renderHtml(bug, panel.webview, context);

  panel.webview.onDidReceiveMessage(message => {
    if (message.command === 'markSolved') {
      vscode.commands.executeCommand('bugvault.markSolved', bug.id).then(() => {
        const fresh = repo.findById(bugId);
        if (fresh && !isDisposed) {
          panel.webview.html = renderHtml(fresh, panel.webview, context);
        }
      });
    } else if (message.command === 'saveFix') {
      vscode.commands.executeCommand('bugvault.saveFix', bug.id).then(() => {
        const fresh = repo.findById(bugId);
        if (fresh && !isDisposed) {
          panel.webview.html = renderHtml(fresh, panel.webview, context);
        }
      });
    }
  }, undefined, context.subscriptions);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function renderHtml(bug: any, webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'bugDetail.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'bugDetail.js')
  );

  const isSolved = bug.status === 'solved';
  const statusClass = isSolved ? 'solved' : 'active';
  const statusLabel = isSolved ? '✓ SOLVED' : '● ACTIVE';
  const severityIcon = bug.severity === 'high' ? '🔴' : bug.severity === 'medium' ? '🟡' : '⚪';

  const metaItems = [
    bug.project_name ? `<span class="meta-chip">📁 ${escapeHtml(bug.project_name)}</span>` : '',
    bug.branch ? `<span class="meta-chip">⎇ ${escapeHtml(bug.branch)}</span>` : '',
    bug.commit_hash ? `<span class="meta-chip">⬡ ${escapeHtml(bug.commit_hash)}</span>` : '',
    bug.language ? `<span class="meta-chip">🔧 ${escapeHtml(bug.language)}</span>` : '',
    bug.os ? `<span class="meta-chip">💻 ${escapeHtml(bug.os)}</span>` : '',
  ].filter(Boolean).join('');

  const filePath = bug.file_path
    ? `<div class="field"><span class="label">File</span><code class="filepath">${escapeHtml(bug.file_path)}</code></div>`
    : '';

  const rootCause = bug.root_cause
    ? `<pre>${escapeHtml(bug.root_cause)}</pre>`
    : `<p class="empty-note">Not recorded</p>`;

  const fix = bug.fix
    ? `<pre class="fix-pre">${escapeHtml(bug.fix)}</pre>`
    : `<p class="empty-note">No fix saved yet — use the button below to add one.</p>`;

  const devNotes = bug.dev_notes
    ? `<pre>${escapeHtml(bug.dev_notes)}</pre>`
    : `<p class="empty-note">—</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
  <title>Bug #${bug.id} — BugVault</title>
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="bug-id">Bug #${bug.id}</div>
        <div class="bug-title">${escapeHtml(bug.error_message.slice(0, 80))}${bug.error_message.length > 80 ? '…' : ''}</div>
      </div>
      <div class="header-right">
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        <span class="occurrence-badge" title="Total times this bug was detected">
          ${bug.occurrence_count}× seen
        </span>
      </div>
    </div>

    <div class="meta-row">${metaItems}</div>

    <div class="timeline">
      <span class="timeline-item">First seen: <strong>${formatDate(bug.first_seen)}</strong></span>
      <span class="timeline-sep">→</span>
      <span class="timeline-item">Last seen: <strong>${formatDate(bug.last_seen)}</strong></span>
      ${isSolved ? `<span class="timeline-sep">→</span><span class="timeline-item solved-time">Solved: <strong>${formatDate(bug.solved_at)}</strong></span>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Error Message</div>
      <div class="error-block">
        <pre>${escapeHtml(bug.error_message)}</pre>
      </div>
    </div>

    ${filePath}

    <div class="section">
      <div class="section-title">Root Cause</div>
      ${rootCause}
    </div>

    <div class="section fix-section ${bug.fix ? 'has-fix' : ''}">
      <div class="section-title">Fix / Solution</div>
      ${fix}
    </div>

    <div class="section">
      <div class="section-title">Dev Notes</div>
      ${devNotes}
    </div>

    <div class="actions">
      <button id="mark-solved-btn" class="btn-primary" ${isSolved ? 'disabled' : ''}>
        ${isSolved ? '✓ Already Solved' : '🤖 Mark as Solved (AI)'}
      </button>
      <button id="save-fix-btn" class="btn-secondary">✏️ Edit Fix</button>
    </div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}