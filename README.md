# npm quick

A lightweight VS Code extension that makes it easy to discover and run npm/pnpm/yarn scripts directly from the Command Palette.

## Features

✨ **Quick Script Discovery** - Browse all scripts defined in your `package.json` via Command Palette

🚀 **Automatic Package Manager Detection** - Automatically detects whether your project uses npm, pnpm, or yarn based on lock files

⚡ **Integrated Terminal Execution** - Executes scripts directly in VS Code's integrated terminal

💻 **No Configuration Required** - Works out of the box with any project that has scripts in `package.json`

## Requirements

- VS Code 1.60.0 or higher
- A `package.json` file with a `scripts` section in your project

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a project folder that contains a `package.json` with scripts
3. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux) to open Command Palette
4. Type "npm quick: Run Script"
5. Select the script you want to run from the list
6. The script executes in the integrated terminal

## Usage Examples

### Running Tests
```
Cmd+Shift+P → "npm quick: Run Script" → Select "test"
```

### Running Build
```
Cmd+Shift+P → "npm quick: Run Script" → Select "build"
```

### Running Dev Server
```
Cmd+Shift+P → "npm quick: Run Script" → Select "dev"
```

## How It Works

The extension:

1. **Reads** your project's `package.json` file
2. **Extracts** all scripts defined in the `scripts` section
3. **Displays** them in a searchable quick pick interface
4. **Detects** your package manager based on lock files present:
   - `pnpm-lock.yaml` → uses `pnpm run <script>`
   - `yarn.lock` → uses `yarn <script>`
   - `package-lock.json` → uses `npm run <script>`
   - *No lock file* → defaults to `npm run <script>`
5. **Executes** the selected script in the integrated terminal

## Supported Package Managers

| Package Manager | Lock File | Command |
|---|---|---|
| **npm** | `package-lock.json` | `npm run <script>` |
| **pnpm** | `pnpm-lock.yaml` | `pnpm run <script>` |
| **yarn** | `yarn.lock` | `yarn <script>` |

## Command Reference

### npm quick: Run Script
- **Command ID**: `npm-quick.runScript`
- **Keybinding**: None (use Command Palette)
- **Description**: Displays a quick pick menu with all available scripts from `package.json`

## Tips & Tricks

- **Search Filtering**: Start typing in the quick pick to filter scripts by name
- **Partial Matches**: The quick pick searches both script names and their descriptions
- **Terminal Reuse**: If a terminal is already open, the script runs in the active terminal
- **Output Viewing**: Terminal output is automatically visible in VS Code

## Troubleshooting

### No scripts appear in the list
- Ensure your project has a valid `package.json` file
- Check that the `scripts` section exists and contains at least one script
- Make sure VS Code has opened a workspace folder

### Wrong package manager is detected
- The extension detects the package manager based on lock files
- Ensure the correct lock file exists in your project root
- If using npm without `package-lock.json`, install dependencies to generate it: `npm install`

### Script doesn't execute
- Check that the script syntax is correct in `package.json`
- Verify that required dependencies for the script are installed
- Check the terminal output for error messages

## Development

This extension is built with TypeScript and uses the VS Code Extension API.

### Setup Development Environment
```bash
npm install
```

### Compile
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Run Tests
```bash
npm run test
```

### Lint Code
```bash
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Issues

None at this time.

## Future Enhancements

Potential features for future releases:
- Custom keybindings for frequently used scripts
- Workspace settings to customize behavior
- Script history/recent scripts list
- Custom script grouping or categorization
- Interactive script with parameter input

## License

MIT - See LICENSE file for details

## Support

If you encounter any issues, please report them on [GitHub Issues](https://github.com/dvigo/npm-quick/issues)

---

**Happy scripting! 🚀**
