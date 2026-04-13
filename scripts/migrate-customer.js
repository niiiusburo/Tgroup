#!/usr/bin/env node
/**
 * Customer Data Migration Tool (Real DB → Demo DB)
 *
 * Pulls a customer's complete profile from tdental_real and inserts it into
 * tdental_demo, mapping schemas, syncing product UUIDs, and creating missing
 * employees.
 *
 * Usage:
 *   node scripts/migrate-customer.js --name="Trần Đỗ Gia Hân"
 *   node scripts/migrate-customer.js --customer=29ce89ed-5b89-479c-9eeb-b1ae00395c5c
 *   node scripts/migrate-customer.js --name="Trần Đỗ Gia Hân" --dry-run
 *
 * PRD: https://github.com/niiiusburo/Tgroup/issues/20
 */

const { Client } = require('pg');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const REAL_DB_URL =
  process.env.REAL_DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:55433/tdental_real';
const DEMO_DB_URL =
  process.env.DEMO_DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo';

// ---------------------------------------------------------------------------
// CLI arg parser
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, customerId: null, customerName: null };
  for (const a of args) {
    if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--customer=')) opts.customerId = a.split('=')[1];
    else if (a.startsWith('--name=')) opts.customerName = decodeURIComponent(a.split('=')[1]);
  }
  if (!opts.customerId && !opts.customerName) {
    console.error('❌ Provide --customer=<uuid> or --name="Customer Name"');
    process.exit(1);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------
const log = {
  migrated: [],
  skipped: [],
  errors: [],

  info(msg)  { console.log(`  ℹ️  ${msg}`); },
  ok(msg)    { console.log(`  ✅ ${msg}`); this.migrated.push(msg); },
  skip(msg)  { console.log(`  ⏭️  ${msg}`); this.skipped.push(msg); },
  warn(msg)  { console.log(`  ⚠️  ${msg}`); },
  error(msg) { console.error(`  ❌ ${msg}`); this.errors.push(msg); },

  summary() {
    console.log('\n' + '═'.repeat(60));
    console.log('  MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  ✅ Migrated : ${this.migrated.length}`);
    console.log(`  ⏭️  Skipped  : ${this.skipped.length}`);
    console.log(`  ❌ Errors   : ${this.errors.length}`);
    if (this.skipped.length) {
      console.log('\n  Skipped items:');
      this.skipped.forEach((s) => console.log(`    • ${s}`));
    }
    if (this.errors.length) {
      console.log('\n  Errors:');
      this.errors.forEach((e) => console.log(`    • ${e}`));
    }
    console.log('═'.repeat(60));
  },
};

// ---------------------------------------------------------------------------
// Schema introspection — get column names for a table
// ---------------------------------------------------------------------------
async function getColumns(client, schema, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table]
  );
  return new Set(rows.map((r) => r.column_name));
}

// ---------------------------------------------------------------------------
// Intersection of two column sets
// ---------------------------------------------------------------------------
function commonColumns(a, b) {
  return new Set([...a].filter((c) => b.has(c)));
}

