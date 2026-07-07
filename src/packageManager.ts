import * as fs from 'fs';
import * as path from 'path';
import { PackageJson, PackageManager } from './types';

/**
 * Strip comments from JSON strings (for deno.jsonc support)
 */
function stripComments(content: string): string {
  return content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
}

export async function readPackageJson(dirPath: string): Promise<PackageJson | null> {
  let packageJsonError: any = null;
  // Try package.json first
  try {
    const packageJsonPath = path.join(dirPath, 'package.json');
    const data = await fs.promises.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    packageJsonError = error;
  }

  // If package.json fails, check for deno.json / deno.jsonc
  for (const filename of ['deno.json', 'deno.jsonc']) {
    try {
      const denoPath = path.join(dirPath, filename);
      const data = await fs.promises.readFile(denoPath, 'utf-8');
      const cleanData = stripComments(data);
      const parsed = JSON.parse(cleanData);
      if (parsed) {
        return {
          name: parsed.name,
          scripts: parsed.tasks || {},
          ...parsed
        };
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to parse Deno config file ${filename}:`, error);
      }
    }
  }

  // Only log package.json error if it was a real parse/read error (not ENOENT)
  if (packageJsonError && packageJsonError.code !== 'ENOENT') {
    console.error('Failed to read package.json:', packageJsonError);
  }

  return null;
}

/**
 * Detect which package manager/engine is being used
 */
export async function detectPackageManager(dirPath: string): Promise<PackageManager> {
  // 1. Try reading package.json/deno config to check packageManager and engines fields
  try {
    const packageJson = await readPackageJson(dirPath);
    if (packageJson) {
      // Check packageManager field (e.g., "pnpm@9.5.0", "yarn@3.6.0", "bun@1.0.0", "deno@1.0.0")
      if (typeof packageJson.packageManager === 'string') {
        const match = packageJson.packageManager.match(/^(npm|pnpm|yarn|bun|deno)(?:@|$)/i);
        if (match) {
          return match[1].toLowerCase() as PackageManager;
        }
      }

      // Check engines field (e.g. "engines": { "pnpm": ">=9.0.0" })
      if (packageJson.engines && typeof packageJson.engines === 'object') {
        const engines = packageJson.engines;
        for (const pm of ['pnpm', 'yarn', 'npm', 'bun', 'deno'] as PackageManager[]) {
          if (pm in engines) {
            return pm;
          }
        }
      }
    }
  } catch (error) {
    // Ignore error and fall back to lock files
  }

  // 2. Check lock files
  const lockFiles: Record<string, PackageManager> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'npm-shrinkwrap.json': 'npm',
    'bun.lockb': 'bun',
    'bun.lock': 'bun',
    'deno.lock': 'deno',
  };

  for (const [filename, pm] of Object.entries(lockFiles)) {
    const lockFilePath = path.join(dirPath, filename);
    try {
      await fs.promises.access(lockFilePath);
      return pm;
    } catch {
      // File doesn't exist, continue
    }
  }

  // 3. Check for Deno configuration files
  for (const filename of ['deno.json', 'deno.jsonc']) {
    const denoPath = path.join(dirPath, filename);
    try {
      await fs.promises.access(denoPath);
      return 'deno';
    } catch {
      // File doesn't exist, continue
    }
  }

  // Default to npm if no configuration or lock file found
  return 'npm';
}

/**
 * Get the command to run a script based on package manager
 */
export function getScriptCommand(scriptName: string, packageManager: PackageManager): string {
  if (scriptName === 'install') {
    if (packageManager === 'deno') {
      return 'deno install';
    }
    return `${packageManager} install`;
  }
  if (scriptName === 'audit') {
    if (packageManager === 'bun') {
      return 'bun pm audit';
    }
    if (packageManager === 'deno') {
      return 'deno task audit';
    }
    return `${packageManager} audit`;
  }
  switch (packageManager) {
    case 'pnpm':
      return `pnpm run ${scriptName}`;
    case 'yarn':
      return `yarn ${scriptName}`;
    case 'bun':
      return `bun run ${scriptName}`;
    case 'deno':
      return `deno task ${scriptName}`;
    case 'npm':
    default:
      return `npm run ${scriptName}`;
  }
}
