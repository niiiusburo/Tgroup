/**
 * Migration Configuration
 * Centralizes database connections, table ordering, and migration settings.
 */

const path = require('path');

function requireProjectDependency(name) {
  try {
    return require(name);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require(path.resolve(__dirname, '../../api/node_modules', name));
  }
}

function loadDotenv() {
  try {
    const dotenv = requireProjectDependency('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
    dotenv.config({ path: path.resolve(__dirname, '../../api/.env'), quiet: true });
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }
}

loadDotenv();

// ── Database Connections ──────────────────────────────────────────

const SOURCE_WRITE_FLAG = 'ALLOW_SOURCE_DB_WRITES';

function cleanEnv(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function parsePort(value, fallback) {
  const raw = cleanEnv(value);
  const port = Number.parseInt(raw || fallback, 10);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid database port: ${raw || fallback}`);
  return port;
}

function resolveSourceDbConfig(env = process.env) {
  const host = cleanEnv(env.SOURCE_DB_HOST);
  if (!host) {
    throw new Error('SOURCE_DB_HOST is required and must be explicit for source database operations. Refusing to use a remote/VPS default.');
  }

  return {
    host,
    port: parsePort(env.SOURCE_DB_PORT, '5432'),
    database: cleanEnv(env.SOURCE_DB_NAME) || 'tdental_demo',
    user: cleanEnv(env.SOURCE_DB_USER) || 'postgres',
    password: env.SOURCE_DB_PASSWORD,
    ssl: env.SOURCE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

function resolveTargetDbConfig(env = process.env) {
  return {
    host: cleanEnv(env.TARGET_DB_HOST) || '127.0.0.1',
    port: parsePort(env.TARGET_DB_PORT, '5433'),
    database: cleanEnv(env.TARGET_DB_NAME) || 'tdental_demo',
    user: cleanEnv(env.TARGET_DB_USER) || 'postgres',
    password: cleanEnv(env.TARGET_DB_PASSWORD) || 'postgres',
  };
}

function assertSourceWritesAllowed(env = process.env) {
  resolveSourceDbConfig(env);
  if (env[SOURCE_WRITE_FLAG] !== '1') {
    throw new Error(`Source DB writes are disabled by default. Set ${SOURCE_WRITE_FLAG}=1 only after verifying SOURCE_DB_HOST points at the intended source.`);
  }
}

function createPool(config) {
  const { Pool } = requireProjectDependency('pg');
  return new Pool(config);
}

let sourcePoolInstance;
let targetPoolInstance;

function getSourcePool() {
  if (!sourcePoolInstance) sourcePoolInstance = createPool(resolveSourceDbConfig());
  return sourcePoolInstance;
}

function getTargetPool() {
  if (!targetPoolInstance) targetPoolInstance = createPool(resolveTargetDbConfig());
  return targetPoolInstance;
}

// ── Table Migration Order (respects FK dependencies) ──────────────

const TABLE_ORDER = [
  // Tier 0: Independent
  'companies',
  'customersources',
  'productcategories',
  'permission_groups',
  'systempreferences',
  'websitepages',
  'receipt_sequences',

  // Tier 1
  'partners',
  'products',
  'group_permissions',

  // Tier 2
  'appointments',
  'saleorders',
  'employee_permissions',
  'employee_location_scope',
  'monthlyplans',

  // Tier 3
  'saleorderlines',
  'payments',
  'dotkhams',
  'monthlyplan_items',

  // Tier 4
  'payment_allocations',
  'dotkhamsteps',
  'planinstallments',

  // Tier 5: Feedback system
  'feedback_threads',
  'feedback_messages',
  'feedback_attachments',

  // Tier 6: Post-migration config
  'company_bank_settings',
  'payment_proofs',
];

// Tables that should NOT be overwritten (local dev config)
const PROTECTED_TABLES = [
  'systempreferences',    // May have local dev settings
];

// Tables that need sequence reset after migration
const SEQUENCES = [
  { table: 'saleorders', column: 'code', seqName: 'saleorder_code_seq' },
  { table: 'receipt_sequences', column: 'last_number', seqName: null }, // Manual reset
];

// ── Data Cleaning Rules ───────────────────────────────────────────

const CLEANING_RULES = {
  // Map dummy UUID to a valid placeholder or null
  dummyUuid: '00000000-0000-0000-0000-000000000001',

  // Tables/columns that may contain the dummy UUID
  dummyUuidColumns: [
    { table: 'saleorders', column: 'partnerid' },
    { table: 'saleorders', column: 'companyid' },
    { table: 'appointments', column: 'partnerid' },
    { table: 'appointments', column: 'companyid' },
  ],

  // SO-2026 code series handling
  so2026: {
    prefix: 'SO-2026-',
    expectedStart: 1,
    // If codes are non-contiguous, we can either:
    // 'preserve' — keep existing codes, adjust sequence to max+1
    // 'resequence' — regenerate all 2026 codes contiguously
    strategy: 'preserve', // or 'resequence'
  },
};

// ── Export ────────────────────────────────────────────────────────

module.exports = {
  get sourcePool() {
    return getSourcePool();
  },
  get targetPool() {
    return getTargetPool();
  },
  assertSourceWritesAllowed,
  resolveSourceDbConfig,
  resolveTargetDbConfig,
  TABLE_ORDER,
  PROTECTED_TABLES,
  SEQUENCES,
  CLEANING_RULES,
};
