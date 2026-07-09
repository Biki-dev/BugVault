# BugVault AI

BugVault AI is an automatic bug memory system for VS Code that acts as your personal — and team — debugging assistant. It actively monitors your workflow, detects errors, and remembers their solutions so you never solve the same bug twice.

Whether you're dealing with terminal crashes, compilation errors, or code diagnostics, BugVault AI captures the context, uses AI to generate and store solutions, and now shares that knowledge across your entire team through Shared Memory Mode.

---

## 🌟 Features

### Core
- **Automatic Error Capture** — Seamlessly monitors your terminal, code diagnostics (Problems tab), and build tasks. Errors are fingerprinted and stored silently.
- **AI-Powered Solutions** — When you mark a bug as solved, BugVault uses VS Code's built-in Language Model API (Copilot, etc.) to generate a rich fix description. The AI uses the full error context: active file content, file path, project path, and your latest `git diff HEAD` — giving it the actual code changes you made, not just the error message.
- **Semantic Memory Matching** — Powered by SQLite + Supermemory, BugVault semantically matches new errors against known ones. Even if the exact error text differs slightly, it recognises the same underlying bug.
- **Granular Task Bug Tracking** — Build task failures are tracked by both task name *and* exit code. A task that fails for a new reason (different exit code) is tracked as a fresh bug — preventing stale fix suggestions from a previous, unrelated failure.

### UI & Feedback
- **Inline CodeLens Annotations** — When a repeated bug is detected on a specific line, a `$(bug) Seen Nx · fix: "..."` CodeLens hint appears directly above that line in your editor. It disappears automatically once the bug is resolved.
- **AI Confidence Bar** — For semantic (AI-matched) bugs, a rich WebView card slides in beside your editor showing an animated similarity bar (`0 → N%`), colour-coded by confidence level (green ≥ 80%, amber 55–79%, red < 55%), with the bug's full context and the stored fix.
- **Time Saved Counter** — Every time BugVault catches a repeated bug it logs an estimated 15 minutes saved. The status bar shows a live running total: `$(watch) Saved ~3.5 hrs`.
- **BugVault Sidebar** — Browse all recent bugs in a dedicated VS Code tree panel.
- **Rich Bug Detail View** — Inspect individual bugs: project, branch, commit hash, error message, root cause, fix, and dev notes.
- **Editable Solutions** — Manually edit any AI-generated fix to add personal notes at any time.

### Team / Shared Memory Mode *(New)*
- **Shared Knowledge Base** — Enable Shared Memory Mode to point BugVault at a central Supermemory instance shared by your entire team. Every developer automatically benefits from fixes already discovered by a teammate.
- **Team Fix Attribution** — When a fix originates from the shared vault, popups are labelled `👥 Team fix` and the confidence card shows a `👥 Team Memory` badge so you know it came from your colleagues, not your local history.
- **Seamless Sync on Solve** — When you mark a bug as solved, the fix is pushed to the shared (or personal) Supermemory automatically. Bugs captured before shared mode was enabled are back-filled into the shared vault the first time they're resolved.
- **Status Bar Indicator** — When Shared Memory Mode is active, the bug count status bar item shows a `👥` icon and the tooltip reads "Team Memory ON".

---

## 🚀 Getting Started

### Prerequisites

1. **VS Code 1.90+** — Required for the built-in Language Model API.
2. **Node.js & npm** — Required to build the extension.
3. **Supermemory Local** — The extension relies on a Supermemory instance for semantic search. Run one locally or point to a shared server.
4. **AI Access** — VS Code Copilot or another provider that exposes language models via the VS Code LM API.

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
   By default, BugVault connects to `http://localhost:6767`. Start your local instance or configure a different URL in settings.

4. **Build the Extension**
   ```bash
   npm run compile
   ```

5. **Run the Extension**
   Open the project in VS Code and press `F5` to launch the Extension Development Host.

> To install permanently, package with `vsce package` and install the `.vsix` file.

---

## ⚙️ Configuration

Open VS Code Settings (`Ctrl+,` / `Cmd+,`) and search for `BugVault`.

