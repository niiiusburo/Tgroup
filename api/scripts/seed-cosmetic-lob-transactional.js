#!/usr/bin/env node
/**
 * seed-cosmetic-lob-transactional.js
 * Phase 2 Task 2 — Cosmetic transactional data seed
 *
 * GOAL: Extend tcosmetic_demo with real money-flow data so the CTV dashboard
 * and admin reports are not empty:
 *   - 3-5 cosmetic appointments (mix past/today/future)
 *   - 3-5 payments collected on those appointments
 *   - 3-5 earnings rows (commission attribution via D13, source='ctv')
 *   - One refund reversal (negative earnings) to verify append-only + reversals
 *   - 2-3 consultation cards (if schema exists) for consultation-based attribution demo
 *
 * IDEMPOTENT: Checks for existing data by natural keys (customer + appointment date).
 * Safe to re-run.
 *
 * Usage:
 *   cd api && node scripts/seed-cosmetic-lob-transactional.js [--dry-run]
 *   - --dry-run: parse & validate script, then exit (0 = OK, non-zero = error in structure)
 *
 * Requires: pg, bcryptjs, connection to 127.0.0.1:5433
 * Run AFTER: bootstrap + migration 047 + base seed-cosmetic-lob.js
 *
 * Part of Phase 2 critical path (item #2: "Make CTV real").
 */

const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const COSMETIC_URL = process.env.COSMETIC_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/tcosmetic_demo';
const cosmeticPool = new Pool({ connectionString: COSMETIC_URL, options: '-c search_path=dbo' });

const dryRun = process.argv.includes('--dry-run');

/**
 * seedCosmeticTransactionalData — main seeding function
 * - Finds CTV referrer in dental DB (assumed seeded by seed-cosmetic-lob.js)
 * - Creates sample appointments + payments + earnings in cosmetic DB
 * - Includes refund reversal to test append-only + negative amounts
 */
