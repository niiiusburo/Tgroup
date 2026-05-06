#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const ExcelJS = require('exceljs');
const {
  buildAppointmentPlan,
  normalizeAppointmentSheetRow,
} = require('../xlsx-batch-import');
const { clean, DEFAULT_DB, uuidOrNull } = require('./utils');

function normalizeText(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body
    .filter((values) => values.length === headers.length)
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
}

function excelValue(value) {
  if (value && typeof value === 'object') {
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
    if (value.richText) return value.richText.map((part) => part.text || '').join('');
  }
  return value;
}

async function readWorkbookRows(file) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const headers = worksheet.getRow(1).values.slice(1).map((value) => clean(excelValue(value)));
  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const source = {};
    headers.forEach((header, index) => {
      source[header] = excelValue(worksheet.getRow(rowNumber).getCell(index + 1).value);
    });
    if (Object.values(source).every((value) => clean(value) === '')) continue;
    rows.push({ rowNumber, source });
  }
  return rows;
}

function mapByNormalizedName(rows) {
  const map = new Map();
  const duplicates = new Set();
  for (const row of rows) {
    const key = normalizeText(row.name);
    if (!key) continue;
    if (map.has(key) && map.get(key).id !== row.id) duplicates.add(key);
    else map.set(key, row);
  }
  for (const key of duplicates) map.delete(key);
  return map;
}

function buildCustomerByRef(rows) {
  return new Map(
    rows
      .map((row) => [clean(row.ref).replace(/\s+/g, '').toUpperCase(), row])
      .filter(([ref]) => Boolean(ref)),
  );
}

async function loadLookups(client) {
  const companies = await client.query('SELECT id, name FROM companies');
  const customers = await client.query(
    'SELECT id, ref, name, phone, companyid FROM partners WHERE customer = true AND COALESCE(isdeleted, false) = false',
  );
  const staff = await client.query(`SELECT id, name FROM employees WHERE COALESCE(active, true) = true
      UNION
      SELECT id, name FROM partners WHERE employee = true AND COALESCE(isdeleted, false) = false AND COALESCE(active, true) = true`);
  const appointments = await client.query(`SELECT partnerid, to_char(date, 'YYYY-MM-DD HH24:MI:SS') AS datekey, note
      FROM appointments WHERE partnerid IS NOT NULL AND date >= '2026-05-01'`);

  return {
    companyByName: mapByNormalizedName(companies.rows),
    customerByRef: buildCustomerByRef(customers.rows),
    staffByName: mapByNormalizedName(staff.rows),
    appointmentSignatures: new Set(appointments.rows.map((row) => `${row.partnerid}|${row.datekey}|${clean(row.note)}`)),
    defaultCompanyId: companies.rows[0]?.id || null,
  };
}

function buildEnrichmentPlan({ compareRows, appointmentActions }) {
  const actionsByRow = new Map(appointmentActions.map((action) => [String(action.rowNumber), action]));
  const updates = [];
  const skipped = [];

  for (const row of compareRows) {
    const action = actionsByRow.get(String(row.rowNumber));
    const appointmentId = uuidOrNull(row.localAppointmentId);
    if (!appointmentId || !action) {
      skipped.push({ rowNumber: row.rowNumber, appointmentId, reason: 'missing_compare_or_action' });
      continue;
    }
    updates.push({
      appointmentId,
      rowNumber: Number(row.rowNumber),
      ref: action.source?.ref,
      datetime: action.datetime,
      time: action.time || null,
      reason: action.reason || null,
      doctorid: uuidOrNull(action.doctorid),
      assistantid: uuidOrNull(action.assistantid),
      dentalaideid: uuidOrNull(action.dentalaideid),
      isrepeatcustomer: Boolean(action.isrepeatcustomer),
    });
  }

  return {
    updates,
    skipped,
    summary: {
      requestedRows: compareRows.length,
      updateRows: updates.length,
      skippedRows: skipped.length,
      withDoctor: updates.filter((update) => update.doctorid).length,
      withAssistant: updates.filter((update) => update.assistantid).length,
      withDentalAide: updates.filter((update) => update.dentalaideid).length,
    },
  };
}

async function applyUpdates(client, updates) {
  for (const update of updates) {
    await client.query(
      `UPDATE appointments
          SET time = $2,
              datetimeappointment = $3::timestamp,
              reason = $4,
              doctorid = $5,
              assistantid = COALESCE($6, assistantid),
              dentalaideid = COALESCE($7, dentalaideid),
              isrepeatcustomer = $8,
              lastupdated = NOW()
        WHERE id = $1`,
      [
        update.appointmentId,
        update.time,
        update.datetime,
        update.reason,
        update.doctorid,
        update.assistantid,
        update.dentalaideid,
        update.isrepeatcustomer,
      ],
    );
  }
  return updates.length;
}

function parseArgs(argv) {
  const args = { dryRun: false, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--appointments') args.appointments = argv[++i];
    else if (arg === '--compare') args.compare = argv[++i];
    else if (arg === '--summary-out') args.summaryOut = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.appointments) throw new Error('--appointments is required');
  if (!args.compare) throw new Error('--compare is required');
  if (args.dryRun === args.apply) throw new Error('Choose exactly one of --dry-run or --apply');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo' });
  await client.connect();
  try {
    const lookups = await loadLookups(client);
    const appointmentRows = (await readWorkbookRows(path.resolve(args.appointments))).map(normalizeAppointmentSheetRow);
    const appointmentPlan = buildAppointmentPlan(appointmentRows, lookups);
    const compareRows = parseCsv(fs.readFileSync(path.resolve(args.compare), 'utf8'));
    const plan = buildEnrichmentPlan({ compareRows, appointmentActions: appointmentPlan.actions });
    const result = { generatedAt: new Date().toISOString(), mode: args.apply ? 'apply' : 'dry-run', ...plan };

    if (args.apply && plan.updates.length > 0) {
      await client.query('BEGIN');
      try {
        result.applied = await applyUpdates(client, plan.updates);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    if (args.summaryOut) {
      fs.mkdirSync(path.dirname(path.resolve(args.summaryOut)), { recursive: true });
      fs.writeFileSync(path.resolve(args.summaryOut), `${JSON.stringify(result, null, 2)}\n`);
    }
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
  buildEnrichmentPlan,
  parseArgs,
};
