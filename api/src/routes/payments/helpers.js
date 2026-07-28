const { query } = require("../../db");
const { getVietnamYear } = require("../../lib/dateUtils");

const RESIDUAL_TOLERANCE = 0.01;

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

/**
 * AUD-006: residual must be read FOR UPDATE inside the payment transaction so a
 * concurrent allocator cannot observe and spend the same residual (TOCTOU).
 */
async function checkInvoiceResidual(id, amt, queryable = query) {
  const r = await rowsFrom(
    queryable,
    "SELECT residual FROM saleorders WHERE id = $1 FOR UPDATE",
    [id]
  );
  if (r.length === 0) return `Invoice ${id} not found`;
  const residual = parseFloat(r[0].residual || 0);
  if (amt > residual + RESIDUAL_TOLERANCE) return 'Payment amount exceeds outstanding balance';
  return null;
}

async function checkDotkhamResidual(id, amt, queryable = query) {
  const r = await rowsFrom(
    queryable,
    "SELECT amountresidual FROM dotkhams WHERE id = $1 FOR UPDATE",
    [id]
  );
  if (r.length === 0) return `Dotkham ${id} not found`;
  const residual = parseFloat(r[0].amountresidual || 0);
  if (amt > residual + RESIDUAL_TOLERANCE) return 'Payment amount exceeds outstanding balance';
  return null;
}

// An allocation is only persisted when it has a target and an amount — see the
// matching `continue` in the POST /Payments allocation insert loop.
function isPersistableAllocation(a) {
  return Boolean(a) && (Boolean(a.invoice_id) || Boolean(a.dotkham_id)) && a.allocated_amount != null;
}

function sumAllocations(allocations) {
  if (!Array.isArray(allocations)) return 0;
  return allocations
    .filter(isPersistableAllocation)
    .reduce((total, a) => total + (parseFloat(a.allocated_amount) || 0), 0);
}

// Group allocations by target so N rows against one invoice are one residual check.
// Sort keys so concurrent transactions acquire row locks in a stable order.
function groupAllocationsByTarget(allocations) {
  const groups = new Map();
  for (const a of allocations) {
    if (!isPersistableAllocation(a)) continue;
    const kind = a.invoice_id ? 'invoice' : 'dotkham';
    const id = a.invoice_id || a.dotkham_id;
    const key = `${kind}:${id}`;
    const previous = groups.get(key);
    groups.set(key, {
      kind,
      id,
      amount: (previous ? previous.amount : 0) + (parseFloat(a.allocated_amount) || 0),
    });
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * INV-003 / INV-012 residual guards:
 *  1. allocations may not total more than the payment amount (when supplied)
 *  2. total allocated to one target may not exceed that target's residual
 *  3. residual rows are locked FOR UPDATE (AUD-006) when queryable is a txn client
 */
async function validateAllocationResidual(allocations, queryable = query, paymentAmount = null) {
  if (!Array.isArray(allocations)) return null;

  if (paymentAmount !== null && paymentAmount !== undefined) {
    const allocated = sumAllocations(allocations);
    const payable = parseFloat(paymentAmount) || 0;
    if (allocated > payable + RESIDUAL_TOLERANCE) {
      return `Allocated total (${allocated}) exceeds the payment amount (${payable})`;
    }
  }

  for (const target of groupAllocationsByTarget(allocations)) {
    const err = target.kind === 'invoice'
      ? await checkInvoiceResidual(target.id, target.amount, queryable)
      : await checkDotkhamResidual(target.id, target.amount, queryable);
    if (err) return err;
  }

  return null;
}

module.exports = {
  generateReceiptNumber,
  mapAllocations,
  rowsFrom,
  sumAllocations,
  validateAllocationResidual,
  RESIDUAL_TOLERANCE,
};
