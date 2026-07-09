# BugVault AI

BugVault AI is an automatic bug memory system for VS Code that acts as your personal debugging assistant. It actively monitors your workflow, detects errors, and remembers their solutions so you never have to solve the same bug twice. 

Whether you're dealing with terminal crashes, compilation errors, or code diagnostics, BugVault AI captures the context and uses AI to automatically generate and store solutions. The next time the same error occurs, BugVault warns you instantly and provides the fix you used last time.

## 🌟 Features

- **Automatic Error Capture**: Seamlessly monitors your terminal, code diagnostics (Problems tab), and build tasks. When an error appears, it's fingerprinted and stored silently.
- **AI-Powered Solutions**: Once you resolve an issue and mark it as "Solved", BugVault uses built-in VS Code AI Language Models to instantly generate a concise explanation of the fix and saves it for you.
- **Semantic Memory Matching**: Powered by SQLite and Supermemory Local, BugVault analyzes new errors semantically. If a similar error occurs in the future, you get an immediate popup with the exact fix you used previously.
- **BugVault Sidebar**: A dedicated VS Code sidebar panel allows you to browse all your recent bugs and review their history.
- **Rich Bug Details**: Inspect individual bugs in a dedicated webview, showing the project branch, commit hash, exact error message, and the AI-generated fix.
- **Editable Solutions**: Not happy with the AI's explanation? You can edit the fix at any time to add your own personal dev notes.

---

## 🚀 Getting Started

### Prerequisites

To run BugVault AI, you need the following dependencies installed on your system:

1. **VS Code 1.90+**: Required for the built-in Language Model API (`vscode.lm`) used for AI generation.
2. **Node.js & npm**: Required to build the extension.
3. **Supermemory Local**: The extension relies on a local instance of Supermemory for semantic search and matching.
4. **AI Access**: Access to VS Code Copilot or another provider that exposes language models to the VS Code API.

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd BugVault
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Supermemory Local**
   Ensure your local instance of Supermemory is running. By default, BugVault expects it to be running at `http://localhost:6767`. 

4. **Build the Extension**
   ```bash
   npm run compile
   ```

5. **Run the Extension**
   Open the project in VS Code and press `F5` to launch the Extension Development Host.

*(To install it permanently in your VS Code, you can package the extension using `vsce package` and install the resulting `.vsix` file.)*

---

## ⚙️ Configuration

You can customize BugVault's behavior through VS Code Settings (`Ctrl+,` or `Cmd+,`) by searching for `BugVault`.

| Setting | Default | Description |
|---------|---------|-------------|
| `bugvault.supermemoryUrl` | `http://localhost:6767` | URL of the local Supermemory instance. Change this if your instance runs on a different port. |
| `bugvault.similarityThreshold` | `0.82` | Minimum semantic similarity score (0.0 to 1.0) required to treat a new bug as a repeat of an old one. |
| `bugvault.enableAutoCapture` | `true` | Toggle the automatic capture of terminal, diagnostic, and build errors. |

---

## 📖 Day-to-Day Workflow Guide

Using BugVault AI in your daily development is designed to be invisible until you need it.

1. **Code Normally**: Just write code. If you encounter an error in the terminal, build tasks, or diagnostics, BugVault will silently capture it in the background.
2. **Review Recent Bugs**: Open the **BugVault panel** in the VS Code Activity Bar (the sidebar) to see a tree view of your recently captured errors.
3. **Mark as Solved**: Once you've fixed the error in your code, right-click the bug in the sidebar (or open its detail view) and select **Mark as Solved**. 
4. **AI Auto-Generation**: BugVault will show a progress notification and automatically ask the AI to generate a fix description based on the error context. It will save this solution into your local vault.
5. **Edit the Fix**: If you want to add more context to the AI's explanation, open the bug's detail view and click **Edit Fix** to manually tweak the stored solution.
6. **Never Repeat Work**: If you ever run into the same (or a semantically similar) error weeks or months later, BugVault will instantly pop up a notification with the stored fix, saving you hours of repetitive debugging!

---

## 🛠️ Commands

You can access these commands via the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **BugVault: Open Bug Vault Panel**: Opens the sidebar view.
- **BugVault: Mark as Solved**: Marks the active bug as solved and triggers the AI solution generation.
- **BugVault: Edit Fix**: Opens an input box to edit the stored fix for a bug.
- **BugVault: Show Related Bugs**: Opens the detailed webview for a bug.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request if you want to improve the extension.

## 📝 License

This project is licensed under the MIT License.