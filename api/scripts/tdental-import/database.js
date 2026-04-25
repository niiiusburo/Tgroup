const crypto = require('crypto');
const {
  mapCompanyRow,
  mapCustomerSourceRow,
  mapEmployeeRow,
  mapPartnerRow,
  mapProductCategoryRow,
  mapProductRow,
} = require('./entity-mappers');
const {
  mapAppointmentRow,
  mapAccountPaymentToPayment,
  mapSaleOrderLineRow,
  mapSaleOrderRow,
} = require('./transaction-mappers');
const { clean, normalizeUuid, numberOrZero, parseCsvDateOnly, parseCsvTimestamp } = require('./utils');

async function getLocalLineSummary(client, partnerId) {
  const res = await client.query(
    `SELECT sol.id, COALESCE(sol.pricetotal, 0) AS pricetotal
     FROM saleorderlines sol
     JOIN saleorders so ON so.id = sol.orderid
     WHERE so.partnerid = $1 AND COALESCE(sol.isdeleted, false) = false`,
    [partnerId],
  );
  return {
    lineIds: new Set(res.rows.map((row) => normalizeUuid(row.id))),
    lineCount: res.rows.length,
    lineTotal: res.rows.reduce((sum, row) => sum + numberOrZero(row.pricetotal), 0),
  };
}

async function upsertRows(client, table, rows) {
  let count = 0;
  for (const row of rows) {
    const entries = Object.entries(row).filter(([, value]) => value !== undefined);
    const columns = entries.map(([column]) => column);
    const values = entries.map(([, value]) => value);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const updates = columns.filter((column) => column !== 'id').map((column) => `${column}=EXCLUDED.${column}`);
    await client.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders.join(',')})
       ON CONFLICT (id) DO UPDATE SET ${updates.join(',')}`,
      values,
    );
    count += 1;
  }
  return count;
}

function orderLineTotals(lines) {
  const totals = new Map();
  for (const line of lines) {
    const orderId = normalizeUuid(line.OrderId);
    totals.set(orderId, (totals.get(orderId) || 0) + numberOrZero(line.PriceTotal));
  }
  return totals;
}

async function upsertPaymentAllocations(client, plan) {
  const targetOrderIds = new Set(plan.rows.lines.map((row) => normalizeUuid(row.OrderId)).filter(Boolean));
  if (targetOrderIds.size === 0) return 0;
  const lineTotals = orderLineTotals(plan.rows.lines);
  const targetOrders = plan.rows.orders
    .filter((row) => targetOrderIds.has(normalizeUuid(row.Id)))
    .map((row) => ({
      id: normalizeUuid(row.Id),
      remaining: Math.max(numberOrZero(row.AmountTotal), lineTotals.get(normalizeUuid(row.Id)) || 0),
      date: parseCsvDateOnly(plan.rows.lines.find((line) => normalizeUuid(line.OrderId) === normalizeUuid(row.Id))?.Date || row.DateOrder),
    }))
    .filter((row) => row.remaining > 0)
    .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));

  if (targetOrders.length === 0) return 0;
  const existing = await client.query(
    `SELECT invoice_id, COALESCE(SUM(allocated_amount), 0) AS allocated
     FROM payment_allocations
     WHERE invoice_id = ANY($1::uuid[])
     GROUP BY invoice_id`,
    [targetOrders.map((order) => order.id)],
  );
  for (const row of existing.rows) {
    const order = targetOrders.find((item) => item.id === normalizeUuid(row.invoice_id));
    if (order) order.remaining = Math.max(0, order.remaining - numberOrZero(row.allocated));
  }

  const payments = plan.rows.payments
    .filter((row) => clean(row.State).toLowerCase() === 'posted')
    .map((row) => ({ row, date: parseCsvDateOnly(row.PaymentDate), amount: numberOrZero(row.Amount) }))
    .filter((payment) => payment.amount > 0)
    .sort((a, b) => `${a.date}-${clean(a.row.DateCreated)}`.localeCompare(`${b.date}-${clean(b.row.DateCreated)}`));

  const existingByPayment = await client.query(
    `SELECT payment_id, COALESCE(SUM(allocated_amount), 0) AS allocated
     FROM payment_allocations
     WHERE payment_id = ANY($1::uuid[])
     GROUP BY payment_id`,
    [payments.map((payment) => normalizeUuid(payment.row.Id))],
  );
  const allocatedByPayment = new Map(
    existingByPayment.rows.map((row) => [normalizeUuid(row.payment_id), numberOrZero(row.allocated)]),
  );

  let count = 0;
  for (const payment of payments) {
    let remainingPayment = Math.max(0, payment.amount - (allocatedByPayment.get(normalizeUuid(payment.row.Id)) || 0));
    for (const order of targetOrders) {
      if (remainingPayment <= 0) break;
      if (order.remaining <= 0) continue;
      if (payment.date && order.date && payment.date < order.date) continue;
      const amount = Math.min(remainingPayment, order.remaining);
      const existingAlloc = await client.query(
        `SELECT id FROM payment_allocations WHERE payment_id = $1 AND invoice_id = $2 LIMIT 1`,
        [normalizeUuid(payment.row.Id), order.id],
      );
      if (existingAlloc.rows.length > 0) {
        await client.query('UPDATE payment_allocations SET allocated_amount = $2 WHERE id = $1', [
          existingAlloc.rows[0].id, amount,
        ]);
      } else {
        await client.query(
          `INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [crypto.randomUUID(), normalizeUuid(payment.row.Id), order.id, amount, parseCsvTimestamp(payment.row.DateCreated)],
        );
      }
      order.remaining -= amount;
      remainingPayment -= amount;
      count += 1;
    }
  }
  return count;
}

