import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the directory of the current module
 */
function getCurrentDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

/**
 * Find package.json by traversing up from dist directory
 * Works whether running from src or dist
 */
function findPackageJson(): string {
  const currentDir = getCurrentDir();
  // Try multiple paths to handle different execution contexts:
  // - dist/index.js -> ../package.json
  // - src/utils/version.ts -> ../../package.json
  const possiblePaths = [
    resolve(currentDir, '../package.json'),
    resolve(currentDir, '../../package.json'),
    resolve(currentDir, '../../../package.json'),
  ];

  for (const path of possiblePaths) {
    try {
      readFileSync(path, 'utf-8');
      return path;
    } catch {
      // Try next path
    }
  }

  throw new Error('package.json not found');
}

/**
 * Read and parse package.json to extract version
 */
function getPackageVersion(): string {
  const packageJsonPath = findPackageJson();
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version as string;
}

/**
 * Get build number from environment variable or default to 0
 * In CI/CD, set BUILD_NUMBER environment variable
 */
function getBuildNumber(): number {
  const envBuildNumber = process.env.BUILD_NUMBER;
  if (envBuildNumber) {
    const parsed = Number.parseInt(envBuildNumber, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Semantic version from package.json
 */
export const SEMVER = getPackageVersion();

/**
 * Build number from environment or git commit count
 */
export const BUILD_NUMBER = getBuildNumber();

/**
 * Full version string in format: {semver}+build.{number}
 * Example: "0.1.0+build.42"
 */
export const VERSION = `${SEMVER}+build.${BUILD_NUMBER}`;

/**
 * Get version information object
 */
export function getVersionInfo(): {
  semver: string;
  buildNumber: number;
  full: string;
} {
  return {
    semver: SEMVER,
    buildNumber: BUILD_NUMBER,
    full: VERSION,
  };
}
