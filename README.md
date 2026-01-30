# Task Executor

A lightweight VS Code extension that makes it easy to discover and run npm/pnpm/yarn scripts from your project's `package.json`.

## Features

✨ **Quick Script Discovery** - Browse all scripts defined in your `package.json` via Command Palette

🚀 **Automatic Package Manager Detection** - Automatically detects whether your project uses npm, pnpm, or yarn

⚡ **Integrated Terminal Execution** - Executes scripts directly in VS Code's integrated terminal

💻 **No Configuration Required** - Works out of the box with any project that has scripts in `package.json`

## Requirements

- VS Code 1.60.0 or higher

## Usage

1. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux)
2. Type "Task Executor: Run Script"
3. Select the script you want to run from the quick pick menu
4. The script will execute in the integrated terminal

## How It Works

- Reads your project's `package.json` file
- Extracts all scripts defined in the `scripts` section
- Displays them in a searchable quick pick interface
- Detects your package manager based on lock files (pnpm-lock.yaml, yarn.lock, or package-lock.json)
- Executes the selected script using the appropriate command (`npm run`, `pnpm run`, or `yarn`)

## Supported Package Managers

- **npm** (detects `package-lock.json`)
- **pnpm** (detects `pnpm-lock.yaml`)
- **yarn** (detects `yarn.lock`)

If no lock file is found, defaults to npm.

## Known Issues

None at this time.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
