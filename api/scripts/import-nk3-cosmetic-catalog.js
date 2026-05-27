#!/usr/bin/env node
'use strict';

const ExcelJS = require('exceljs');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { normalizeVietnamese } = require('../src/utils/search');

const DEFAULT_SHEET_ID = '1OIHZp1e3_7N6evnqEBTxId3B-ws1ODJwc7B1smXSYqQ';
const DEFAULT_SOURCE_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/export?format=xlsx`;
const DEFAULT_COSMETIC_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/tcosmetic_demo';
const LOCAL_ALLOWED_DATABASES = ['tcosmetic_demo'];
const NK3_ALLOWED_DATABASES = ['tcosmetic_demo', 'tcosmetic_smoketest'];
const DEFAULT_EXTRACT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'reports',
  'nk3-cosmetic-catalog-extract',
  new Date().toISOString().slice(0, 10)
);

function clean(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.text !== undefined) return clean(value.text);
    if (value.result !== undefined) return clean(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('').trim();
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizedKey(value) {
  return normalizeVietnamese(clean(value));
}

function identityKey(value) {
  return clean(value).normalize('NFC').toLocaleLowerCase('vi-VN');
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = clean(value).replace(/[^\d.-]/g, '');
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvCell(value) {
  const text = clean(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

async function downloadWorkbookBuffer(sourceUrl = DEFAULT_SOURCE_URL) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download source workbook: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function parseCatalogWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const servicesSheet = workbook.getWorksheet('Dịch vụ');
  const locationsSheet = workbook.getWorksheet('Chi nhánh');
  if (!servicesSheet) throw new Error('Missing required sheet: Dịch vụ');
  if (!locationsSheet) throw new Error('Missing required sheet: Chi nhánh');

  const services = [];
  const anomalies = [];
  const seenServices = new Map();
  for (let rowNumber = 3; rowNumber <= servicesSheet.rowCount; rowNumber += 1) {
    const row = servicesSheet.getRow(rowNumber);
    const category = clean(row.getCell(2).value);
    const name = clean(row.getCell(3).value);
    const price = parseMoney(row.getCell(4).value);
    if (!category && !name && !price) continue;
    if (!category || !name || price <= 0) {
      anomalies.push({ rowNumber, category, name, price, reason: 'missing_category_name_or_positive_price' });
      continue;
    }
    const key = identityKey(name);
    if (seenServices.has(key)) {
      anomalies.push({ rowNumber, category, name, price, reason: 'duplicate_service_name' });
      continue;
    }
    seenServices.set(key, true);
    services.push({ rowNumber, category, name, price, nameKey: key, categoryKey: identityKey(category) });
  }

  const locations = [];
  const seenLocations = new Map();
  for (let rowNumber = 2; rowNumber <= locationsSheet.rowCount; rowNumber += 1) {
    const name = clean(locationsSheet.getRow(rowNumber).getCell(2).value);
    if (!name) continue;
    const key = identityKey(name);
    if (seenLocations.has(key)) {
      anomalies.push({ rowNumber, location: name, reason: 'duplicate_location_name' });
      continue;
    }
    seenLocations.set(key, true);
    locations.push({ rowNumber, name, nameKey: key });
  }

  const categories = [...new Map(services.map((service) => [service.categoryKey, {
    name: service.category,
    nameKey: service.categoryKey,
  }])).values()];

  return { services, categories, locations, anomalies };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    sourceUrl: process.env.NK3_COSMETIC_CATALOG_URL || DEFAULT_SOURCE_URL,
    connectionString: process.env.COSMETIC_DATABASE_URL || DEFAULT_COSMETIC_URL,
    target: process.env.NK3_COSMETIC_TARGET || 'local',
    apply: false,
    replaceActiveCatalog: true,
    parseOnly: false,
    extract: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--dry-run') args.apply = false;
    else if (arg === '--parse-only') args.parseOnly = true;
    else if (arg === '--keep-existing-active') args.replaceActiveCatalog = false;
    else if (arg === '--source-url') args.sourceUrl = argv[++index];
    else if (arg === '--database-url') args.connectionString = argv[++index];
    else if (arg === '--target') args.target = argv[++index];
    else if (arg === '--extract') args.extract = true;
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function assertSafeTarget({ connectionString, target, apply }) {
  const raw = String(connectionString || '').toLowerCase();
  const targetName = String(target || '').toLowerCase();
  if (!['local', 'nk3'].includes(targetName)) {
    throw new Error(`Refusing target "${target}". Only local and nk3 are allowed.`);
  }
  if (raw.includes('tdental_demo') || raw.includes('nk2') || raw.includes('nk.2checkin.com')) {
    throw new Error('Refusing to run: database URL points at dental, NK, or NK2.');
  }
  const allowedDatabases = targetName === 'nk3' ? NK3_ALLOWED_DATABASES : LOCAL_ALLOWED_DATABASES;
  const dbName = new URL(connectionString).pathname.replace(/^\//, '').toLowerCase();
  if (!allowedDatabases.includes(dbName)) {
    throw new Error(`Refusing database "${dbName}". Expected ${allowedDatabases.join(' or ')} only.`);
  }
  if (apply && targetName === 'nk3' && process.env.CONFIRM_NK3_COSMETIC_IMPORT !== 'YES') {
    throw new Error('NK3 apply requires CONFIRM_NK3_COSMETIC_IMPORT=YES.');
  }
}

async function writeExtractFiles(parsed) {
  const resolvedDir = DEFAULT_EXTRACT_DIR;
  await fs.mkdir(resolvedDir, { recursive: true });
  const files = {
    services: path.join(resolvedDir, 'services.csv'),
    categories: path.join(resolvedDir, 'categories.csv'),
    locations: path.join(resolvedDir, 'locations.csv'),
    anomalies: path.join(resolvedDir, 'anomalies.json'),
    summary: path.join(resolvedDir, 'summary.json'),
  };

  await fs.writeFile(files.services, toCsv([
    ['source_row', 'category', 'service_name', 'price'],
    ...parsed.services.map((service) => [service.rowNumber, service.category, service.name, service.price]),
  ]));
  await fs.writeFile(files.categories, toCsv([
    ['category_name'],
    ...parsed.categories.map((category) => [category.name]),
  ]));
  await fs.writeFile(files.locations, toCsv([
    ['source_row', 'location_name'],
    ...parsed.locations.map((location) => [location.rowNumber, location.name]),
  ]));
  await fs.writeFile(files.anomalies, JSON.stringify(parsed.anomalies, null, 2));
  await fs.writeFile(files.summary, JSON.stringify(summarize(parsed), null, 2));

  return {
    outputDir: resolvedDir,
    files,
  };
}

async function readCurrentCatalog(client) {
  const products = await client.query(`SELECT id, name, namenosign, listprice, categid, active, type FROM products WHERE COALESCE(type, 'service') = 'service'`);
  const categories = await client.query('SELECT id, name, completename, active FROM productcategories');
  const companies = await client.query('SELECT id, name, active FROM companies');
  return {
    products: products.rows,
    categories: categories.rows,
    companies: companies.rows,
  };
}

function buildPlan(parsed, current, options = {}) {
  const replaceActiveCatalog = options.replaceActiveCatalog !== false;
  const categoryByKey = new Map(current.categories.map((row) => [identityKey(row.name), row]));
  const productByKey = new Map(current.products.map((row) => [identityKey(row.name), row]));
  const companyByKey = new Map(current.companies.map((row) => [identityKey(row.name), row]));
  const sheetProductKeys = new Set(parsed.services.map((service) => service.nameKey));
  const sheetCategoryKeys = new Set(parsed.categories.map((category) => category.nameKey));

  return {
    categoriesToCreate: parsed.categories.filter((category) => !categoryByKey.has(category.nameKey)),
    categoriesToUpdate: parsed.categories.filter((category) => categoryByKey.has(category.nameKey)),
    servicesToCreate: parsed.services.filter((service) => !productByKey.has(service.nameKey)),
    servicesToUpdate: parsed.services.filter((service) => productByKey.has(service.nameKey)),
    productsToInactivate: replaceActiveCatalog
      ? current.products.filter((product) => product.active && !sheetProductKeys.has(identityKey(product.name)))
      : [],
    categoriesToInactivate: replaceActiveCatalog
      ? current.categories.filter((category) => category.active && !sheetCategoryKeys.has(identityKey(category.name)))
      : [],
    locationsToCreate: parsed.locations.filter((location) => !companyByKey.has(location.nameKey)),
    locationsToUpdate: parsed.locations.filter((location) => companyByKey.has(location.nameKey)),
  };
}

async function upsertLocation(client, location) {
  const existing = await client.query('SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [location.name]);
  if (existing.rows.length) {
    await client.query('UPDATE companies SET active = true, lastupdated = NOW() WHERE id = $1', [existing.rows[0].id]);
    return existing.rows[0].id;
  }

  const partnerId = randomUUID();
  await client.query(
    `INSERT INTO partners (
      id, displayname, name, namenosign, supplier, customer, isagent, isinsurance,
      active, employee, iscompany, ishead, isbusinessinvoice, isdeleted,
      isdoctor, isassistant, isreceptionist, lob_scope, datecreated, lastupdated
    ) VALUES (
      $1, $2, $2, $3, false, false, false, false,
      true, false, true, false, false, false,
      false, false, false, ARRAY['cosmetic'], NOW(), NOW()
    )`,
    [partnerId, `${location.name} (Company)`, normalizedKey(location.name)]
  );

  const companyId = randomUUID();
  await client.query(
    `INSERT INTO companies (
      id, name, partnerid, active, notallowexportinventorynegative,
      isuppercasepartnername, ishead, paymentsmsvalidation,
      isconnectconfigmedicalprescription, datecreated, lastupdated
    ) VALUES ($1, $2, $3, true, false, false, false, false, false, NOW(), NOW())`,
    [companyId, location.name, partnerId]
  );
  return companyId;
}

async function upsertCategory(client, category) {
  const existing = await client.query('SELECT id FROM productcategories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [category.name]);
  if (existing.rows.length) {
    await client.query(
      'UPDATE productcategories SET name = $1, completename = $1, active = true, lastupdated = NOW() WHERE id = $2',
      [category.name, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }
  const id = randomUUID();
  await client.query(
    `INSERT INTO productcategories (id, name, completename, active, datecreated, lastupdated)
     VALUES ($1, $2, $2, true, NOW(), NOW())`,
    [id, category.name]
  );
  return id;
}

async function applyCatalogImport(client, parsed, options = {}) {
  const categoryIds = new Map();
  for (const category of parsed.categories) {
    categoryIds.set(category.nameKey, await upsertCategory(client, category));
  }

  for (const location of parsed.locations) {
    await upsertLocation(client, location);
  }

  for (const service of parsed.services) {
    const categoryId = categoryIds.get(service.categoryKey);
    const existing = await client.query(
      "SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND COALESCE(type, $2) = $2 LIMIT 1",
      [service.name, 'service']
    );
    if (existing.rows.length) {
      await client.query(
        `UPDATE products
         SET name = $1, namenosign = $2, type = 'service', type2 = 'service',
             listprice = $3, saleprice = $3, categid = $4, uomname = 'Lần',
             active = true, lastupdated = NOW()
         WHERE id = $5`,
        [service.name, normalizedKey(service.name), service.price, categoryId, existing.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO products (
          id, name, namenosign, type, type2, listprice, saleprice, categid,
          uomname, active, canorderlab, datecreated, lastupdated
        ) VALUES ($1, $2, $3, 'service', 'service', $4, $4, $5, 'Lần', true, false, NOW(), NOW())`,
        [randomUUID(), service.name, normalizedKey(service.name), service.price, categoryId]
      );
    }
  }

  if (options.replaceActiveCatalog !== false) {
    const serviceKeys = parsed.services.map((service) => service.nameKey);
    const categoryKeys = parsed.categories.map((category) => category.nameKey);
    await client.query(
      `UPDATE products
       SET active = false, lastupdated = NOW()
       WHERE active = true
         AND COALESCE(type, 'service') = 'service'
         AND NOT (LOWER(TRIM(name)) = ANY($1::text[]))`,
      [serviceKeys]
    );
    await client.query(
      `UPDATE productcategories category
       SET active = false, lastupdated = NOW()
       WHERE category.active = true
         AND NOT (LOWER(TRIM(category.name)) = ANY($1::text[]))
         AND NOT EXISTS (
           SELECT 1
           FROM products product
           WHERE product.categid = category.id
             AND product.active = true
         )`,
      [categoryKeys]
    );
  }
}

