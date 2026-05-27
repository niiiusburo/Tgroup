#!/usr/bin/env node

const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const { applyCosmeticImport } = require('./cosmetic-lob-import/applyImport');
const {
  parseArgs,
  printApplySummary,
  printSummary,
  resolveProjectPath,
  writeAuditArtifacts,
} = require('./cosmetic-lob-import/audit');
const {
  databaseUrlFromEnv,
  deriveCosmeticDatabaseUrl,
  loadSnapshot,
} = require('./cosmetic-lob-import/dbSnapshot');
const {
  REQUIRED_SHEETS,
  canonicalBranch,
  clean,
  mapPaymentMethod,
  normalizePhone,
  normalizeText,
  noSign,
  parseDate,
} = require('./cosmetic-lob-import/normalizers');
const { buildCosmeticImportPlan } = require('./cosmetic-lob-import/plan');
const {
  readCosmeticWorkbook,
  validateWorkbookSheets,
} = require('./cosmetic-lob-import/workbook');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node api/scripts/cosmetic-lob-import.js --workbook file.xlsx (--dry-run | --apply [--allow-manual-review]) [--database-url url] [--audit-dir dir]');
    return;
  }

  const source = await readCosmeticWorkbook(path.resolve(args.workbook));
  const client = new Client({
    connectionString: args.databaseUrl || databaseUrlFromEnv(),
    options: '-c search_path=dbo,public',
  });
  await client.connect();
  try {
    const snapshot = await loadSnapshot(client);
    const plan = buildCosmeticImportPlan(source, snapshot);
    const paths = writeAuditArtifacts(plan, args);
    if (args.apply) {
      const applyResult = await applyCosmeticImport(client, source, plan, args);
      printApplySummary(applyResult, paths);
    } else {
      printSummary(plan, paths);
    }
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
  REQUIRED_SHEETS,
  applyCosmeticImport,
  buildCosmeticImportPlan,
  canonicalBranch,
  clean,
  databaseUrlFromEnv,
  deriveCosmeticDatabaseUrl,
  mapPaymentMethod,
  normalizePhone,
  normalizeText,
  noSign,
  parseArgs,
  parseDate,
  readCosmeticWorkbook,
  resolveProjectPath,
  validateWorkbookSheets,
};
