import * as assert from 'assert';
import * as vscode from 'vscode';

// ─────────────────────────────────────────────
// Extension activation & command registration
// ─────────────────────────────────────────────
suite('Extension – Activation & Commands', () => {

	test('Extension is present in the extension host', () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension dvigo.npm-quick should be installed');
	});

	test('Extension is active', async () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension should exist');
		if (!ext.isActive) {
			await ext.activate();
		}
		assert.ok(ext.isActive, 'Extension should be active');
	});

	// All commands declared in package.json contributes.commands
	const expectedCommands = [
		'npm-quick.runScript',
		'npm-quick.executeScript',
		'npm-quick.refreshScripts',
		'npm-quick.addScript',
		'npm-quick.clearHistory',
		'npm-quick.removeHistoryItem',
		'npm-quick.viewScriptOutput',
		'npm-quick.stopScript',
		'npm-quick.openPanel',
	];

	for (const cmd of expectedCommands) {
		test(`Command "${cmd}" is registered`, async () => {
			const all = await vscode.commands.getCommands(true);
			assert.ok(all.includes(cmd), `Command ${cmd} should be registered`);
		});
	}
});

// ─────────────────────────────────────────────
// Keybindings / configuration contribution
// ─────────────────────────────────────────────
suite('Extension – Package.json Contributions', () => {

	test('Package.json contains required keybindings section', () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension should exist');
		const pkg = ext.packageJSON;
		assert.ok(pkg.contributes, 'contributes section should exist');
		assert.ok(Array.isArray(pkg.contributes.keybindings), 'keybindings should be an array');
		assert.ok(pkg.contributes.keybindings.length > 0, 'should have at least one keybinding');
	});

	test('Package.json declares the output webview view', () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension should exist');
		const pkg = ext.packageJSON;
		const views: Array<{ type: string; id: string }> = Object.values(pkg.contributes.views ?? {}).flat() as any;
		const outputView = views.find((v) => v.id === 'npm-quick.outputView');
		assert.ok(outputView, 'outputView should be declared in contributes.views');
	});

	test('Package.json declares the scripts tree view', () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension should exist');
		const pkg = ext.packageJSON;
		const views: Array<{ type: string; id: string }> = Object.values(pkg.contributes.views ?? {}).flat() as any;
		const scriptsView = views.find((v) => v.id === 'npm-quick.scriptsView');
		assert.ok(scriptsView, 'scriptsView should be declared in contributes.views');
	});

	test('Package.json version matches expected format (semver)', () => {
		const ext = vscode.extensions.getExtension('dvigo.npm-quick');
		assert.ok(ext, 'Extension should exist');
		const semverRegex = /^\d+\.\d+\.\d+$/;
		assert.ok(semverRegex.test(ext.packageJSON.version), `Version ${ext.packageJSON.version} should be semver`);
	});
});
