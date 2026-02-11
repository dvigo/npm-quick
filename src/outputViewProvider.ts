import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';
import { t } from './i18n';

export class OutputViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'npm-quick.outputView';
	private view?: vscode.WebviewView;
	private processes: Map<string, ChildProcess> = new Map();
	private currentScriptName?: string;
	private currentScriptId?: string;
	private onProcessStart?: (scriptName: string, command: string, scriptId?: string) => void;
	private onProcessEnd?: (scriptName: string, success: boolean) => void;
	private onRemoveHistoryItem?: (id: string) => void;
	private onAppendOutput?: (id: string, text: string) => void;

	constructor(private context: vscode.ExtensionContext) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken
	) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.context.extensionUri],
		};

		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage((message) => {
			if (message.command === 'input' && this.currentScriptId) {
				const process = this.processes.get(this.currentScriptId);
				if (process && process.stdin) {
					process.stdin.write(message.text + '\n');
				}
			} else if (message.command === 'stop') {
				this.stopCurrentProcess();
			} else if (message.command === 'clearAndRemove') {
				this.clearAndRemoveHistory();
			}
		});
	}

	public async reveal() {
		if (this.view) {
			await vscode.commands.executeCommand('workbench.view.extension.npm-quick-scripts');
			this.view.show(true);
		}
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		const stopText = t('stop');
		const clearText = t('clear');
		const placeholderText = t('enterInput');
		const confirmClearText = t('confirmRemoveItem');
		const yesText = t('yes');
		const noText = t('no');
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Output</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
			font-size: 12px;
			color: #d4d4d4;
			background-color: #1e1e1e;
			display: flex;
			flex-direction: column;
			height: 100vh;
		}
		#controls {
			padding: 8px;
			background-color: #252526;
			border-bottom: 1px solid #3c3c3c;
			display: flex;
			gap: 8px;
		}
		button {
			background-color: #0e639c;
			color: #ffffff;
			border: none;
			padding: 4px 12px;
			cursor: pointer;
			border-radius: 2px;
			font-size: 11px;
		}
		button:hover {
			background-color: #1177bb;
		}
		button.stop {
			background-color: #a1260d;
		}
		button.stop:hover:not(:disabled) {
			background-color: #c72e0d;
		}
		button.delete {
			background-color: #6b7280;
			color: #ffffff;
			padding: 4px 8px;
		}
		button.delete:hover:not(:disabled) {
			background-color: #9ca3af;
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		#output-container {
			flex: 1;
			overflow-y: auto;
			padding: 10px;
		}
		#output {
			white-space: pre-wrap;
			word-wrap: break-word;
			line-height: 1.5;
		}
		#input-container {
			padding: 8px;
			background-color: #252526;
			border-top: 1px solid #3c3c3c;
			display: none;
		}
		#input-container.active {
			display: block;
		}
		input {
			width: 100%;
			background-color: #3c3c3c;
			color: #d4d4d4;
			border: 1px solid #3c3c3c;
			padding: 6px;
			font-family: inherit;
			font-size: 12px;
		}
		input:focus {
			outline: none;
			border-color: #007acc;
		}
		.modal {
			display: none;
			position: fixed;
			z-index: 1000;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0,0,0,0.4);
			justify-content: center;
			align-items: center;
		}
		.modal.show {
			display: flex;
		}
		.modal-content {
			background-color: #252526;
			padding: 20px;
			border: 1px solid #3c3c3c;
			border-radius: 4px;
			min-width: 300px;
		}
		.modal-buttons {
			display: flex;
			gap: 8px;
			margin-top: 16px;
			justify-content: flex-end;
		}
		.modal-text {
			margin-bottom: 12px;
		}
	</style>
