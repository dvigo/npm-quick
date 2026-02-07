import * as vscode from 'vscode';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { ScriptItem } from './types';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';

export function activate(context: vscode.ExtensionContext) {
	console.log('Activating npm quick extension');

	const disposable = vscode.commands.registerCommand('npm-quick.runScript', async () => {
		await runScriptCommand();
	});

	context.subscriptions.push(disposable);
}

async function runScriptCommand(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder is open');
		return;
	}

	const workspacePath = workspaceFolders[0].uri.fsPath;

	// Read package.json
	const packageJson = await readPackageJson(workspacePath);
	if (!packageJson || !packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
		vscode.window.showErrorMessage('No scripts found in package.json');
		return;
	}

	// Create script items for quick pick
	const scriptItems: (vscode.QuickPickItem & ScriptItem)[] = Object.entries(packageJson.scripts).map(([name, command]) => {
		const scriptType = detectScriptType(name);
		const typeLabel = getScriptTypeLabel(scriptType);
		return {
			label: `${typeLabel}  ${name}`,
			description: command as string,
			script: name,
			scriptType,
		};
	});

	// Show quick pick
	const selectedScript = await vscode.window.showQuickPick(scriptItems, {
		placeHolder: 'Select a script to run',
		matchOnDescription: true,
	});

	if (!selectedScript) {
		return; // User cancelled
	}

	// Detect package manager
	const packageManager = await detectPackageManager(workspacePath);
	const command = getScriptCommand(selectedScript.script, packageManager);

	// Create or get terminal
	const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('task-executor');
	terminal.show();
	terminal.sendText(command);
}

export function deactivate() {}
