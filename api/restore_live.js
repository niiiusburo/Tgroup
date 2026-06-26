const { Pool } = require('pg');
require('dotenv').config();

const paymentsToRestore = [
  { ref: '11252', code: 'SO38543', amount: 5900000 },
  { ref: '11252', code: 'SO38584', amount: 900000 },
  { ref: '11252', code: 'SO42064', amount: 700000 },
  { ref: '11252', code: 'SO42224', amount: 1800000 },
  { ref: '11252', code: 'SO42828', amount: 300000 },
  { ref: '11252', code: 'SO46371', amount: 200000 },
  { ref: '11252', code: 'SO53567', amount: 300000 },
  { ref: '11252', code: 'SO54122', amount: 2000000 },
  { ref: 'T045156', code: 'SO27744', amount: 5000000 },
  { ref: 'T045937', code: 'SO29226', amount: 5800000 },
  { ref: 'T045937', code: 'SO30307', amount: 1500000 },
  { ref: 'T045937', code: 'SO37806', amount: 2000000 },
  { ref: 'T045937', code: 'SO47917', amount: 1000000 },
  { ref: 'T046059', code: 'SO30870', amount: 5800000 },
  { ref: 'T046059', code: 'SO35907', amount: 300000 },
  { ref: 'T046059', code: 'SO38248', amount: 500000 },
  { ref: 'T046059', code: 'SO51046', amount: 89000 },
  { ref: 'T046059', code: 'SO52485', amount: 600000 },
  { ref: 'T048631', code: 'SO37260', amount: 1200000 },
  { ref: 'T048631', code: 'SO39660', amount: 300000 },
  { ref: 'T049843', code: 'SO59564', amount: 1500000 },
  { ref: 'T050355', code: 'SO38361', amount: 7100000 },
  { ref: 'T050355', code: 'SO38973', amount: 700000 },
  { ref: 'T050355', code: 'SO51596', amount: 300000 },
  { ref: 'T051377', code: 'SO40543', amount: 5800000 },
  { ref: 'T051377', code: 'SO46219', amount: 600000 },
  { ref: 'T053016', code: 'SO46961', amount: 600000 },
  { ref: 'T054935', code: 'SO49788', amount: 1500000 },
  { ref: 'T054935', code: 'SO49789', amount: 2100000 },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: '-c search_path=dbo' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let insertedPayments = 0;
    let insertedAllocs = 0;
    
    for (const p of paymentsToRestore) {
      const partner = await client.query('SELECT id FROM dbo.partners WHERE ref = $1', [p.ref]);
      const order = await client.query('SELECT id FROM dbo.saleorders WHERE code = $1', [p.code]);
      if (partner.rows.length === 0 || order.rows.length === 0) { continue; }
      
      const partnerId = partner.rows[0].id;
      const orderId = order.rows[0].id;
      
      const paymentResult = await client.query(
        `INSERT INTO dbo.payments (id, customer_id, service_id, amount, method, notes, created_at, payment_date, status, deposit_used, cash_amount, bank_amount, receipt_number, deposit_type, payment_category)
         VALUES (gen_random_uuid(), $1, $2, $3, 'cash', $4, NOW(), NOW(), 'posted', '0.00', $5, '0.00', NULL, NULL, 'payment')
         RETURNING id, amount, notes`,
        [partnerId, orderId, p.amount.toString(), 
         `RECON-2026-06-24 [Restored] ${p.ref} ${p.code} — ${p.amount.toLocaleString()} VND`,
         p.amount.toFixed(2)]
      );
      
      const paymentId = paymentResult.rows[0].id;
      insertedPayments++;
      
      await client.query(
        `INSERT INTO dbo.payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at, dotkham_id)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NULL)`,
        [paymentId, orderId, p.amount.toString()]
      );
      insertedAllocs++;
      
      console.log(`[RESTORED] ${p.code} | ${p.ref} | ${p.amount.toLocaleString()} | payment=${paymentId}`);
    }
    
    await client.query('COMMIT');
    console.log(`\n=== RESTORED ${insertedPayments} payments + ${insertedAllocs} allocations on LIVE ===`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLBACK:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
