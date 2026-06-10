#!/usr/bin/env node
'use strict';

/**
 * Live NK3 CTV/referral/earnings integrity repair.
 *
 * Default mode is dry-run. Apply requires:
 *   --apply --confirm APPLY_NK3_CTV_INTEGRITY_REPAIR
 *
 * Run locally against the VPS:
 *   node scripts/nk3-only/nk3-live-ctv-integrity-repair.js --dry-run --vps root@76.13.16.68
 *
 * This script talks to Postgres through docker exec psql, so it stays on the NK3
 * VPS/container boundary instead of opening a direct laptop DB connection.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  computeCtvRepairPlan,
  classifyServiceCardGap,
  migrationLedgerTargets,
  normalizeScope,
} = require('../../api/src/services/nk3CtvIntegrityRepair');

const ROOT = path.resolve(__dirname, '../..');
const CONFIRM = 'APPLY_NK3_CTV_INTEGRITY_REPAIR';
const DENTAL_DB = 'tdental_nk3';
const COSMETIC_DB = 'tcosmetic_nk3';
const NK3_VPS = 'root@76.13.16.68';
const DB_CONTAINER = 'tgroup-db';
const MIGRATION_PATHS = Object.freeze({
  '055_earnings_service_card_created.sql': path.join(ROOT, 'api', 'migrations', '055_earnings_service_card_created.sql'),
  '056_braces_commission_config.sql': path.join(ROOT, 'api', 'migrations', '056_braces_commission_config.sql'),
  '057_payout_group_id.sql': path.join(ROOT, 'api', 'migrations', '057_payout_group_id.sql'),
  '058_audit_logs.sql': path.join(ROOT, 'api', 'migrations', '058_audit_logs.sql'),
});

function parseArgs(argv) {
  const args = { apply: false, dryRun: true, useVps: false, confirm: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') { args.apply = true; args.dryRun = false; }
    else if (arg === '--dry-run') { args.dryRun = true; args.apply = false; }
    else if (arg === '--vps') {
      const target = argv[++i];
      if (target !== NK3_VPS) throw new Error(`Only the NK3 VPS target is allowed: ${NK3_VPS}`);
      args.useVps = true;
    } else if (arg === '--container') {
      const container = argv[++i];
      if (container !== DB_CONTAINER) throw new Error(`Only the NK3 DB container is allowed: ${DB_CONTAINER}`);
    }
    else if (arg === '--confirm') args.confirm = argv[++i];
    else if (arg === '--help' || arg === '-h') usage(0);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.apply && args.confirm !== CONFIRM) {
    throw new Error(`Apply requires --confirm ${CONFIRM}`);
  }
  return args;
}

function usage(code = 0) {
  console.log(`Usage:
  node scripts/nk3-only/nk3-live-ctv-integrity-repair.js --dry-run --vps root@76.13.16.68
  node scripts/nk3-only/nk3-live-ctv-integrity-repair.js --apply --confirm ${CONFIRM} --vps root@76.13.16.68
`);
  process.exit(code);
}

function spawnPsql(args, db, sql) {
  const options = { input: sql, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 };
  const psqlFlags = ['psql', '-U', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-tA', '-f', '-'];

  if (args.useVps && db === DENTAL_DB) {
    return spawnSync('ssh', [NK3_VPS, 'docker', 'exec', '-i', DB_CONTAINER, ...psqlFlags, '-d', DENTAL_DB], options);
  }
  if (args.useVps && db === COSMETIC_DB) {
    return spawnSync('ssh', [NK3_VPS, 'docker', 'exec', '-i', DB_CONTAINER, ...psqlFlags, '-d', COSMETIC_DB], options);
  }
  if (!args.useVps && db === DENTAL_DB) {
    return spawnSync('docker', ['exec', '-i', DB_CONTAINER, ...psqlFlags, '-d', DENTAL_DB], options);
  }
  if (!args.useVps && db === COSMETIC_DB) {
    return spawnSync('docker', ['exec', '-i', DB_CONTAINER, ...psqlFlags, '-d', COSMETIC_DB], options);
  }
  throw new Error(`Unsupported NK3 database: ${db}`);
}

function psql(args, db, sql) {
  const out = spawnPsql(args, db, sql);
  if (out.status !== 0) {
    throw new Error(`psql ${db} failed: ${out.stderr || out.stdout}`);
  }
  return (out.stdout || '').trim();
}

function jsonQuery(args, db, sql) {
  const raw = psql(args, db, sql);
  if (!raw) return [];
  return JSON.parse(raw);
}

function sqlLit(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function uuidLit(value) {
  return value ? `${sqlLit(value)}::uuid` : 'NULL';
}

function textArray(scope) {
  const items = normalizeScope(scope);
  if (items.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${items.map(sqlLit).join(',')}]::text[]`;
}

function setClause(next) {
  const parts = [];
  for (const [key, value] of Object.entries(next)) {
    if (key === 'lob_scope') parts.push(`${key} = ${textArray(value)}`);
    else if (key === 'referred_by_ctv_id') parts.push(`${key} = ${uuidLit(value)}`);
    else if (typeof value === 'boolean') parts.push(`${key} = ${value ? 'true' : 'false'}`);
    else parts.push(`${key} = ${sqlLit(value)}`);
  }
  parts.push('lastupdated = now()');
  return parts.join(', ');
}

function updatePartnerSql(op) {
  return `UPDATE dbo.partners SET ${setClause(op.next)} WHERE id = ${uuidLit(op.id)} AND is_ctv = true;`;
}

function insertDentalPartnerSql(op) {
  const row = op.row;
  return `
    INSERT INTO dbo.partners (
      id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
      active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
      isbusinessinvoice, isdeleted, datecreated, lastupdated, created_via
    ) VALUES (
      ${uuidLit(row.id)}, ${sqlLit(row.name)}, ${sqlLit(row.phone)}, ${sqlLit(row.email)}, ${sqlLit(row.password_hash)},
      true, ${textArray(row.lob_scope)}, ${uuidLit(row.referred_by_ctv_id)},
      ${row.active ? 'true' : 'false'}, true, false, false, false, false, false, false,
      false, false, now(), now(), ${sqlLit(row.created_via)}
    )
    ON CONFLICT (id) DO NOTHING;
  `;
}

function ctvRowsSql() {
  return `
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT id::text, name, phone, email, password_hash, is_ctv, lob_scope,
             referred_by_ctv_id::text, active, employee, customer, isdeleted,
             created_via, ref, datecreated, lastupdated
        FROM dbo.partners
       WHERE is_ctv = true AND COALESCE(isdeleted, false) = false
       ORDER BY id::text
    ) t;
  `;
}

function serviceCardGapsSql(lob) {
  return `
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT ${sqlLit(lob)} AS lob,
             sol.id::text AS service_line_id,
             so.id::text AS saleorder_id,
             so.partnerid::text AS client_id,
             so.ctv_id::text AS ctv_id,
             COALESCE(sol.pricetotal, so.amounttotal, 0) AS price,
             COALESCE(sol.productname, p.name) AS product_name,
             pc.name AS category_name,
             NOT EXISTS (
               SELECT 1 FROM dbo.partners cp
                WHERE cp.id = so.partnerid AND COALESCE(cp.isdeleted, false) = false
             ) AS order_partner_missing,
             NOT EXISTS (
               SELECT 1 FROM dbo.products pp
                WHERE pp.id = sol.productid AND COALESCE(pp.active, true) = true
             ) AS product_missing
        FROM dbo.saleorderlines sol
        JOIN dbo.saleorders so ON so.id = sol.orderid
        LEFT JOIN dbo.products p ON p.id = sol.productid
        LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
       WHERE so.ctv_id IS NOT NULL
         AND COALESCE(sol.isdeleted, false) = false
         AND COALESCE(so.isdeleted, false) = false
         AND NOT EXISTS (
           SELECT 1 FROM dbo.earnings e
            WHERE e.service_line_id = sol.id
              AND e.payment_id IS NULL
              AND e.source = 'ctv'
              AND e.amount > 0
         )
       ORDER BY sol.datecreated NULLS LAST, sol.id
    ) t;
  `;
}

function orphanPaidEarningsSql() {
  return `
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT e.id::text, e.payout_id::text, e.amount, e.status
        FROM dbo.earnings e
       WHERE e.status = 'paid'
         AND e.payout_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM dbo.payouts p WHERE p.id = e.payout_id)
       ORDER BY e.created_at NULLS LAST, e.id
    ) t;
  `;
}

function migrationLedgerSql() {
  return `
    SELECT COALESCE(json_agg(filename ORDER BY filename), '[]'::json)
      FROM dbo.schema_migrations;
  `;
}

function serviceCardBackfillSql(row) {
  return `
    WITH RECURSIVE service AS (
      SELECT so.partnerid AS client_id,
             sol.id AS service_line_id,
             so.ctv_id AS ctv_id,
             COALESCE(sol.pricetotal, so.amounttotal, 0)::numeric AS price
        FROM dbo.saleorderlines sol
        JOIN dbo.saleorders so ON so.id = sol.orderid
       WHERE sol.id = ${uuidLit(row.service_line_id)}
    ), chain(level, partner_id, path) AS (
      SELECT 0, service.ctv_id, ARRAY[service.ctv_id] FROM service
      UNION ALL
      SELECT chain.level + 1, p.referred_by_ctv_id, chain.path || p.referred_by_ctv_id
        FROM chain
        JOIN dbo.partners p ON p.id = chain.partner_id
       WHERE chain.level < 4
         AND p.referred_by_ctv_id IS NOT NULL
         AND NOT p.referred_by_ctv_id = ANY(chain.path)
    ), payable AS (
      SELECT s.client_id, c.partner_id AS recipient_partner_id, s.service_line_id,
             c.level, ROUND((s.price * cfg.share_percent / 100.0)::numeric, 2) AS amount
        FROM service s
        JOIN chain c ON true
        JOIN dbo.commission_level_config cfg ON cfg.level = c.level AND cfg.enabled = true
       WHERE s.price > 0 AND cfg.share_percent > 0
    )
    INSERT INTO dbo.earnings (
      client_id, recipient_partner_id, payment_id, service_line_id,
      source, level, amount, status, earned_at
    )
    SELECT client_id, recipient_partner_id, NULL, service_line_id,
           'ctv', level, amount, 'pending', now()
      FROM payable p
     WHERE NOT EXISTS (
       SELECT 1 FROM dbo.earnings e
        WHERE e.service_line_id = p.service_line_id
          AND e.recipient_partner_id = p.recipient_partner_id
          AND COALESCE(e.level, -1) = COALESCE(p.level, -1)
          AND e.payment_id IS NULL
     );
  `;
}

function softCancelInvalidServiceSql(row) {
  const note = '[nk3 repair 2026-06-06] soft-cancelled invalid CTV service-card row: missing customer/product';
  return `
    UPDATE dbo.saleorderlines
       SET isdeleted = true, state = 'cancelled', lastupdated = now()
     WHERE id = ${uuidLit(row.service_line_id)};
    UPDATE dbo.saleorders
       SET isdeleted = true,
           state = 'cancelled',
           notes = CONCAT_WS(E'\\n', NULLIF(notes, ''), ${sqlLit(note)}),
           lastupdated = now()
     WHERE id = ${uuidLit(row.saleorder_id)}
       AND NOT EXISTS (
         SELECT 1 FROM dbo.saleorderlines
          WHERE orderid = ${uuidLit(row.saleorder_id)}
            AND id <> ${uuidLit(row.service_line_id)}
            AND COALESCE(isdeleted, false) = false
       );
  `;
}

function repairOrphanPaidEarningSql(row) {
  return `
    UPDATE dbo.earnings
       SET status = 'pending', payout_id = NULL
     WHERE id = ${uuidLit(row.id)}
       AND status = 'paid'
       AND payout_id = ${uuidLit(row.payout_id)}
       AND NOT EXISTS (SELECT 1 FROM dbo.payouts p WHERE p.id = ${uuidLit(row.payout_id)});
  `;
}

function migrationHash(filename) {
  const full = MIGRATION_PATHS[filename];
  if (!full) throw new Error(`Migration file is not allowlisted for NK3 repair: ${filename}`);
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}

function insertMigrationLedgerSql(filename) {
  return `
    INSERT INTO dbo.schema_migrations (filename, applied_at, hash)
    SELECT ${sqlLit(filename)}, now(), ${sqlLit(migrationHash(filename))}
    WHERE NOT EXISTS (SELECT 1 FROM dbo.schema_migrations WHERE filename = ${sqlLit(filename)});
  `;
}

function planSqlBatch(plan, serviceGaps, orphanEarnings, ledgerMissing) {
  const dental = [];
  const cosmetic = [];
  for (const op of plan.dentalUpdates) dental.push(updatePartnerSql(op));
  for (const op of plan.dentalInserts) dental.push(insertDentalPartnerSql(op));
  for (const op of plan.cosmeticUpdates) cosmetic.push(updatePartnerSql(op));

  for (const gap of serviceGaps) {
    const decision = classifyServiceCardGap(gap);
    if (decision.action === 'soft_cancel_invalid_service') {
      (gap.lob === 'dental' ? dental : cosmetic).push(softCancelInvalidServiceSql(gap));
    } else if (decision.action === 'backfill_service_card_earning') {
      (gap.lob === 'dental' ? dental : cosmetic).push(serviceCardBackfillSql(gap));
    }
  }

  for (const row of orphanEarnings.dental) dental.push(repairOrphanPaidEarningSql(row));
  for (const row of orphanEarnings.cosmetic) cosmetic.push(repairOrphanPaidEarningSql(row));
  for (const file of ledgerMissing.dental) dental.push(insertMigrationLedgerSql(file));
  for (const file of ledgerMissing.cosmetic) cosmetic.push(insertMigrationLedgerSql(file));
  return { dental, cosmetic };
}

function wrapTransaction(sqls) {
  if (sqls.length === 0) return '';
  return ['BEGIN;', ...sqls, 'COMMIT;'].join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const [dentalRows, cosmeticRows] = [
    jsonQuery(args, DENTAL_DB, ctvRowsSql()),
    jsonQuery(args, COSMETIC_DB, ctvRowsSql()),
  ];
  const ctvPlan = computeCtvRepairPlan({ dentalRows, cosmeticRows });
  const serviceGaps = [
    ...jsonQuery(args, DENTAL_DB, serviceCardGapsSql('dental')),
    ...jsonQuery(args, COSMETIC_DB, serviceCardGapsSql('cosmetic')),
  ];
  const orphanEarnings = {
    dental: jsonQuery(args, DENTAL_DB, orphanPaidEarningsSql()),
    cosmetic: jsonQuery(args, COSMETIC_DB, orphanPaidEarningsSql()),
  };
  const ledgerRows = {
    dental: jsonQuery(args, DENTAL_DB, migrationLedgerSql()),
    cosmetic: jsonQuery(args, COSMETIC_DB, migrationLedgerSql()),
  };
  const ledgerMissing = {
    dental: migrationLedgerTargets('dental').filter((f) => !ledgerRows.dental.includes(f)),
    cosmetic: migrationLedgerTargets('cosmetic').filter((f) => !ledgerRows.cosmetic.includes(f)),
  };
  const sqlBatch = planSqlBatch(ctvPlan, serviceGaps, orphanEarnings, ledgerMissing);

  const summary = {
    mode: args.apply ? 'apply' : 'dry-run',
    target: { dental: DENTAL_DB, cosmetic: COSMETIC_DB, vps: args.useVps ? NK3_VPS : 'local-docker' },
    ctv: {
      dentalUpdates: ctvPlan.dentalUpdates.length,
      cosmeticUpdates: ctvPlan.cosmeticUpdates.length,
      dentalInserts: ctvPlan.dentalInserts.length,
      unresolved: ctvPlan.unresolved,
      dentalUpdateDetails: ctvPlan.dentalUpdates.map((op) => ({ id: op.id, reasons: op.reasons })),
      cosmeticUpdateDetails: ctvPlan.cosmeticUpdates.map((op) => ({ id: op.id, reasons: op.reasons })),
      dentalInsertDetails: ctvPlan.dentalInserts.map((op) => ({ id: op.id, reason: op.reason, name: op.row.name, phone: op.row.phone })),
    },
    serviceGaps: serviceGaps.map((gap) => ({
      lob: gap.lob,
      service_line_id: gap.service_line_id,
      saleorder_id: gap.saleorder_id,
      decision: classifyServiceCardGap(gap),
    })),
    orphanPaidEarnings: orphanEarnings,
    ledgerMissing,
    sqlStatements: { dental: sqlBatch.dental.length, cosmetic: sqlBatch.cosmetic.length },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!args.apply) return;

  if (sqlBatch.dental.length > 0) psql(args, DENTAL_DB, wrapTransaction(sqlBatch.dental));
  if (sqlBatch.cosmetic.length > 0) psql(args, COSMETIC_DB, wrapTransaction(sqlBatch.cosmetic));
  console.log(JSON.stringify({ applied: true, dentalStatements: sqlBatch.dental.length, cosmeticStatements: sqlBatch.cosmetic.length }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
