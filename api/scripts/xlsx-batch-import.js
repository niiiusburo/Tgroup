#!/usr/bin/env node

const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const ExcelJS = require('exceljs');
const { DEFAULT_DB, clean } = require('./tdental-import/utils');

const HEADER_ALIASES = {
  customerCode: ['Mã khách hàng', 'Mã KH'],
  customerName: ['Họ và tên', 'Tên KH', 'Tên Khách Hàng', 'Khách hàng'],
  phone: ['Số điện thoại', 'SĐT'],
  branch: ['Cơ sở', 'Chi nhánh', 'Chi nhánh tạo'],
  appointmentDate: ['Ngày hẹn'],
  appointmentTime: ['Giờ hẹn'],
  service: ['Dịch vụ'],
  doctor: ['Bác sĩ'],
  assistant: ['Phụ tá'],
  dentalAide: ['Trợ lý bác sĩ'],
  content: ['Nội dung', 'Ghi chú'],
  appointmentType: ['Loại khám', 'Loại hẹn'],
  status: ['Trạng thái'],
};

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

function firstValue(row, aliases) {
  const normalizedValues = new Map(
    Object.entries(row).map(([key, value]) => [normalizeText(key), value]),
  );
  for (const alias of aliases) {
    const value = normalizedValues.get(normalizeText(alias));
    if (value !== undefined && value !== null && clean(value) !== '') return value;
  }
  return '';
}

function excelValue(value) {
  if (value && typeof value === 'object') {
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
    if (value.richText) return value.richText.map((part) => part.text || '').join('');
  }
  return value;
}

function excelDateSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(Date.UTC(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate()));
}

