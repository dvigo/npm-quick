# FAQ - npm quick

## General Questions

### Q: What is npm quick?
**A:** npm quick is a VS Code extension that helps you quickly discover and run npm/pnpm/yarn scripts from your project's `package.json` file without leaving the editor.

### Q: How do I install npm quick?
**A:** You can install it directly from the [VS Code Marketplace](https://marketplace.visualstudio.com) by searching for "npm quick" or visiting the extension's marketplace page.

### Q: Is npm quick free?
**A:** Yes, npm quick is completely free and open-source under the MIT license.

### Q: Can I use npm quick with other package managers?
**A:** Currently, npm quick supports npm, pnpm, and yarn. If you use a different package manager, please open an issue on GitHub.

## Usage Questions

### Q: How do I run a script?
**A:** Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux), type "npm quick: Run Script", and select the script you want to run.

### Q: Can I run scripts without opening the Command Palette?
**A:** Not yet, but you can easily assign a keyboard shortcut in VS Code settings. See VS Code's [keybindings documentation](https://code.visualstudio.com/docs/getstarted/keybindings) for how to do this.

### Q: Why can't I see any scripts?
**A:** Make sure:
- Your project has a valid `package.json` file
- The `scripts` section exists in your `package.json`
- You've opened a workspace folder in VS Code
- The file is properly formatted JSON

### Q: What happens when I select a script?
**A:** The script runs in VS Code's integrated terminal using the appropriate command for your package manager (npm, pnpm, or yarn).

## Package Manager Detection

### Q: How does npm quick know which package manager to use?
**A:** It checks for lock files in your project root in this order:
1. `pnpm-lock.yaml` → uses pnpm
2. `yarn.lock` → uses yarn
3. `package-lock.json` → uses npm
4. No lock file → defaults to npm

### Q: What if I use multiple package managers?
**A:** Task Executor will prioritize based on the lock files present. Make sure you only have one package manager's lock file in your project root.

### Q: Can I manually specify which package manager to use?
**A:** Not in the current version. Please open a feature request if you need this functionality.

## Troubleshooting

### Q: The script runs but shows an error
**A:** This usually means:
- The script itself has an error
- A dependency is missing (run `npm install`, `pnpm install`, or `yarn install`)
- The script command syntax is incorrect in your `package.json`

Check the terminal output for error details.

### Q: The extension doesn't appear in my Command Palette
**A:** Make sure:
- The extension is installed and enabled
- You're in a workspace folder (not just a single file)
- Try reloading VS Code (`Cmd+Shift+P` → "Developer: Reload Window")

### Q: My script hangs in the terminal
**A:** Some scripts (like dev servers) are designed to run continuously. You can:
- Stop the process by pressing `Ctrl+C` in the terminal
- Open a new terminal to run other commands

### Q: The wrong package manager is being used
**A:** Delete or rename any conflicting lock files. For example, if you're using pnpm but `package-lock.json` exists, remove it.

## Feature Questions

### Q: Can I create custom shortcuts for my favorite scripts?
**A:** Not built-in yet, but you can create VS Code keybindings that call the extension command. See [VS Code keybindings](https://code.visualstudio.com/docs/getstarted/keybindings).

### Q: Can I see a history of recently run scripts?
**A:** This is planned for a future release. Please upvote the feature request on GitHub if you're interested.

### Q: Can I group or organize scripts by category?
**A:** Not yet, but this is under consideration. Open an issue on GitHub to discuss this feature.

### Q: Can I run multiple scripts at once?
**A:** Currently, you run one script at a time. Each script opens in a terminal. You can open multiple terminals if needed.

## Development Questions

### Q: Can I contribute to Task Executor?
**A:** Absolutely! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

### Q: Where is the source code?
**A:** The source code is available on [GitHub](https://github.com/dvigo/npm-quick).

### Q: How can I report a bug?
**A:** Open an issue on [GitHub Issues](https://github.com/dvigo/npm-quick/issues) with:
- A clear description
- Steps to reproduce
- Your environment (OS, VS Code version)
- Screenshots if applicable

### Q: How can I request a feature?
**A:** Open a feature request on [GitHub Issues](https://github.com/dvigo/npm-quick/issues) describing:
- The use case
- Your proposed solution
- Any alternatives you've considered

## Performance Questions

### Q: Does npm quick slow down VS Code?
**A:** No, npm quick is lightweight and only activates when you run the command. It has minimal impact on VS Code's performance.

### Q: How long does it take to load scripts?
**A:** Typically less than 100ms. If you notice delays, it might be due to your `package.json` size or file system speed.

## Compatibility Questions

### Q: What versions of VS Code does npm quick support?
**A:** VS Code 1.60.0 and later.

### Q: Does Task Executor work on Windows, macOS, and Linux?
**A:** Yes, it works on all platforms where VS Code is available.

### Q: Can I use npm quick in remote workspaces (SSH, WSL, Containers)?
**A:** Yes, npm quick works with VS Code's remote development features.

---

Didn't find your answer? [Open an issue on GitHub](https://github.com/dvigo/npm-quick/issues)!
