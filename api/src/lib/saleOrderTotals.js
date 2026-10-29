function parseMoney(value) {
  const parsed = Number.parseFloat(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getAllocatedPaymentTotal(query, saleOrderId) {
  const rows = await query(
    `SELECT COALESCE(SUM(pa.allocated_amount), 0) AS totalpaid
     FROM payment_allocations pa
     JOIN payments p ON p.id = pa.payment_id
     WHERE pa.invoice_id = $1
       AND COALESCE(p.status, 'posted') != 'voided'`,
    [saleOrderId],
  );
  return parseMoney(rows[0]?.totalpaid);
}

function calculateSaleOrderPaymentState(amountTotal, allocatedPaid) {
  const total = parseMoney(amountTotal);
  const paid = parseMoney(allocatedPaid);
  return {
    amountTotal: total,
    totalPaid: paid,
    residual: Math.max(0, total - paid),
  };
}

async function calculateSaleOrderPaymentStateFromAllocations(query, saleOrderId, amountTotal) {
  const allocatedPaid = await getAllocatedPaymentTotal(query, saleOrderId);
  return calculateSaleOrderPaymentState(amountTotal, allocatedPaid);
}

// Payment create/void/delete adjust residual incrementally; totalpaid must follow the
// same allocations or treatment orders show a stale "paid" amount (see INV-030).
async function syncSaleOrderTotalPaid(client, saleOrderId) {
  await client.query(
    `UPDATE saleorders
     SET totalpaid = (
       SELECT COALESCE(SUM(pa.allocated_amount), 0)
       FROM payment_allocations pa
       JOIN payments p ON p.id = pa.payment_id
       WHERE pa.invoice_id = $1
         AND COALESCE(p.status, 'posted') != 'voided'
     )
     WHERE id = $1`,
    [saleOrderId],
  );
}

async function syncSaleOrdersTotalPaid(client, saleOrderIds) {
  const unique = [...new Set(saleOrderIds.filter(Boolean))];
  for (const id of unique) {
    await syncSaleOrderTotalPaid(client, id);
  }
}

module.exports = {
  calculateSaleOrderPaymentState,
  calculateSaleOrderPaymentStateFromAllocations,
  getAllocatedPaymentTotal,
  parseMoney,
  syncSaleOrderTotalPaid,
  syncSaleOrdersTotalPaid,
};