async function voidStaleDepositRows(client, partnerId) {
  const res = await client.query(
    `UPDATE payments
     SET status = 'voided'
     WHERE customer_id = $1
       AND status != 'voided'
       AND deposit_type = 'deposit'
       AND reference_code LIKE 'TUKH/%'`,
    [normalizeUuid(partnerId)],
  );
  return res.rowCount;
}

async function voidLocalOnlyPaymentRows(client, plan) {
  const sourcePaymentIds = plan.rows.payments
    .map((row) => normalizeUuid(row.Id))
    .filter(Boolean);
  const res = await client.query(
    `WITH stale AS (
       SELECT p.id
       FROM payments p
       WHERE p.customer_id = $1
         AND p.status = 'posted'
         AND COALESCE(p.payment_category, 'payment') = 'payment'
         AND p.id <> ALL($2::uuid[])
         AND (p.reference_code IS NULL OR BTRIM(p.reference_code) = '')
     ),
     deleted_allocations AS (
       DELETE FROM payment_allocations pa
       USING stale
       WHERE pa.payment_id = stale.id
       RETURNING pa.id
     ),
     voided_payments AS (
       UPDATE payments p
       SET status = 'voided',
           notes = CONCAT_WS(' | ', NULLIF(p.notes, ''), 'VOIDED by TDental import: local-only no reference')
       FROM stale
       WHERE p.id = stale.id
       RETURNING p.id
     )
     SELECT
       (SELECT COUNT(*) FROM voided_payments) AS voided_count,
       (SELECT COUNT(*) FROM deleted_allocations) AS deleted_allocation_count`,
    [normalizeUuid(plan.partner.Id), sourcePaymentIds],
  );
  const row = res.rows[0] || {};
  return {
    voided: numberOrZero(row.voided_count),
    deletedAllocations: numberOrZero(row.deleted_allocation_count),
  };
}

async function updateCustomerSalesStaff(client, partnerId, salesStaff) {
  if (!salesStaff || !salesStaff.assistantId) return 0;
  const res = await client.query(
    'UPDATE partners SET salestaffid = $2 WHERE id = $1',
    [normalizeUuid(partnerId), salesStaff.assistantId],
  );
  return res.rowCount;
}

async function applyClientImport(client, plan) {
  const inserted = {};
  await client.query('BEGIN');
  try {
    inserted.companies = await upsertRows(client, 'companies', plan.rows.companies.map(mapCompanyRow));
    inserted.productcategories = await upsertRows(client, 'productcategories', plan.rows.productcategories.map(mapProductCategoryRow));
    inserted.products = await upsertRows(client, 'products', plan.rows.products.map(mapProductRow));
    inserted.customersources = await upsertRows(client, 'customersources', plan.rows.customersources.map(mapCustomerSourceRow));
    inserted.staff_partners = await upsertRows(client, 'partners', plan.rows.staffEmployees.map(mapEmployeeRow));
    inserted.partners = await upsertRows(client, 'partners', [mapPartnerRow(plan.rows.partner)]);
    inserted.customer_sales_staff = await updateCustomerSalesStaff(client, plan.partner.Id, plan.mapping.salesStaff);
    inserted.saleorders = await upsertRows(client, 'saleorders', plan.rows.orders.map(mapSaleOrderRow));
    inserted.saleorderlines = await upsertRows(client, 'saleorderlines', plan.rows.lines.map(mapSaleOrderLineRow));
    inserted.appointments = await upsertRows(client, 'appointments', plan.rows.appointments.map(mapAppointmentRow));
    inserted.accountpayments = 0;
    inserted.payments = await upsertRows(client, 'payments', plan.rows.payments.map(mapAccountPaymentToPayment));
    const localOnlyPaymentCleanup = await voidLocalOnlyPaymentRows(client, plan);
    inserted.local_only_payments_voided = localOnlyPaymentCleanup.voided;
    inserted.local_only_payment_allocations_removed = localOnlyPaymentCleanup.deletedAllocations;
    inserted.payment_allocations = await upsertPaymentAllocations(client, plan);
    inserted.stale_deposits_voided = await voidStaleDepositRows(client, plan.partner.Id);
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

module.exports = { applyClientImport, getLocalLineSummary, voidLocalOnlyPaymentRows };
