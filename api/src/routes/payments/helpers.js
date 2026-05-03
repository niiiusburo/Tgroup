const { query } = require("../../db");
const { getVietnamYear } = require("../../lib/dateUtils");

async function rowsFrom(queryable, sql, params) {
  const result = typeof queryable === "function"
    ? await queryable(sql, params)
    : await queryable.query(sql, params);
  return Array.isArray(result) ? result : result.rows || [];
}

function mapAllocations(allocResult) {
  return allocResult.map(a => {
    if (a.invoice_id) {
      return {
        id: a.id,
        paymentId: a.payment_id,
        invoiceId: a.invoice_id,
        invoiceName: a.invoice_name,
        invoiceCode: a.invoice_code,
        invoiceTotal: parseFloat(a.invoice_total || 0),
        invoiceResidual: parseFloat(a.invoice_residual || 0),
        allocatedAmount: parseFloat(a.allocated_amount),
      };
    }
    return {
      id: a.id,
      paymentId: a.payment_id,
      dotkhamId: a.dotkham_id,
      dotkhamName: a.dotkham_name,
      dotkhamTotal: parseFloat(a.dotkham_total || 0),
      dotkhamResidual: parseFloat(a.dotkham_residual || 0),
      allocatedAmount: parseFloat(a.allocated_amount),
    };
  });
}

async function generateReceiptNumber(prefix = "TUKH", queryable = query) {
  const year = getVietnamYear();
  const result = await rowsFrom(
    queryable,
    `INSERT INTO receipt_sequences (prefix, year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (prefix, year)
     DO UPDATE SET last_number = receipt_sequences.last_number + 1
     RETURNING last_number`,
    [prefix, year]
  );
  const num = result[0].last_number;
  return `${prefix}/${year}/${String(num).padStart(5, "0")}`;
}

async function checkInvoiceResidual(id, amt, queryable = query) {
  const r = await rowsFrom(queryable, "SELECT residual FROM saleorders WHERE id = $1", [id]);
  if (r.length === 0) return `Invoice ${id} not found`;
  const residual = parseFloat(r[0].residual || 0);
  if (amt > residual + 0.01) return 'Payment amount exceeds outstanding balance';
  return null;
}

async function checkDotkhamResidual(id, amt, queryable = query) {
  const r = await rowsFrom(queryable, "SELECT amountresidual FROM dotkhams WHERE id = $1", [id]);
  if (r.length === 0) return `Dotkham ${id} not found`;
  const residual = parseFloat(r[0].amountresidual || 0);
  if (amt > residual + 0.01) return 'Payment amount exceeds outstanding balance';
  return null;
}

async function checkOneAllocationResidual(a, queryable = query) {
  if ((!a.invoice_id && !a.dotkham_id) || a.allocated_amount == null) return null;
  const amt = parseFloat(a.allocated_amount);
  if (a.invoice_id) return checkInvoiceResidual(a.invoice_id, amt, queryable);
  return checkDotkhamResidual(a.dotkham_id, amt, queryable);
}

async function validateAllocationResidual(allocations, queryable = query) {
  if (!Array.isArray(allocations)) return null;
  for (const a of allocations) {
    const e = await checkOneAllocationResidual(a, queryable);
    if (e) return e;
  }
  return null;
}

module.exports = {
  generateReceiptNumber,
  mapAllocations,
  rowsFrom,
  validateAllocationResidual,
};
