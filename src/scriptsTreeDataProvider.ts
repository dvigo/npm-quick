import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';
import { OutputViewProvider } from './outputViewProvider';

export class ScriptItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly script: string,
		public readonly description: string,
		public readonly scriptType: string,
		public readonly workspacePath: string,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
	) {
		super(label, collapsibleState);
		this.tooltip = `${script}: ${description}`;
		this.description = description;
		this.contextValue = 'script';
	}
}

export class ScriptsTreeDataProvider implements vscode.TreeDataProvider<ScriptItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ScriptItem | undefined | null | void> = new vscode.EventEmitter<ScriptItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ScriptItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor(private context: vscode.ExtensionContext, private outputProvider: OutputViewProvider) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ScriptItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ScriptItem): Promise<ScriptItem[]> {
		if (element) {
			return [];
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return [];
		}

		const workspacePath = workspaceFolders[0].uri.fsPath;
		const packageJson = await readPackageJson(workspacePath);

		if (!packageJson || !packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
			return [];
		}

		const scriptItems: ScriptItem[] = Object.entries(packageJson.scripts).map(([name, command]) => {
			const scriptType = detectScriptType(name);
			const typeLabel = getScriptTypeLabel(scriptType);
			return new ScriptItem(
				`${typeLabel}  ${name}`,
				name,
				command as string,
				scriptType,
				workspacePath
			);
		});

		// Sort by script type
		return scriptItems.sort((a, b) => a.label.localeCompare(b.label));
	}

	async executeScript(item: ScriptItem): Promise<void> {
		this.outputProvider.reveal();
		const packageManager = await detectPackageManager(item.workspacePath);
		const command = getScriptCommand(item.script, packageManager);

		this.outputProvider.clear();
		this.outputProvider.append(`▶ Ejecutando: ${command}\n\n`);

		try {
			const [cmd, ...args] = command.split(' ');
			const process = spawn(cmd, args, {
				cwd: item.workspacePath,
				shell: true,
			});

			process.stdout.on('data', (data) => {
				this.outputProvider.append(data.toString());
			});

			process.stderr.on('data', (data) => {
				this.outputProvider.append(data.toString());
			});

			process.on('close', (code) => {
				this.outputProvider.append(`\n\n✓ Proceso completado con código: ${code}\n`);
			});
		} catch (error) {
			this.outputProvider.append(`\n✗ Error: ${error}\n`);
		}
	}
}
