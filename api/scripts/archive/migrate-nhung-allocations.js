const { Client } = require('pg');

const DB = 'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';
const PID = 'cd985f43-2f12-4d6d-b1b8-b23000efbac3';

async function main() {
  const c = new Client({ connectionString: DB, options: '-c search_path=dbo' });
  await c.connect();

  // Fetch sale orders
  const soRes = await c.query(
    `SELECT id, name, amounttotal, residual, totalpaid FROM saleorders WHERE partnerid = $1 AND isdeleted = false ORDER BY name`,
    [PID]
  );
  const invoices = {};
  for (const r of soRes.rows) invoices[r.name] = r.id;
  console.log('Invoices:', Object.keys(invoices));

  // Fetch payments
  const pmRes = await c.query(
    `SELECT id, amount, notes FROM payments WHERE customer_id = $1 ORDER BY created_at`,
    [PID]
  );
  console.log(`Payments: ${pmRes.rows.length}`);

  // Fetch monthly plans
  const planRes = await c.query(
    `SELECT id, treatment_description, total_amount FROM monthlyplans WHERE customer_id = $1`,
    [PID]
  );

  // Link braces plan to SO24081
  const bracesPlan = planRes.rows.find(p => p.total_amount === '15835000.00');
  if (bracesPlan && invoices['SO24081']) {
    await c.query(
      `INSERT INTO monthlyplan_items (plan_id, invoice_id, priority) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
      [bracesPlan.id, invoices['SO24081']]
    );
    console.log(`Linked plan ${bracesPlan.id} to SO24081`);
  }

  // Create allocations
  let allocCount = 0;
  for (const p of pmRes.rows) {
    const note = (p.notes || '').toLowerCase();
    let invoiceId = null;
    if (note.includes('tgl')) invoiceId = invoices['SO24081']; // braces
    else if (note.includes('trám') || note.includes('tram')) invoiceId = invoices['SO24080']; // fillings
    else if (note.includes('nho')) invoiceId = invoices['SO30242']; // extraction

    if (invoiceId) {
      await c.query(
        `INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [p.id, invoiceId, p.amount]
      );
      allocCount++;
      console.log(`Allocated ${p.amount} to ${Object.keys(invoices).find(k => invoices[k] === invoiceId)} for payment ${p.id.slice(0,8)}`);
    } else {
      console.log(`No mapping for payment ${p.id.slice(0,8)}: ${p.notes}`);
    }
  }

  console.log(`\nDone. Created ${allocCount} allocations.`);
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
