import * as assert from 'assert';
import { detectScriptType, getScriptTypeLabel } from '../scriptIcons';

// ─────────────────────────────────────────────
// detectScriptType – test suite
// ─────────────────────────────────────────────
suite('scriptIcons – detectScriptType', () => {

	// ── Test scripts ──────────────────────────
	const testNames = ['test', 'test:unit', 'test:e2e', 'jest', 'vitest', 'spec', 'run:spec'];
	for (const name of testNames) {
		test(`"${name}" is detected as "test"`, () => {
			assert.strictEqual(detectScriptType(name), 'test');
		});
	}

	// ── Build scripts ─────────────────────────
	const buildNames = ['build', 'build:prod', 'bundle', 'bundle:analyze', 'pack', 'compile', 'prebuild'];
	for (const name of buildNames) {
		test(`"${name}" is detected as "build"`, () => {
			assert.strictEqual(detectScriptType(name), 'build');
		});
	}

	// ── Dev scripts ───────────────────────────
	const devNames = ['dev', 'dev:server', 'start', 'start:dev', 'serve', 'serve:local'];
	for (const name of devNames) {
		test(`"${name}" is detected as "dev"`, () => {
			assert.strictEqual(detectScriptType(name), 'dev');
		});
	}

	// ── Lint scripts ──────────────────────────
	const lintNames = ['lint', 'lint:fix', 'eslint', 'eslint:check'];
	for (const name of lintNames) {
		test(`"${name}" is detected as "lint"`, () => {
			assert.strictEqual(detectScriptType(name), 'lint');
		});
	}

	// ── Format scripts ────────────────────────
	const formatNames = ['format', 'prettier'];
	for (const name of formatNames) {
		test(`"${name}" is detected as "format"`, () => {
			assert.strictEqual(detectScriptType(name), 'format');
		});
	}

	// ── Deploy scripts ────────────────────────
	const deployNames = ['deploy', 'deploy:prod', 'publish', 'release'];
	for (const name of deployNames) {
		test(`"${name}" is detected as "deploy"`, () => {
			assert.strictEqual(detectScriptType(name), 'deploy');
		});
	}

	// ── Docs scripts ──────────────────────────
	const docsNames = ['docs', 'doc', 'jsdoc', 'generate:docs'];
	for (const name of docsNames) {
		test(`"${name}" is detected as "docs"`, () => {
			assert.strictEqual(detectScriptType(name), 'docs');
		});
	}

	// ── Other scripts (fallback) ──────────────
	const otherNames = ['watch', 'clean', 'prepare', 'postinstall', 'custom-script', 'migrate'];
	for (const name of otherNames) {
		test(`"${name}" falls back to "other"`, () => {
			assert.strictEqual(detectScriptType(name), 'other');
		});
	}

	// ── Case-insensitive matching ─────────────
	test('Detection is case-insensitive: "BUILD" → build', () => {
		assert.strictEqual(detectScriptType('BUILD'), 'build');
	});

	test('Detection is case-insensitive: "TEST" → test', () => {
		assert.strictEqual(detectScriptType('TEST'), 'test');
	});

	test('Detection is case-insensitive: "DEV" → dev', () => {
		assert.strictEqual(detectScriptType('DEV'), 'dev');
	});
});

// ─────────────────────────────────────────────
// getScriptTypeLabel
// ─────────────────────────────────────────────
suite('scriptIcons – getScriptTypeLabel', () => {

	const expectedLabels: Record<string, string> = {
		test:   '$(testing-passed-icon) Test',
		build:  '$(settings-gear) Build',
		dev:    '$(run) Dev',
		lint:   '$(checklist) Lint',
		format: '$(edit) Format',
		deploy: '$(cloud-upload) Deploy',
		docs:   '$(book) Docs',
		other:  '$(play) Run',
	};

	for (const [scriptType, expectedLabel] of Object.entries(expectedLabels)) {
		test(`getScriptTypeLabel("${scriptType}") returns correct icon + text`, () => {
			const label = getScriptTypeLabel(scriptType as any);
			assert.strictEqual(label, expectedLabel);
		});
	}

	test('Label always contains a VS Code icon reference ($(...) format)', () => {
		const types = ['test', 'build', 'dev', 'lint', 'format', 'deploy', 'docs', 'other'] as const;
		for (const t of types) {
			const label = getScriptTypeLabel(t);
			assert.ok(label.includes('$('), `Label for "${t}" should contain a VS Code icon reference`);
		}
	});
});
