#!/usr/bin/env node
/**
 * Migrate ALL historical accountpayments into the payments table.
 * Safe to re-run: skips already-existing ids (ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   node api/migrate-all-accountpayments.js
 *
 * Environment:
 *   DATABASE_URL – PostgreSQL connection string (defaults to Docker local)
 */

const { Client } = require('pg');

const DB = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

async function main() {
  const client = new Client({ connectionString: DB, options: '-c search_path=dbo' });
  await client.connect();

  console.log('🔍 Fetching historical accountpayments...');
  const rows = await client.query(`
    SELECT
      id,
      partnerid,
      amount,
      COALESCE(communication, name) AS notes,
      COALESCE(paymentdate, datecreated) AS created_at,
      paymentdate AS payment_date,
      name AS reference_code,
      CASE WHEN state = 'posted' THEN 'posted' ELSE 'voided' END AS status,
      paymenttype
    FROM accountpayments
    WHERE state = 'posted'
    ORDER BY paymentdate
  `);

  let inserted = 0;
  let skipped = 0;

  for (const r of rows.rows) {
    // Map paymenttype to a simple method
    let method = 'cash';
    const pt = (r.paymenttype || '').toLowerCase();
    if (pt === 'transfer' || pt === 'bank_transfer' || pt === 'bank') method = 'bank_transfer';
    if (pt === 'card' || pt === 'credit_card') method = 'bank_transfer';

    try {
      await client.query(`
        INSERT INTO payments (
          id, customer_id, service_id, amount, method, notes, created_at,
          payment_date, reference_code, status, deposit_used, cash_amount, bank_amount
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.partnerid, r.amount, method, r.notes,
        r.created_at, r.payment_date, r.reference_code, r.status
      ]);
      inserted++;
    } catch (err) {
      console.warn(`⚠️ Skipped ${r.id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done. Inserted: ${inserted} | Skipped: ${skipped} | Total source rows: ${rows.rows.length}`);
  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
