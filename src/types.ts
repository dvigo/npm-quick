/**
 * Types for the task-executor extension
 */

export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  [key: string]: any;
}

export interface ScriptItem {
  label: string;
  description: string;
  script: string;
  iconPath?: string;
  scriptType?: ScriptType;
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export type ScriptType = 'test' | 'build' | 'dev' | 'lint' | 'format' | 'deploy' | 'docs' | 'other';
