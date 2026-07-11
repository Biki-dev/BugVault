# BugVault AI

<img src="banner.jpg" alt="BugVault AI Banner"/>

BugVault AI is an automatic bug memory system for VS Code designed to enhance developer productivity by intelligently detecting, remembering, and preventing recurring bugs. It serves as a personal and team-wide debugging assistant, ensuring that once a bug is solved, its solution is readily available when the same issue reappears.

This README is structured to provide relevant information for three key audiences:

1.  **Daily Users**: Learn how to integrate BugVault into your workflow, understand its features, and leverage its capabilities for efficient debugging.
2.  **Project Contributors**: Gain insights into the codebase structure, architecture, and contribution guidelines to help improve BugVault.
3.  **Hackathon Judges**: Understand the project's core innovation, technical implementation, and overall impact.

**Version 1.0.0** · [Changelog](#-changelog)

---

## 🌟 Features

BugVault AI offers a robust set of features designed to streamline the debugging process and foster a shared knowledge base within development teams.

### Core Functionality

*   **Automatic Error Capture**: BugVault seamlessly monitors your development environment, capturing errors from the terminal, VS Code's diagnostics (Problems tab), and build tasks. These errors are fingerprinted and stored silently in the background [1].
*   **AI-Powered Solutions**: When a bug is marked as solved, BugVault leverages VS Code's built-in Language Model API (e.g., Copilot) to generate a concise, actionable fix description. This description is contextually rich, drawing from your `git diff HEAD` and relevant code snippets [2].
*   **Semantic Memory Matching**: Powered by SQLite and Supermemory, BugVault employs semantic search to match new errors against previously solved ones, even if the exact error text differs. This ensures that similar issues are identified and addressed efficiently [3].
*   **Granular Task Bug Tracking**: Build task failures are tracked not only by task name but also by their exit codes. This prevents matching a task failing for a new reason against an outdated or unrelated fix.
*   **Resilient Memory Layer**: In scenarios where Supermemory (personal or shared) is unreachable, BugVault gracefully falls back to fingerprint-only detection, ensuring continuous operation of the capture pipeline.

### User Interface & Feedback

*   **Inline CodeLens Annotations**: A `$(bug) Seen Nx · fix: "..."` hint appears directly above a failing line when a repeated bug is detected, disappearing once resolved.
*   **AI Confidence Bar**: For semantically matched bugs, a WebView card displays an animated similarity bar (green ≥ 80%, amber 55–79%, red < 55%), providing full context and the stored fix. This data is always fresh, even on repeat opens.
*   **Time Saved Counter**: Every detected repeat bug logs approximately 15 minutes saved. A live total is displayed in the status bar: `$(watch) Saved ~3.5 hrs`.
*   **BugVault Sidebar**: A dedicated tree panel allows users to browse recent bugs, with color-coded icons (green = solved, red = active) and markdown tooltips. The **Clear Solved** option in the panel toolbar hides resolved bugs.
*   **Rich Bug Detail View**: Provides comprehensive details for each bug, including status badges, meta chips, a git timeline, and colored error/fix blocks. Panels are reused per bug ID and refresh automatically after actions.
*   **Editable Solutions**: Users can manually edit any AI-generated fix at any time. Empty input is treated as a validation warning, not a silent cancellation.

### Team / Shared Memory Mode

*   **Shared Knowledge Base**: BugVault can be configured to connect to a central Supermemory instance, allowing all developers on a team to benefit from fixes discovered by teammates.
*   **Team Fix Attribution**: Fixes originating from a shared vault are clearly labeled `👥 Team fix` in popups and `👥 Team Memory` on the confidence card.
*   **Seamless Sync on Solve**: Fixes are automatically pushed to the active Supermemory instance (shared or personal) when a bug is marked as solved, including back-filling bugs captured before shared mode was enabled.
*   **Status Bar Indicator**: A `👥` icon and 
"Team Memory ON" tooltip indicate when shared mode is active.

---

## 🚀 Getting Started

This section guides users through the process of setting up and using BugVault AI for their day-to-day development work.

### Prerequisites

To run BugVault AI, ensure you have the following installed:

1.  **VS Code 1.90+**: Required for the built-in Language Model API.
2.  **Node.js & npm**: Necessary for building and managing the extension.
3.  **Supermemory Local**: Used for semantic search. You can run a local instance (default `http://localhost:6767`) or connect to a shared server. BugVault can still function with fingerprint-only matching if Supermemory is unavailable [3].
4.  **AI Access**: A VS Code extension like GitHub Copilot or any other provider exposing language models via the VS Code LM API.

### Installation Options

#### Option A — Install the packaged VSIX

If you have the `.vsix` file, you can install it directly:

```bash
# From VS Code command palette:
# Extensions: Install from VSIX…
# Select: bugvault-ai-1.0.0.vsix

# Or via CLI:
code --install-extension ./bugvault-ai-1.0.0.vsix
```

#### Option B — Build from source

For developers and contributors, building from source is straightforward:

```bash
git clone https://github.com/biki-dev/BugVault.git
cd BugVault
npm install
npm run compile
```

After compilation, open the project in VS Code and press `F5` to launch the Extension Development Host. This will open a new VS Code window with the BugVault AI extension running.

---

## ⚙️ Configuration

BugVault AI offers several configuration options to tailor its behavior to your needs. Access these settings by opening VS Code Settings (`Ctrl+,` / `Cmd+,`) and searching for `BugVault`.

| Setting | Default | Description |
|---|---|---|
| `bugvault.supermemoryUrl` | `http://localhost:6767` | URL of your **personal** local Supermemory instance. |
| `bugvault.similarityThreshold` | `0.82` | Minimum semantic similarity score (0.5–1.0) to treat a new bug as a repeat. Higher values result in stricter matching. |
| `bugvault.enableAutoCapture` | `true` | Toggles automatic capture of terminal, diagnostic, and build errors. |
| `bugvault.sharedMemory.enabled` | `false` | Enables Team/Shared Memory Mode, allowing connection to a central Supermemory instance. |
| `bugvault.sharedMemory.url` | `http://localhost:6767` | URL of the **shared team** Supermemory instance used when `sharedMemory.enabled` is true. |

### Setting Up Shared Memory Mode

To enable collaborative debugging with Shared Memory Mode:

1.  Deploy a Supermemory instance that is accessible to all team members.
2.  In VS Code settings, set `bugvault.sharedMemory.url` to the URL of your deployed Supermemory server.
3.  Toggle `bugvault.sharedMemory.enabled` to `true`.
4.  Reload the VS Code window. BugVault will now prioritize searching the shared vault and push new fixes to it.

> **Conflict Resolution**: In shared memory mode, if two developers solve the same bug concurrently, the most recent fix is stored, adhering to a 
last-write-wins policy.

---

## 📖 Day-to-Day Workflow (For Daily Users)

BugVault AI integrates seamlessly into your daily coding routine. Here's how it enhances your debugging workflow:

1.  **Code Normally**: Continue writing and debugging your code as usual. BugVault operates silently in the background, capturing errors without interrupting your flow.
2.  **See the Gutter Hint**: If BugVault detects a known bug, an inline CodeLens annotation (e.g., `$(bug) Seen Nx · fix: "..."`) will appear directly above the failing line in your editor. This hint disappears once the bug is resolved.
3.  **Get the Confidence Card**: For bugs matched semantically, a WebView card will slide in, displaying an animated similarity bar and the stored fix. This card provides immediate context and can indicate if the fix is a `👥 Team Fix` from shared memory.
4.  **Mark as Solved**: Once you've resolved a bug, you can mark it as solved either from the sidebar or the detailed bug view. BugVault will then leverage AI to generate a fix description based on your code context and `git diff`, and synchronize it with your personal or shared memory [2].
5.  **Edit the Fix**: You have the flexibility to manually edit any AI-generated fix at any time to refine the stored solution.
6.  **Watch the Savings Grow**: BugVault tracks the time saved by preventing repeat bugs. You can monitor the `$(watch) Saved ~X hrs` counter in your status bar, a testament to your increased productivity.

---

## 🛠️ Commands

BugVault AI provides several commands accessible via the VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---|---|
| `BugVault: Open Bug Vault Panel` | Opens the dedicated BugVault sidebar panel, where you can browse recent bugs. |
| `BugVault: Mark as Solved` | Marks the currently active bug as solved, triggering AI solution generation and memory synchronization. |
| `BugVault: Edit Fix` | Allows you to manually edit the stored fix for a selected bug. |
| `BugVault: Show Related Bugs` | Opens the detailed webview for a specific bug, providing comprehensive information. |
| `BugVault: Clear Solved` | Hides all solved bugs from the sidebar panel, decluttering your view. |

---

## 🗂️ Architecture Overview (For Contributors and Hackathon Judges)

BugVault AI is built as a VS Code extension with a modular architecture, designed for extensibility and maintainability. The core components work in concert to provide a seamless bug tracking and resolution experience.

```
BugVault AI
├── capture/          # Error sources: terminal, diagnostics, tasks
│   ├── bugEvent.ts        — Defines the structure of a captured bug event, including taskName and exitCode.
│   ├── terminalWatcher     — Monitors and captures errors from terminal output.
│   ├── diagnosticsWatcher  — Watches the VS Code Problems panel, capturing error-severity diagnostics (capped at 1 error per file to prevent spam) [1].
│   └── taskWatcher         — Monitors VS Code build tasks, capturing failures and their exit codes.
├── db/
│   ├── bugRepository.ts    — Handles SQLite CRUD operations for bugs, including updating memory IDs and framework information.
│   └── statsRepository.ts  — Manages SQLite counters for tracking time saved by preventing repeat bugs.
├── memory/
│   ├── supermemoryClient   — HTTP client for interacting with the Supermemory API, both personal and shared instances.
│   ├── matchEngine.ts      — The core logic for bug detection, combining exact fingerprint matching with semantic search (prioritizing shared memory, then personal, with a fallback to fingerprint-only if Supermemory is unreachable) [3].
│   └── memoryTypes.ts      — Defines shared types, including `MatchOutcome` which indicates if a match is `fromShared` or a `teamFix`.
├── lifecycle/
│   ├── bugTracker.ts       — Tracks active bugs and resolves them based on exit code changes.
│   └── fixCapture.ts       — Manages the prompt flow for capturing fixes when a bug is resolved, handling both AI-generated and manual fixes, and syncing with Supermemory [4].
├── ui/
│   ├── bugCodeLens.ts       — Provides inline gutter CodeLens annotations for detected repeat bugs.
│   ├── confidencePopup.ts   — Implements the WebView for the confidence bar card, ensuring fresh data and displaying team memory badges.
│   ├── popupNotifier.ts     — Manages toast notifications, including labels for team fixes.
│   ├── statusBarIndicator   — Displays the bug count, time saved, and shared mode indicator in the VS Code status bar.
│   ├── bugDetailView.ts     — Renders the detailed bug webview, reusing panels per bug ID and refreshing content automatically [5].
│   └── bugVaultPanel.ts     — Implements the sidebar tree view for browsing recent bugs.
├── commands/
│   └── registerCommands     — Registers all VS Code commands, including `markSolved`, `saveFix`, `showRelatedBugs`, `openPanel`, and `clearSolved`. It also manages `syncFixToMemory` for updating shared memory and back-filling missing `memory_id`s [2].
└── utils/
    └── config.ts            — Provides getters for all extension settings, including helpers for shared memory configuration.
```

---

## 🤝 Contributing (For Contributors)

We welcome contributions to BugVault AI! Whether it's reporting issues, suggesting features, or submitting pull requests, your input is valuable. Please feel free to open an issue on our GitHub repository or submit a pull request.

### Development Setup

To get started with contributing, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/biki-dev/BugVault.git
    cd BugVault
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Compile the extension**:
    ```bash
    npm run compile
    ```
4.  **Launch the Extension Development Host**: Open the project in VS Code and press `F5`. This will open a new VS Code window where you can test your changes.

### Running Tests

BugVault AI uses `vitest` for its test suite. To run the tests, use the following command:

```bash
npm test
```

### Manual Testing (For Hackathon Judges and Contributors)

For a comprehensive manual verification of BugVault's functionality, refer to the `manual_test_list.md` file in the repository. This document outlines a step-by-step QA checklist covering environment setup, feature validation, and configuration toggles [6].

---

## 📦 Publishing (For Maintainers)

This section is for maintainers who need to publish new versions of the BugVault AI extension to the VS Code Marketplace.

1.  **Create a publisher**: If you haven't already, create a publisher account at [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).
2.  **Get a Personal Access Token (PAT)**: Obtain a Personal Access Token from Azure DevOps with the necessary permissions.
3.  **Login and Publish**:
    ```bash
    npx @vscode/vsce login biki-dev
    npx @vscode/vsce publish
    ```

---

## 📋 Changelog

### 1.0.0

*   Fixed stale panel data on repeat opens (confidence popup, bug detail view).
*   Bug detail panels now reused per bug ID instead of duplicating.
*   Fixed `framework` column missing from SQLite insert.
*   Added fallback to personal Supermemory when shared instance is unreachable.
*   Wrapped memory writes in try/catch so local tracking survives a Supermemory outage.
*   Capped diagnostics capture to 1 error per file to prevent notification spam.
*   Fixed `fixCapture` prompting even when a bug was already auto-resolved.
*   Fixed empty-string vs cancel handling in `saveFix`.
*   Added `bugvault.clearSolved` command and sidebar toolbar button.
*   New icon, MIT license, tightened `.vscodeignore`, marketplace metadata.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
