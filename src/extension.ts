import * as vscode from 'vscode';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';
import { ScriptsTreeDataProvider, ScriptItem } from './scriptsTreeDataProvider';
import { OutputViewProvider } from './outputViewProvider';
import { t } from './i18n';

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
		(scriptName: string, command: string, scriptId?: string) => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders) {
				// Use the provided scriptId instead of generating a new one
				treeDataProvider.addRunningScript(scriptName, command, workspaceFolders[0].uri.fsPath, scriptId);
			}
		},
		(scriptName: string, success: boolean) => {
			treeDataProvider.removeRunningScript(scriptName, success);
		},
		(id: string) => {
			treeDataProvider.removeHistoryItem(id);
		},
		(id: string, text: string) => {
			treeDataProvider.appendOutput(id, text);
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

	const clearHistoryDisposable = vscode.commands.registerCommand('npm-quick.clearHistory', async () => {
		const answer = await vscode.window.showWarningMessage(
			t('confirmClearHistory'),
			{ modal: true },
			t('yes'),
			t('no')
		);
		
		if (answer === t('yes')) {
			treeDataProvider.clearHistory();
			vscode.window.showInformationMessage(t('historyCleared'));
		}
	});

	const removeHistoryItemDisposable = vscode.commands.registerCommand('npm-quick.removeHistoryItem', async (item: ScriptItem) => {
		if (item) {
			const answer = await vscode.window.showWarningMessage(
				t('confirmRemoveItem'),
				{ modal: true },
				t('yes'),
				t('no')
			);
			
			if (answer === t('yes')) {
				treeDataProvider.removeHistoryItem(item.id);
			}
		}
	});

	const viewScriptOutputDisposable = vscode.commands.registerCommand('npm-quick.viewScriptOutput', async (item: ScriptItem) => {
		if (item) {
			const output = treeDataProvider.getOutput(item.id);
			const entry = treeDataProvider.getEntry(item.id);
			const isRunning = entry?.status === 'running';
			await outputProvider.reveal();
			outputProvider.loadOutput(output, item.id, isRunning, entry?.scriptName);
		}
	});

	const stopScriptDisposable = vscode.commands.registerCommand('npm-quick.stopScript', () => {
		outputProvider.stopCurrentScript();
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
		viewScriptOutputDisposable,
		stopScriptDisposable,
		workspaceChangeDisposable
	);
}

async function runScriptCommand(outputProvider: OutputViewProvider): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage(t('noWorkspace'));
		return;
	}

	const workspacePath = workspaceFolders[0].uri.fsPath;

	// Read package.json
	const packageJson = await readPackageJson(workspacePath);
	if (!packageJson || !packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
		vscode.window.showErrorMessage(t('noScripts'));
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
		placeHolder: t('selectScript'),
		matchOnDescription: true,
	});

	if (!selectedScript) {
		return; // User cancelled
	}

	// Detect package manager
	const packageManager = await detectPackageManager(workspacePath);
	const command = getScriptCommand(selectedScript.script, packageManager);

	// Execute in output view (ID will be generated automatically)
	await outputProvider.executeCommand(command, workspacePath, selectedScript.script);
}

export function deactivate() {}
