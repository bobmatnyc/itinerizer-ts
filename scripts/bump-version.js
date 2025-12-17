#!/usr/bin/env node

/**
 * Version bump script with build number
 * Usage: npm run version:bump [major|minor|patch]
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '../package.json');

/**
 * Get git commit count as build number
 */
function getGitCommitCount() {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf-8' });
    return Number.parseInt(count.trim(), 10);
  } catch {
    return 0;
  }
}

/**
 * Bump version number
 */
function bumpVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function main() {
  const bumpType = process.argv[2] || 'patch';

  if (!['major', 'minor', 'patch'].includes(bumpType)) {
    console.error('Usage: npm run version:bump [major|minor|patch]');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  const buildNumber = getGitCommitCount();

  pkg.version = newVersion;
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`Version bumped: ${oldVersion} → ${newVersion}`);
  console.log(`Build number: ${buildNumber}`);
  console.log(`Full version: ${newVersion}+build.${buildNumber}`);
}

main();
