const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { clean } = require('./normalizers');

function outputPaths(args) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = crypto.randomBytes(4).toString('hex');
  const auditDir = resolveProjectPath(args.auditDir || 'artifacts/cosmetic-lob-import', 'audit-dir');
  const prefix = auditDir.endsWith(path.sep) ? auditDir : `${auditDir}${path.sep}`;
  return {
    summaryOut: `${prefix}cosmetic-lob-import-${stamp}-${runId}.summary.json`,
    anomaliesOut: `${prefix}cosmetic-lob-import-${stamp}-${runId}.anomalies.ndjson`,
  };
}

function resolveProjectPath(value, label) {
  const raw = clean(value);
  if (!raw || raw.includes('\0') || path.isAbsolute(raw)) {
    throw new Error(`${label} must be a relative path inside the project workspace`);
  }
  const parts = raw.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`${label} must not contain relative traversal segments`);
  }
  return `${process.cwd().replace(/[\\/]$/, '')}${path.sep}${parts.join(path.sep)}`;
}

function writeAuditArtifacts(plan, args) {
  const paths = outputPaths(args);
  fs.mkdirSync(path.dirname(paths.summaryOut), { recursive: true });
  fs.writeFileSync(paths.summaryOut, `${JSON.stringify({
    sourceTabs: plan.sourceTabs,
    fieldMapping: plan.fieldMapping,
    summary: plan.summary,
  }, null, 2)}\n`);
  fs.writeFileSync(
    paths.anomaliesOut,
    plan.anomalies.map((anomaly) => JSON.stringify(anomaly)).join('\n') + (plan.anomalies.length ? '\n' : ''),
  );
  return paths;
}

function parseArgs(argv) {
  const args = { dryRun: false, apply: false, allowManualReview: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workbook') args.workbook = argv[++i];
    else if (arg === '--database-url') args.databaseUrl = argv[++i];
    else if (arg === '--audit-dir') args.auditDir = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--allow-manual-review') args.allowManualReview = true;
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (!args.workbook) throw new Error('Provide --workbook <xlsx-file>');
  if (args.dryRun && args.apply) throw new Error('Choose only one mode: --dry-run or --apply');
  if (!args.dryRun && !args.apply) throw new Error('Choose --dry-run or --apply');
  return args;
}

function printSummary(plan, paths) {
  console.log('Cosmetic LOB source workbook dry run complete');
  console.log(`Tabs: ${plan.sourceTabs.map((tab) => `${tab.name}=${tab.rows}`).join(', ')}`);
  console.log(`Companies create: ${plan.summary.companies.create}`);
  console.log(`Staff create: ${plan.summary.staff.create}`);
  console.log(`Products create: ${plan.summary.products.create}`);
  console.log(`Customers create/update: ${plan.summary.customers.create}/${plan.summary.customers.updateFromProfile}`);
  console.log(`Deposits create/skip/manual: ${plan.summary.deposits.create}/${plan.summary.deposits.skipExisting}/${plan.summary.deposits.manualReview}`);
  console.log(`Treatments create/skip/manual: ${plan.summary.treatments.create}/${plan.summary.treatments.skipExisting}/${plan.summary.treatments.manualReview}`);
  console.log(`Payments create/skip: ${plan.summary.payments.create}/${plan.summary.payments.skipExisting}`);
  console.log(`Anomalies: ${plan.summary.anomalies}`);
  console.log(`Summary: ${paths.summaryOut}`);
  console.log(`Anomalies: ${paths.anomaliesOut}`);
}

function printApplySummary(result, paths) {
  console.log('Cosmetic LOB source workbook apply complete');
  console.log(`Companies created: ${result.companiesCreated}`);
  console.log(`Staff created: ${result.staffCreated}`);
  console.log(`Products created: ${result.productsCreated}`);
  console.log(`Customers created/updated: ${result.customers.created}/${result.customers.updated}`);
  console.log(`Deposits created/skip/manual: ${result.deposits.created}/${result.deposits.skipped}/${result.deposits.manualReview}`);
  console.log(`Treatments created/skip/manual: ${result.treatments.created}/${result.treatments.skipped}/${result.treatments.manualReview}`);
  console.log(`Payments created/skip: ${result.payments.created}/${result.payments.skipped}`);
  console.log(`Anomalies preserved: ${result.anomaliesPreserved}`);
  console.log(`Summary: ${paths.summaryOut}`);
  console.log(`Anomalies: ${paths.anomaliesOut}`);
}

module.exports = {
  parseArgs,
  printApplySummary,
  printSummary,
  resolveProjectPath,
  writeAuditArtifacts,
};
