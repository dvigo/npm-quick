import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readPackageJson, detectPackageManager, getScriptCommand, parseAuditOutput } from '../packageManager';

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

	test('Detects bun when bun.lockb or bun.lock exists', async () => {
		const tmpDir1 = await createTempDir({ 'bun.lockb': '' });
		const tmpDir2 = await createTempDir({ 'bun.lock': '' });
		try {
			const pm1 = await detectPackageManager(tmpDir1);
			assert.strictEqual(pm1, 'bun');
			const pm2 = await detectPackageManager(tmpDir2);
			assert.strictEqual(pm2, 'bun');
		} finally {
			removeTempDir(tmpDir1);
			removeTempDir(tmpDir2);
		}
	});

	test('Detects deno when deno.lock or deno.json or deno.jsonc exists', async () => {
		const tmpDir1 = await createTempDir({ 'deno.lock': '' });
		const tmpDir2 = await createTempDir({ 'deno.json': '{}' });
		const tmpDir3 = await createTempDir({ 'deno.jsonc': '// comment\n{}' });
		try {
			const pm1 = await detectPackageManager(tmpDir1);
			assert.strictEqual(pm1, 'deno');
			const pm2 = await detectPackageManager(tmpDir2);
			assert.strictEqual(pm2, 'deno');
			const pm3 = await detectPackageManager(tmpDir3);
			assert.strictEqual(pm3, 'deno');
		} finally {
			removeTempDir(tmpDir1);
			removeTempDir(tmpDir2);
			removeTempDir(tmpDir3);
		}
	});

	test('Detects package manager via packageManager field in package.json', async () => {
		const tmpDir = await createTempDir({
			'package.json': JSON.stringify({ name: 'test', packageManager: 'bun@1.0.1' })
		});
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'bun');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Detects package manager via engines field in package.json', async () => {
		const tmpDir = await createTempDir({
			'package.json': JSON.stringify({ name: 'test', engines: { pnpm: '>=9.0.0' } })
		});
		try {
			const pm = await detectPackageManager(tmpDir);
			assert.strictEqual(pm, 'pnpm');
		} finally {
			removeTempDir(tmpDir);
		}
	});

	test('Correctly strips comments when reading deno.jsonc', async () => {
		const tmpDir = await createTempDir({
			'deno.jsonc': '{\n  // This is a comment\n  "name": "deno-project",\n  "tasks": {\n    "start": "deno run main.ts"\n  }\n}'
		});
		try {
			const pkg = await readPackageJson(tmpDir);
			assert.ok(pkg);
			assert.strictEqual(pkg?.name, 'deno-project');
			assert.deepStrictEqual(pkg?.scripts, { start: 'deno run main.ts' });
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

	test('Returns "bun run <script>" for bun', () => {
		assert.strictEqual(getScriptCommand('build', 'bun'), 'bun run build');
	});

	test('Returns "deno task <script>" for deno', () => {
		assert.strictEqual(getScriptCommand('build', 'deno'), 'deno task build');
	});

	test('Works with colon-separated script names (dev:server)', () => {
		assert.strictEqual(getScriptCommand('dev:server', 'npm'), 'npm run dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'pnpm'), 'pnpm run dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'yarn'), 'yarn dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'bun'), 'bun run dev:server');
		assert.strictEqual(getScriptCommand('dev:server', 'deno'), 'deno task dev:server');
	});

	test('Works with kebab-case script names', () => {
		assert.strictEqual(getScriptCommand('my-script', 'npm'), 'npm run my-script');
		assert.strictEqual(getScriptCommand('my-script', 'pnpm'), 'pnpm run my-script');
		assert.strictEqual(getScriptCommand('my-script', 'yarn'), 'yarn my-script');
		assert.strictEqual(getScriptCommand('my-script', 'bun'), 'bun run my-script');
		assert.strictEqual(getScriptCommand('my-script', 'deno'), 'deno task my-script');
	});

	test('Works with common script names: test, start, watch, lint, format', () => {
		const scripts = ['test', 'start', 'watch', 'lint', 'format'];
		for (const s of scripts) {
			assert.strictEqual(getScriptCommand(s, 'npm'), `npm run ${s}`);
			assert.strictEqual(getScriptCommand(s, 'yarn'), `yarn ${s}`);
			assert.strictEqual(getScriptCommand(s, 'pnpm'), `pnpm run ${s}`);
			assert.strictEqual(getScriptCommand(s, 'bun'), `bun run ${s}`);
			assert.strictEqual(getScriptCommand(s, 'deno'), `deno task ${s}`);
		}
	});

	test('Returns "<packageManager> install" for install', () => {
		assert.strictEqual(getScriptCommand('install', 'npm'), 'npm install');
		assert.strictEqual(getScriptCommand('install', 'pnpm'), 'pnpm install');
		assert.strictEqual(getScriptCommand('install', 'yarn'), 'yarn install');
		assert.strictEqual(getScriptCommand('install', 'bun'), 'bun install');
		assert.strictEqual(getScriptCommand('install', 'deno'), 'deno install');
	});

	test('Returns "<packageManager> audit" for audit', () => {
		assert.strictEqual(getScriptCommand('audit', 'npm'), 'npm audit');
		assert.strictEqual(getScriptCommand('audit', 'pnpm'), 'pnpm audit');
		assert.strictEqual(getScriptCommand('audit', 'yarn'), 'yarn audit');
		assert.strictEqual(getScriptCommand('audit', 'bun'), 'bun pm audit');
		assert.strictEqual(getScriptCommand('audit', 'deno'), 'deno task audit');
	});
});

// ─────────────────────────────────────────────
// parseAuditOutput
// ─────────────────────────────────────────────
suite('packageManager – parseAuditOutput', () => {

	test('Returns a green summary box when 0 vulnerabilities are found (no vulnerabilities pattern)', () => {
		const outputs = [
			'found 0 vulnerabilities',
			'No vulnerabilities found',
			'0 vulnerabilities found',
			'zero vulnerabilities'
		];
		for (const output of outputs) {
			const res = parseAuditOutput(output);
			assert.ok(res);
			assert.ok(res.includes('No vulnerabilities found'), `Should match green success string for: "${output}"`);
			assert.ok(res.includes('🛡️'), 'Should have shield emoji');
			assert.ok(res.includes('\x1b[32m'), 'Should have green ANSI border');
		}
	});

	test('Parses npm audit format with vulnerabilities', () => {
		const log = 'found 12 vulnerabilities (3 low, 6 moderate, 3 high, 0 critical)';
		const res = parseAuditOutput(log);
		assert.ok(res);
		assert.ok(res.includes('12 vulnerabilities found') || res.includes('12 vulnerability found'));
		assert.ok(res.includes('Low: \x1b[1m3'));
		assert.ok(res.includes('Moderate: \x1b[1m\x1b[33m6'));
		assert.ok(res.includes('High: \x1b[1m\x1b[31m3'));
		assert.ok(res.includes('Critical: \x1b[1m\x1b[91m0'));
		assert.ok(res.includes('\x1b[31m'), 'Should have red ANSI border');
	});

	test('Parses pnpm audit format with vulnerabilities', () => {
		const log = '5 vulnerabilities found\nSeverity: 1 low | 2 moderate | 2 high | 0 critical';
		const res = parseAuditOutput(log);
		assert.ok(res);
		assert.ok(res.includes('5 vulnerabilities found'));
		assert.ok(res.includes('Low: \x1b[1m1'));
		assert.ok(res.includes('Moderate: \x1b[1m\x1b[33m2'));
		assert.ok(res.includes('High: \x1b[1m\x1b[31m2'));
		assert.ok(res.includes('Critical: \x1b[1m\x1b[91m0'));
	});

	test('Parses yarn audit format with vulnerabilities', () => {
		const log = '5 vulnerabilities found - Resolutions still needed [1 low, 2 moderate, 2 high]';
		const res = parseAuditOutput(log);
		assert.ok(res);
		assert.ok(res.includes('5 vulnerabilities found'));
		assert.ok(res.includes('Low: \x1b[1m1'));
		assert.ok(res.includes('Moderate: \x1b[1m\x1b[33m2'));
		assert.ok(res.includes('High: \x1b[1m\x1b[31m2'));
		assert.ok(res.includes('Critical: \x1b[1m\x1b[91m0'));
	});

	test('Parses bun pm audit format with vulnerabilities', () => {
		const log = 'Found 3 vulnerabilities.';
		const res = parseAuditOutput(log);
		assert.ok(res);
		assert.ok(res.includes('3 vulnerabilities found') || res.includes('3 vulnerability found'));
	});

	test('Returns null if the output is not recognized as an audit log', () => {
		const log = 'some unrelated log message\nhello world\ncompilation complete';
		const res = parseAuditOutput(log);
		assert.strictEqual(res, null);
	});
});
