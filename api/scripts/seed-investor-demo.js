#!/usr/bin/env node
'use strict';
/**
 * Seeds a demo investor account + optional visible clients for local verification.
 * Usage: node api/scripts/seed-investor-demo.js [--email investor@clinic.vn] [--password 123123]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const email = process.argv.includes('--email')
  ? process.argv[process.argv.indexOf('--email') + 1]
  : 'investor@clinic.vn';
const password = process.argv.includes('--password')
  ? process.argv[process.argv.indexOf('--password') + 1]
  : '123123';

const DENTAL_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/tdental_demo';

async function run() {
  const pool = new Pool({ connectionString: DENTAL_URL, options: '-c search_path=dbo' });
  const hash = await bcrypt.hash(password, 10);

  const existing = await pool.query(
    'SELECT id FROM investor_accounts WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  let investorId;
  if (existing.rows.length > 0) {
    investorId = existing.rows[0].id;
    await pool.query(
      `UPDATE investor_accounts
       SET password_hash = $1, is_active = true, investor_name = $2, updated_at = NOW()
       WHERE id = $3`,
      [hash, 'Demo Investor', investorId]
    );
    console.log(`Updated investor ${email} (${investorId})`);
  } else {
    const inserted = await pool.query(
      `INSERT INTO investor_accounts (email, password_hash, investor_name, lob, is_active)
       VALUES ($1, $2, $3, 'dental', true)
       RETURNING id`,
      [email, hash, 'Demo Investor']
    );
    investorId = inserted.rows[0].id;
    console.log(`Created investor ${email} (${investorId})`);
  }

  const customers = await pool.query(
    `SELECT id FROM partners
     WHERE customer = true AND COALESCE(isdeleted, false) = false
     ORDER BY name ASC
     LIMIT 3`
  );

  const admin = await pool.query(
    `SELECT id FROM partners WHERE employee = true AND COALESCE(isdeleted, false) = false LIMIT 1`
  );
  const markedBy = admin.rows[0]?.id || customers.rows[0]?.id;

  if (markedBy && customers.rows.length > 0) {
    for (const row of customers.rows) {
      await pool.query(
        `INSERT INTO investor_clients (investor_id, partner_id, lob, is_visible, marked_by_partner_id)
         VALUES ($1, $2, 'dental', true, $3)
         ON CONFLICT (investor_id, partner_id, lob)
         DO UPDATE SET is_visible = true, marked_at = NOW()`,
        [investorId, row.id, markedBy]
      );
    }
    console.log(`Linked ${customers.rows.length} demo client(s) to investor`);
  } else {
    console.log('No customers found to link — run after demo data exists');
  }

  await pool.end();
  console.log(`\nLogin: POST /api/investor/auth/login`);
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});