// ---------------------------------------------------------------------------
// Build an INSERT from a row object, only using allowed columns
// ---------------------------------------------------------------------------
function buildInsert(table, row, allowedCols) {
  // Required NOT NULL boolean defaults for demo DB
  const boolDefaults = {
    supplier: false,
    customer: true,
    isagent: false,
    isinsurance: false,
    active: true,
    employee: false,
    iscompany: false,
    ishead: false,
    isbusinessinvoice: false,
    isdeleted: false,
    isdoctor: false,
    isassistant: false,
    isreceptionist: false,
  };

  // Merge defaults into row (row values take precedence)
  const merged = { ...boolDefaults, ...row };

  const cols = Object.keys(merged).filter((k) => allowedCols.has(k));
  const vals = cols.map((k) => {
    let v = merged[k];
    // Convert text booleans from real DB ('f'/'t') to actual booleans
    if (v === 't') v = true;
    if (v === 'f') v = false;
    return v;
  });
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const colList = cols.join(', ');
  return {
    sql: `INSERT INTO dbo.${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
    params: vals,
  };
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  console.log(`\n🚀 Customer Migration Tool${opts.dryRun ? ' (DRY RUN)' : ''}`);
  console.log('─'.repeat(60));

  const real = new Client({ connectionString: REAL_DB_URL });
  const demo = new Client({ connectionString: DEMO_DB_URL });
  await real.connect();
  await demo.connect();
  console.log('  Connected to both databases.\n');

  // ── Introspect demo DB schemas ──────────────────────────────────────
  const demoPartnersCols   = await getColumns(demo, 'dbo', 'partners');
  const demoOrdersCols     = await getColumns(demo, 'dbo', 'saleorders');
  const demoLinesCols      = await getColumns(demo, 'dbo', 'saleorderlines');
  const demoPaymentsCols   = await getColumns(demo, 'dbo', 'payments');
  const demoAllocsCols     = await getColumns(demo, 'dbo', 'payment_allocations');
  const demoApptsCols      = await getColumns(demo, 'dbo', 'appointments');
  const demoProductsCols   = await getColumns(demo, 'dbo', 'products');

  // ── 1. Find customer in real DB ─────────────────────────────────────
  let customer;
  if (opts.customerId) {
    const { rows } = await real.query(
      `SELECT * FROM dbo.partners WHERE id = $1 AND customer = true`,
      [opts.customerId]
    );
    customer = rows[0];
  } else {
    const { rows } = await real.query(
      `SELECT * FROM dbo.partners WHERE name ILIKE $1 AND customer = true LIMIT 1`,
      [`%${opts.customerName}%`]
    );
    customer = rows[0];
  }

  if (!customer) {
    log.error(`Customer not found in real DB.`);
    process.exit(1);
  }
  console.log(`  👤 Customer: ${customer.name} (${customer.id})`);
  console.log(`     Phone: ${customer.phone || 'N/A'}, Gender: ${customer.gender || 'N/A'}, Ref: ${customer.ref || 'N/A'}`);
  console.log(`     Branch: ${customer.companyid}\n`);

  // Start transaction on demo DB
  if (!opts.dryRun) {
    await demo.query('BEGIN');
  }

  try {
    // ── 2. Verify branch exists in demo DB ────────────────────────────
    const { rows: branchRows } = await demo.query(
      `SELECT id, name FROM dbo.companies WHERE id = $1`, [customer.companyid]
    );
    if (branchRows.length === 0) {
      log.error(`Branch ${customer.companyid} not found in demo DB. Cannot migrate.`);
      process.exit(1);
    }
    log.info(`Branch: ${branchRows[0].name} ✓`);

    // ── 3. Load customer's data from real DB ──────────────────────────
    // Sale orders
    const { rows: realOrders } = await real.query(
      `SELECT * FROM dbo.saleorders
       WHERE partnerid = $1 AND (isdeleted = false OR isdeleted IS NULL)
       ORDER BY datecreated`,
      [customer.id]
    );

    // Sale order lines
    const orderIds = realOrders.map((o) => o.id);
    let realLines = [];
    if (orderIds.length > 0) {
      const { rows } = await real.query(
        `SELECT * FROM dbo.saleorderlines
         WHERE orderid = ANY($1) AND (isdeleted = false OR isdeleted IS NULL)
         ORDER BY datecreated`,
        [orderIds]
      );
      realLines = rows;
    }

    // Payments
    const { rows: realPayments } = await real.query(
      `SELECT * FROM dbo.saleorderpayments
       WHERE partnerid = $1 AND state = 'posted'
       ORDER BY date`,
      [customer.id]
    );

    // Accountpayments (for reference_code / receipt numbers)
    const { rows: realAccountPayments } = await real.query(
      `SELECT name, communication, paymentdate, amount
       FROM dbo.accountpayments
       WHERE partnerid = $1 AND state = 'posted' AND name IS NOT NULL AND name != ''`,
      [customer.id]
    );
    const apMap = new Map();
    for (const ap of realAccountPayments) {
      const key = (ap.communication || '').trim();
      if (key && !apMap.has(key)) {
        apMap.set(key, ap.name);
      }
    }

    // Appointments
    const { rows: realAppts } = await real.query(
      `SELECT * FROM dbo.appointments
       WHERE partnerid = $1
       ORDER BY date`,
      [customer.id]
    );

    console.log(`  📊 Real DB data: ${realOrders.length} orders, ${realLines.length} lines, ${realPayments.length} payments, ${realAppts.length} appointments\n`);

    // ── 4. Collect unique product IDs and sync UUIDs ──────────────────
    const productIds = [...new Set(realLines.map((l) => l.productid).filter(Boolean))];
    const productMap = {}; // realUUID → demoUUID (after sync: both are same)
    const syncedDemoProductIds = new Set(); // track which demo products have been synced

    if (productIds.length > 0) {
      const { rows: realProducts } = await real.query(
        `SELECT id, name, listprice, companyid FROM dbo.products WHERE id = ANY($1)`,
        [productIds]
      );

      // Group by name to handle duplicates (same product at different branches)
      const byName = {};
      for (const rp of realProducts) {
        if (!byName[rp.name]) byName[rp.name] = [];
        byName[rp.name].push(rp);
      }

      for (const [name, products] of Object.entries(byName)) {
        // Sort: prefer product matching customer's branch first
        products.sort((a, b) => {
          if (a.companyid === customer.companyid) return -1;
          if (b.companyid === customer.companyid) return 1;
          return 0;
        });

        for (let i = 0; i < products.length; i++) {
          const rp = products[i];

          // Check if this exact UUID already exists in demo DB
          const { rows: exactMatch } = await demo.query(
            `SELECT id FROM dbo.products WHERE id = $1`, [rp.id]
          );
          if (exactMatch.length > 0) {
            productMap[rp.id] = rp.id;
            syncedDemoProductIds.add(rp.id);
            log.info(`Product "${rp.name}" UUID already synced (${rp.id.slice(0, 8)}...)`);
            continue;
          }

          // Find matching product by name in demo DB that hasn't been synced yet
          const { rows: nameMatches } = await demo.query(
            `SELECT id, name FROM dbo.products WHERE name = $1`, [rp.name]
          );
          const unsyncedMatch = nameMatches.find((m) => !syncedDemoProductIds.has(m.id));

          if (!unsyncedMatch) {
            // No available demo product — insert new one with real UUID
            const newProd = {
              id: rp.id,
              name: `${rp.name}`,
              namenosign: rp.name,
              listprice: rp.listprice || 0,
              active: true,
            };
            if (!opts.dryRun) {
              const ins = buildInsert('products', newProd, demoProductsCols);
              await demo.query(ins.sql, ins.params);
            }
            productMap[rp.id] = rp.id;
            syncedDemoProductIds.add(rp.id);
            log.ok(`Product "${rp.name}" inserted as new with real UUID ${rp.id.slice(0, 8)}...`);
            continue;
          }

          // Update demo product UUID to real UUID
          const oldDemoId = unsyncedMatch.id;
          if (!opts.dryRun) {
            await demo.query(`UPDATE dbo.saleorderlines SET productid = $1 WHERE productid = $2`, [rp.id, oldDemoId]);
            await demo.query(`UPDATE dbo.products SET id = $1 WHERE id = $2`, [rp.id, oldDemoId]);
          }
          productMap[rp.id] = rp.id;
          syncedDemoProductIds.add(rp.id);
          log.ok(`Product "${rp.name}" UUID synced: ${oldDemoId.slice(0, 8)}... → ${rp.id.slice(0, 8)}...`);
        }
      }
    }

    // ── 5. Collect unique doctors and match/create ─────────────────────
    const doctorIds = [...new Set([
      ...realAppts.map((a) => a.doctorid).filter(Boolean),
      ...realOrders.map((o) => o.doctorid).filter(Boolean),
    ])];
    const doctorMap = {}; // realDoctorId → demoPartnerId

    for (const docId of doctorIds) {
      // Get doctor info from real DB
      const { rows: empRows } = await real.query(
        `SELECT e.id, e.name, e.companyid, e.isdoctor, e.isassistant, e.isreceptionist,
                e.phone, e.email, e.wage, e.startworkdate, e.partnerid
         FROM dbo.employees e WHERE e.id = $1`,
        [docId]
      );
      if (empRows.length === 0) {
        log.warn(`Doctor ${docId} not found in real DB employees table — skipping doctor mapping`);
        doctorMap[docId] = null;
        continue;
      }
      const emp = empRows[0];

      // Try to find by name in demo DB
      const { rows: nameMatches } = await demo.query(
        `SELECT id, name FROM dbo.partners WHERE employee = true AND name ILIKE $1`,
        [`%${emp.name}%`]
      );

      if (nameMatches.length > 0) {
        doctorMap[docId] = nameMatches[0].id;
        log.info(`Doctor "${emp.name}" matched to existing "${nameMatches[0].name}" (${nameMatches[0].id.slice(0, 8)}...)`);
        continue;
      }

      // Create new doctor in demo DB
      const newDoctor = {
        id: emp.id,
        name: emp.name,
        namenosign: emp.name,
        employee: true,
        customer: false,
        isdoctor: true,
        isassistant: false,
        isreceptionist: false,
        active: true,
        companyid: emp.companyid,
        phone: emp.phone || null,
        email: emp.email || null,
        wage: emp.wage || 0,
        startworkdate: emp.startworkdate || null,
      };
      if (!opts.dryRun) {
        const ins = buildInsert('partners', newDoctor, demoPartnersCols);
        await demo.query(ins.sql, ins.params);
      }
      doctorMap[docId] = emp.id;
      log.ok(`Doctor "${emp.name}" created at branch ${emp.companyid?.slice(0, 8)}...`);
    }

    // ── 5b. Resolve Phụ tá (assistant) → salestaffid ──────────────────
    let chosenAssistantId = null;
    {
      // Build frequency map: assistantid → { count, lastDate }
      const assistantFreq = new Map();
      for (const line of realLines) {
        if (!line.assistantid) continue;
        const existing = assistantFreq.get(line.assistantid);
        const lineDate = line.datecreated ? new Date(line.datecreated) : new Date(0);
        if (!existing) {
          assistantFreq.set(line.assistantid, { count: 1, lastDate: lineDate });
        } else {
          existing.count += 1;
          if (lineDate > existing.lastDate) existing.lastDate = lineDate;
        }
      }

      if (assistantFreq.size === 0) {
        log.info('Phụ tá: no assistantid found across saleorderlines — salestaffid will be null');
      } else {
        if (assistantFreq.size > 1) {
          log.warn(`Phụ tá: ${assistantFreq.size} distinct assistants found — picking most frequent (tie-break: most recent)`);
        }

        // Pick winner: max count, tie-break by most recent lastDate
        let winnerId = null;
        let winnerCount = -1;
        let winnerDate = new Date(0);
        for (const [id, { count, lastDate }] of assistantFreq) {
          if (count > winnerCount || (count === winnerCount && lastDate > winnerDate)) {
            winnerId = id;
            winnerCount = count;
            winnerDate = lastDate;
          }
        }

        // Look up winner in real DB employees
        const { rows: asstRows } = await real.query(
          `SELECT id, name, companyid, phone, email, isdoctor, isassistant, isreceptionist
           FROM dbo.employees WHERE id = $1`,
          [winnerId]
        );

        if (asstRows.length === 0) {
          log.warn(`Phụ tá: employee ${winnerId} not found in real DB employees — salestaffid will be null`);
        } else {
          const emp = asstRows[0];
          log.info(`Phụ tá: "${emp.name}" (${emp.id.slice(0, 8)}...) — count=${winnerCount}`);

          // Check demo DB by exact id
          const { rows: exactRows } = await demo.query(
            `SELECT id FROM dbo.partners WHERE id = $1`, [emp.id]
          );
          if (exactRows.length > 0) {
            chosenAssistantId = emp.id;
            log.info(`Phụ tá: "${emp.name}" already exists in demo DB by id`);
          } else {
            // Try name match
            const { rows: nameRows } = await demo.query(
              `SELECT id, name FROM dbo.partners WHERE employee = true AND name ILIKE $1`,
              [`%${emp.name}%`]
            );
            if (nameRows.length > 0) {
              chosenAssistantId = nameRows[0].id;
              log.info(`Phụ tá: "${emp.name}" matched to existing "${nameRows[0].name}" (${nameRows[0].id.slice(0, 8)}...)`);
            } else {
              // Create new partner for this assistant
              const newAsst = {
                id: emp.id,
                name: emp.name,
                namenosign: emp.name,
                employee: true,
                customer: false,
                isassistant: !!emp.isassistant,
                isdoctor: !!emp.isdoctor,
                isreceptionist: !!emp.isreceptionist,
                active: true,
                companyid: emp.companyid,
                phone: emp.phone || null,
                email: emp.email || null,
              };
              if (!opts.dryRun) {
                const ins = buildInsert('partners', newAsst, demoPartnersCols);
                await demo.query(ins.sql, ins.params);
              }
              chosenAssistantId = emp.id;
              log.ok(`Phụ tá: "${emp.name}" created in demo DB (${emp.id.slice(0, 8)}...)`);
            }
          }
          log.ok(`Phụ tá resolved → salestaffid = ${chosenAssistantId?.slice(0, 8)}... ("${emp.name}")`);
        }
      }
    }

    // ── 6. Insert customer into demo DB ────────────────────────────────
    const existingCustomer = await demo.query(
      `SELECT id FROM dbo.partners WHERE id = $1`, [customer.id]
    );
    if (existingCustomer.rows.length > 0) {
      log.skip(`Customer "${customer.name}" already exists in demo DB`);
      if (chosenAssistantId && !opts.dryRun) {
        await demo.query(
          `UPDATE dbo.partners SET salestaffid = $1 WHERE id = $2`,
          [chosenAssistantId, customer.id]
        );
        log.ok(`Customer "${customer.name}" salestaffid updated to ${chosenAssistantId.slice(0, 8)}...`);
      }
    } else {
      const customerRow = { ...customer };
      // Ensure required fields for demo DB
      if (!customerRow.employee) customerRow.employee = false;
      if (!customerRow.customer) customerRow.customer = true;
      if (!customerRow.active) customerRow.active = true;
      if (!customerRow.isdeleted) customerRow.isdeleted = false;
      // Set salestaffid from resolved Phụ tá
      customerRow.salestaffid = chosenAssistantId;

      if (!opts.dryRun) {
        const ins = buildInsert('partners', customerRow, demoPartnersCols);
        await demo.query(ins.sql, ins.params);
      }
      log.ok(`Customer "${customer.name}" inserted${chosenAssistantId ? ` with salestaffid=${chosenAssistantId.slice(0, 8)}...` : ''}`);
    }

    // ── 7. Insert saleorders ───────────────────────────────────────────
    const migratedOrderIds = []; // track which orders were actually inserted
    for (const order of realOrders) {
      const orderLines = realLines.filter((l) => l.orderid === order.id);

      // Skip empty orders
      if (parseFloat(order.amounttotal) === 0 && orderLines.length === 0) {
        log.skip(`Order ${order.name} (${order.id.slice(0, 8)}...) — amounttotal=0, no lines`);
        continue;
      }

      // Map columns: real → demo
      const mappedOrder = {
        id: order.id,
        name: order.name,
        partnerid: order.partnerid,
        companyid: order.companyid,
        doctorid: doctorMap[order.doctorid] || null,
        amounttotal: order.amounttotal,
        residual: order.residual,
        totalpaid: order.totalpaid,
        state: order.state,
        isdeleted: order.isdeleted || false,
        datecreated: order.datecreated,
        lastupdated: order.lastupdated,
        notes: order.note || null,
        assistantid: null,
        quantity: 1,
        unit: 'răng',
        dentalaideid: null,
        datestart: order.dateorder || order.datecreated,
        dateend: null,
      };

      // Check idempotency
      const exists = await demo.query(`SELECT id FROM dbo.saleorders WHERE id = $1`, [order.id]);
      if (exists.rows.length > 0) {
        log.skip(`Order ${order.name} already exists`);
        migratedOrderIds.push(order.id);
        continue;
      }

      if (!opts.dryRun) {
        const ins = buildInsert('saleorders', mappedOrder, demoOrdersCols);
        await demo.query(ins.sql, ins.params);
      }
      log.ok(`Order ${order.name} — ${parseFloat(order.amounttotal).toLocaleString('vi-VN')}₫`);
      migratedOrderIds.push(order.id);
    }

    // ── 8. Insert saleorderlines ───────────────────────────────────────
    for (const line of realLines) {
      // Only insert lines for orders we actually migrated
      if (!migratedOrderIds.includes(line.orderid)) continue;

      const mappedLine = {
        id: line.id,
        orderid: line.orderid,
        productid: productMap[line.productid] || line.productid,
        productname: line.name || null,
        pricetotal: line.pricetotal,
        isdeleted: line.isdeleted || false,
        datecreated: line.datecreated,
      };

      const exists = await demo.query(`SELECT id FROM dbo.saleorderlines WHERE id = $1`, [line.id]);
      if (exists.rows.length > 0) {
        log.skip(`Line ${line.id.slice(0, 8)}... already exists`);
        continue;
      }

      if (!opts.dryRun) {
        const ins = buildInsert('saleorderlines', mappedLine, demoLinesCols);
        await demo.query(ins.sql, ins.params);
      }
      log.ok(`Line for order — product: ${line.name}, ${parseFloat(line.pricetotal).toLocaleString('vi-VN')}₫`);
    }

    // ── 9. Insert payments + payment_allocations ───────────────────────
    for (const payment of realPayments) {
      // Skip zero-amount payments
      if (parseFloat(payment.amount) === 0) {
        log.skip(`Payment ${payment.id.slice(0, 8)}... — amount=0`);
        continue;
      }

      // Only migrate payments for orders we actually migrated
      if (!migratedOrderIds.includes(payment.orderid)) {
        log.skip(`Payment ${payment.id.slice(0, 8)}... — order not migrated (${payment.orderid?.slice(0, 8)}...)`);
        continue;
      }

      // Handle refunds: negative amount
      let paymentAmount = parseFloat(payment.amount);
      if (payment.isrefund) paymentAmount = -Math.abs(paymentAmount);

      // Map to demo payments table
      const mappedPayment = {
        id: payment.id,
        customer_id: payment.partnerid,
        service_id: null,
        amount: paymentAmount,
        method: 'cash',
        notes: payment.note || null,
        payment_date: payment.date ? payment.date.toISOString().slice(0, 10) : null,
        reference_code: apMap.get((payment.note || '').trim()) || null,
        status: payment.state || 'posted',
        deposit_used: 0,
        cash_amount: paymentAmount > 0 ? paymentAmount : 0,
        bank_amount: 0,
        receipt_number: null,
        deposit_type: null,
      };

      // Check idempotency
      const exists = await demo.query(`SELECT id FROM dbo.payments WHERE id = $1`, [payment.id]);
      if (exists.rows.length > 0) {
        log.skip(`Payment ${payment.id.slice(0, 8)}... already exists`);
        continue;
      }

      if (!opts.dryRun) {
        const ins = buildInsert('payments', mappedPayment, demoPaymentsCols);
        await demo.query(ins.sql, ins.params);

        // Create payment_allocation linking to saleorder
        const allocationId = require('crypto').randomUUID();
        const alloc = {
          id: allocationId,
          payment_id: payment.id,
          invoice_id: payment.orderid,
          dotkham_id: null,
          allocated_amount: Math.abs(paymentAmount),
        };
        const allocIns = buildInsert('payment_allocations', alloc, demoAllocsCols);
        await demo.query(allocIns.sql, allocIns.params);
      }
      log.ok(`Payment ${parseFloat(payment.amount).toLocaleString('vi-VN')}₫ → order ${payment.orderid?.slice(0, 8)}...`);
    }

    // ── 10. Update saleorder totalpaid/residual ────────────────────────
    for (const orderId of migratedOrderIds) {
      if (!opts.dryRun) {
        await demo.query(
          `UPDATE dbo.saleorders SET
             totalpaid = COALESCE((
               SELECT SUM(pa.allocated_amount)
               FROM dbo.payment_allocations pa
               WHERE pa.invoice_id = $1
             ), 0),
             residual = GREATEST(0, amounttotal - COALESCE((
               SELECT SUM(pa.allocated_amount)
               FROM dbo.payment_allocations pa
               WHERE pa.invoice_id = $1
             ), 0))
           WHERE id = $1`,
          [orderId]
        );
      }
      const { rows: updated } = await demo.query(
        `SELECT name, totalpaid, residual, amounttotal FROM dbo.saleorders WHERE id = $1`,
        [orderId]
      );
      if (updated[0]) {
        log.info(`Order ${updated[0].name}: total=${parseFloat(updated[0].amounttotal).toLocaleString('vi-VN')}₫, paid=${parseFloat(updated[0].totalpaid).toLocaleString('vi-VN')}₫, residual=${parseFloat(updated[0].residual).toLocaleString('vi-VN')}₫`);
      }
    }

    // ── 11. Insert appointments ────────────────────────────────────────
    for (const appt of realAppts) {
      const mappedAppt = {
        ...appt,
        doctorid: doctorMap[appt.doctorid] || null,
        // Preserve saleorderid if it points to a migrated order
        saleorderid: migratedOrderIds.includes(appt.saleorderid) ? appt.saleorderid : null,
      };

      const exists = await demo.query(`SELECT id FROM dbo.appointments WHERE id = $1`, [appt.id]);
      if (exists.rows.length > 0) {
        log.skip(`Appointment ${appt.name} already exists`);
        continue;
      }

      if (!opts.dryRun) {
        const ins = buildInsert('appointments', mappedAppt, demoApptsCols);
        await demo.query(ins.sql, ins.params);
      }
      const dateStr = appt.date ? new Date(appt.date).toLocaleDateString('vi-VN') : '?';
      log.ok(`Appointment ${appt.name} — ${dateStr} — ${appt.state}`);
    }

    // ── Commit or show dry-run summary ─────────────────────────────────
    if (opts.dryRun) {
      console.log('\n  🔍 DRY RUN — no data was written to demo DB.');
    } else {
      await demo.query('COMMIT');
      console.log('\n  💾 Transaction committed successfully.');
    }

    log.summary();
  } catch (err) {
    if (!opts.dryRun) {
      await demo.query('ROLLBACK');
      console.error('\n  💥 Transaction rolled back due to error.');
    }
    log.error(err.message);
    console.error(err.stack);
    log.summary();
    process.exit(1);
  } finally {
    await real.end();
    await demo.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
