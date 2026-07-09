# BugVault AI - Manual Testing Checklist

Follow these steps to manually verify that the entire BugVault AI workflow is functioning properly. 

### 1. Environment & Initialization Setup
- [ ] Ensure Supermemory Local is running on your machine (usually `http://localhost:6767`).
- [ ] Run `npm run compile` to build the extension.
- [ ] Press `F5` to open the Extension Development Host window in VS Code.
- [ ] Open a test project or folder in the Development Host window.
- [ ] Verify the **BugVault panel** appears in the VS Code Activity Bar (sidebar).

### 2. Auto-Capture Error Detection
- [ ] Create a deliberate error in your test project (e.g., a syntax error in a TypeScript/JavaScript file, or a failing build command in the terminal).
- [ ] **Diagnostics Test**: Save a file with a syntax error. Verify that the BugVault sidebar updates to show a new active bug.
- [ ] **Terminal Test**: Run a command that fails (e.g., `npm run missing-script`) in the integrated terminal. Verify that the BugVault sidebar captures it as an active bug.

### 3. The New "Mark as Solved" & AI Feature
- [ ] Click on the newly captured bug in the BugVault sidebar to open the **Bug Details Webview**.
- [ ] Click the **"Mark as Solved"** button.
- [ ] **Verify Notification**: Check the bottom right corner of VS Code for a progress notification that says *"BugVault: Auto-generating solution with AI..."*.
- [ ] **Verify AI Response**: Once completed, a success message should appear. Re-open or check the Bug Details Webview to ensure the `Fix` field is now populated with an AI-generated solution.

### 4. "Edit Fix" Functionality
- [ ] In the Bug Details Webview, click the **"Edit Fix"** button (which should be visible next to "Show Related").
- [ ] An input prompt should appear at the top of the VS Code window, **pre-filled** with the AI-generated solution.
- [ ] Modify the text (e.g., add "My custom note: ...") and press `Enter` to save.
- [ ] Refresh or re-open the Bug Details Webview and verify that your edited text is now displayed in the `Fix` field.

### 5. Semantic Memory & Repeat Bug Notification
- [ ] Delete or comment out the code that caused the first error, and clear your terminal.
- [ ] Wait a few seconds, then **re-introduce the exact same error** (or a very similar one) and trigger it again.
- [ ] **Verify Popup**: Check the bottom right corner of VS Code. A BugVault popup should instantly appear warning you that you've seen this bug before.
- [ ] **Verify Popup Content**: The popup should display the solution/fix that you edited and saved in Step 4.

### 6. Configuration Check (Optional)
- [ ] Open VS Code Settings (`Ctrl+,`), search for `bugvault.enableAutoCapture`, and uncheck it.
- [ ] Trigger an error in the terminal. Verify that the error is **not** captured in the BugVault sidebar.
- [ ] Re-enable the setting to restore normal functionality.
