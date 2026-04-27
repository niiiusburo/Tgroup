#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { DEFAULT_DB } = require('./utils');
const {
  buildDryRunSummary,
  loadAppScopeSourceFromArchive,
  loadAppScopeSourceFromDir,
  readLocalSnapshot,
} = require('./dry-run');

function parseArgs(argv) {
  const args = { auditDir: path.resolve('artifacts') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--archive') args.archive = argv[++i];
    else if (arg === '--export-dir') args.exportDir = argv[++i];
    else if (arg === '--audit-dir') args.auditDir = argv[++i];
    else if (arg === '--audit-out') args.auditOut = argv[++i];
    else if (arg === '--summary-out') args.summaryOut = argv[++i];
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (Boolean(args.archive) === Boolean(args.exportDir)) throw new Error('Choose exactly one of --archive or --export-dir');
  return args;
}

function outputPaths(args) {
  if (args.auditOut) {
    const auditOut = path.resolve(args.auditOut);
    return {
      auditOut,
      summaryOut: path.resolve(args.summaryOut || auditOut.replace(/\.ndjson$/i, '.summary.json')),
    };
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = crypto.randomBytes(4).toString('hex');
  return {
    auditOut: path.resolve(args.auditDir, `tdental-dry-run-${stamp}-${runId}.ndjson`),
    summaryOut: path.resolve(args.auditDir, `tdental-dry-run-${stamp}-${runId}.summary.json`),
  };
}

function writeAuditArtifacts(summary, args) {
  const paths = outputPaths(args);
  fs.mkdirSync(path.dirname(paths.auditOut), { recursive: true });
  fs.mkdirSync(path.dirname(paths.summaryOut), { recursive: true });
  fs.writeFileSync(paths.summaryOut, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(
    paths.auditOut,
    summary.anomalies.map((anomaly) => JSON.stringify(anomaly)).join('\n') + (summary.anomalies.length ? '\n' : ''),
  );
  return paths;
}

function printSummary(summary, paths) {
  console.log('TDental app-scope dry run complete');
  console.log(`Customers create/update: ${summary.entities.customers.creates}/${summary.entities.customers.updates}`);
  console.log(`Appointments create/update: ${summary.entities.appointments.creates}/${summary.entities.appointments.updates}`);
  console.log(`Services exact/code/name/create: ${summary.entities.services.exactMatches}/${summary.entities.services.defaultCodeMatches}/${summary.entities.services.nameMatches}/${summary.entities.services.creates}`);
  console.log(`Staff exact/name/create/location-adds: ${summary.entities.staff.exactMatches}/${summary.entities.staff.nameMatches}/${summary.entities.staff.creates}/${summary.entities.staff.locationScopeAdds}`);
  console.log(`Payments create/update: ${summary.entities.payments.creates}/${summary.entities.payments.updates}`);
  console.log(`Allocation rels/order-backed/dotkham-ignored: ${summary.entities.paymentAllocations.relationRows}/${summary.entities.paymentAllocations.orderBacked}/${summary.entities.paymentAllocations.dotkhamOnlyIgnored}`);
  console.log(`Anomalies: ${summary.anomalies.length}`);
  console.log(`Summary: ${paths.summaryOut}`);
  console.log(`Audit: ${paths.auditOut}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/tdental-import/dry-run-full-export.js (--archive file.rar | --export-dir dir) [--audit-dir dir] [--audit-out file.ndjson]');
    return;
  }

  const loaded = args.archive
    ? loadAppScopeSourceFromArchive(path.resolve(args.archive))
    : loadAppScopeSourceFromDir(path.resolve(args.exportDir));
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo,public' });
  await client.connect();
  try {
    const local = await readLocalSnapshot(client);
    const summary = buildDryRunSummary({ source: loaded.source, local, sourceWarnings: loaded.warnings });
    const paths = writeAuditArtifacts(summary, args);
    printSummary(summary, paths);
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

module.exports = {
  outputPaths,
  parseArgs,
  printSummary,
  writeAuditArtifacts,
};
