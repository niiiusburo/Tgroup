#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { clean, DEFAULT_DB, normalizeUuid, parseCsvTimestamp } = require('./utils');

function normalizeText(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeRef(value) {
  return clean(value).replace(/\s+/g, '').toUpperCase();
}

function parseArgs(argv) {
  const args = { dryRun: false, apply: false, bucket: 'present_in_partners_csv' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--live-match') args.liveMatch = argv[++i];
    else if (arg === '--presence') args.presence = argv[++i];
    else if (arg === '--summary-out') args.summaryOut = argv[++i];
    else if (arg === '--audit-out') args.auditOut = argv[++i];
    else if (arg === '--bucket') args.bucket = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.liveMatch) throw new Error('--live-match is required');
  if (!args.presence) throw new Error('--presence is required');
  if (args.dryRun === args.apply) throw new Error('Choose exactly one of --dry-run or --apply');
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function buildPresenceByRef(presence) {
  return new Map((presence.rows || []).map((row) => [normalizeRef(row.source_ref), row]));
}

function liveResultToCustomer(result) {
  const exact = result.live?.exactRefMatches?.[0] || {};
  const ref = normalizeRef(result.source?.ref || exact.ref);
  const name = clean(exact.name || result.source?.name);
  return {
    id: normalizeUuid(exact.id),
    ref,
    name,
    displayname: clean(exact.displayName) || `[${ref}] ${name}`,
    phone: clean(exact.phone || result.source?.phone),
    active: exact.active !== false,
    datecreated: parseCsvTimestamp(exact.dateCreated),
    comment: clean(exact.comment),
    jobtitle: clean(exact.jobTitle),
    branchName: clean(result.source?.branch),
    appointmentRows: Number(result.source?.rowCount || 0),
    rowNumbers: result.source?.rowNumbers || [],
  };
}

function mapLocalIndexes(localRows) {
  const byId = new Map();
  const byRef = new Map();
  for (const row of localRows || []) {
    const id = normalizeUuid(row.id);
    const ref = normalizeRef(row.ref);
    if (id) byId.set(id, row);
    if (ref) {
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push(row);
    }
  }
  return { byId, byRef };
}

function buildCompanyByName(companies) {
  return new Map((companies || []).map((company) => [normalizeText(company.name), company]));
}

function changedFields(customer, existing) {
  if (!existing) return ['create_partner'];
  const checks = [
    ['ref', customer.ref, existing.ref],
    ['name', customer.name, existing.name],
    ['displayname', customer.displayname, existing.displayname],
    ['phone', customer.phone, existing.phone],
    ['comment', customer.comment, existing.comment],
    ['jobtitle', customer.jobtitle, existing.jobtitle],
  ];
  return checks.filter(([, next, current]) => clean(next) !== clean(current)).map(([field]) => field);
}

function buildCustomerDeltaPlan({ liveMatch, presence, localRows, companies, bucket = 'present_in_partners_csv' }) {
  const presenceByRef = buildPresenceByRef(presence);
  const { byId, byRef } = mapLocalIndexes(localRows);
  const companyByName = buildCompanyByName(companies);
  const defaultCompanyId = companies?.[0]?.id || null;
  const actions = [];
  const held = [];
  const anomalies = [];

  for (const result of liveMatch.results || []) {
    const ref = normalizeRef(result.source?.ref);
    const presenceRow = presenceByRef.get(ref);
    const sourceBucket = presenceRow?.bucket || 'not_classified';
    const customer = liveResultToCustomer(result);

    if (sourceBucket !== bucket) {
      held.push({
        ref,
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        sourceBucket,
        reason: sourceBucket === 'not_in_archive_csvs' ? 'live_only_not_in_downloads_csv' : 'outside_requested_bucket',
      });
      continue;
    }

    if (!customer.id || !customer.ref || !customer.name) {
      anomalies.push({ code: 'customer_missing_required', ref, sourceBucket, message: 'Missing TDental id, ref, or name.' });
      continue;
    }

    const existing = byId.get(customer.id) || null;
    const sameRefOtherIds = (byRef.get(customer.ref) || []).filter((row) => normalizeUuid(row.id) !== customer.id);
    if (sameRefOtherIds.length > 0) {
      anomalies.push({
        code: 'customer_ref_used_by_other_uuid',
        ref: customer.ref,
        id: customer.id,
        message: 'Target ref is already used by a different local partner UUID.',
        details: { localIds: sameRefOtherIds.map((row) => row.id) },
      });
      continue;
    }

    const branchCompany = companyByName.get(normalizeText(customer.branchName));
    const companyid = existing?.companyid || branchCompany?.id || defaultCompanyId;
    actions.push({
      type: existing ? 'update' : 'create',
      id: customer.id,
      ref: customer.ref,
      name: customer.name,
      displayname: customer.displayname,
      phone: customer.phone || null,
      companyid,
      comment: customer.comment || null,
      jobtitle: customer.jobtitle || null,
      active: customer.active,
      datecreated: customer.datecreated,
      branchName: customer.branchName,
      appointmentRows: customer.appointmentRows,
      rowNumbers: customer.rowNumbers,
      localRef: existing?.ref || null,
      localName: existing?.name || null,
      changedFields: changedFields(customer, existing),
    });
  }

  return {
    actions,
    held,
    anomalies,
    summary: {
      bucket,
      create: actions.filter((action) => action.type === 'create').length,
      update: actions.filter((action) => action.type === 'update').length,
      held: held.length,
      anomalies: anomalies.length,
      duplicateRiskIfMatchedByRef: actions.filter((action) => action.localRef && normalizeRef(action.localRef) !== action.ref).length,
      appointmentRowsCovered: actions.reduce((sum, action) => sum + action.appointmentRows, 0),
    },
  };
}

async function loadLocalInputs(client, planIds, planRefs) {
  const local = await client.query(
    `SELECT id::text, ref, name, displayname, phone, companyid::text, comment, jobtitle,
            customer, isdeleted, active
       FROM partners
      WHERE id = ANY($1::uuid[])
         OR upper(regexp_replace(coalesce(ref, ''), '\\s', '', 'g')) = ANY($2::text[])`,
    [planIds, planRefs],
  );
  const companies = await client.query('SELECT id::text, name FROM companies ORDER BY name');
  return { localRows: local.rows, companies: companies.rows };
}

async function applyActions(client, actions) {
  for (const action of actions) {
    await client.query(
      `INSERT INTO partners (
        id, ref, name, displayname, phone, companyid, comment, jobtitle,
        customer, supplier, employee, isagent, isinsurance, active, isdeleted,
        isbusinessinvoice, iscompany, ishead, usedaddressv2, isdoctor, isassistant,
        isreceptionist, datecreated, lastupdated
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        true,false,false,false,false,$9,false,
        false,false,false,false,false,false,
        false,COALESCE($10::timestamp, NOW()),NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        ref = EXCLUDED.ref,
        name = EXCLUDED.name,
        displayname = EXCLUDED.displayname,
        phone = COALESCE(EXCLUDED.phone, partners.phone),
        companyid = COALESCE(partners.companyid, EXCLUDED.companyid),
        comment = COALESCE(EXCLUDED.comment, partners.comment),
        jobtitle = COALESCE(EXCLUDED.jobtitle, partners.jobtitle),
        customer = true,
        supplier = false,
        employee = false,
        active = EXCLUDED.active,
        isdeleted = false,
        lastupdated = NOW()`,
      [
        action.id,
        action.ref,
        action.name,
        action.displayname,
        action.phone,
        action.companyid,
        action.comment,
        action.jobtitle,
        action.active,
        action.datecreated,
      ],
    );
  }
  return actions.length;
}

function writeArtifacts(result, args) {
  if (args.summaryOut) {
    fs.mkdirSync(path.dirname(path.resolve(args.summaryOut)), { recursive: true });
    fs.writeFileSync(path.resolve(args.summaryOut), `${JSON.stringify(result, null, 2)}\n`);
  }
  if (args.auditOut) {
    fs.mkdirSync(path.dirname(path.resolve(args.auditOut)), { recursive: true });
    fs.writeFileSync(
      path.resolve(args.auditOut),
      [...result.actions, ...result.held, ...result.anomalies].map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const liveMatch = readJson(args.liveMatch);
  const presence = readJson(args.presence);
  const candidates = (liveMatch.results || []).map(liveResultToCustomer).filter((row) => row.id);
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo' });
  await client.connect();
  try {
    const inputs = await loadLocalInputs(
      client,
      candidates.map((row) => row.id),
      candidates.map((row) => row.ref),
    );
    const plan = buildCustomerDeltaPlan({ liveMatch, presence, ...inputs, bucket: args.bucket });
    const result = { generatedAt: new Date().toISOString(), mode: args.apply ? 'apply' : 'dry-run', ...plan };

    if (args.apply && plan.actions.length > 0) {
      await client.query('BEGIN');
      try {
        result.applied = await applyActions(client, plan.actions);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    writeArtifacts(result, args);
    console.log(JSON.stringify({ summary: result.summary, applied: result.applied || 0 }, null, 2));
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
  buildCustomerDeltaPlan,
  liveResultToCustomer,
  normalizeRef,
  normalizeText,
  parseArgs,
};
