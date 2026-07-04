#!/usr/bin/env node
/*
 * Deployment continuity preflight.
 *
 * Blocks deploys from a worktree/branch that does not contain the commit
 * currently served by the target live site. This catches the "similar worktree
 * overwrote yesterday's feature" failure mode before a build starts.
 */

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');

const SITE_URLS = {
  nk: 'https://nk.2checkin.com',
  nk2: 'https://nk2.2checkin.com',
  nk3: 'https://tmv.2checkin.com',
};

function usage() {
  return [
    'Usage:',
    '  DEPLOY_SITE=nk DEPLOY_FEATURES="TLBS hotfix" node scripts/deploy-preflight.js',
    '  DEPLOY_SITE=nk,nk2 DEPLOY_FEATURES=$\'TLBS selector\\nInvestor export scope\' node scripts/deploy-preflight.js',
    '',
    'Options:',
    '  --site <nk|nk2|nk3[,..]>       Target site(s); env: DEPLOY_SITE or DEPLOY_SITES',
    '  --url <https://host>           Extra target URL; may be repeated',
    '  --candidate <ref>              Candidate ref to deploy; default: HEAD',
    '  --features <text>              Product-facing feature manifest; env: DEPLOY_FEATURES',
    '  --features-file <path>         Feature manifest file; env: DEPLOY_FEATURES_FILE',
    '  --live-commit <ref>            Test/offline mode: compare against this ref instead of fetching version.json',
    '',
    'Emergency overrides, both must be recorded in the deploy report:',
    '  ALLOW_DEPLOY_PREFLIGHT_BYPASS=1',
    '  ALLOW_UNKNOWN_LIVE_COMMIT=1',
  ].join('\n');
}

