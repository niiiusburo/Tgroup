#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'website', 'package.json');
const changelogPath = path.join(rootDir, 'website', 'public', 'CHANGELOG.json');

const [bumpType, ...messageParts] = process.argv.slice(2);
const message = messageParts.join(' ') || 'Release';

if (!bumpType) {
  console.error('Usage: node scripts/bump-version.mjs <patch|minor|major|x.y.z> "Highlight message"');
  process.exit(1);
}

// 1. Read and bump version
const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
const current = pkg.version;

let next;
if (/^\d+\.\d+\.\d+/.test(bumpType)) {
  next = bumpType;
} else {
  const [maj, min, pat] = current.split('.').map(Number);
  if (bumpType === 'major') next = `${maj + 1}.0.0`;
  else if (bumpType === 'minor') next = `${maj}.${min + 1}.0`;
  else next = `${maj}.${min}.${pat + 1}`;
}

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Prepend CHANGELOG entry
const today = new Date().toISOString().split('T')[0];
const commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();

const entry = {
  version: next,
  date: today,
  commit,
  highlights: message,
  sections: [
    { title: 'New Features', items: [] },
    { title: 'Bug Fixes', items: [] },
    { title: 'Release Notes', items: [] },
  ],
};

let changelog = [];
if (fs.existsSync(changelogPath)) {
  changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
}
changelog.unshift(entry);
fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2) + '\n');

// 3. Stage files
execSync('git add website/package.json website/public/CHANGELOG.json', { cwd: rootDir, stdio: 'inherit' });
console.log(`✅ Bumped ${current} → ${next}`);