</head>
<body>
	<div id="controls">
		<button id="stopBtn" class="stop" onclick="stopProcess()" disabled>⏹ ${stopText}</button>
		<button id="deleteBtn" class="delete" onclick="confirmClear()" title="${clearText}" disabled>🗑️</button>
	</div>
	<div id="output-container">
		<div id="output"></div>
	</div>
	<div id="input-container">
		<input type="text" id="userInput" placeholder="${placeholderText}" />
	</div>
	<div id="confirmModal" class="modal">
		<div class="modal-content">
			<div class="modal-text">${confirmClearText}</div>
			<div class="modal-buttons">
				<button onclick="cancelClear()">${noText}</button>
				<button onclick="clearOutput()">${yesText}</button>
			</div>
		</div>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		const outputDiv = document.getElementById('output');
		const outputContainer = document.getElementById('output-container');
		const inputContainer = document.getElementById('input-container');
		const userInput = document.getElementById('userInput');
		const confirmModal = document.getElementById('confirmModal');
		const deleteBtn = document.getElementById('deleteBtn');
		const stopBtn = document.getElementById('stopBtn');

		window.addEventListener('message', event => {
			const message = event.data;
			if (message.command === 'append') {
				outputDiv.textContent += message.text;
				outputContainer.scrollTop = outputContainer.scrollHeight;
			} else if (message.command === 'clear') {
				outputDiv.textContent = '';
			} else if (message.command === 'enableInput') {
				inputContainer.classList.add('active');
			} else if (message.command === 'disableInput') {
				inputContainer.classList.remove('active');
			} else if (message.command === 'enableDelete') {
				deleteBtn.disabled = false;
			} else if (message.command === 'disableDelete') {
				deleteBtn.disabled = true;
			} else if (message.command === 'enableStop') {
				stopBtn.disabled = false;
			} else if (message.command === 'disableStop') {
				stopBtn.disabled = true;
			}
		});

		userInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				vscode.postMessage({
					command: 'input',
					text: userInput.value
				});
				userInput.value = '';
			}
		});

		function stopProcess() {
			if (!stopBtn.disabled) {
				vscode.postMessage({ command: 'stop' });
			}
		}

		function confirmClear() {
			if (!deleteBtn.disabled) {
				confirmModal.classList.add('show');
			}
		}

		function cancelClear() {
			confirmModal.classList.remove('show');
		}

		function clearOutput() {
			confirmModal.classList.remove('show');
			outputDiv.textContent = '';
			vscode.postMessage({ command: 'clearAndRemove' });
		}
	</script>
