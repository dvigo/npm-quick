import * as fs from 'fs';
import * as path from 'path';
import { PackageJson, PackageManager } from './types';

/**
 * Read and parse package.json from the given directory
 */
export async function readPackageJson(dirPath: string): Promise<PackageJson | null> {
  try {
    const packageJsonPath = path.join(dirPath, 'package.json');
    const data = await fs.promises.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read package.json:', error);
    return null;
  }
}

/**
 * Detect which package manager is being used based on lock files
 */
export async function detectPackageManager(dirPath: string): Promise<PackageManager> {
  const lockFiles: Record<string, PackageManager> = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
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

  // Default to npm if no lock file found
  return 'npm';
}

/**
 * Get the command to run a script based on package manager
 */
export function getScriptCommand(scriptName: string, packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return `pnpm run ${scriptName}`;
    case 'yarn':
      return `yarn ${scriptName}`;
    case 'npm':
    default:
      return `npm run ${scriptName}`;
  }
}
