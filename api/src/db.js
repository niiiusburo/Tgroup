const { Pool, types } = require('pg');
require('dotenv').config();

// Return date columns (OID 1082) as plain YYYY-MM-DD strings to avoid TZ shift
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
