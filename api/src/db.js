const { Pool, types } = require('pg');
require('dotenv').config();

// Return DATE columns (OID 1082) as plain YYYY-MM-DD strings to avoid TZ shift.
// NOTE: this does NOT affect TIMESTAMP (OID 1114) or TIMESTAMPTZ (OID 1184) columns.
// For consistent display of timestamp values, the API process should run with
// TZ=Asia/Ho_Chi_Minh so node-pg parses timestamp without timezone in Vietnam local time.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=dbo'
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

module.exports = { pool, query };
