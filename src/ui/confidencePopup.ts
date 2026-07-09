import * as vscode from 'vscode';
import { BugRecord } from '../db/bugRepository';

let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Show a rich WebView "confidence card" for a semantically-matched repeated bug.
 * Only one panel is open at a time; subsequent calls replace the content.
 */
export function showConfidencePopup(
  context: vscode.ExtensionContext,
  bug: BugRecord,
  score: number,
  fromShared = false,
  teamFix?: string
): void {
  const pct = Math.round(score * 100);

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside, true);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'bugvaultConfidence',
      'BugVault — Similar Bug Detected',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: false
      }
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });

    // Handle button clicks from the WebView
    currentPanel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'viewDetails') {
        vscode.commands.executeCommand('bugvault.showRelatedBugs', bug.id);
      }
      if (msg.command === 'dismiss') {
        currentPanel?.dispose();
      }
    }, undefined, context.subscriptions);
  }

  currentPanel.webview.html = buildHtml(bug, pct, fromShared, teamFix);
}

function buildHtml(bug: BugRecord, pct: number, fromShared = false, teamFix?: string): string {
  // Color: green ≥80, amber 55-79, red <55
  const barColor = pct >= 80 ? '#4ade80' : pct >= 55 ? '#fbbf24' : '#f87171';
  const badgeColor = pct >= 80 ? '#16a34a' : pct >= 55 ? '#d97706' : '#dc2626';
  const label = pct >= 80 ? 'High confidence' : pct >= 55 ? 'Moderate confidence' : 'Low confidence';

  const effectiveFix = teamFix || bug.fix;
  const fixOriginLabel = (fromShared && teamFix) ? '👥 Team Fix' : 'Last Fix';

  const teamBadgeHtml = fromShared
    ? `<span class="team-badge">👥 Team Memory</span>`
    : '';

  const fixHtml = effectiveFix
    ? `<div class="fix-box"><span class="fix-label">${fixOriginLabel}</span><p class="fix-text">${escHtml(effectiveFix)}</p></div>`
    : `<p class="no-fix">⚠ No fix was saved for this bug yet.</p>`;

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BugVault — Similar Bug</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      font-size: 13px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 24px 20px;
      min-height: 100vh;
    }

    .card {
      background: var(--vscode-sideBar-background, #1e1e2e);
      border: 1px solid var(--vscode-panel-border, #3c3c5c);
      border-radius: 10px;
      padding: 20px 22px;
      max-width: 520px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .icon {
      font-size: 20px;
      line-height: 1;
    }

    .title {
      font-size: 14px;
      font-weight: 700;
      color: var(--vscode-titleBar-activeForeground, #e2e8f0);
      flex: 1;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      background: ${badgeColor}22;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}55;
      white-space: nowrap;
    }

    .team-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 99px;
      background: #6366f122;
      color: #818cf8;
      border: 1px solid #6366f155;
      white-space: nowrap;
      margin-left: 6px;
    }

    /* ── Confidence bar ── */
    .confidence-section {
      margin-bottom: 18px;
    }

    .confidence-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }

    .confidence-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--vscode-descriptionForeground, #94a3b8);
    }

    .confidence-pct {
      font-size: 22px;
      font-weight: 800;
      color: ${barColor};
      line-height: 1;
    }

    .confidence-word {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      margin-left: 4px;
    }

    .bar-track {
      width: 100%;
      height: 8px;
      background: var(--vscode-scrollbarSlider-background, #2d2d44);
      border-radius: 99px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      width: 0%;
      border-radius: 99px;
      background: linear-gradient(90deg, ${barColor}99, ${barColor});
      transition: width 0.75s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 6px ${barColor}88;
    }

    /* ── Bug info ── */
    .meta {
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      margin-bottom: 12px;
    }

    .error-box {
      background: var(--vscode-inputValidation-errorBackground, #3c1a1a);
      border-left: 3px solid var(--vscode-inputValidation-errorBorder, #f87171);
      padding: 8px 10px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      line-height: 1.5;
      word-break: break-word;
      margin-bottom: 14px;
      color: var(--vscode-editor-foreground);
    }

    .fix-box {
      background: var(--vscode-editor-background, #0d1117);
      border: 1px solid var(--vscode-panel-border, #30363d);
      border-left: 3px solid ${barColor};
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 18px;
    }

    .fix-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${barColor};
      display: block;
      margin-bottom: 6px;
    }

    .fix-text {
      font-size: 12px;
      line-height: 1.6;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .no-fix {
      font-size: 12px;
      color: var(--vscode-editorWarning-foreground, #fbbf24);
      margin-bottom: 18px;
    }

    /* ── Actions ── */
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    button {
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
    }
    button:hover { opacity: 0.88; transform: translateY(-1px); }
    button:active { transform: translateY(0); }

    .btn-primary {
      background: var(--vscode-button-background, #0e7afe);
      color: var(--vscode-button-foreground, #fff);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #2d2d44);
      color: var(--vscode-button-secondaryForeground, #ccc);
    }

    .divider {
      border: none;
      border-top: 1px solid var(--vscode-panel-border, #3c3c5c);
      margin: 14px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="icon">🐛</span>
      <span class="title">Similar Bug Detected</span>
      <span class="badge">${label}</span>
      ${teamBadgeHtml}
    </div>

    <div class="confidence-section">
      <div class="confidence-header">
        <span class="confidence-label">AI Similarity Score</span>
        <span>
          <span class="confidence-pct">${pct}%</span>
          <span class="confidence-word">match</span>
        </span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" id="bar"></div>
      </div>
    </div>

    <p class="meta">
      Seen <strong>${bug.occurrence_count}</strong> time(s) · 
      Project: <strong>${escHtml(bug.project_name)}</strong>
      ${bug.file_path ? ` · <code>${escHtml(shortPath(bug.file_path))}</code>` : ''}
    </p>

    <div class="error-box">${escHtml(bug.error_message.substring(0, 300))}${bug.error_message.length > 300 ? '…' : ''}</div>

    <hr class="divider">

    ${fixHtml}

    <div class="actions">
      <button class="btn-secondary" onclick="dismiss()">Dismiss</button>
      <button class="btn-primary" onclick="viewDetails()">View Full Details</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Animate the bar after paint
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.getElementById('bar').style.width = '${pct}%';
      }, 60);
    });

    function viewDetails() { vscode.postMessage({ command: 'viewDetails' }); }
    function dismiss()     { vscode.postMessage({ command: 'dismiss' }); }
  </script>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortPath(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : p;
}