function parseArgs(argv) {
  const out = { urls: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[i];
    };

    if (arg === '--site') out.site = next();
    else if (arg === '--url') out.urls.push(next());
    else if (arg === '--candidate') out.candidate = next();
    else if (arg === '--features') out.features = next();
    else if (arg === '--features-file') out.featuresFile = next();
    else if (arg === '--live-commit') out.liveCommit = next();
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

function gitStatus(args) {
  return spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function resolveRef(ref) {
  return git(['rev-parse', '--verify', `${ref}^{commit}`]);
}

function short(ref) {
  return git(['rev-parse', '--short', ref]);
}

function isAncestor(ancestor, descendant) {
  return gitStatus(['merge-base', '--is-ancestor', ancestor, descendant]).status === 0;
}

function logRange(fromExclusive, toInclusive) {
  const result = gitStatus(['log', '--oneline', '--decorate', '--max-count=30', `${fromExclusive}..${toInclusive}`]);
  if (result.status !== 0) return '(unable to compute commit range)';
  return result.stdout.trim() || '(none)';
}

function getFeatureManifest(args) {
  const featureText = args.features ?? process.env.DEPLOY_FEATURES;
  const featureFile = args.featuresFile ?? process.env.DEPLOY_FEATURES_FILE;

  let text = featureText || '';
  if (!text && featureFile) {
    text = fs.readFileSync(featureFile, 'utf8');
  }

  const items = text
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(
      [
        'DEPLOY_FEATURES is required.',
        'Every deployment must list the product-facing features it is deploying.',
        'Example:',
        '  DEPLOY_SITE=nk DEPLOY_FEATURES=$\'TLBS selector restored\\nInvestor export scope\' source scripts/deploy-build-args.sh',
      ].join('\n')
    );
  }

  return items;
}

function getTargets(args) {
  const rawSites = args.site ?? process.env.DEPLOY_SITE ?? process.env.DEPLOY_SITES ?? '';
  const targets = [];

  for (const site of rawSites.split(',').map((s) => s.trim()).filter(Boolean)) {
    const url = SITE_URLS[site];
    if (!url) {
      throw new Error(`Unknown DEPLOY_SITE "${site}". Expected one of: ${Object.keys(SITE_URLS).join(', ')}`);
    }
    targets.push({ label: site, url });
  }

  for (const url of args.urls) {
    targets.push({ label: url.replace(/^https?:\/\//, ''), url });
  }

  if (args.liveCommit && targets.length === 0) {
    targets.push({ label: 'offline-live-commit', url: null });
  }

  if (targets.length === 0) {
    throw new Error('DEPLOY_SITE or --url is required so the preflight knows which live deployment to protect.');
  }

  return targets;
}

async function fetchLiveVersion(target) {
  if (!target.url) return { gitCommit: null, source: 'offline' };
  const versionUrl = `${target.url.replace(/\/$/, '')}/version.json`;
  const response = await fetch(versionUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${target.label}: failed to fetch ${versionUrl} (${response.status})`);
  }
  return response.json();
}

async function main() {
  if (process.env.ALLOW_DEPLOY_PREFLIGHT_BYPASS === '1') {
    console.error('WARN deploy-preflight bypassed by ALLOW_DEPLOY_PREFLIGHT_BYPASS=1. Record this in the deploy report.');
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const featureManifest = getFeatureManifest(args);
  const targets = getTargets(args);
  const candidateRef = args.candidate ?? process.env.DEPLOY_CANDIDATE ?? 'HEAD';
  const candidateSha = resolveRef(candidateRef);
  const candidateShort = short(candidateSha);
  const failures = [];

  console.log('Deployment feature manifest:');
  featureManifest.forEach((item, index) => console.log(`  ${index + 1}. ${item}`));
  console.log('');
  console.log(`Candidate: ${candidateRef} (${candidateShort})`);

  for (const target of targets) {
    try {
      const liveVersion = await fetchLiveVersion(target);
      const liveRef = args.liveCommit ?? liveVersion.gitCommit;
      console.log('');
      console.log(`Target: ${target.label}${target.url ? ` (${target.url})` : ''}`);
      console.log(`Live version: ${liveVersion.version ?? '(unknown version)'}`);
      console.log(`Live commit: ${liveRef ?? '(missing)'}`);

      if (!liveRef || liveRef === 'unknown') {
        if (process.env.ALLOW_UNKNOWN_LIVE_COMMIT === '1') {
          console.log('WARN live commit is unknown; ancestry check skipped by ALLOW_UNKNOWN_LIVE_COMMIT=1.');
          continue;
        }
        throw new Error(`${target.label}: live commit is unknown. Refusing deploy without ALLOW_UNKNOWN_LIVE_COMMIT=1.`);
      }

      let liveSha;
      try {
        liveSha = resolveRef(liveRef);
      } catch {
        if (process.env.ALLOW_UNKNOWN_LIVE_COMMIT === '1') {
          console.log(`WARN live commit ${liveRef} is not present in this checkout; ancestry check skipped by ALLOW_UNKNOWN_LIVE_COMMIT=1.`);
          continue;
        }
        throw new Error(`${target.label}: live commit ${liveRef} is not present in this checkout. Fetch the right branch/worktree before deploying.`);
      }

      if (!isAncestor(liveSha, candidateSha)) {
        const liveShort = short(liveSha);
        console.log('');
        console.log('Live-only commits that the candidate does not contain:');
        console.log(logRange(candidateSha, liveSha));
        console.log('');
        console.log('Candidate-only commits:');
        console.log(logRange(liveSha, candidateSha));
        throw new Error(
          `${target.label}: candidate ${candidateShort} does not contain live commit ${liveShort}. ` +
          'Deploying this worktree would erase already-deployed features.'
        );
      }

      console.log('Candidate includes the live commit.');
      console.log('Commits that would deploy after the live commit:');
      console.log(logRange(liveSha, candidateSha));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (failures.length > 0) {
    console.error('');
    console.error('DEPLOY PREFLIGHT FAILED');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('');
  console.log('DEPLOY PREFLIGHT PASSED');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(usage());
  process.exit(1);
});
