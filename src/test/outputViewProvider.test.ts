import * as assert from 'assert';
import * as vscode from 'vscode';
import { OutputViewProvider } from '../outputViewProvider';

// ─────────────────────────────────────────────
// Helper – create a minimal ExtensionContext stub
// ─────────────────────────────────────────────
function makeContext(): vscode.ExtensionContext {
	return {
		extensionUri: vscode.Uri.file('/test'),
		subscriptions: [],
		extensionPath: '/test',
		globalState: { get: () => undefined, update: async () => {}, setKeysForSync: () => {} },
		workspaceState: { get: () => undefined, update: async () => {} },
		secrets: { get: async () => undefined, store: async () => {}, delete: async () => {} },
		storageUri: undefined,
		globalStorageUri: vscode.Uri.file('/tmp'),
		logUri: vscode.Uri.file('/tmp'),
		extensionMode: vscode.ExtensionMode.Test,
		asAbsolutePath: (p: string) => p,
		storagePath: undefined,
		globalStoragePath: '/tmp',
		logPath: '/tmp',
		environmentVariableCollection: {} as any,
		extension: {} as any,
		languageModelAccessInformation: {} as any,
	} as unknown as vscode.ExtensionContext;
}

// ─────────────────────────────────────────────
// Helper – mock webview view so UI calls don't crash
// ─────────────────────────────────────────────
function attachMockView(provider: OutputViewProvider): { messages: Array<{ command: string }> } {
	const messages: Array<{ command: string }> = [];
	const mockView = {
		show: (_preserveFocus?: boolean) => {},
		webview: {
			postMessage: (msg: any) => { messages.push(msg); return Promise.resolve(true); },
			html: '',
			options: {},
			onDidReceiveMessage: () => ({ dispose: () => {} }),
		},
	};
	(provider as any).view = mockView;
	return { messages };
}

// ─────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────
suite('OutputViewProvider – initial state', () => {

	test('getCurrentScriptId() returns undefined initially', () => {
		const provider = new OutputViewProvider(makeContext());
		assert.strictEqual(provider.getCurrentScriptId(), undefined);
	});

	test('view is undefined before resolveWebviewView is called', () => {
		const provider = new OutputViewProvider(makeContext());
		assert.strictEqual((provider as any).view, undefined);
	});

	test('processes map is initially empty', () => {
		const provider = new OutputViewProvider(makeContext());
		const processes: Map<string, any> = (provider as any).processes;
		assert.strictEqual(processes.size, 0);
	});
});

// ─────────────────────────────────────────────
// setProcessCallbacks
// ─────────────────────────────────────────────
suite('OutputViewProvider – setProcessCallbacks', () => {

	test('Stores all four callbacks correctly', () => {
		const provider = new OutputViewProvider(makeContext());
		const onStart = () => {};
		const onEnd = () => {};
		const onRemove = () => {};
		const onAppend = () => {};
		provider.setProcessCallbacks(onStart, onEnd, onRemove, onAppend);
		assert.strictEqual((provider as any).onProcessStart, onStart);
		assert.strictEqual((provider as any).onProcessEnd, onEnd);
		assert.strictEqual((provider as any).onRemoveHistoryItem, onRemove);
		assert.strictEqual((provider as any).onAppendOutput, onAppend);
	});

	test('Works with only start and end callbacks (optional args omitted)', () => {
		const provider = new OutputViewProvider(makeContext());
		provider.setProcessCallbacks(() => {}, () => {});
		assert.strictEqual((provider as any).onRemoveHistoryItem, undefined);
		assert.strictEqual((provider as any).onAppendOutput, undefined);
	});
});

// ─────────────────────────────────────────────
// append & clear
// ─────────────────────────────────────────────
suite('OutputViewProvider – append / clear', () => {

	test('append sends an "append" message to the webview', () => {
		const provider = new OutputViewProvider(makeContext());
		const { messages } = attachMockView(provider);
		provider.append('hello world');
		const appendMsg = messages.find(m => m.command === 'append');
		assert.ok(appendMsg, 'Should send append message');
		assert.strictEqual((appendMsg as any).text, 'hello world');
	});

	test('append calls onAppendOutput callback with currentScriptId and text', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		const received: Array<{ id: string; text: string }> = [];
		provider.setProcessCallbacks(() => {}, () => {}, () => {}, (id, text) => received.push({ id, text }));
		(provider as any).currentScriptId = 'test-id-1';
		provider.append('some output');
		assert.strictEqual(received.length, 1);
		assert.strictEqual(received[0].id, 'test-id-1');
		assert.strictEqual(received[0].text, 'some output');
	});

	test('append does not crash when view is undefined', () => {
		const provider = new OutputViewProvider(makeContext());
		assert.doesNotThrow(() => provider.append('text without view'));
	});

	test('clear sends "clear" and "disableDelete" messages to the webview', () => {
		const provider = new OutputViewProvider(makeContext());
		const { messages } = attachMockView(provider);
		provider.clear();
		assert.ok(messages.some(m => m.command === 'clear'), 'Should send clear');
		assert.ok(messages.some(m => m.command === 'disableDelete'), 'Should send disableDelete');
	});

	test('clear does not crash when view is undefined', () => {
		const provider = new OutputViewProvider(makeContext());
		assert.doesNotThrow(() => provider.clear());
	});
});

// ─────────────────────────────────────────────
// loadOutput
// ─────────────────────────────────────────────
suite('OutputViewProvider – loadOutput', () => {

	test('loadOutput sets currentScriptId', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		provider.loadOutput('output text', 'script-42', false, 'build');
		assert.strictEqual(provider.getCurrentScriptId(), 'script-42');
	});

	test('loadOutput for a running script enables Stop and Input', () => {
		const provider = new OutputViewProvider(makeContext());
		const { messages } = attachMockView(provider);
		provider.loadOutput('...', 'id-running', true, 'dev');
		assert.ok(messages.some(m => m.command === 'enableStop'), 'Should enable Stop');
		assert.ok(messages.some(m => m.command === 'enableInput'), 'Should enable Input');
	});

	test('loadOutput for a non-running script disables Stop and Input', () => {
		const provider = new OutputViewProvider(makeContext());
		const { messages } = attachMockView(provider);
		provider.loadOutput('...', 'id-done', false, 'build');
		assert.ok(messages.some(m => m.command === 'disableStop'), 'Should disable Stop');
		assert.ok(messages.some(m => m.command === 'disableInput'), 'Should disable Input');
	});

	test('loadOutput sends the full output as an append message', () => {
		const provider = new OutputViewProvider(makeContext());
		const { messages } = attachMockView(provider);
		provider.loadOutput('full output here', 'id-x', false, 'test');
		const appendMsg = messages.find(m => m.command === 'append');
		assert.ok(appendMsg, 'Should send append with saved output');
		assert.strictEqual((appendMsg as any).text, 'full output here');
	});

	test('loadOutput clears currentScriptName for non-running scripts', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		(provider as any).currentScriptName = 'old-script';
		provider.loadOutput('...', 'id-y', false);
		assert.strictEqual((provider as any).currentScriptName, undefined);
	});

	test('loadOutput sets currentScriptName for running scripts', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		provider.loadOutput('...', 'id-z', true, 'dev-server');
		assert.strictEqual((provider as any).currentScriptName, 'dev-server');
	});
});

// ─────────────────────────────────────────────
// stopCurrentScript
// ─────────────────────────────────────────────
suite('OutputViewProvider – stopCurrentScript', () => {

	test('stopCurrentScript does nothing when no script is running (currentScriptId is undefined)', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		assert.doesNotThrow(() => provider.stopCurrentScript());
	});

	test('stopCurrentScript does nothing when currentScriptId has no matching process', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		(provider as any).currentScriptId = 'phantom-id';
		assert.doesNotThrow(() => provider.stopCurrentScript());
	});

	test('stopCurrentScript sends SIGINT to the process and calls onProcessEnd', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);

		let killSignal: string | undefined;
		let endCalled = false;
		let endSuccess: boolean | undefined;

		const mockProcess = {
			kill: (signal: string) => { killSignal = signal; },
			stdin: null,
			stdout: { on: () => {} },
			stderr: { on: () => {} },
			on: () => {},
		};

		(provider as any).currentScriptId = 'proc-1';
		(provider as any).currentScriptName = 'dev';
		(provider as any).processes.set('proc-1', mockProcess);
		provider.setProcessCallbacks(
			() => {},
			(_name: string, success: boolean) => { endCalled = true; endSuccess = success; }
		);

		provider.stopCurrentScript();

		assert.strictEqual(killSignal, 'SIGINT', 'Should send SIGINT first');
		assert.ok(endCalled, 'onProcessEnd callback should be called');
		assert.strictEqual(endSuccess, false, 'Stopped process should report failure');
	});

	test('stopCurrentScript removes process from the processes map', () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);

		const mockProcess = { kill: () => {}, stdin: null };
		(provider as any).currentScriptId = 'proc-2';
		(provider as any).currentScriptName = 'build';
		(provider as any).processes.set('proc-2', mockProcess);
		provider.setProcessCallbacks(() => {}, () => {});

		provider.stopCurrentScript();

		assert.strictEqual((provider as any).processes.has('proc-2'), false, 'Process should be removed from map');
	});
});

// ─────────────────────────────────────────────
// executeCommand – onProcessStart callback
// ─────────────────────────────────────────────
suite('OutputViewProvider – executeCommand callbacks', () => {

	test('executeCommand calls onProcessStart with correct scriptName, command, and scriptId', async () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);

		let startArgs: { scriptName: string; command: string; scriptId?: string } | undefined;
		provider.setProcessCallbacks(
			(scriptName, command, scriptId) => { startArgs = { scriptName, command, scriptId }; },
			() => {}
		);

		await provider.executeCommand('echo hello', '/tmp', 'my-script', 'my-id');

		assert.ok(startArgs, 'onProcessStart should have been called');
		assert.strictEqual(startArgs?.scriptName, 'my-script');
		assert.strictEqual(startArgs?.command, 'echo hello');
		assert.strictEqual(startArgs?.scriptId, 'my-id');
	});

	test('executeCommand generates a scriptId when none is provided', async () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);

		let receivedId: string | undefined;
		provider.setProcessCallbacks(
			(_name, _cmd, id) => { receivedId = id; },
			() => {}
		);

		await provider.executeCommand('echo hello', '/tmp', 'auto-id-script');
		assert.ok(receivedId, 'Should generate an id');
		assert.ok(receivedId?.startsWith('auto-id-script-'), 'Generated id should include the script name');
	});

	test('executeCommand sets currentScriptId correctly', async () => {
		const provider = new OutputViewProvider(makeContext());
		attachMockView(provider);
		provider.setProcessCallbacks(() => {}, () => {});

		await provider.executeCommand('echo hello', '/tmp', 'build', 'custom-42');
		assert.strictEqual(provider.getCurrentScriptId(), 'custom-42');
	});
});

