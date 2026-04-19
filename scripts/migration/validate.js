/**
 * Pre-Migration Validation
 * Checks source data quality, counts rows, identifies issues
 */

const { sourcePool, targetPool, TABLE_ORDER, CLEANING_RULES } = require('./config');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, 'reports');

async function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

async function getRowCounts(pool, label) {
  const results = {};
  for (const table of TABLE_ORDER) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM dbo.${table}`);
      results[table] = parseInt(res.rows[0].count);
    } catch (err) {
      results[table] = `ERROR: ${err.message}`;
    }
  }
  return results;
}

async function findOrphanedRecords(pool) {
  const issues = [];

  // Check for dummy UUID references
  for (const { table, column } of CLEANING_RULES.dummyUuidColumns) {
    const res = await pool.query(
      `SELECT COUNT(*) FROM dbo.${table} WHERE ${column} = $1`,
      [CLEANING_RULES.dummyUuid]
    );
    const count = parseInt(res.rows[0].count);
    if (count > 0) {
      issues.push({
        severity: 'CRITICAL',
        table,
        column,
        issue: `Found ${count} rows with dummy UUID`,
        count,
      });
    }
  }

  // Check FK integrity: saleorders.companyid → companies.id
  const fkChecks = [
    {
      table: 'saleorders',
      column: 'companyid',
      refTable: 'companies',
      refColumn: 'id',
    },
    {
      table: 'saleorders',
      column: 'partnerid',
      refTable: 'partners',
      refColumn: 'id',
    },
    {
      table: 'appointments',
      column: 'companyid',
      refTable: 'companies',
      refColumn: 'id',
    },
    {
      table: 'appointments',
      column: 'partnerid',
      refTable: 'partners',
      refColumn: 'id',
    },
    {
      table: 'saleorderlines',
      column: 'saleorderid',
      refTable: 'saleorders',
      refColumn: 'id',
    },
    {
      table: 'payments',
      column: 'customer_id',
      refTable: 'partners',
      refColumn: 'id',
    },
    {
      table: 'payment_allocations',
      column: 'payment_id',
      refTable: 'payments',
      refColumn: 'id',
    },
    {
      table: 'payment_allocations',
      column: 'saleorder_id',
      refTable: 'saleorders',
      refColumn: 'id',
    },
  ];

  for (const check of fkChecks) {
    const res = await pool.query(
      `SELECT COUNT(*) FROM dbo.${check.table} t
       LEFT JOIN dbo.${check.refTable} r ON t.${check.column} = r.${check.refColumn}
       WHERE t.${check.column} IS NOT NULL AND r.${check.refColumn} IS NULL`
    );
    const count = parseInt(res.rows[0].count);
    if (count > 0) {
      issues.push({
        severity: 'CRITICAL',
        table: check.table,
        column: check.column,
        issue: `Found ${count} orphaned FK references to ${check.refTable}.${check.refColumn}`,
        count,
      });
    }
  }

  return issues;
}

async function checkSo2026Series(pool) {
  const res = await pool.query(
    `SELECT code FROM dbo.saleorders WHERE code LIKE 'SO-2026-%' ORDER BY code`
  );
  const codes = res.rows.map(r => r.code);

  // Extract numbers and check contiguity
  const numbers = codes
    .map(c => parseInt(c.replace('SO-2026-', '')))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      gaps.push({ from: numbers[i - 1], to: numbers[i] });
    }
  }

  return {
    totalCodes: codes.length,
    minNumber: numbers[0] || null,
    maxNumber: numbers[numbers.length - 1] || null,
    gaps,
    codes,
  };
}

async function generateReport() {
  await ensureReportDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `pre-migration-report-${timestamp}.json`);

  console.log('🔍 Running pre-migration validation...\n');

  // 1. Row counts
  console.log('📊 Counting rows in source and target...');
  const sourceCounts = await getRowCounts(sourcePool, 'source');
  const targetCounts = await getRowCounts(targetPool, 'target');

  // 2. Orphaned records
  console.log('🔗 Checking foreign key integrity...');
  const orphanedIssues = await findOrphanedRecords(sourcePool);

  // 3. SO-2026 series
  console.log('📋 Checking SO-2026 code series...');
  const so2026Info = await checkSo2026Series(sourcePool);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceCounts,
    targetCounts,
    orphanedIssues,
    so2026Info,
    summary: {
      totalTables: TABLE_ORDER.length,
      totalSourceRows: Object.values(sourceCounts)
        .filter(v => typeof v === 'number')
        .reduce((a, b) => a + b, 0),
      totalTargetRows: Object.values(targetCounts)
        .filter(v => typeof v === 'number')
        .reduce((a, b) => a + b, 0),
      criticalIssues: orphanedIssues.filter(i => i.severity === 'CRITICAL').length,
      warnings: orphanedIssues.filter(i => i.severity === 'WARNING').length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Console summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           PRE-MIGRATION VALIDATION REPORT                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ Source total rows: ${String(report.summary.totalSourceRows).padEnd(43)} ║`);
  console.log(`║ Target total rows: ${String(report.summary.totalTargetRows).padEnd(43)} ║`);
  console.log(`║ Critical issues:   ${String(report.summary.criticalIssues).padEnd(43)} ║`);
  console.log(`║ Warnings:          ${String(report.summary.warnings).padEnd(43)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (orphanedIssues.length > 0) {
    console.log('\n⚠️  Issues found:');
    for (const issue of orphanedIssues) {
      console.log(`   [${issue.severity}] ${issue.table}.${issue.column}: ${issue.issue}`);
    }
  }

  if (so2026Info.gaps.length > 0) {
    console.log(`\n📌 SO-2026 series has ${so2026Info.gaps.length} gap(s):`);
    for (const gap of so2026Info.gaps) {
      console.log(`   Missing between ${gap.from} and ${gap.to}`);
    }
  }

  console.log(`\n📝 Full report saved to: ${reportPath}`);

  return report;
}

// Run if called directly
if (require.main === module) {
  generateReport()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Validation failed:', err);
      process.exit(1);
    });
}

module.exports = { generateReport, findOrphanedRecords, checkSo2026Series };
