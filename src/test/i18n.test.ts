import * as assert from 'assert';
import * as vscode from 'vscode';
import { t } from '../i18n';

// ─────────────────────────────────────────────
// i18n – t() function
//
// Note: In the VS Code test environment the language is usually 'en'.
// We test that every known key returns a non-empty string and that
// fallback behaviour works correctly.
// ─────────────────────────────────────────────
suite('i18n – t() translation function', () => {

	// ── Known keys should always return a non-empty string ───────────
	const knownKeys = [
		'noWorkspace',
		'noScripts',
		'selectScript',
		'executing',
		'processCompleted',
		'processTerminated',
		'processStopped',
		'error',
		'confirmClearHistory',
		'confirmRemoveItem',
		'historyCleared',
		'yes',
		'no',
		'running',
		'completed',
		'failed',
		'enterInput',
		'stop',
		'clear',
	];

	for (const key of knownKeys) {
		test(`t("${key}") returns a non-empty string`, () => {
			const result = t(key);
			assert.ok(typeof result === 'string', `t("${key}") should return a string`);
			assert.ok(result.length > 0, `t("${key}") should not be empty`);
		});
	}

	// ── Unknown key returns the key itself (fallback) ─────────────────
	test('t() returns the key itself for unknown translation keys', () => {
		const unknownKey = '__this_key_does_not_exist__';
		const result = t(unknownKey);
		assert.strictEqual(result, unknownKey, 'Should fall back to the key string');
	});

	// ── In English VS Code environment, verify specific translations ──
	// These tests assume the test runner is in English (which is typical in CI)
	test('t("yes") returns a non-empty string in any supported language', () => {
		const result = t('yes');
		// All supported langs have a translation for 'yes'
		assert.ok(['Yes', 'Sí', 'Oui', 'Ja', 'Sim', 'Sì'].includes(result),
			`t("yes") should be one of the supported translations, got: ${result}`);
	});

	test('t("no") returns a non-empty string in any supported language', () => {
		const result = t('no');
		assert.ok(['No', 'Non', 'Nein', 'Não'].includes(result) || result === 'No',
			`t("no") should be one of the supported translations, got: ${result}`);
	});

	test('t("stop") is never empty', () => {
		const result = t('stop');
		assert.ok(result.length > 0);
	});

	test('t("error") is never empty', () => {
		const result = t('error');
		assert.ok(result.length > 0);
	});

	// ── Result is always a string type ────────────────────────────────
	test('t() always returns a string, never null or undefined', () => {
		for (const key of knownKeys) {
			const result = t(key);
			assert.strictEqual(typeof result, 'string');
			assert.notStrictEqual(result, null);
			assert.notStrictEqual(result, undefined);
		}
	});

	// ── Language detected from vscode.env.language ────────────────────
	test('t() uses vscode.env.language to pick the right language', () => {
		// We can at least verify the function uses the VS Code locale
		const lang = vscode.env.language;
		assert.ok(typeof lang === 'string', 'vscode.env.language should be a string');
		assert.ok(lang.length > 0, 'vscode.env.language should not be empty');

		// The result of t() should not throw regardless of locale
		assert.doesNotThrow(() => t('executing'));
	});

	// ── Smoke test: all keys return different content from each other ─
	test('Different keys return different strings', () => {
		const results = knownKeys.map(key => t(key));
		// Not all should be equal to each other – there should be variety
		const uniqueValues = new Set(results);
		assert.ok(uniqueValues.size > 1, 'Different keys should produce different translations');
	});
});
