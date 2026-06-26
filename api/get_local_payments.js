const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c search_path=dbo' });
async function main() {
  const client = await pool.connect();
  try {
    const pmts = await client.query(
      `SELECT id, customer_id, service_id, amount, method, status, created_at, payment_date, reference_code, notes, cash_amount, bank_amount, receipt_number, deposit_type, payment_category
       FROM dbo.payments
       WHERE customer_id IN (
         SELECT id FROM dbo.partners WHERE ref IN ('T049843','T050355','T045937','T046059','11252','T054935','T051377','T048631','T053016','T045156')
       )
       ORDER BY customer_id, created_at`
    );
    console.log(JSON.stringify(pmts.rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
