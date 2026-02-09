import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';

export class OutputViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'npm-quick.outputView';
	private view?: vscode.WebviewView;
	private currentProcess?: ChildProcess;
	private currentScriptName?: string;
	private onProcessStart?: (scriptName: string, command: string) => void;
	private onProcessEnd?: (scriptName: string) => void;

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
			if (message.command === 'input' && this.currentProcess && this.currentProcess.stdin) {
				this.currentProcess.stdin.write(message.text + '\n');
			} else if (message.command === 'stop') {
				this.stopCurrentProcess();
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
		button.stop:hover {
			background-color: #c72e0d;
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
	</style>
</head>
<body>
	<div id="controls">
		<button class="stop" onclick="stopProcess()">⏹ Stop</button>
		<button onclick="clearOutput()">Clear</button>
	</div>
	<div id="output-container">
		<div id="output"></div>
	</div>
	<div id="input-container">
		<input type="text" id="userInput" placeholder="Enter input..." />
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		const outputDiv = document.getElementById('output');
		const outputContainer = document.getElementById('output-container');
		const inputContainer = document.getElementById('input-container');
		const userInput = document.getElementById('userInput');

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
			vscode.postMessage({ command: 'stop' });
		}

		function clearOutput() {
			outputDiv.textContent = '';
		}
	</script>
</body>
</html>`;
	}

	public append(text: string) {
		if (this.view) {
			this.view.webview.postMessage({ command: 'append', text });
		}
	}

	public clear() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'clear' });
		}
	}

	public async executeCommand(command: string, workspacePath: string, scriptName?: string) {
		await this.reveal();
		this.clear();
		this.append(`▶ Ejecutando: ${command}\n\n`);

		this.currentScriptName = scriptName;
		if (scriptName && this.onProcessStart) {
			this.onProcessStart(scriptName, command);
		}

		try {
			const process = spawn(command, {
				cwd: workspacePath,
				shell: true,
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			this.currentProcess = process;
			this.enableInput();

			process.stdout.on('data', (data) => {
				this.append(data.toString());
			});

			process.stderr.on('data', (data) => {
				this.append(data.toString());
			});

			process.on('close', (code) => {
				const scriptName = this.currentScriptName;
				this.currentProcess = undefined;
				this.currentScriptName = undefined;
				this.disableInput();
				this.append(`\n\n✓ Proceso completado con código: ${code}\n`);
				
				if (scriptName && this.onProcessEnd) {
					this.onProcessEnd(scriptName);
				}
			});

			process.on('error', (error) => {
				const scriptName = this.currentScriptName;
				this.currentProcess = undefined;
				this.currentScriptName = undefined;
				this.disableInput();
				this.append(`\n✗ Error: ${error.message}\n`);
				
				if (scriptName && this.onProcessEnd) {
					this.onProcessEnd(scriptName);
				}
			});
		} catch (error) {
			this.append(`\n✗ Error: ${error}\n`);
			const scriptName = this.currentScriptName;
			this.currentScriptName = undefined;
			if (scriptName && this.onProcessEnd) {
				this.onProcessEnd(scriptName);
			}
		}
	}

	public setProcessCallbacks(
		onStart: (scriptName: string, command: string) => void,
		onEnd: (scriptName: string) => void
	) {
		this.onProcessStart = onStart;
		this.onProcessEnd = onEnd;
	}

	private enableInput() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'enableInput' });
		}
	}

	private disableInput() {
		if (this.view) {
			this.view.webview.postMessage({ command: 'disableInput' });
		}
	}

	private stopCurrentProcess() {
		if (this.currentProcess) {
			this.currentProcess.kill();
			const scriptName = this.currentScriptName;
			this.currentProcess = undefined;
			this.currentScriptName = undefined;
			this.disableInput();
			this.append('\n\n⏹ Proceso detenido por el usuario\n');
			
			if (scriptName && this.onProcessEnd) {
				this.onProcessEnd(scriptName);
			}
		}
	}
}