</body>
</html>`;
	}

	public append(text: string) {
		if (this.view) {
			this.view.webview.postMessage({ command: 'append', text });
		}
		// Save to history
		if (this.currentScriptId && this.onAppendOutput) {
			this.onAppendOutput(this.currentScriptId, text);
		}
	}

	public clear() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'clear' });
			this.view.webview.postMessage({ command: 'disableDelete' });
		}
	}

	public async executeCommand(command: string, workspacePath: string, scriptName?: string, scriptId?: string) {
		await this.reveal();
		
		// Generate ID if not provided
		if (!scriptId && scriptName) {
			scriptId = `${scriptName}-${Date.now()}`;
		}
		
		this.currentScriptName = scriptName;
		this.currentScriptId = scriptId;
		
		// Create history entry BEFORE first append
		if (scriptName && this.onProcessStart && scriptId) {
			this.onProcessStart(scriptName, command, scriptId);
		}
		
		this.clear();
		this.append(`▶ ${t('executing')}: ${command}\n\n`);
		
		if (this.view) {
			this.view.webview.postMessage({ command: 'enableDelete' });
		}

		try {
			const process = spawn(command, {
				cwd: workspacePath,
				shell: true,
				stdio: ['pipe', 'pipe', 'pipe'],
				detached: false,
			});

			// Store process by scriptId
			if (scriptId) {
				this.processes.set(scriptId, process);
			}
			
			this.enableInput();
			this.enableStop();

			process.stdout.on('data', (data) => {
				this.append(data.toString());
			});

			process.stderr.on('data', (data) => {
				this.append(data.toString());
			});

			process.on('close', (code) => {
				const scriptName = this.currentScriptName;
				const success = code === 0;
				
				// Remove process from map
				if (scriptId) {
					this.processes.delete(scriptId);
				}
				
				// Only update UI if this is the currently viewed process
				if (this.currentScriptId === scriptId) {
					this.disableInput();
					this.disableStop();
				}
				
				if (success) {
					this.append(`\n\n✓ ${t('processCompleted')}: ${code}\n`);
				} else {
					this.append(`\n\n✗ ${t('processTerminated')}: ${code}\n`);
				}
				
				if (scriptName && this.onProcessEnd) {
					this.onProcessEnd(scriptName, success);
				}
			});

			process.on('error', (error) => {
				const scriptName = this.currentScriptName;
				
				// Remove process from map
				if (scriptId) {
					this.processes.delete(scriptId);
				}
				
				// Only update UI if this is the currently viewed process
				if (this.currentScriptId === scriptId) {
					this.disableInput();
					this.disableStop();
				}
				
				this.append(`\n✗ ${t('error')}: ${error.message}\n`);
				
				if (scriptName && this.onProcessEnd) {
					this.onProcessEnd(scriptName, false);
				}
			});
		} catch (error) {
			this.append(`\n✗ ${t('error')}: ${error}\n`);
			const scriptName = this.currentScriptName;
			
			if (scriptName && this.onProcessEnd) {
				this.onProcessEnd(scriptName, false);
			}
		}
	}

	public setProcessCallbacks(
		onStart: (scriptName: string, command: string, scriptId?: string) => void,
		onEnd: (scriptName: string, success: boolean) => void,
		onRemove?: (id: string) => void,
		onAppendOutput?: (id: string, text: string) => void
	) {
		this.onProcessStart = onStart;
		this.onProcessEnd = onEnd;
		this.onRemoveHistoryItem = onRemove;
		this.onAppendOutput = onAppendOutput;
	}

	public loadOutput(output: string, scriptId?: string, isRunning: boolean = false, scriptName?: string) {
		this.clear();
		
		// Update current script tracking
		this.currentScriptId = scriptId;
		this.currentScriptName = isRunning ? scriptName : undefined;
		
		if (this.view) {
			this.view.webview.postMessage({ command: 'append', text: output });
			this.view.webview.postMessage({ command: 'enableDelete' });
			
			if (isRunning) {
				this.view.webview.postMessage({ command: 'enableStop' });
				this.view.webview.postMessage({ command: 'enableInput' });
			} else {
				this.view.webview.postMessage({ command: 'disableStop' });
				this.view.webview.postMessage({ command: 'disableInput' });
			}
		}
	}

	public getCurrentScriptId(): string | undefined {
		return this.currentScriptId;
	}

	public stopCurrentScript() {
		this.stopCurrentProcess();
	}

	private enableInput() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'enableInput' });
		}
	}

	private enableStop() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'enableStop' });
		}
	}

	private disableInput() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'disableInput' });
		}
	}

	private disableStop() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'disableStop' });
		}
	}

	private stopCurrentProcess() {
		if (this.currentScriptId) {
			const process = this.processes.get(this.currentScriptId);
			if (process) {
				// Send SIGINT (Ctrl+C) to the process
				try {
					process.kill('SIGINT');
				} catch (error) {
					// If SIGINT fails, try SIGTERM as fallback
					try {
						process.kill('SIGTERM');
					} catch (e) {
						// Process might already be dead
					}
				}
				
				const scriptName = this.currentScriptName;
				this.processes.delete(this.currentScriptId);
				this.currentScriptName = undefined;
				this.disableInput();
				this.disableStop();
				this.append(`\n\n⏹ ${t('processStopped')}\n`);
				
				if (scriptName && this.onProcessEnd) {
					this.onProcessEnd(scriptName, false);
				}
			}
		}
	}

	private clearAndRemoveHistory() {
		if (this.currentScriptId && this.onRemoveHistoryItem) {
			this.onRemoveHistoryItem(this.currentScriptId);
		}
		this.currentScriptId = undefined;
		this.currentScriptName = undefined;
		this.clear();
		if (this.view) {
			this.view.webview.postMessage({ command: 'disableDelete' });
			this.view.webview.postMessage({ command: 'disableStop' });
			this.view.webview.postMessage({ command: 'disableInput' });
		}
	}
}
