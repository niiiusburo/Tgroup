/**
 * Migration Configuration
 * Centralizes database connections, table ordering, and migration settings
 */

require('dotenv').config();

const { Pool } = require('pg');

// ── Database Connections ──────────────────────────────────────────

const sourcePool = new Pool({
  host: process.env.SOURCE_DB_HOST || 'vps.tamtmv.com',
  port: parseInt(process.env.SOURCE_DB_PORT || '5432'),
  database: process.env.SOURCE_DB_NAME || 'tdental_demo',
  user: process.env.SOURCE_DB_USER || 'postgres',
  password: process.env.SOURCE_DB_PASSWORD,
  ssl: process.env.SOURCE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const targetPool = new Pool({
  host: process.env.TARGET_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TARGET_DB_PORT || '5433'),
  database: process.env.TARGET_DB_NAME || 'tdental_demo',
  user: process.env.TARGET_DB_USER || 'postgres',
  password: process.env.TARGET_DB_PASSWORD || 'postgres',
  // Local dev uses search_path=dbo via connection string or SET command
});

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
  sourcePool,
  targetPool,
  TABLE_ORDER,
  PROTECTED_TABLES,
  SEQUENCES,
  CLEANING_RULES,
};
