const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c search_path=dbo'
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

module.exports = { pool, query };
