import * as vscode from 'vscode';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';
import { ScriptsTreeDataProvider, ScriptItem } from './scriptsTreeDataProvider';
import { OutputViewProvider } from './outputViewProvider';
import { t } from './i18n';

let treeDataProvider: ScriptsTreeDataProvider;
let treeView: vscode.TreeView<ScriptItem>;
let outputProvider: OutputViewProvider;
let statusBarItem: vscode.StatusBarItem;

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
	treeView = vscode.window.createTreeView('npm-quick.scriptsView', { treeDataProvider });
	context.subscriptions.push(treeView);

	// Set up callbacks for process lifecycle
	outputProvider.setProcessCallbacks(
		(scriptName: string, command: string, scriptId?: string) => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders) {
				// Use the provided scriptId instead of generating a new one
				const actualId = treeDataProvider.addRunningScript(scriptName, command, workspaceFolders[0].uri.fsPath, scriptId);
				// Focus/Reveal the execution item in the tree view
				setTimeout(() => {
					const item = treeDataProvider.getScriptItemById(actualId);
					if (item) {
						treeView.reveal(item, { select: true, focus: true });
					}
				}, 100);
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
			const currentScriptId = outputProvider.getCurrentScriptId();
			treeDataProvider.clearHistory();
			
			// Clear output if the current script is no longer in history (was removed)
			if (currentScriptId && !treeDataProvider.hasHistoryItem(currentScriptId)) {
				outputProvider.clear();
			}
			
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
			if (!outputProvider.isViewVisible()) {
				await outputProvider.reveal();
			}
			outputProvider.loadOutput(output, item.id, isRunning, entry?.scriptName);
		}
	});

	const stopScriptDisposable = vscode.commands.registerCommand('npm-quick.stopScript', () => {
		outputProvider.stopCurrentScript();
	});

	const openPanelDisposable = vscode.commands.registerCommand('npm-quick.openPanel', async () => {
		await vscode.commands.executeCommand('workbench.view.extension.npm-quick-scripts');
	});

	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = '$(package)';
	statusBarItem.tooltip = 'npm quick';
	statusBarItem.command = 'npm-quick.openPanel';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

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
		openPanelDisposable,
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
	if (!packageJson) {
		vscode.window.showErrorMessage(t('noScripts'));
		return;
	}

	// Detect package manager
	const packageManager = await detectPackageManager(workspacePath);

	// Create script items for quick pick
	const scriptItems: (vscode.QuickPickItem & { script: string; scriptType: string })[] = [];

	// Add default commands (install & audit)
	const installCmd = `${packageManager} install`;
	const installTypeLabel = getScriptTypeLabel('install');
	scriptItems.push({
		label: `${installTypeLabel}  install`,
		description: installCmd,
		script: 'install',
		scriptType: 'install',
	});

	const auditCmd = `${packageManager} audit`;
	const auditTypeLabel = getScriptTypeLabel('audit');
	scriptItems.push({
		label: `${auditTypeLabel}  audit`,
		description: auditCmd,
		script: 'audit',
		scriptType: 'audit',
	});

	// Add the actual scripts from package.json if present
	if (packageJson.scripts) {
		Object.entries(packageJson.scripts).forEach(([name, command]) => {
			if (name === 'install' || name === 'audit') {
				return;
			}
			const scriptType = detectScriptType(name);
			const typeLabel = getScriptTypeLabel(scriptType);
			scriptItems.push({
				label: `${typeLabel}  ${name}`,
				description: command as string,
				script: name,
				scriptType,
			});
		});
	}

	// Show quick pick
	const selectedScript = await vscode.window.showQuickPick(scriptItems, {
		placeHolder: t('selectScript'),
		matchOnDescription: true,
	});

	if (!selectedScript) {
		return; // User cancelled
	}

	const command = getScriptCommand(selectedScript.script, packageManager);

	// Execute in output view (ID will be generated automatically)
	await outputProvider.executeCommand(command, workspacePath, selectedScript.script);
}

export function deactivate() {}
