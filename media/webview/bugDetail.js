(function () {
  const vscode = acquireVsCodeApi();

  const markSolvedBtn = document.getElementById('mark-solved-btn');
  const saveFixBtn = document.getElementById('save-fix-btn');
  const showRelatedBtn = document.getElementById('show-related-btn');

  if (markSolvedBtn) {
    markSolvedBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'markSolved' });
    });
  }

  if (saveFixBtn) {
    saveFixBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'saveFix' });
    });
  }

  if (showRelatedBtn) {
    showRelatedBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'showRelated' });
    });
  }

  // Reflect live updates pushed from the extension (e.g. after markSolved
  // completes elsewhere and this panel should refresh without a full reload)
  window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'updateStatus') {
      const statusEl = document.querySelector('.status');
      if (statusEl) {
        statusEl.textContent = message.status.toUpperCase();
        statusEl.className = 'status ' + message.status;
      }
      if (markSolvedBtn && message.status === 'solved') {
        markSolvedBtn.disabled = true;
        markSolvedBtn.textContent = 'Solved';
      }
    }
  });
})();