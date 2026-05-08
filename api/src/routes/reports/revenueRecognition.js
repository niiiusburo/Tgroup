'use strict';

const SERVICE_REVENUE_PAYMENT_CONDITION = [
  "p.status = 'posted'",
  'pa.invoice_id IS NOT NULL',
  "COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')",
  "COALESCE(p.method, '') <> 'deposit'",
].join('\nAND ');

const ALLOCATION_TOTALS_CTE = `allocation_totals AS (
  SELECT payment_id, SUM(allocated_amount) AS total_allocated_for_payment
  FROM dbo.payment_allocations
  GROUP BY payment_id
)`;

const CAPPED_ALLOCATED_AMOUNT_SQL = `CASE
  WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
  THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
  ELSE pa.allocated_amount
END`;

function buildPairedRevenueFilters({
  dateFrom,
  dateTo,
  companyId,
  orderDateCol,
  paymentDateCol,
  orderCompanyCol,
  paymentCompanyCol,
}) {
  const orderConds = [];
  const paymentConds = [];
  const params = [];
  let idx = 1;

  if (dateFrom) {
    const ref = `$${idx}`;
    orderConds.push(`${orderDateCol}::date >= ${ref}`);
    paymentConds.push(`${paymentDateCol}::date >= ${ref}`);
    params.push(dateFrom);
    idx++;
  }

  if (dateTo) {
    const ref = `$${idx}`;
    orderConds.push(`${orderDateCol}::date <= ${ref}`);
    paymentConds.push(`${paymentDateCol}::date <= ${ref}`);
    params.push(dateTo);
    idx++;
  }

  if (companyId) {
    const ref = `$${idx}`;
    orderConds.push(`${orderCompanyCol} = ${ref}`);
    paymentConds.push(`${paymentCompanyCol} = ${ref}`);
    params.push(companyId);
    idx++;
  }

  return {
    orderWhere: orderConds.length ? `AND ${orderConds.join(' AND ')}` : '',
    paymentWhere: paymentConds.length ? `AND ${paymentConds.join(' AND ')}` : '',
    params,
    idx,
  };
}

function buildPaymentRevenueFilter({
  dateFrom,
  dateTo,
  companyId,
  paymentDateCol = 'COALESCE(p.payment_date, p.created_at)',
  companyCol = 'so.companyid',
}) {
  const conds = [];
  const params = [];
  let idx = 1;

  if (dateFrom) {
    conds.push(`${paymentDateCol}::date >= $${idx}`);
    params.push(dateFrom);
    idx++;
  }

  if (dateTo) {
    conds.push(`${paymentDateCol}::date <= $${idx}`);
    params.push(dateTo);
    idx++;
  }

  if (companyId) {
    conds.push(`${companyCol} = $${idx}`);
    params.push(companyId);
    idx++;
  }

  return {
    where: conds.length ? `AND ${conds.join(' AND ')}` : '',
    params,
    idx,
  };
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInt(value) {
  const parsed = parseInt(value || 0, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

module.exports = {
  SERVICE_REVENUE_PAYMENT_CONDITION,
  ALLOCATION_TOTALS_CTE,
  CAPPED_ALLOCATED_AMOUNT_SQL,
  buildPairedRevenueFilters,
  buildPaymentRevenueFilter,
  toNumber,
  toInt,
};