function parseDatePart(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const useUtcDate = value.getUTCHours() === 0
      && value.getUTCMinutes() === 0
      && value.getUTCSeconds() === 0;
    const year = useUtcDate ? value.getUTCFullYear() : value.getFullYear();
    const month = useUtcDate ? value.getUTCMonth() : value.getMonth();
    const date = useUtcDate ? value.getUTCDate() : value.getDate();
    return [
      year,
      String(month + 1).padStart(2, '0'),
      String(date).padStart(2, '0'),
    ].join('-');
  }
  if (typeof value === 'number') {
    const date = excelDateSerialToDate(value);
    return date ? date.toISOString().slice(0, 10) : '';
  }
  const raw = clean(value);
  const vn = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vn) return `${vn[3]}-${vn[2].padStart(2, '0')}-${vn[1].padStart(2, '0')}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : '';
}

function parseTimePart(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }
  const raw = clean(value);
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
}

function mapAppointmentStatus(value) {
  const normalized = normalizeText(value);
  if (normalized.includes('HUY')) return 'cancelled';
  if (normalized.includes('DA DEN')) return 'arrived';
  if (normalized.includes('DA KHAM')) return 'done';
  if (normalized.includes('CHO KHAM')) return 'arrived';
  if (normalized.includes('DANG HEN') || normalized.includes('CHUA XAC NHAN')) return 'scheduled';
  if (normalized.includes('XAC NHAN')) return 'confirmed';
  return 'scheduled';
}

function composeAppointmentNote(row) {
  const lines = [];
  const content = row.content;
  if (content) lines.push(content);
  if (row.service) lines.push(`Dịch vụ: ${row.service}`);
  if (row.doctorName && !row.doctorId) lines.push(`Bác sĩ: ${row.doctorName}`);
  if (row.assistantName) lines.push(`Phụ tá: ${row.assistantName}`);
  if (row.dentalAideName) lines.push(`Trợ lý bác sĩ: ${row.dentalAideName}`);
  return [...new Set(lines.map(clean).filter(Boolean))].join('\n');
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

function normalizeCustomerSheetRow(entry) {
  const row = entry.source;
  return {
    rowNumber: entry.rowNumber,
    ref: clean(firstValue(row, HEADER_ALIASES.customerCode)).replace(/\s+/g, '').toUpperCase(),
    name: clean(firstValue(row, HEADER_ALIASES.customerName)),
    phone: clean(firstValue(row, HEADER_ALIASES.phone)),
    branchName: clean(firstValue(row, HEADER_ALIASES.branch)),
  };
}

function normalizeAppointmentSheetRow(entry) {
  const row = entry.source;
  const date = parseDatePart(firstValue(row, HEADER_ALIASES.appointmentDate));
  const time = parseTimePart(firstValue(row, HEADER_ALIASES.appointmentTime));
  return {
    rowNumber: entry.rowNumber,
    ref: clean(firstValue(row, HEADER_ALIASES.customerCode)).replace(/\s+/g, '').toUpperCase(),
    customerName: clean(firstValue(row, HEADER_ALIASES.customerName)),
    phone: clean(firstValue(row, HEADER_ALIASES.phone)),
    branchName: clean(firstValue(row, HEADER_ALIASES.branch)),
    date,
    time,
    datetime: date ? `${date} ${time || '00:00'}:00` : '',
    service: clean(firstValue(row, HEADER_ALIASES.service)),
    doctorName: clean(firstValue(row, HEADER_ALIASES.doctor)),
    assistantName: clean(firstValue(row, HEADER_ALIASES.assistant)),
    dentalAideName: clean(firstValue(row, HEADER_ALIASES.dentalAide)),
    content: clean(firstValue(row, HEADER_ALIASES.content)),
    appointmentType: clean(firstValue(row, HEADER_ALIASES.appointmentType)),
    status: mapAppointmentStatus(firstValue(row, HEADER_ALIASES.status)),
  };
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
  return new Map(rows.map((row) => [normalizeRef(row.ref), row]).filter(([ref]) => Boolean(ref)));
}

function resolveStaffId(name, staffByName) {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  return staffByName.get(normalized)?.id || null;
}

function buildCustomerPlan(rows, lookups) {
  const seen = new Set();
  const actions = [];
  const anomalies = [];
  for (const row of rows) {
    if (!row.ref || !row.name) {
      anomalies.push({ rowNumber: row.rowNumber, code: 'customer_missing_required', message: 'Missing customer code or name.' });
      continue;
    }
    if (seen.has(row.ref)) {
      anomalies.push({ rowNumber: row.rowNumber, code: 'customer_duplicate_in_sheet', message: `Duplicate customer code in sheet: ${row.ref}` });
      continue;
    }
    seen.add(row.ref);
    const company = lookups.companyByName.get(normalizeText(row.branchName));
    const existing = lookups.customerByRef.get(normalizeRef(row.ref));
    actions.push({
      type: existing ? 'update' : 'create',
      rowNumber: row.rowNumber,
      id: existing?.id || null,
      ref: row.ref,
      name: row.name,
      phone: row.phone,
      companyid: company?.id || existing?.companyid || lookups.defaultCompanyId,
      existing,
    });
    if (row.branchName && !company) {
      anomalies.push({ rowNumber: row.rowNumber, code: 'customer_unknown_branch', message: `Unknown branch: ${row.branchName}` });
    }
  }
  return { actions, anomalies };
}

function buildAppointmentPlan(rows, lookups) {
  const actions = [];
  const anomalies = [];
  for (const row of rows) {
    const customer = lookups.customerByRef.get(normalizeRef(row.ref));
    if (!row.ref || !customer) {
      anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_missing_customer', message: `Customer code not found: ${row.ref || '(blank)'}` });
      continue;
    }
    if (!row.date) {
      anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_missing_date', message: 'Missing or invalid appointment date.' });
      continue;
    }
    const company = row.branchName ? lookups.companyByName.get(normalizeText(row.branchName)) : null;
    const doctorId = resolveStaffId(row.doctorName, lookups.staffByName);
    const assistantId = resolveStaffId(row.assistantName, lookups.staffByName);
    const dentalAideId = resolveStaffId(row.dentalAideName, lookups.staffByName);
    const note = composeAppointmentNote({ ...row, doctorId, assistantId, dentalAideId });
    const signature = `${customer.id}|${row.datetime}|${note}`;
    const existing = lookups.appointmentSignatures.has(signature);
    actions.push({
      type: existing ? 'skip_existing' : 'create',
      rowNumber: row.rowNumber,
      partnerid: customer.id,
      companyid: company?.id || customer.companyid || lookups.defaultCompanyId,
      datetime: row.datetime,
      date: row.datetime,
      time: row.time,
      note,
      reason: row.content || null,
      state: row.status,
      isrepeatcustomer: normalizeText(row.appointmentType).includes('TAI KHAM'),
      doctorid: doctorId,
      assistantid: assistantId,
      dentalaideid: dentalAideId,
      source: row,
    });
    if (row.branchName && !company) anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_unknown_branch', message: `Unknown branch: ${row.branchName}` });
    if (row.doctorName && !doctorId) anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_unmatched_doctor', message: `Doctor not matched: ${row.doctorName}` });
    if (row.assistantName && !assistantId) anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_unmatched_assistant', message: `Assistant not matched: ${row.assistantName}` });
    if (row.dentalAideName && !dentalAideId) anomalies.push({ rowNumber: row.rowNumber, code: 'appointment_unmatched_dental_aide', message: `Dental aide not matched: ${row.dentalAideName}` });
  }
  return { actions, anomalies };
}

function summarizePlan(customerPlan, appointmentPlan) {
  return {
    customers: {
      create: customerPlan.actions.filter((action) => action.type === 'create').length,
      update: customerPlan.actions.filter((action) => action.type === 'update').length,
      anomalies: customerPlan.anomalies.length,
    },
    appointments: {
      create: appointmentPlan.actions.filter((action) => action.type === 'create').length,
      skipExisting: appointmentPlan.actions.filter((action) => action.type === 'skip_existing').length,
      anomalies: appointmentPlan.anomalies.length,
    },
  };
}

async function loadLookups(client) {
  const companies = await client.query('SELECT id, name FROM companies');
  const customers = await client.query('SELECT id, ref, name, phone, companyid FROM partners WHERE customer = true AND COALESCE(isdeleted, false) = false');
  const staff = await client.query(`SELECT id, name FROM employees WHERE COALESCE(active, true) = true
      UNION
      SELECT id, name FROM partners WHERE employee = true AND COALESCE(isdeleted, false) = false AND COALESCE(active, true) = true`);
  const appointments = await client.query(`SELECT partnerid, to_char(date, 'YYYY-MM-DD HH24:MI:SS') AS datekey, note FROM appointments WHERE partnerid IS NOT NULL AND date >= '2026-05-01'`);
  const companyByName = mapByNormalizedName(companies.rows);
  const customerByRef = buildCustomerByRef(customers.rows);
  const staffByName = mapByNormalizedName(staff.rows);
  const appointmentSignatures = new Set(appointments.rows.map((row) => `${row.partnerid}|${row.datekey}|${clean(row.note)}`));
  return {
    companyByName,
    customerByRef,
    staffByName,
    appointmentSignatures,
    defaultCompanyId: companies.rows[0]?.id || null,
  };
}

async function applyCustomerActions(client, actions) {
  let count = 0;
  for (const action of actions) {
    if (action.type === 'create') {
      await client.query(
        `INSERT INTO partners (
          id, name, displayname, ref, phone, companyid, customer, supplier, employee,
          isagent, isinsurance, active, isdeleted, isbusinessinvoice, iscompany, ishead,
          usedaddressv2, isdoctor, isassistant, isreceptionist, datecreated, lastupdated
        ) VALUES ($1,$2,$2,$3,$4,$5,true,false,false,false,false,true,false,false,false,false,false,false,false,false,NOW(),NOW())`,
        [crypto.randomUUID(), action.name, action.ref, action.phone || null, action.companyid],
      );
    } else if (action.type === 'update') {
      await client.query(
        `UPDATE partners
         SET name = $2, displayname = $2, phone = COALESCE(NULLIF($3, ''), phone),
             companyid = COALESCE($4, companyid), lastupdated = NOW()
         WHERE id = $1`,
        [action.id, action.name, action.phone || '', action.companyid],
      );
    }
    count += 1;
  }
  return count;
}

async function nextAppointmentName(client, offset) {
  const result = await client.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + $1 AS next_seq FROM appointments WHERE name LIKE 'AP%'",
    [offset + 1],
  );
  return `AP${String(result.rows[0]?.next_seq || offset + 1).padStart(6, '0')}`;
}

async function applyAppointmentActions(client, actions) {
  let count = 0;
  for (const action of actions.filter((item) => item.type === 'create')) {
    const name = await nextAppointmentName(client, count);
    await client.query(
      `INSERT INTO appointments (
        id, name, date, time, datetimeappointment, timeexpected, note, partnerid, companyid,
        doctorid, assistantid, dentalaideid, state, aptstate, reason, isrepeatcustomer,
        isnotreatment, datecreated, lastupdated
      ) VALUES (
        $1,$2,$3,$4,$3,30,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,false,NOW(),NOW()
      )`,
      [
        crypto.randomUUID(),
        name,
        action.datetime,
        action.time || null,
        action.note,
        action.partnerid,
        action.companyid,
        action.doctorid,
        action.assistantid,
        action.dentalaideid,
        action.state,
        action.reason,
        action.isrepeatcustomer,
      ],
    );
    count += 1;
  }
  return count;
}

function parseArgs(argv) {
  const args = { dryRun: false, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--customers') args.customers = argv[++i];
    else if (arg === '--appointments') args.appointments = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.customers && !args.appointments) throw new Error('Provide --customers and/or --appointments');
  if (args.dryRun === args.apply) throw new Error('Choose exactly one of --dry-run or --apply');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB, options: '-c search_path=dbo' });
  await client.connect();
  try {
    const lookups = await loadLookups(client);
    const customerRows = args.customers
      ? (await readWorkbookRows(path.resolve(args.customers))).map(normalizeCustomerSheetRow)
      : [];
    const customerPlan = buildCustomerPlan(customerRows, lookups);
    if (args.apply && customerPlan.actions.length > 0) {
      await client.query('BEGIN');
      try {
        await applyCustomerActions(client, customerPlan.actions);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    const refreshedLookups = args.apply && customerPlan.actions.length > 0 ? await loadLookups(client) : lookups;
    const appointmentRows = args.appointments
      ? (await readWorkbookRows(path.resolve(args.appointments))).map(normalizeAppointmentSheetRow)
      : [];
    const appointmentPlan = buildAppointmentPlan(appointmentRows, refreshedLookups);
    if (args.apply && appointmentPlan.actions.some((action) => action.type === 'create')) {
      await client.query('BEGIN');
      try {
        await applyAppointmentActions(client, appointmentPlan.actions);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    const summary = summarizePlan(customerPlan, appointmentPlan);
    console.log(JSON.stringify({ summary, customerAnomalies: customerPlan.anomalies, appointmentAnomalies: appointmentPlan.anomalies }, null, 2));
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
  buildAppointmentPlan,
  buildCustomerByRef,
  buildCustomerPlan,
  composeAppointmentNote,
  mapAppointmentStatus,
  normalizeAppointmentSheetRow,
  normalizeCustomerSheetRow,
  normalizeRef,
  normalizeText,
  parseArgs,
  parseDatePart,
  parseTimePart,
  summarizePlan,
};