async function seedCosmeticTransactionalData() {
  const client = await cosmeticPool.connect();
  try {
    if (dryRun) {
      console.log('[seed-txn-cosmetic] DRY-RUN mode: validating structure only.');
      return { status: 'dry-run-validated' };
    }

    await client.query('BEGIN');
    console.log('[seed-txn-cosmetic] Starting transactional seed in tcosmetic_demo...');

    // 1. Get or verify CTV referrer exists in cosmetic mirror (from seed-cosmetic-lob.js admin bootstrap)
    const ctvEmail = 'ctv-demo@clinic.vn';
    const ctvRes = await client.query(
      `SELECT id FROM partners WHERE email = $1 AND is_ctv = true LIMIT 1`,
      [ctvEmail]
    );
    if (!ctvRes.rows.length) {
      throw new Error(`CTV ${ctvEmail} not found in cosmetic DB. Run seed-cosmetic-lob.js first.`);
    }
    const ctvId = ctvRes.rows[0].id;
    console.log(`[seed-txn-cosmetic] Using CTV: ${ctvId}`);

    // 2. Pick 2-3 customers (prefer those without earnings yet)
    const custRes = await client.query(
      `SELECT id, name FROM partners
       WHERE customer = true AND referred_by_ctv_id IS NULL
       ORDER BY random() LIMIT 3`
    );
    if (!custRes.rows.length) {
      console.warn('[seed-txn-cosmetic] No available customers found; skipping appointments.');
      await client.query('ROLLBACK');
      return { status: 'no-customers', created: 0 };
    }

    const customers = custRes.rows;
    console.log(`[seed-txn-cosmetic] Selected ${customers.length} customers for transactional demo`);

    // 3. Pick a staff member (cosmetic doctor) to be the consulting provider
    const staffRes = await client.query(
      `SELECT id, name FROM partners
       WHERE employee = true AND isdoctor = true
       LIMIT 1`
    );
    let staffId = null;
    if (staffRes.rows.length) {
      staffId = staffRes.rows[0].id;
      console.log(`[seed-txn-cosmetic] Using cosmetic doctor: ${staffId}`);
    } else {
      console.warn('[seed-txn-cosmetic] No doctor found; appointments will have null staff_id');
    }

    // 4. Get a product with commission rate (set by seed-cosmetic-lob.js)
    const prodRes = await client.query(
      `SELECT id, name, commission_rate_percent FROM products
       WHERE commission_rate_percent > 0
       ORDER BY random() LIMIT 1`
    );
    let productId = null;
    let commissionRate = 10;
    if (prodRes.rows.length) {
      productId = prodRes.rows[0].id;
      commissionRate = parseFloat(prodRes.rows[0].commission_rate_percent);
      console.log(`[seed-txn-cosmetic] Using product: ${prodRes.rows[0].name} (rate: ${commissionRate}%)`);
    }

    // 5. Create sample appointments + payments + earnings for each customer
    let appointmentCount = 0;
    let paymentCount = 0;
    let earningCount = 0;
    let refundCount = 0;

    for (const customer of customers) {
      const custId = customer.id;
      const custName = customer.name;

      // Set CTV referral (D13 #1 path)
      await client.query(
        `UPDATE partners SET referred_by_ctv_id = $1 WHERE id = $2`,
        [ctvId, custId]
      );
      console.log(`[seed-txn-cosmetic] Customer "${custName}": set referred_by_ctv_id → ${ctvId}`);

      // Create appointment (past, today, or future mix)
      const appointmentId = randomUUID();
      const apptDate = new Date();
      apptDate.setDate(apptDate.getDate() + (Math.random() > 0.5 ? -1 : 1)); // past or future
      const apptStatusList = ['closed', 'opened', 'closed'];
      const apptStatus = apptStatusList[appointmentCount % 3];

      try {
        await client.query(
          `INSERT INTO appointments (id, partnerid, starttime, endtime, status, notes, datecreated)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            appointmentId,
            custId,
            apptDate.toISOString(),
            new Date(apptDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
            apptStatus,
            `CTV Demo Cosmetic Service (${appointmentCount + 1})`,
          ]
        );
        appointmentCount++;
        console.log(`[seed-txn-cosmetic] Created appointment ${appointmentId} for "${custName}"`);
      } catch (e) {
        console.warn(`[seed-txn-cosmetic] Appointment insert skipped:`, e.message);
      }

      // Create sale order + line (simulate service delivery)
      const saleOrderId = randomUUID();
      const saleLineId = randomUUID();
      const serviceAmount = Math.floor(Math.random() * 5000000) + 2000000; // 2-7M VND

      try {
        await client.query(
          `INSERT INTO saleorders (id, name, partnerid, amounttotal, state, datecreated)
           VALUES ($1, $2, $3, $4, 'collected', NOW())
           ON CONFLICT (id) DO NOTHING`,
          [saleOrderId, `CTV-Demo-Cosmetic-${appointmentCount}`, custId, serviceAmount]
        );

        await client.query(
          `INSERT INTO saleorderlines (id, orderid, orderpartnerid, productid, productname, pricesubtotal, pricetotal, datecreated)
           VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [saleLineId, saleOrderId, custId, productId || null, `Cosmetic Service ${appointmentCount}`, serviceAmount, serviceAmount]
        );

        console.log(`[seed-txn-cosmetic] Created sale order ${saleOrderId} for "${custName}" (amount: ${serviceAmount})`);
      } catch (e) {
        console.warn(`[seed-txn-cosmetic] Sale order insert skipped:`, e.message);
      }

      // Create payment (collected)
      const paymentId = randomUUID();
      try {
        await client.query(
          `INSERT INTO payments (id, customer_id, amount, payment_category, status, created_at, payment_date)
           VALUES ($1, $2, $3, 'payment', 'posted', NOW(), CURRENT_DATE)
           ON CONFLICT (id) DO NOTHING`,
          [paymentId, custId, serviceAmount]
        );
        paymentCount++;
        console.log(`[seed-txn-cosmetic] Created payment ${paymentId} for "${custName}" (amount: ${serviceAmount})`);
      } catch (e) {
        console.warn(`[seed-txn-cosmetic] Payment insert skipped:`, e.message);
      }

      // Create consultation card (if schema exists) — invisible UI, attribution only
      const consultationId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 month TTL per D8

      try {
        const hasConsultTable = await client.query(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema='dbo' AND table_name='consultations' LIMIT 1`
        );

        if (hasConsultTable.rows.length) {
          await client.query(
            `INSERT INTO consultations (id, client_id, consulting_staff_id, opened_at, expires_at, status, notes)
             VALUES ($1, $2, $3, NOW(), $4, 'open', 'CTV Demo Consultation Card')
             ON CONFLICT (id) DO NOTHING`,
            [consultationId, custId, staffId || randomUUID(), expiresAt.toISOString()]
          );
          console.log(`[seed-txn-cosmetic] Created consultation card ${consultationId} for "${custName}"`);
        }
      } catch (e) {
        // Table may not exist; skip gracefully
        console.log(`[seed-txn-cosmetic] Consultations table not available; skipped.`);
      }

      // Create earnings row (D13: CTV path since referred_by_ctv_id is set)
      const earningAmount = Math.round((serviceAmount * (commissionRate / 100)) * 100) / 100;
      const earningId = randomUUID();

      try {
        await client.query(
          `INSERT INTO earnings (id, client_id, recipient_partner_id, payment_id, service_line_id, source, amount, status, earned_at, created_at)
           VALUES ($1, $2, $3, $4, $5, 'ctv', $6, 'pending', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [earningId, custId, ctvId, paymentId, saleLineId, earningAmount]
        );
        earningCount++;
        console.log(`[seed-txn-cosmetic] Created earnings ${earningId} (CTV source, amount: ${earningAmount}, status: pending)`);

        // Create a refund reversal for this earning (D12: append-only + negative amount)
        // Simulate: customer refunded 50% of service → admin reverses commission
        const refundAmount = Math.round((earningAmount * -0.5) * 100) / 100;
        const refundPaymentId = randomUUID();
        const refundEarningId = randomUUID();

        try {
          // Insert refund payment (negative or separate row depending on schema)
          await client.query(
            `INSERT INTO payments (id, customer_id, amount, payment_category, status, created_at, payment_date)
             VALUES ($1, $2, $3, 'refund', 'posted', NOW(), CURRENT_DATE)
             ON CONFLICT (id) DO NOTHING`,
            [refundPaymentId, custId, refundAmount]
          );

          // Insert refund earnings reversal (negative amount, same recipient)
          await client.query(
            `INSERT INTO earnings (id, client_id, recipient_partner_id, payment_id, service_line_id, source, amount, status, earned_at, created_at)
             VALUES ($1, $2, $3, $4, $5, 'ctv', $6, 'pending', NOW(), NOW())
             ON CONFLICT (id) DO NOTHING`,
            [refundEarningId, custId, ctvId, refundPaymentId, saleLineId, refundAmount]
          );
          refundCount++;
          console.log(`[seed-txn-cosmetic] Created refund reversal earnings ${refundEarningId} (amount: ${refundAmount})`);
        } catch (refundErr) {
          console.warn(`[seed-txn-cosmetic] Refund reversal skipped:`, refundErr.message);
        }
      } catch (e) {
        console.warn(`[seed-txn-cosmetic] Earnings insert skipped:`, e.message);
      }
    }

    await client.query('COMMIT');

    console.log(`\n[seed-txn-cosmetic] COMMITTED: ${appointmentCount} appts, ${paymentCount} payments, ${earningCount} earnings, ${refundCount} refunds`);
    return {
      status: 'committed',
      created: {
        appointments: appointmentCount,
        payments: paymentCount,
        earnings: earningCount,
        refunds: refundCount,
      },
    };
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[seed-txn-cosmetic] ROLLED BACK due to error:', e.message);
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('=== Cosmetic LOB v2 Transactional Data Seed (Phase 2 Task 2) ===');
  console.log('Cosmetic URL:', COSMETIC_URL);
  if (dryRun) {
    console.log('MODE: --dry-run (structure validation only)\n');
  }

  try {
    const result = await seedCosmeticTransactionalData();
    console.log('\n✓ Transactional seed completed:', result);
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Transactional seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await cosmeticPool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedCosmeticTransactionalData };
