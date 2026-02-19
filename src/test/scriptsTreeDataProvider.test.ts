import * as assert from 'assert';
import * as vscode from 'vscode';
import { ScriptsTreeDataProvider, ScriptItem } from '../scriptsTreeDataProvider';
import { OutputViewProvider } from '../outputViewProvider';

// ─────────────────────────────────────────────
// Minimal stub for OutputViewProvider
// We only need the executeCommand method signature to exist
// ─────────────────────────────────────────────
function makeOutputStub(): OutputViewProvider {
	const ctx = {
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

	const stub = new OutputViewProvider(ctx);
	// Override executeCommand so it doesn't actually spawn processes
	(stub as any).executeCommand = async () => {};
	return stub;
}

function makeProvider(): ScriptsTreeDataProvider {
	const ctx = {
		extensionUri: vscode.Uri.file('/test'),
		subscriptions: [],
	} as unknown as vscode.ExtensionContext;
	return new ScriptsTreeDataProvider(ctx, makeOutputStub());
}

// ─────────────────────────────────────────────
// ScriptItem
// ─────────────────────────────────────────────
suite('ScriptItem – constructor & properties', () => {

	test('Creates item with "running" status and correct contextValue', () => {
		const item = new ScriptItem('$(run) Dev  dev', 'dev', 'node dev.js', 'dev', '/workspace', 'running', 'dev-123');
		assert.strictEqual(item.contextValue, 'script-running');
		assert.ok(item.iconPath instanceof vscode.ThemeIcon, 'icon should be a ThemeIcon');
	});

	test('Creates item with "completed" status and correct contextValue', () => {
		const item = new ScriptItem('$(settings-gear) Build  build', 'build', 'tsc', 'build', '/workspace', 'completed', 'build-456');
		assert.strictEqual(item.contextValue, 'script-history');
		assert.ok(item.iconPath instanceof vscode.ThemeIcon);
	});

	test('Creates item with "failed" status and correct contextValue', () => {
		const item = new ScriptItem('$(play) Run  test', 'test', 'jest', 'test', '/workspace', 'failed', 'test-789');
		assert.strictEqual(item.contextValue, 'script-history');
		assert.ok(item.iconPath instanceof vscode.ThemeIcon);
	});

	test('Item command is set to viewScriptOutput', () => {
		const item = new ScriptItem('label', 'script', 'cmd', 'other', '/ws', 'completed', 'id-1');
		assert.strictEqual(item.command?.command, 'npm-quick.viewScriptOutput');
		assert.deepStrictEqual(item.command?.arguments, [item]);
	});

	test('Running item has a spin loading icon', () => {
		const item = new ScriptItem('label', 'dev', 'cmd', 'dev', '/ws', 'running', 'id-run');
		const icon = item.iconPath as vscode.ThemeIcon;
		assert.strictEqual(icon.id, 'loading~spin');
	});

	test('Completed item has a pass icon', () => {
		const item = new ScriptItem('label', 'build', 'cmd', 'build', '/ws', 'completed', 'id-ok');
		const icon = item.iconPath as vscode.ThemeIcon;
		assert.strictEqual(icon.id, 'pass');
	});

	test('Failed item has an error icon', () => {
		const item = new ScriptItem('label', 'test', 'cmd', 'test', '/ws', 'failed', 'id-fail');
		const icon = item.iconPath as vscode.ThemeIcon;
		assert.strictEqual(icon.id, 'error');
	});
});

// ─────────────────────────────────────────────
// ScriptsTreeDataProvider – history management
// ─────────────────────────────────────────────
suite('ScriptsTreeDataProvider – history management', () => {

	test('Initially returns empty children', async () => {
		const provider = makeProvider();
		const children = await provider.getChildren();
		assert.deepStrictEqual(children, []);
	});

	test('addRunningScript adds an entry and returns its id', async () => {
		const provider = makeProvider();
		const id = provider.addRunningScript('build', 'npm run build', '/workspace');
		assert.ok(id, 'Should return a generated id');
		const children = await provider.getChildren();
		assert.strictEqual(children.length, 1);
		assert.strictEqual(children[0].script, 'build');
		assert.strictEqual(children[0].status, 'running');
	});

	test('addRunningScript accepts an explicit id', async () => {
		const provider = makeProvider();
		const id = provider.addRunningScript('test', 'npm run test', '/workspace', 'my-custom-id');
		assert.strictEqual(id, 'my-custom-id');
		const entry = provider.getEntry('my-custom-id');
		assert.ok(entry, 'Entry should exist by custom id');
	});

	test('addRunningScript generates an id when none is provided', () => {
		const provider = makeProvider();
		const id = provider.addRunningScript('lint', 'npm run lint', '/workspace');
		// Format: "<scriptName>-<timestamp>"
		assert.ok(id.startsWith('lint-'), 'Generated id should start with script name');
	});

	test('removeRunningScript marks entry as completed on success', async () => {
		const provider = makeProvider();
		provider.addRunningScript('build', 'npm run build', '/workspace', 'b-1');
		provider.removeRunningScript('build', true);
		const entry = provider.getEntry('b-1');
		assert.strictEqual(entry?.status, 'completed');
		assert.ok(entry?.endTime instanceof Date, 'endTime should be set');
	});

	test('removeRunningScript marks entry as failed on failure', async () => {
		const provider = makeProvider();
		provider.addRunningScript('test', 'npm test', '/workspace', 't-1');
		provider.removeRunningScript('test', false);
		const entry = provider.getEntry('t-1');
		assert.strictEqual(entry?.status, 'failed');
	});

	test('appendOutput accumulates text on the entry', () => {
		const provider = makeProvider();
		provider.addRunningScript('dev', 'npm run dev', '/workspace', 'd-1');
		provider.appendOutput('d-1', 'line 1\n');
		provider.appendOutput('d-1', 'line 2\n');
		assert.strictEqual(provider.getOutput('d-1'), 'line 1\nline 2\n');
	});

	test('getOutput returns empty string for unknown id', () => {
		const provider = makeProvider();
		assert.strictEqual(provider.getOutput('does-not-exist'), '');
	});

	test('removeHistoryItem deletes the entry', () => {
		const provider = makeProvider();
		provider.addRunningScript('build', 'npm run build', '/workspace', 'b-2');
		provider.removeHistoryItem('b-2');
		assert.strictEqual(provider.getEntry('b-2'), undefined);
		assert.strictEqual(provider.hasHistoryItem('b-2'), false);
	});

	test('hasHistoryItem returns true/false correctly', () => {
		const provider = makeProvider();
		provider.addRunningScript('lint', 'npm run lint', '/workspace', 'l-1');
		assert.strictEqual(provider.hasHistoryItem('l-1'), true);
		assert.strictEqual(provider.hasHistoryItem('non-existent'), false);
	});

	test('clearHistory removes only completed/failed entries, keeps running ones', async () => {
		const provider = makeProvider();
		provider.addRunningScript('dev', 'npm run dev', '/workspace', 'run-1');
		provider.addRunningScript('build', 'npm run build', '/workspace', 'done-1');
		provider.removeRunningScript('build', true); // mark as completed
		provider.clearHistory();

		// Running script should still be there
		assert.ok(provider.hasHistoryItem('run-1'), 'Running script should survive clearHistory');
		// Completed script should be gone
		assert.ok(!provider.hasHistoryItem('done-1'), 'Completed script should be removed by clearHistory');
	});

	test('clearHistory removes failed entries too', () => {
		const provider = makeProvider();
		provider.addRunningScript('test', 'npm test', '/workspace', 'fail-1');
		provider.removeRunningScript('test', false);
		provider.clearHistory();
		assert.ok(!provider.hasHistoryItem('fail-1'), 'Failed script should be removed by clearHistory');
	});
});

// ─────────────────────────────────────────────
// ScriptsTreeDataProvider – sorting
// ─────────────────────────────────────────────
suite('ScriptsTreeDataProvider – sort order', () => {

	test('Running scripts appear before completed ones', async () => {
		const provider = makeProvider();
		provider.addRunningScript('build', 'npm run build', '/ws', 'a');
		provider.addRunningScript('dev', 'npm run dev', '/ws', 'b');
		provider.removeRunningScript('build', true); // 'a' becomes completed
		// 'b' (dev) is still running

		const children = await provider.getChildren();
		assert.strictEqual(children[0].id, 'b', 'Running script should be first');
		assert.strictEqual(children[1].id, 'a', 'Completed script should be second');
	});

	test('Among non-running entries, newest appears first', async () => {
		const provider = makeProvider();
		provider.addRunningScript('lint', 'npm run lint', '/ws', 'old');
		// Small delay to ensure different timestamp
		await new Promise(r => setTimeout(r, 5));
		provider.addRunningScript('test', 'npm test', '/ws', 'new');
		provider.removeRunningScript('lint', true);
		provider.removeRunningScript('test', true);

		const children = await provider.getChildren();
		assert.strictEqual(children[0].id, 'new', 'Newer completed entry should appear first');
		assert.strictEqual(children[1].id, 'old', 'Older completed entry should appear second');
	});
});

// ─────────────────────────────────────────────
// ScriptsTreeDataProvider – TreeDataProvider API
// ─────────────────────────────────────────────
suite('ScriptsTreeDataProvider – TreeDataProvider API', () => {

	test('getTreeItem returns the same element unchanged', () => {
		const provider = makeProvider();
		const item = new ScriptItem('label', 'script', 'cmd', 'other', '/ws', 'completed', 'id-x');
		const result = provider.getTreeItem(item);
		assert.strictEqual(result, item);
	});

	test('getChildren with an element returns empty array (no nested children)', async () => {
		const provider = makeProvider();
		provider.addRunningScript('build', 'npm run build', '/ws', 'x');
		const item = (await provider.getChildren())[0];
		const nested = await provider.getChildren(item);
		assert.deepStrictEqual(nested, [], 'Tree items have no children');
	});

	test('onDidChangeTreeData fires after addRunningScript', (done) => {
		const provider = makeProvider();
		const disposable = provider.onDidChangeTreeData!(() => {
			disposable.dispose();
			done();
		});
		provider.addRunningScript('compile', 'tsc', '/ws', 'evt-1');
	});

	test('onDidChangeTreeData fires after removeRunningScript', (done) => {
		const provider = makeProvider();
		provider.addRunningScript('compile', 'tsc', '/ws', 'evt-2');
		const disposable = provider.onDidChangeTreeData!(() => {
			disposable.dispose();
			done();
		});
		provider.removeRunningScript('compile', true);
	});

	test('onDidChangeTreeData fires after clearHistory', (done) => {
		const provider = makeProvider();
		provider.addRunningScript('build', 'npm run build', '/ws', 'evt-3');
		provider.removeRunningScript('build', true);
		const disposable = provider.onDidChangeTreeData!(() => {
			disposable.dispose();
			done();
		});
		provider.clearHistory();
	});
});
