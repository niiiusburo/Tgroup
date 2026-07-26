const { Pool, types } = require('pg');
require('dotenv').config();

// Return DATE columns (OID 1082) as plain YYYY-MM-DD strings to avoid TZ shift.
// NOTE: this does NOT affect TIMESTAMP (OID 1114) or TIMESTAMPTZ (OID 1184) columns.
// For consistent display of timestamp values, the API process should run with
// TZ=Asia/Ho_Chi_Minh so node-pg parses timestamp without timezone in Vietnam local time.
types.setTypeParser(1082, (val) => val);

// Pool sizing. The default node-pg max of 10 was a real bottleneck: a single API process
// on an 8-core box serialised requests behind 10 slots while admin pages fan out several
// queries each, which showed up as 1.3-2.3s page loads that were contention, not slow SQL.
//
// 15 rather than a larger number because ONE Postgres server (max_connections=100) hosts
// tdental_demo (shared by nk and nk2), tdental_nk3 and tcosmetic_nk3, and an NK3 process
// opens a pool per LOB. Worst case at 15: nk 15 + nk2 15 + nk3 (2 x 15) = 60, leaving
// headroom for psql, superuser-reserved slots and migrations. Raise DB_POOL_MAX only after
// re-checking `SELECT datname, numbackends FROM pg_stat_database` against max_connections.
const POOL_MAX = Number(process.env.DB_POOL_MAX) || 15;

// A statement that runs longer than this is a runaway, not a slow report: the heaviest
// bounded query in the app (the appointments export, 7 joins, hard-capped at 100k rows)
// measures 545ms on production data, so 30s is ~55x the real worst case. Without this, one
// pathological query holds a pool slot indefinitely and starves every other request.
const STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 30_000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=dbo -c statement_timeout=${STATEMENT_TIMEOUT_MS}`,
  max: POOL_MAX,
  // Hand idle connections back so the shared server is not held hostage between bursts.
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS) || 30_000,
  // Fail a request that cannot get a slot instead of hanging on it forever (node-pg
  // defaults to waiting indefinitely, which turns saturation into an unbounded stall).
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS) || 15_000,
});

// An idle client can be killed by the server or the network. Without a listener, node-pg
// re-emits that as an unhandled 'error' event on the pool, which crashes the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function withTransaction(work) {
  const client = await pool.connect();
  const transactionQuery = async (text, params) => {
    const result = await client.query(text, params);
    return result.rows;
  };

  try {
    await client.query('BEGIN');
    const result = await work(transactionQuery);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
