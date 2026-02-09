import * as vscode from 'vscode';

export class OutputViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'npm-quick.outputView';
	private view?: vscode.WebviewView;

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
	}

	public async reveal() {
		if (this.view) {
			// Open the view container
			await vscode.commands.executeCommand('workbench.view.extension.npm-quick-scripts');
			// Show the view and focus it
			this.view.show(true);
			// Focus on the output view
			await vscode.commands.executeCommand('npm-quick.outputView.focus');
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
			padding: 10px;
			font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
			font-size: 12px;
			color: #d4d4d4;
			background-color: #1e1e1e;
			line-height: 1.5;
		}
		#output {
			white-space: pre-wrap;
			word-wrap: break-word;
			overflow-y: auto;
			max-height: 100vh;
		}
		.success {
			color: #4ec9b0;
		}
		.error {
			color: #f48771;
		}
		.info {
			color: #75beff;
		}
	</style>
</head>
<body>
	<div id="output"></div>
	<script>
		const vscode = acquireVsCodeApi();
		const outputDiv = document.getElementById('output');

		window.addEventListener('message', event => {
			const message = event.data;
			if (message.command === 'append') {
				outputDiv.textContent += message.text;
				outputDiv.scrollTop = outputDiv.scrollHeight;
			} else if (message.command === 'clear') {
				outputDiv.textContent = '';
			}
		});
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
}
