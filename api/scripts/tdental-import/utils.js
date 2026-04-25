const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DEFAULT_DB = 'postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo';
const TABLE_FILES = {
  companies: 'dbo.Companies.csv',
  productcategories: 'dbo.ProductCategories.csv',
  products: 'dbo.Products.csv',
  partners: 'dbo.Partners.csv',
  employees: 'dbo.Employees.csv',
  appointments: 'dbo.Appointments.csv',
  customersources: 'dbo.PartnerSources.csv',
  customerreceipts: 'dbo.CustomerReceipts.csv',
  saleorders: 'dbo.SaleOrders.csv',
  saleorderlines: 'dbo.SaleOrderLines.csv',
  accountpayments: 'dbo.AccountPayments.csv',
  saleorderpayments: 'dbo.SaleOrderPayments.csv',
  saleorderpaymentaccountpaymentrels: 'dbo.SaleOrderPaymentAccountPaymentRels.csv',
  partneradvances: 'dbo.PartnerAdvances.csv',
};

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\u0000/g, '').trim();
}

function nullable(value) {
  const v = clean(value);
  return v === '' ? null : v;
}

function normalizeUuid(value) {
  return clean(value).toLowerCase();
}

function uuidOrNull(value) {
  const v = normalizeUuid(value);
  if (!v || v === '0' || v === '00000000-0000-0000-0000-000000000000') return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v) ? v : null;
}

function numberOrZero(value) {
  const v = clean(value);
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function integerOrNull(value) {
  const v = clean(value);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function booleanOrNull(value) {
  const v = clean(value).toLowerCase();
  if (['1', 'true', 't', 'yes'].includes(v)) return true;
  if (['0', 'false', 'f', 'no'].includes(v)) return false;
  return null;
}

function isDeleted(row) {
  return booleanOrNull(row.IsDeleted) === true;
}

function parseCsvDateOnly(value) {
  const v = clean(value);
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const vn = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vn) return `${vn[3]}-${vn[2].padStart(2, '0')}-${vn[1].padStart(2, '0')}`;
  return null;
}

function parseCsvTimestamp(value) {
  const v = clean(value).replace('T', ' ');
  if (!v) return null;
  const iso = v.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}:\d{2})(?:\.(\d+))?)?/);
  if (!iso) return parseCsvDateOnly(v);
  const time = iso[2] || '00:00:00';
  const fracDigits = iso[3] ? iso[3].slice(0, 6).padEnd(6, '0') : '';
  const frac = fracDigits && !/^0+$/.test(fracDigits) ? `.${fracDigits}` : '';
  return `${iso[1]} ${time}${frac}`;
}

function parseCsvContent(content) {
  return parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function parseCsvRecords(content) {
  return parse(content, {
    columns: false,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function rowToObject(header, row) {
  return header.reduce((obj, column, index) => {
    obj[column] = row[index];
    return obj;
  }, {});
}

function repairPartnerRow(header, row) {
  const extra = row.length - header.length;
  const streetIndex = header.indexOf('Street');
  if (extra <= 0 || streetIndex < 0) return row;
  return [
    ...row.slice(0, streetIndex),
    row.slice(streetIndex, streetIndex + extra + 1).join(','),
    ...row.slice(streetIndex + extra + 1),
  ];
}

function parsePartnersCsvContent(content) {
  const [header, ...rows] = parseCsvRecords(content);
  if (!header) return [];
  return rows.map((row) => rowToObject(header, repairPartnerRow(header, row)));
}

function sanitizeOddQuoteLines(content) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const quoteCount = (line.match(/"/g) || []).length;
      return quoteCount % 2 === 1 ? line.replace(/"/g, '') : line;
    })
    .join('\n');
}

function readCsv(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\u0000/g, '');
  const content = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const parser = path.basename(file) === TABLE_FILES.partners ? parsePartnersCsvContent : parseCsvContent;
  try {
    return parser(content);
  } catch (error) {
    if (!/Quote Not Closed|Invalid Opening Quote/.test(error.message)) throw error;
    return parser(sanitizeOddQuoteLines(content));
  }
}

function loadSource(exportDir) {
  const source = {};
  for (const [key, file] of Object.entries(TABLE_FILES)) {
    const fullPath = path.join(exportDir, file);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing export file: ${fullPath}`);
    source[key] = readCsv(fullPath);
  }
  return source;
}

module.exports = {
  DEFAULT_DB,
  TABLE_FILES,
  booleanOrNull,
  clean,
  integerOrNull,
  isDeleted,
  loadSource,
  normalizeUuid,
  nullable,
  numberOrZero,
  parseCsvDateOnly,
  parseCsvTimestamp,
  readCsv,
  uuidOrNull,
};
