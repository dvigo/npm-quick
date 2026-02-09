import * as vscode from 'vscode';
import * as path from 'path';
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
	private runningScripts: Map<string, ScriptItem> = new Map();

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

		// Return only running scripts
		return Array.from(this.runningScripts.values());
	}

	addRunningScript(scriptName: string, command: string, workspacePath: string) {
		const scriptType = detectScriptType(scriptName);
		const typeLabel = getScriptTypeLabel(scriptType);
		const item = new ScriptItem(
			`${typeLabel}  ${scriptName}`,
			scriptName,
			command,
			scriptType,
			workspacePath
		);
		this.runningScripts.set(scriptName, item);
		this.refresh();
	}

	removeRunningScript(scriptName: string) {
		this.runningScripts.delete(scriptName);
		this.refresh();
	}

	async executeScript(item: ScriptItem): Promise<void> {
		const packageManager = await detectPackageManager(item.workspacePath);
		const command = getScriptCommand(item.script, packageManager);

		await this.outputProvider.executeCommand(command, item.workspacePath, item.script);
	}

	async executeScriptByName(scriptName: string, workspacePath: string): Promise<void> {
		const packageManager = await detectPackageManager(workspacePath);
		const command = getScriptCommand(scriptName, packageManager);

		await this.outputProvider.executeCommand(command, workspacePath, scriptName);
	}
}
