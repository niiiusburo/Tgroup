#!/usr/bin/env node

const path = require('path');
const { Client } = require('pg');
const { applyClientImport, getLocalLineSummary } = require('./database');
const { buildClientImportPlan, selectClientRows } = require('./planner');
const { mapAppointmentRow, mapAccountPaymentToPayment, mapSaleOrderLineRow } = require('./transaction-mappers');
const { DEFAULT_DB, booleanOrNull, clean, loadSource, normalizeUuid, parseCsvDateOnly, parseCsvTimestamp } = require('./utils');

function parseArgs(argv) {
  const args = { dryRun: false, apply: false, allCustomers: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--export-dir') args.exportDir = argv[++i];
    else if (arg === '--partner-id') args.partnerId = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--all-customers') args.allCustomers = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.exportDir) throw new Error('--export-dir is required');
  if (!args.partnerId && !args.allCustomers) throw new Error('--partner-id is required for one-client import');
  if (args.dryRun === args.apply) throw new Error('Choose exactly one of --dry-run or --apply');
  if (args.allCustomers && args.apply && process.env.TDENTAL_ENABLE_BULK !== '1') {
    throw new Error('Bulk apply is disabled until one-client verification passes. Set TDENTAL_ENABLE_BULK=1 to enable.');
  }
  return args;
}

function printPlan(plan, applied) {
  const missingNames = [...new Set(plan.missing.lines.map((line) => clean(line.OrderId)))];
  const failedOrderChecks = plan.mapping.orderTotalChecks.filter((check) => !check.ok);
  console.log(`Partner: ${clean(plan.partner.Name)} (${normalizeUuid(plan.partner.Id)})`);
  console.log(`Duplicate ref matches ignored: ${plan.duplicateRefPartners.length}`);
  console.log(`Duplicate phone matches ignored: ${plan.duplicatePhonePartners.length}`);
  console.log(`Sales staff assistant rule: ${plan.mapping.salesStaff.assistantId || 'manual-review'}`);
  console.log(`Source lines: ${plan.source.lineCount} / ${plan.source.lineTotal}`);
  console.log(`Local lines: ${plan.local.lineCount} / ${plan.local.lineTotal}`);
  console.log(`Missing lines: ${plan.missing.lineCount} / ${plan.missing.lineTotal}`);
  console.log(`Missing order IDs: ${missingNames.join(', ') || 'none'}`);
  console.log(`Order total check failures: ${failedOrderChecks.length}`);
  console.log(`Posted payments: ${plan.payments.postedCount} / ${plan.payments.postedTotal}`);
  console.log(`Voided payments: ${plan.payments.voidedCount} / ${plan.payments.voidedTotal}`);
  if (applied) console.log(`Applied: ${JSON.stringify(applied)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo' });
  await client.connect();
  try {
    const source = loadSource(path.resolve(args.exportDir));
    const partnerIds = args.allCustomers
      ? source.partners.filter((row) => booleanOrNull(row.Customer) === true).map((row) => normalizeUuid(row.Id))
      : [normalizeUuid(args.partnerId)];
    for (const partnerId of partnerIds) {
      const local = await getLocalLineSummary(client, partnerId);
      const plan = buildClientImportPlan(source, local, partnerId);
      const applied = args.apply ? await applyClientImport(client, plan) : null;
      printPlan(plan, applied);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  applyClientImport,
  buildClientImportPlan,
  loadSource,
  mapAppointmentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  parseArgs,
  parseCsvDateOnly,
  parseCsvTimestamp,
  selectClientRows,
};
