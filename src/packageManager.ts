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

/**
 * Get a visual length of a string, taking into account surrogate pairs (emojis) and ignoring ANSI escape codes.
 */
function getVisualLength(str: string): number {
  const clean = str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  let length = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      length += 2;
      i++;
    } else if (code === 0xfe0f) {
      // Skip variation selector
    } else {
      length += 1;
    }
  }
  return length;
}

/**
 * Format a box summary using standard ANSI escape codes for the audit results.
 */
export function formatAuditSummary(total: number, low: number, moderate: number, high: number, critical: number): string {
  const lineLength = 56;
  const borderChar = '│';
  const greenBorder = '\x1b[32m';
  const redBorder = '\x1b[31m';
  const reset = '\x1b[0m';
  
  let content = '';
  
  if (total === 0) {
    const boldGreen = '\x1b[1;32m';
    const titleLine = `  🛡️  Audit Summary: ${boldGreen}No vulnerabilities found${reset}`;
    const visualLen = getVisualLength(titleLine);
    const padding = ' '.repeat(Math.max(0, lineLength - visualLen));
    
    content += `${greenBorder}┌${'─'.repeat(lineLength)}┐${reset}\n`;
    content += `${greenBorder}${borderChar}${reset}${titleLine}${padding}${greenBorder}${borderChar}${reset}\n`;
    content += `${greenBorder}└${'─'.repeat(lineLength)}┘${reset}\n`;
  } else {
    const boldRed = '\x1b[1;31m';
    const titleText = `  ⚠️  Audit Summary: ${boldRed}${total} vulnerabilit${total > 1 ? 'ies' : 'y'} found${reset}`;
    const visualTitleLen = getVisualLength(titleText);
    const titlePadding = ' '.repeat(Math.max(0, lineLength - visualTitleLen));
    
    const bold = '\x1b[1m';
    const yellow = '\x1b[33m';
    const red = '\x1b[31m';
    const brightRed = '\x1b[91m';
    
    const breakdownText = `  Breakdown: Low: ${bold}${low}${reset} | Moderate: ${bold}${yellow}${moderate}${reset} | High: ${bold}${red}${high}${reset} | Critical: ${bold}${brightRed}${critical}${reset}`;
    const visualBreakdownLen = getVisualLength(breakdownText);
    const breakdownPadding = ' '.repeat(Math.max(0, lineLength - visualBreakdownLen));
    
    content += `${redBorder}┌${'─'.repeat(lineLength)}┐${reset}\n`;
    content += `${redBorder}${borderChar}${reset}${titleText}${titlePadding}${redBorder}${borderChar}${reset}\n`;
    content += `${redBorder}${borderChar}${reset}${' '.repeat(lineLength)}${redBorder}${borderChar}${reset}\n`;
    content += `${redBorder}${borderChar}${reset}${breakdownText}${breakdownPadding}${redBorder}${borderChar}${reset}\n`;
    content += `${redBorder}└${'─'.repeat(lineLength)}┘${reset}\n`;
  }
  
  return content;
}

/**
 * Scan the stdout/stderr log of an audit command and format a summary of vulnerability counts.
 */
export function parseAuditOutput(output: string): string | null {
  const cleanOutput = output.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');

  const noVulnerabilitiesPatterns = [
    /No vulnerabilities found/i,
    /found 0 vulnerabilities/i,
    /0 vulnerabilities found/i,
    /zero vulnerabilities/i
  ];

  const hasNoVulnerabilities = noVulnerabilitiesPatterns.some(pattern => pattern.test(cleanOutput));

  if (hasNoVulnerabilities) {
    return formatAuditSummary(0, 0, 0, 0, 0);
  }

  // Find total vulnerabilities
  const totalMatch = cleanOutput.match(/(\d+)\s+vulnerabilit/i) || cleanOutput.match(/[Ff]ound\s+(\d+)\s+vulnerabilit/i);
  let total = totalMatch ? parseInt(totalMatch[1], 10) : null;

  // Find breakdowns
  const getCount = (name: string): number => {
    const pattern1 = new RegExp(`(\\d+)\\s+${name}\\b`, 'i');
    const pattern2 = new RegExp(`\\b${name}:?\\s*(\\d+)\\b`, 'i');
    const match1 = cleanOutput.match(pattern1);
    if (match1) return parseInt(match1[1], 10);
    const match2 = cleanOutput.match(pattern2);
    if (match2) return parseInt(match2[1], 10);
    return 0;
  };

  const low = getCount('low');
  const moderate = getCount('moderate');
  const high = getCount('high');
  const critical = getCount('critical');
  const info = getCount('info');

  if (total === null) {
    total = low + moderate + high + critical + info;
    if (total === 0) {
      return null;
    }
  }

  return formatAuditSummary(total, low, moderate, high, critical);
}
