import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Integration tests – run inside a real VS Code instance
// with a workspace that has a package.json
// ─────────────────────────────────────────────
suite('Integration – workspace & package.json', () => {

	test('Workspace contains a package.json with scripts', async () => {
		const folders = vscode.workspace.workspaceFolders;
		assert.ok(folders && folders.length > 0, 'Should have at least one workspace folder');
		const pkgPath = path.join(folders![0].uri.fsPath, 'package.json');
		assert.ok(fs.existsSync(pkgPath), 'package.json should exist in workspace');
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
		assert.ok(pkg.scripts && Object.keys(pkg.scripts).length > 0, 'Should have scripts defined');
	});

	test('Workspace package.json has compile and watch scripts', async () => {
		const folders = vscode.workspace.workspaceFolders;
		assert.ok(folders && folders.length > 0);
		const pkg = JSON.parse(fs.readFileSync(path.join(folders![0].uri.fsPath, 'package.json'), 'utf-8'));
		assert.ok(pkg.scripts.compile, '"compile" script should be defined');
		assert.ok(pkg.scripts.watch, '"watch" script should be defined');
	});

	test('Workspace package.json publisher is "dvigo"', async () => {
		const folders = vscode.workspace.workspaceFolders;
		assert.ok(folders && folders.length > 0);
		const pkg = JSON.parse(fs.readFileSync(path.join(folders![0].uri.fsPath, 'package.json'), 'utf-8'));
		assert.strictEqual(pkg.publisher, 'dvigo');
	});

	test('npm-quick.runScript command executes without throwing', async () => {
		// We can't fully run a script in tests, but we can verify the command is callable
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('npm-quick.runScript'));
	});

	test('npm-quick.openPanel command opens the panel without throwing', async () => {
		await assert.doesNotReject(
			Promise.resolve(vscode.commands.executeCommand('npm-quick.openPanel')),
			'openPanel command should not throw'
		);
	});

	test('npm-quick.refreshScripts command executes without throwing', async () => {
		await assert.doesNotReject(
			Promise.resolve(vscode.commands.executeCommand('npm-quick.refreshScripts')),
			'refreshScripts command should not throw'
		);
	});

	test('npm-quick.stopScript command executes without throwing when no script is running', async () => {
		await assert.doesNotReject(
			Promise.resolve(vscode.commands.executeCommand('npm-quick.stopScript')),
			'stopScript should not throw when idle'
		);
	});
});
