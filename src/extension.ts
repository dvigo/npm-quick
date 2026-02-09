import * as vscode from 'vscode';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';
import { ScriptsTreeDataProvider, ScriptItem } from './scriptsTreeDataProvider';
import { OutputViewProvider } from './outputViewProvider';

let treeDataProvider: ScriptsTreeDataProvider;
let outputProvider: OutputViewProvider;

export function activate(context: vscode.ExtensionContext) {
	console.log('Activating npm quick extension');

	// Create and register the output view provider
	outputProvider = new OutputViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(OutputViewProvider.viewType, outputProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	// Create and register the tree data provider
	treeDataProvider = new ScriptsTreeDataProvider(context, outputProvider);
	vscode.window.registerTreeDataProvider('npm-quick.scriptsView', treeDataProvider);

	// Set up callbacks for process lifecycle
	outputProvider.setProcessCallbacks(
		(scriptName: string, command: string) => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders) {
				treeDataProvider.addRunningScript(scriptName, command, workspaceFolders[0].uri.fsPath);
			}
		},
		(scriptName: string, success: boolean) => {
			treeDataProvider.removeRunningScript(scriptName, success);
		}
	);

	// Register commands
	const runScriptDisposable = vscode.commands.registerCommand('npm-quick.runScript', async () => {
		await runScriptCommand(outputProvider);
	});

	const executeScriptDisposable = vscode.commands.registerCommand('npm-quick.executeScript', async (item: ScriptItem) => {
		if (item) {
			await treeDataProvider.executeScript(item);
		}
	});

	const refreshDisposable = vscode.commands.registerCommand('npm-quick.refreshScripts', () => {
		treeDataProvider.refresh();
	});

	const addScriptDisposable = vscode.commands.registerCommand('npm-quick.addScript', async () => {
		await runScriptCommand(outputProvider);
	});

	const clearHistoryDisposable = vscode.commands.registerCommand('npm-quick.clearHistory', () => {
		treeDataProvider.clearHistory();
		vscode.window.showInformationMessage('Historial limpiado');
	});

	const removeHistoryItemDisposable = vscode.commands.registerCommand('npm-quick.removeHistoryItem', (item: ScriptItem) => {
		if (item) {
			treeDataProvider.removeHistoryItem(item.id);
		}
	});

	// Refresh tree when workspace changes
	const workspaceChangeDisposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
		treeDataProvider.refresh();
	});

	context.subscriptions.push(
		runScriptDisposable, 
		executeScriptDisposable, 
		refreshDisposable, 
		addScriptDisposable, 
		clearHistoryDisposable, 
		removeHistoryItemDisposable, 
		workspaceChangeDisposable
	);
}

async function runScriptCommand(outputProvider: OutputViewProvider): Promise<void> {
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
	const scriptItems: (vscode.QuickPickItem & { script: string; scriptType: string })[] = Object.entries(packageJson.scripts).map(([name, command]) => {
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

	// Execute in output view
	await outputProvider.executeCommand(command, workspacePath, selectedScript.script);
}

export function deactivate() {}