| Setting | Default | Description |
|---------|---------|-------------|
| `bugvault.supermemoryUrl` | `http://localhost:6767` | URL of your **personal** local Supermemory instance. |
| `bugvault.similarityThreshold` | `0.82` | Minimum semantic similarity (0–1) to treat a new bug as a repeat. |
| `bugvault.enableAutoCapture` | `true` | Toggle automatic capture of terminal, diagnostic, and build errors. |
| `bugvault.sharedMemory.enabled` | `false` | **Enable Team/Shared Memory Mode.** When `true`, BugVault connects to the shared Supermemory URL for all search and storage operations. |
| `bugvault.sharedMemory.url` | `http://localhost:6767` | URL of the **shared team** Supermemory instance. Override this with your team's deployed endpoint. |

### Setting Up Shared Memory Mode

1. Deploy a Supermemory instance accessible to all developers (e.g. on a shared server or cloud VM).
2. Open VS Code Settings and set `bugvault.sharedMemory.url` to your server URL.
3. Toggle `bugvault.sharedMemory.enabled` to `true`.
4. Reload the window — BugVault will now search the shared vault first and push all new fixes there.

> **Conflict resolution**: Last write wins. If two developers solve the same bug concurrently, the most recent fix is stored.

---

## 📖 Day-to-Day Workflow

1. **Code Normally** — BugVault captures errors silently in the background.
2. **See the Gutter Hint** — If a bug has been seen before, a CodeLens annotation appears above the failing line with the occurrence count and fix preview.
3. **Get the Confidence Card** — For AI-matched bugs, a WebView card slides in with an animated similarity bar and the stored fix (labelled `👥 Team Fix` if it came from shared memory).
4. **Mark as Solved** — Right-click in the sidebar or open the detail view and click **Mark as Solved**. BugVault generates an AI fix using your full code context and git diff, then syncs it to memory (personal or shared).
5. **Edit the Fix** — Click **Edit Fix** at any time to refine the stored solution.
6. **Watch the Savings Grow** — Keep an eye on the `$(watch) Saved ~X hrs` status bar item as BugVault catches more repeats.

---

## 🛠️ Commands

Access via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `BugVault: Open Bug Vault Panel` | Opens the sidebar panel. |
| `BugVault: Mark as Solved` | Marks the bug as solved and triggers AI solution generation + memory sync. |
| `BugVault: Edit Fix` | Opens an input box to manually edit the stored fix. |
| `BugVault: Show Related Bugs` | Opens the detailed webview for a bug. |

---

## 🗂️ Architecture Overview

```
BugVault AI
├── capture/          # Error sources: terminal, diagnostics, tasks
│   ├── bugEvent.ts       — Event type (now carries taskName + exitCode)
│   ├── terminalWatcher   — Watches terminal output
│   ├── diagnosticsWatcher— Watches Problems panel
│   └── taskWatcher       — Watches VS Code tasks (granular exit code tracking)
├── db/
│   ├── bugRepository.ts  — SQLite CRUD for bugs (+ updateMemoryId)
│   └── statsRepository.ts— SQLite counter for time-saved stats
├── memory/
│   ├── supermemoryClient — HTTP client for Supermemory API
│   ├── matchEngine.ts    — Fingerprint + semantic search (shared-first)
│   └── memoryTypes.ts    — Shared types (MatchOutcome with fromShared/teamFix)
├── lifecycle/
│   ├── bugTracker.ts     — Tracks active bugs; resolves on exit-code change
│   └── fixCapture.ts     — Prompts fix capture on resolution
├── ui/
│   ├── bugCodeLens.ts    — Inline gutter CodeLens provider
│   ├── confidencePopup.ts— WebView confidence bar card (+ Team Memory badge)
│   ├── popupNotifier.ts  — Toast notification (+ Team Fix label)
│   ├── statusBarIndicator— Bug count + time saved + shared mode indicator
│   ├── bugDetailView.ts  — Detailed bug webview
│   └── bugVaultPanel.ts  — Sidebar tree view
├── commands/
│   └── registerCommands  — markSolved, saveFix (shared memory-aware sync)
└── utils/
    └── config.ts         — All settings getters incl. shared memory helpers
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

## 📝 License

This project is licensed under the MIT License.