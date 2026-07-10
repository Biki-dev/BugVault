(function () {
  const vscode = acquireVsCodeApi();

  const markSolvedBtn = document.getElementById('mark-solved-btn');
  const saveFixBtn = document.getElementById('save-fix-btn');

  if (markSolvedBtn && !markSolvedBtn.disabled) {
    markSolvedBtn.addEventListener('click', () => {
      markSolvedBtn.disabled = true;
      markSolvedBtn.textContent = '⏳ Generating AI solution…';
      vscode.postMessage({ command: 'markSolved' });
    });
  }

  if (saveFixBtn) {
    saveFixBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'saveFix' });
    });
  }
})();