function summarize(parsed, plan = null) {
  return {
    source: {
      services: parsed.services.length,
      categories: parsed.categories.length,
      locations: parsed.locations.length,
      anomalies: parsed.anomalies,
    },
    plan: plan ? {
      categoriesToCreate: plan.categoriesToCreate.length,
      categoriesToUpdate: plan.categoriesToUpdate.length,
      servicesToCreate: plan.servicesToCreate.length,
      servicesToUpdate: plan.servicesToUpdate.length,
      productsToInactivate: plan.productsToInactivate.length,
      categoriesToInactivate: plan.categoriesToInactivate.length,
      locationsToCreate: plan.locationsToCreate.length,
      locationsToUpdate: plan.locationsToUpdate.length,
    } : null,
  };
}

async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('Usage: node api/scripts/import-nk3-cosmetic-catalog.js [--dry-run|--apply] [--parse-only] [--extract] [--target local|nk3] [--source-url URL] [--database-url URL] [--keep-existing-active]');
    return;
  }
  assertSafeTarget(args);

  const parsed = await parseCatalogWorkbook(await downloadWorkbookBuffer(args.sourceUrl));
  const extract = args.extract ? await writeExtractFiles(parsed) : null;
  if (args.parseOnly) {
    console.log(JSON.stringify({ ...summarize(parsed), extract }, null, 2));
    return;
  }

  const pool = new Pool({ connectionString: args.connectionString, options: '-c search_path=dbo' });
  const client = await pool.connect();
  try {
    const db = await client.query('SELECT current_database() AS db');
    const allowedDatabases = args.target === 'nk3' ? NK3_ALLOWED_DATABASES : LOCAL_ALLOWED_DATABASES;
    if (!allowedDatabases.includes(db.rows[0].db)) {
      throw new Error(`Connected to ${db.rows[0].db}; expected ${allowedDatabases.join(' or ')}.`);
    }
    const current = await readCurrentCatalog(client);
    const plan = buildPlan(parsed, current, { replaceActiveCatalog: args.replaceActiveCatalog });
    if (!args.apply) {
      console.log(JSON.stringify({ mode: 'dry-run', target: args.target, ...summarize(parsed, plan), extract }, null, 2));
      return;
    }
    await client.query('BEGIN');
    await applyCatalogImport(client, parsed, { replaceActiveCatalog: args.replaceActiveCatalog });
    await client.query('COMMIT');
    const after = await readCurrentCatalog(client);
    console.log(JSON.stringify({
      mode: 'applied',
      target: args.target,
      ...summarize(parsed, plan),
      extract,
      after: {
        activeServices: after.products.filter((product) => product.active).length,
        activeCategories: after.categories.filter((category) => category.active).length,
        activeLocations: after.companies.filter((company) => company.active).length,
      },
    }, null, 2));
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_rollbackError) {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`[import-nk3-cosmetic-catalog] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_SOURCE_URL,
  DEFAULT_EXTRACT_DIR,
  assertSafeTarget,
  buildPlan,
  clean,
  csvCell,
  identityKey,
  parseArgs,
  parseCatalogWorkbook,
  parseMoney,
  normalizedKey,
  toCsv,
  writeExtractFiles,
};
