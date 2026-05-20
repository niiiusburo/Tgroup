const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

// Request-scoped LOB context for cosmetic mirror routes (enables reuse of handlers without per-handler edits)
const lobStorage = new AsyncLocalStorage();

// Return DATE columns (OID 1082) as plain YYYY-MM-DD strings to avoid TZ shift.
// NOTE: this does NOT affect TIMESTAMP (OID 1114) or TIMESTAMPTZ (OID 1184) columns.
// For consistent display of timestamp values, the API process should run with
// TZ=Asia/Ho_Chi_Minh so node-pg parses timestamp without timezone in Vietnam local time.
types.setTypeParser(1082, (val) => val);

/**
 * DB Factory for Cosmetic LOB v2 (Phase 0+)
 * Two physical databases, separate connection pools, no cross-DB SQL.
 * - dental: tdental_demo (existing, additive changes only)
 * - cosmetic: tcosmetic_demo (new, bootstrapped empty, mirrors dental schema for route reuse)
 *
 * Usage:
 *   const { getDb } = require('./db'); // or from '../db' in most modules
 *   const dentalDb = getDb('dental');
 *   const rows = await dentalDb.queryRows('SELECT ...', []); // or .query()
 *   const cosmeticDb = getDb('cosmetic');
 *
 * Legacy compat (existing code unchanged):
 *   const { pool, query } = require('../db'); // still dental
 *
 * Env:
 *   DATABASE_URL (dental, default tdental_demo on 5433)
 *   COSMETIC_DATABASE_URL (optional; defaults to tcosmetic_demo on same host)
 *
 * @crossref:implements[PLAN.md Phase 0 DB factory + v2 spec D1 two-DB isolation]
 * @crossref:used-by[all routes, services, commissionEngine (future), cosmetic/* mirrors]
 */

// === Cosmetic LOB v2 Factory (added Phase 0) ===
// Two separate pools. Legacy exports remain dental for zero-break compat.

const DEFAULT_DENTAL_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo';
const DEFAULT_COSMETIC_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/tcosmetic_demo';

function createPool(connectionString) {
  if (!connectionString) {
    throw new Error('Database connection string is required for pool');
  }
  const pool = new Pool({
    connectionString,
    options: '-c search_path=dbo'
  });
  pool.queryRows = async function queryRows(text, params) {
    const result = await this.query(text, params);
    return result.rows;
  };
  return pool;
}

let dentalPool = null;
let cosmeticPool = null;

function getDentalPool() {
  if (!dentalPool) {
    const url = process.env.DATABASE_URL || DEFAULT_DENTAL_URL;
    dentalPool = createPool(url);
  }
  return dentalPool;
}

function getCosmeticPool() {
  if (!cosmeticPool) {
    const url = process.env.COSMETIC_DATABASE_URL || DEFAULT_COSMETIC_URL;
    cosmeticPool = createPool(url);
  }
  return cosmeticPool;
}

function getDb(lob) {
  if (lob === 'dental' || lob === undefined || lob === null) {
    return getDentalPool();
  }
  if (lob === 'cosmetic') {
    return getCosmeticPool();
  }
  throw new Error(`Invalid LOB for getDb: "${lob}". Must be "dental" or "cosmetic".`);
}

function getCurrentLob() {
  const store = lobStorage.getStore();
  return (store && store.lob) || 'dental';
}

function runWithLob(lob, fn) {
  const safeLob = (lob === 'cosmetic' || lob === 'dental') ? lob : 'dental';
  return lobStorage.run({ lob: safeLob }, fn);
}

/**
 * getQuery(reqOrLob) — returns a query executor function(text, params) => Promise<rows>
 * that targets the correct pool based on:
 *   - if passed a request object with .lob or .db (from attachCosmeticDb middleware), use it
 *   - if string 'cosmetic'/'dental', use that
 *   - otherwise defaults to dental (for legacy direct calls and dental routes)
 *
 * This allows core handlers to support LOB switching with ONE import change + one q= line,
 * while dental routes (never setting req.lob) continue to use the original `query` import unchanged.
 */
function getQuery(reqOrLob) {
  if (!reqOrLob) {
    return query; // legacy dental
  }
  if (typeof reqOrLob === 'string') {
    const pool = getDb(reqOrLob);
    return (text, params) => pool.queryRows ? pool.queryRows(text, params) : pool.query(text, params);
  }
  // req-like object
  if (reqOrLob.db) {
    const pool = reqOrLob.db;
    return (text, params) => pool.queryRows ? pool.queryRows(text, params) : pool.query(text, params);
  }
  if (reqOrLob.lob) {
    const pool = getDb(reqOrLob.lob);
    return (text, params) => pool.queryRows ? pool.queryRows(text, params) : pool.query(text, params);
  }
  return query; // default dental
}

// Legacy dental exports (exact same surface as pre-v2 db.js)
// IMPORTANT (Cosmetic LOB v2): query() is NOW DYNAMIC — it resolves pool at call-time via
// getCurrentLob() (ALS context set by cosmetic mirror middleware) or defaults to dental.
// This enables exact handler reuse for /api/cosmetic/* without touching handler source.
// Direct `pool` remains the dental pool for any legacy direct-pool code (rare).
const pool = getDentalPool();
async function query(text, params) {
  const lob = getCurrentLob();
  const activePool = getDb(lob);
  return activePool.queryRows(text, params);
}

module.exports = {
  getDb,           // LOB-aware factory (dental | cosmetic)
  getQuery,        // context-aware query executor (req or lob string)
  getCurrentLob,   // returns 'dental'|'cosmetic' from ALS or default
  runWithLob,      // (lob, fn) => runs fn inside ALS context so query() targets right DB
  pool,            // legacy dental pool (compat)
  query,           // DYNAMIC: follows current LOB context (or dental)
  _getDentalPool: getDentalPool,
  _getCosmeticPool: getCosmeticPool,
  _lobStorage: lobStorage, // for advanced testing
};
