import * as vscode from 'vscode';
import * as path from 'path';
import { readPackageJson, detectPackageManager, getScriptCommand } from './packageManager';
import { detectScriptType, getScriptTypeLabel } from './scriptIcons';
import { OutputViewProvider } from './outputViewProvider';
import { t } from './i18n';

export type ScriptStatus = 'running' | 'completed' | 'failed';

export interface ScriptHistoryEntry {
	id: string;
	scriptName: string;
	command: string;
	status: ScriptStatus;
	startTime: Date;
	endTime?: Date;
	workspacePath: string;
	output: string;
}

export class ScriptItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly script: string,
		public readonly description: string,
		public readonly scriptType: string,
		public readonly workspacePath: string,
		public readonly status: ScriptStatus,
		public readonly id: string,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
	) {
		super(label, collapsibleState);
		this.tooltip = this.getTooltip();
		this.description = description;
		this.contextValue = status === 'running' ? 'script-running' : 'script-history';
		this.iconPath = this.getIcon();
		this.command = {
			command: 'npm-quick.viewScriptOutput',
			title: 'View Output',
			arguments: [this]
		};
	}

	private getTooltip(): string {
		if (this.status === 'running') {
			return `🔄 ${this.script}: ${this.description} (${t('running')})`;
		} else if (this.status === 'completed') {
			return `✓ ${this.script}: ${this.description} (${t('completed')})`;
		} else {
			return `✗ ${this.script}: ${this.description} (${t('failed')})`;
		}
	}

	private getIcon(): vscode.ThemeIcon {
		if (this.status === 'running') {
			return new vscode.ThemeIcon('loading~spin', new vscode.ThemeColor('charts.blue'));
		} else if (this.status === 'completed') {
			return new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
		} else {
			return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
		}
	}
}

export class ScriptsTreeDataProvider implements vscode.TreeDataProvider<ScriptItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ScriptItem | undefined | null | void> = new vscode.EventEmitter<ScriptItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ScriptItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private history: Map<string, ScriptHistoryEntry> = new Map();

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

		// Return all history entries (running and completed)
		const items: ScriptItem[] = [];
		for (const entry of this.history.values()) {
			const scriptType = detectScriptType(entry.scriptName);
			const typeLabel = getScriptTypeLabel(scriptType);
			
			const item = new ScriptItem(
				`${typeLabel}  ${entry.scriptName}`,
				entry.scriptName,
				entry.command,
				scriptType,
				entry.workspacePath,
				entry.status,
				entry.id
			);
			items.push(item);
		}

		// Sort: running first, then by start time (newest first)
		return items.sort((a, b) => {
			if (a.status === 'running' && b.status !== 'running') return -1;
			if (a.status !== 'running' && b.status === 'running') return 1;
			
			const entryA = this.history.get(a.id)!;
			const entryB = this.history.get(b.id)!;
			return entryB.startTime.getTime() - entryA.startTime.getTime();
		});
	}

	addRunningScript(scriptName: string, command: string, workspacePath: string, id?: string): string {
		// Use provided ID or generate new one
		if (!id) {
			id = `${scriptName}-${Date.now()}`;
		}
		
		const entry: ScriptHistoryEntry = {
			id,
			scriptName,
			command,
			status: 'running',
			startTime: new Date(),
			workspacePath,
			output: ''
		};
		this.history.set(id, entry);
		this.refresh();
		return id;
	}

	appendOutput(id: string, text: string) {
		const entry = this.history.get(id);
		if (entry) {
			entry.output += text;
		}
	}

	getOutput(id: string): string {
		const entry = this.history.get(id);
		return entry ? entry.output : '';
	}

	getEntry(id: string): ScriptHistoryEntry | undefined {
		return this.history.get(id);
	}

	removeRunningScript(scriptName: string, success: boolean = true) {
		// Find the running entry for this script
		for (const [id, entry] of this.history.entries()) {
			if (entry.scriptName === scriptName && entry.status === 'running') {
				entry.status = success ? 'completed' : 'failed';
				entry.endTime = new Date();
				break;
			}
		}
		this.refresh();
	}

	clearHistory() {
		// Keep only running scripts
		const runningEntries = Array.from(this.history.entries()).filter(([_, entry]) => entry.status === 'running');
		this.history.clear();
		runningEntries.forEach(([id, entry]) => this.history.set(id, entry));
		this.refresh();
	}

	removeHistoryItem(id: string) {
		this.history.delete(id);
		this.refresh();
	}

	hasHistoryItem(id: string): boolean {
		return this.history.has(id);
	}

	async executeScript(item: ScriptItem): Promise<void> {
		const packageManager = await detectPackageManager(item.workspacePath);
		const command = getScriptCommand(item.script, packageManager);

		await this.outputProvider.executeCommand(command, item.workspacePath, item.script, item.id);
	}

	async executeScriptByName(scriptName: string, workspacePath: string, scriptId?: string): Promise<void> {
		const packageManager = await detectPackageManager(workspacePath);
		const command = getScriptCommand(scriptName, packageManager);

		await this.outputProvider.executeCommand(command, workspacePath, scriptName, scriptId);
	}
}
