#!/usr/bin/env node
/*
 * Deployment worktree audit.
 *
 * Lists every linked git worktree and classifies whether its HEAD contains the
 * commit currently served by NK/NK2/NK3. This is a release-planning companion
 * to deploy-preflight.js; deploy-preflight remains the blocking deploy gate.
 */

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SITE_URLS = {
  nk: 'https://nk.2checkin.com',
  nk2: 'https://nk2.2checkin.com',
  nk3: 'https://tmv.2checkin.com',
};

function usage() {
  return [
    'Usage:',
    '  DEPLOY_SITE=nk,nk2 node scripts/deploy-worktree-audit.js',
    '  node scripts/deploy-worktree-audit.js --live-commit 771fa551b --fail-on-risk',
    '',
    'Options:',
    '  --site <nk|nk2|nk3[,..]>  Target site(s); env: DEPLOY_SITE or DEPLOY_SITES',
    '  --url <https://host>      Extra target URL; may be repeated',
    '  --live-commit <ref>       Offline mode: compare worktrees against this ref',
    '  --fail-on-risk           Exit non-zero when stale or dirty worktrees exist',
    '',
    'This command does not deploy. It identifies which worktrees are safe deploy',
    'candidates and which ones would be blocked by deploy-preflight.js.',
  ].join('\n');
}

function parseArgs(argv) {
  const out = { urls: [], failOnRisk: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === '--site') out.site = next();
    else if (arg === '--url') out.urls.push(next());
    else if (arg === '--live-commit') out.liveCommit = next();
    else if (arg === '--fail-on-risk') out.failOnRisk = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function gitStatus(args, options = {}) {
  return spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

function short(ref) {
  return git(['rev-parse', '--short', ref]);
}

function resolveRef(ref) {
  return git(['rev-parse', '--verify', `${ref}^{commit}`]);
}

function isAncestor(worktreePath, ancestor, descendant) {
  return gitStatus(['-C', worktreePath, 'merge-base', '--is-ancestor', ancestor, descendant]).status === 0;
}

function dirtyCount(worktreePath) {
  const result = gitStatus(['-C', worktreePath, 'status', '--porcelain']);
  if (result.status !== 0) return '?';
  return result.stdout.split(/\r?\n/).filter(Boolean).length;
}

function hasPreflight(worktreePath) {
  return fs.existsSync(path.join(worktreePath, 'scripts/deploy-preflight.js'));
}

function parseWorktrees() {
  const raw = git(['worktree', 'list', '--porcelain']);
  const records = raw.split(/\n\n+/).filter(Boolean);
  return records.map((record) => {
    const item = { branch: '(detached)' };
    for (const line of record.split(/\r?\n/)) {
      const [key, ...rest] = line.split(' ');
      const value = rest.join(' ');
      if (key === 'worktree') item.path = value;
      else if (key === 'HEAD') item.head = value;
      else if (key === 'branch') item.branch = value.replace(/^refs\/heads\//, '');
    }
    return item;
  });
}

function getTargets(args) {
  const rawSites = args.site ?? process.env.DEPLOY_SITE ?? process.env.DEPLOY_SITES ?? '';
  const targets = [];

  for (const site of rawSites.split(',').map((s) => s.trim()).filter(Boolean)) {
    const url = SITE_URLS[site];
    if (!url) throw new Error(`Unknown DEPLOY_SITE "${site}". Expected one of: ${Object.keys(SITE_URLS).join(', ')}`);
    targets.push({ label: site, url });
  }

  for (const url of args.urls) {
    targets.push({ label: url.replace(/^https?:\/\//, ''), url });
  }

  if (args.liveCommit && targets.length === 0) {
    targets.push({ label: 'offline-live-commit', url: null });
  }

  if (targets.length === 0) {
    throw new Error('DEPLOY_SITE, --url, or --live-commit is required.');
  }

  return targets;
}

async function fetchLiveVersion(target) {
  if (!target.url) return { gitCommit: null, version: '(offline)' };
  const versionUrl = `${target.url.replace(/\/$/, '')}/version.json`;
  const response = await fetch(versionUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${target.label}: failed to fetch ${versionUrl} (${response.status})`);
  return response.json();
}

async function getLiveCommit(args, targets) {
  if (args.liveCommit) return resolveRef(args.liveCommit);

  const liveCommits = [];
  for (const target of targets) {
    const version = await fetchLiveVersion(target);
    console.log(`${target.label}: version ${version.version ?? '(unknown)'} commit ${version.gitCommit ?? '(missing)'}`);
    if (!version.gitCommit || version.gitCommit === 'unknown') {
      throw new Error(`${target.label}: live commit is missing or unknown.`);
    }
    liveCommits.push(resolveRef(version.gitCommit));
  }

  const unique = [...new Set(liveCommits)];
  if (unique.length !== 1) {
    throw new Error(`Targets do not share one live commit: ${unique.map((ref) => short(ref)).join(', ')}`);
  }
  return unique[0];
}

function printRows(rows) {
  console.log('');
  console.log('containsLive\tdirty\tguard\tHEAD\tbranch\tworktree');
  for (const row of rows) {
    console.log([
      row.containsLive ? 'yes' : 'no',
      row.dirty,
      row.hasGuard ? 'yes' : 'no',
      row.headShort,
      row.branch,
      row.path,
    ].join('\t'));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = getTargets(args);
  const liveSha = await getLiveCommit(args, targets);
  const liveShort = short(liveSha);
  const rows = parseWorktrees().map((worktree) => {
    const containsLive = isAncestor(worktree.path, liveSha, 'HEAD');
    const dirty = dirtyCount(worktree.path);
    return {
      ...worktree,
      containsLive,
      dirty,
      hasGuard: hasPreflight(worktree.path),
      headShort: short(worktree.head),
    };
  });

  console.log(`Live commit baseline: ${liveShort}`);
  printRows(rows);

  const risky = rows.filter((row) => !row.containsLive || row.dirty !== 0);
  const missingGuard = rows.filter((row) => !row.hasGuard);
  console.log('');
  console.log(`Summary: ${rows.length} worktrees, ${risky.length} stale/dirty risk(s), ${missingGuard.length} missing deploy-preflight.js.`);

  if (args.failOnRisk && risky.length > 0) {
    throw new Error('One or more worktrees are stale or dirty. Do not deploy those candidates.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(usage());
  process.exit(1);
});
