/**
 * Version Generator Script
 * 
 * Generates version.json with build metadata
 * Run this before or during build to create a version file
 * 
 * Usage:
 *   node scripts/generate-version.js
 * 
 * This creates public/version.json with:
 * - version: from package.json
 * - buildTime: ISO timestamp
 * - gitCommit: short commit hash (if available)
 * - gitBranch: branch name (if available)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package.json version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

// Try to get git info
function getGitInfo() {
  try {
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    return { commit, branch };
  } catch {
    return { commit: 'unknown', branch: 'unknown' };
  }
}

const gitInfo = getGitInfo();

const versionInfo = {
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  gitCommit: gitInfo.commit,
  gitBranch: gitInfo.branch,
  environment: process.env.NODE_ENV || 'development',
};

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write version.json
const versionPath = path.join(publicDir, 'version.json');
fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Generated version.json:');
console.log(JSON.stringify(versionInfo, null, 2));
