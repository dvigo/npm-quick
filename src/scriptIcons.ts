import * as vscode from 'vscode';
import { ScriptType } from './types';

/**
 * Detects the type of script based on its name
 */
export function detectScriptType(scriptName: string): ScriptType {
  const name = scriptName.toLowerCase();

  // Test scripts
  if (name.includes('test') || name.includes('spec') || name.includes('jest') || name.includes('vitest')) {
    return 'test';
  }

  // Build scripts
  if (name.includes('build') || name.includes('bundle') || name.includes('pack') || name.includes('compile')) {
    return 'build';
  }

  // Dev/development scripts
  if (name.includes('dev') || name.includes('start') || name.includes('serve') || name === 'dev:server') {
    return 'dev';
  }

  // Lint scripts
  if (name.includes('lint') || name.includes('eslint') || name.includes('prettier') && name.includes('check')) {
    return 'lint';
  }

  // Format scripts
  if (name.includes('format') || (name.includes('prettier') && !name.includes('check'))) {
    return 'format';
  }

  // Deploy scripts
  if (name.includes('deploy') || name.includes('publish') || name.includes('release')) {
    return 'deploy';
  }

  // Docs scripts
  if (name.includes('doc') || name.includes('docs') || name.includes('jsdoc')) {
    return 'docs';
  }

  return 'other';
}

/**
 * Gets the icon path for a specific script type
 */
export function getIconPath(scriptType: ScriptType): vscode.ThemeIcon | string {
  const iconMap: Record<ScriptType, vscode.ThemeIcon> = {
    test: new vscode.ThemeIcon('testing-passed-icon'),
    build: new vscode.ThemeIcon('settings-gear'),
    dev: new vscode.ThemeIcon('run'),
    lint: new vscode.ThemeIcon('checklist'),
    format: new vscode.ThemeIcon('edit'),
    deploy: new vscode.ThemeIcon('cloud-upload'),
    docs: new vscode.ThemeIcon('book'),
    other: new vscode.ThemeIcon('play'),
  };

  return iconMap[scriptType];
}

/**
 * Gets a color badge for a specific script type (for QuickPick items)
 */
export function getScriptTypeLabel(scriptType: ScriptType): string {
  const labelMap: Record<ScriptType, string> = {
    test: '$(testing-passed-icon) Test',
    build: '$(settings-gear) Build',
    dev: '$(run) Dev',
    lint: '$(checklist) Lint',
    format: '$(edit) Format',
    deploy: '$(cloud-upload) Deploy',
    docs: '$(book) Docs',
    other: '$(play) Run',
  };

  return labelMap[scriptType];
}
