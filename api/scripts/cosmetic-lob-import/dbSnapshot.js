const { normalizePhone, normalizeText } = require('./normalizers');

const DEFAULT_COSMETIC_DB = 'postgresql://postgres:postgres@127.0.0.1:5433/tcosmetic_demo';

function deriveCosmeticDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return '';
  return databaseUrl.replace(/\/[^/?]+(\?.*)?$/, '/tcosmetic_demo$1');
}

function databaseUrlFromEnv() {
  return process.env.COSMETIC_DATABASE_URL
    || deriveCosmeticDatabaseUrl(process.env.DATABASE_URL)
    || DEFAULT_COSMETIC_DB;
}

function rowsByNormalizedName(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeText(row.name);
    if (!key || map.has(key)) continue;
    map.set(key, row);
  }
  return map;
}

function mapRowsByPhone(rows) {
  const map = new Map();
  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    if (!phone) continue;
    if (!map.has(phone)) map.set(phone, []);
    map.get(phone).push(row);
  }
  return map;
}

async function loadSnapshot(client) {
  const companies = await client.query('SELECT id, name FROM companies');
  const customers = await client.query("SELECT id, name, phone, ref, companyid FROM partners WHERE customer = true AND COALESCE(isdeleted, false) = false");
  const staff = await client.query("SELECT id, name, isdoctor, isassistant, isreceptionist FROM partners WHERE employee = true AND COALESCE(isdeleted, false) = false");
  const products = await client.query("SELECT id, name FROM products WHERE COALESCE(active, true) = true");
  const payments = await client.query("SELECT id, reference_code FROM payments WHERE reference_code LIKE 'COSMETIC_SHEET:%'");
  const saleOrders = await client.query("SELECT id, code, origin FROM saleorders WHERE code LIKE 'COSMETIC_SHEET:%' OR origin = 'cosmetic-sheet'");
  return {
    companies: companies.rows,
    companyByName: rowsByNormalizedName(companies.rows),
    customers: customers.rows,
    customersByPhone: mapRowsByPhone(customers.rows),
    staffByName: rowsByNormalizedName(staff.rows),
    productsByName: rowsByNormalizedName(products.rows),
    paymentRefs: new Set(payments.rows.map((row) => row.reference_code).filter(Boolean)),
    orderCodes: new Set(saleOrders.rows.map((row) => row.code).filter(Boolean)),
  };
}

async function refreshSnapshot(client) {
  return loadSnapshot(client);
}

module.exports = {
  databaseUrlFromEnv,
  deriveCosmeticDatabaseUrl,
  loadSnapshot,
  refreshSnapshot,
};
