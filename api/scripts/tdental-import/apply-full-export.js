#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { applyAppScopeMigration } = require('./apply');
const { loadAppScopeSourceFromArchive, loadAppScopeSourceFromDir } = require('./dry-run');
const { DEFAULT_DB } = require('./utils');

function parseArgs(argv) {
  const args = { auditDir: path.resolve('artifacts') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--archive') args.archive = argv[++i];
    else if (arg === '--export-dir') args.exportDir = argv[++i];
    else if (arg === '--audit-dir') args.auditDir = argv[++i];
    else if (arg === '--audit-out') args.auditOut = argv[++i];
    else if (arg === '--summary-out') args.summaryOut = argv[++i];
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (!args.apply) throw new Error('--apply is required for database writes');
  if (Boolean(args.archive) === Boolean(args.exportDir)) throw new Error('Choose exactly one of --archive or --export-dir');
  return args;
}

function outputPaths(args) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryOut = path.resolve(args.summaryOut || args.auditOut?.replace(/\.ndjson$/i, '.summary.json') || path.join(args.auditDir, `tdental-apply-${stamp}.summary.json`));
  const auditOut = path.resolve(args.auditOut || path.join(args.auditDir, `tdental-apply-${stamp}.ndjson`));
  return { auditOut, summaryOut };
}

function writeArtifacts(result, paths) {
  fs.mkdirSync(path.dirname(paths.auditOut), { recursive: true });
  fs.mkdirSync(path.dirname(paths.summaryOut), { recursive: true });
  fs.writeFileSync(paths.summaryOut, `${JSON.stringify({ generatedAt: new Date().toISOString(), mode: 'apply', applied: result.applied, anomalyCounts: result.anomalies.reduce((acc, anomaly) => {
    acc[anomaly.code] = (acc[anomaly.code] || 0) + 1;
    return acc;
  }, {}) }, null, 2)}\n`);
  fs.writeFileSync(paths.auditOut, result.anomalies.map((anomaly) => JSON.stringify(anomaly)).join('\n') + (result.anomalies.length ? '\n' : ''));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/tdental-import/apply-full-export.js --apply (--archive file.rar | --export-dir dir) [--audit-out file.ndjson]');
    return;
  }
  const loaded = args.archive ? loadAppScopeSourceFromArchive(path.resolve(args.archive)) : loadAppScopeSourceFromDir(path.resolve(args.exportDir));
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo,public' });
  await client.connect();
  try {
    const result = await applyAppScopeMigration(client, loaded.source);
    for (const warning of loaded.warnings) result.anomalies.push({ severity: 'warning', code: 'source_file_missing', message: warning });
    const paths = outputPaths(args);
    writeArtifacts(result, paths);
    console.log('TDental app-scope migration applied');
    console.log(JSON.stringify(result.applied, null, 2));
    console.log(`Anomalies: ${result.anomalies.length}`);
    console.log(`Summary: ${paths.summaryOut}`);
    console.log(`Audit: ${paths.auditOut}`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = { outputPaths, parseArgs };
