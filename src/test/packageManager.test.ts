import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readPackageJson, detectPackageManager, getScriptCommand } from '../packageManager';

// Helper to create a temporary directory with specific files
async function createTempDir(files: Record<string, string>): Promise<string> {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'npm-quick-test-'));
	for (const [filename, content] of Object.entries(files)) {
		fs.writeFileSync(path.join(tmpDir, filename), content, 'utf-8');
	}
	return tmpDir;
}

function removeTempDir(dir: string) {
	fs.rmSync(dir, { recursive: true, force: true });
}

// ─────────────────────────────────────────────
// readPackageJson
// ─────────────────────────────────────────────
suite('packageManager – readPackageJson', () => {

	test('Returns parsed JSON when package.json exists', async () => {
		const tmpDir = await createTempDir({
			'package.json': JSON.stringify({ name: 'test-project', scripts: { build: 'tsc', test: 'jest' } })
		});
		try {
			const result = await readPackageJson(tmpDir);
			assert.ok(result, 'Should return a parsed object');
			assert.strictEqual(result?.name, 'test-project');
			assert.deepStrictEqual(result?.scripts, { build: 'tsc', test: 'jest' });
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Returns null when package.json does not exist', async () => {
		const tmpDir = await createTempDir({});
		try {
			const result = await readPackageJson(tmpDir);
			assert.strictEqual(result, null);
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Returns null when package.json contains invalid JSON', async () => {
		const tmpDir = await createTempDir({ 'package.json': '{ invalid json !!!' });
		try {
			const result = await readPackageJson(tmpDir);
			assert.strictEqual(result, null);
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Returns object with empty scripts', async () => {
		const tmpDir = await createTempDir({
			'package.json': JSON.stringify({ name: 'empty', scripts: {} })
		});
		try {
			const result = await readPackageJson(tmpDir);
			assert.ok(result, 'Should return object');
			assert.deepStrictEqual(result?.scripts, {});
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Returns object even when scripts key is missing', async () => {
		const tmpDir = await createTempDir({
			'package.json': JSON.stringify({ name: 'no-scripts' })
		});
		try {
			const result = await readPackageJson(tmpDir);
			assert.ok(result, 'Should return object');
			assert.strictEqual(result?.scripts, undefined);
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Preserves all top-level fields', async () => {
		const pkg = { name: 'full', version: '1.0.0', author: 'test', scripts: { start: 'node index.js' } };
		const tmpDir = await createTempDir({ 'package.json': JSON.stringify(pkg) });
		try {
			const result = await readPackageJson(tmpDir);
			assert.strictEqual(result?.name, 'full');
			assert.strictEqual(result?.version, '1.0.0');
			assert.strictEqual(result?.author, 'test');
		} finally {
			removeTempDir(tmpDir);
		}
	});
});

// ─────────────────────────────────────────────
// detectPackageManager
// ─────────────────────────────────────────────
suite('packageManager – detectPackageManager', () => {

	test('Detects pnpm when pnpm-lock.yaml exists', async () => {
		const tmpDir = await createTempDir({ 'pnpm-lock.yaml': '' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'pnpm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Detects yarn when yarn.lock exists', async () => {
		const tmpDir = await createTempDir({ 'yarn.lock': '' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'yarn');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Detects npm when package-lock.json exists', async () => {
		const tmpDir = await createTempDir({ 'package-lock.json': '{}' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'npm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Defaults to npm when no lock file is present', async () => {
		const tmpDir = await createTempDir({});
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'npm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Prefers pnpm over yarn when both lock files exist', async () => {
		// pnpm-lock.yaml is checked first in the implementation
		const tmpDir = await createTempDir({ 'pnpm-lock.yaml': '', 'yarn.lock': '' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'pnpm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Prefers pnpm over package-lock.json when both exist', async () => {
		const tmpDir = await createTempDir({ 'pnpm-lock.yaml': '', 'package-lock.json': '{}' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'pnpm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Prefers yarn over npm when both yarn.lock and package-lock.json exist', async () => {
		const tmpDir = await createTempDir({ 'yarn.lock': '', 'package-lock.json': '{}' });
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'yarn');
		} finally {
			removeTempDir(tmpDir);
		}
	});
});

// ─────────────────────────────────────────────
// getScriptCommand
// ─────────────────────────────────────────────
suite('packageManager – getScriptCommand', () => {

	test('Returns "npm run <script>" for npm', () => {
		assert.strictEqual(getScriptCommand('build', 'npm'), 'npm run build');
	});

	test('Returns "pnpm run <script>" for pnpm', () => {
		assert.strictEqual(getScriptCommand('build', 'pnpm'), 'pnpm run build');
	});

	test('Returns "yarn <script>" for yarn (no "run" prefix)', () => {
		assert.strictEqual(getScriptCommand('build', 'yarn'), 'yarn build');
	});

	test('Works with colon-separated script names (dev:server)', () => {
		assert.strictEqual(getScriptCommand('dev:server', 'npm'), 'npm run dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'pnpm'), 'pnpm run dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'yarn'), 'yarn dev:server');
	});

	test('Works with kebab-case script names', () => {
		assert.strictEqual(getScriptCommand('my-script', 'npm'), 'npm run my-script');
		assert.strictEqual(getScriptCommand('my-script', 'pnpm'), 'pnpm run my-script');
		assert.strictEqual(getScriptCommand('my-script', 'yarn'), 'yarn my-script');
	});

	test('Works with common script names: test, start, watch, lint, format', () => {
		const scripts = ['test', 'start', 'watch', 'lint', 'format'];
		for (const s of scripts) {
			assert.strictEqual(getScriptCommand(s, 'npm'), `npm run ${s}`);
			assert.strictEqual(getScriptCommand(s, 'yarn'), `yarn ${s}`);
			assert.strictEqual(getScriptCommand(s, 'pnpm'), `pnpm run ${s}`);
		}
	});
});
