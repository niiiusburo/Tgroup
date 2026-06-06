const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

// Return DATE columns (OID 1082) as plain YYYY-MM-DD strings to avoid TZ shift.
// NOTE: this does NOT affect TIMESTAMP (OID 1114) or TIMESTAMPTZ (OID 1184) columns.
// For consistent display of timestamp values, the API process should run with
// TZ=Asia/Ho_Chi_Minh so node-pg parses timestamp without timezone in Vietnam local time.
types.setTypeParser(1082, (val) => val);

/**
 * DB Factory for Cosmetic LOB v2 (minimal compat layer)
 * Two physical databases, separate connection pools, no cross-DB SQL.
 * - dental: tdental_demo (existing, default)
 * - cosmetic: tcosmetic_demo (falls back to same host if COSMETIC_DATABASE_URL not set)
 *
 * Legacy compat (existing code unchanged):
 *   const { pool, query } = require('../db'); // still dental
 */

const DEFAULT_DENTAL_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo';
const DEFAULT_COSMETIC_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/tcosmetic_demo';

const lobStorage = new AsyncLocalStorage();

function createPool(connectionString) {
  if (!connectionString) {
    throw new Error('Database connection string is required for pool');
  }
  // Pool sizing is env-driven so we can tune per environment without code changes.
  // Default max stays 10 (pg default) so non-NK3 envs are unchanged. NK3 raises
  // DB_POOL_MAX to relieve connection-pool starvation under concurrent page fan-out.
  // NOTE: total connections = workers * pools(2: dental+cosmetic) * max must stay
  // under postgres max_connections (100). With WEB_CONCURRENCY>1, size DB_POOL_MAX down.
  const pool = new Pool({
    connectionString,
    options: '-c search_path=dbo',
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_MS || '15000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT_MS || '5000', 10),
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
// query() is NOW DYNAMIC — it resolves pool at call-time via getCurrentLob()
// (ALS context set by cosmetic mirror middleware) or defaults to dental.
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
  _lobStorage: lobStorage,
};
