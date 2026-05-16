'use strict';

const { query } = require('../../../db');
const { addCommonDateFilters } = require('./legacyFlatReportFilters');

function buildRevenueWhere(filters) {
  const conditions = [
    "p.status = 'posted'",
    'pa.invoice_id IS NOT NULL',
    'COALESCE(so.isdeleted, false) = false',
    "COALESCE(p.payment_category, 'payment') = 'payment'",
    "COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')",
  ];
  const params = [];
  let idx = 1;

  idx = addCommonDateFilters(
    filters,
    conditions,
    params,
    idx,
    'COALESCE(p.payment_date, p.created_at)::date',
    "COALESCE(p.created_at::time, TIME '00:00')"
  );

  if (filters.search) {
    conditions.push(`(
      so.code ILIKE $${idx}
      OR so.name ILIKE $${idx}
      OR cust.ref ILIKE $${idx}
      OR cust.name ILIKE $${idx}
      OR cust.displayname ILIKE $${idx}
      OR cust.phone ILIKE $${idx}
    )`);
    params.push(`%${filters.search}%`);
    idx += 1;
  }

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`so.companyid = $${idx}`);
    params.push(filters.companyId);
    idx += 1;
  }

  if (filters.doctorId) {
    conditions.push(`so.doctorid = $${idx}`);
    params.push(filters.doctorId);
  }

  return { where: conditions.join(' AND '), params };
}

function revenueCte(where) {
  const allocatedAmountExpr = `
    CASE
      WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
      THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
      ELSE pa.allocated_amount
    END
  `;

  return `
    WITH allocation_totals AS (
      SELECT payment_id, SUM(allocated_amount) AS total_allocated_for_payment
      FROM payment_allocations
      GROUP BY payment_id
    ),
    revenue_rows AS (
      SELECT
        c.name AS companyname,
        cust.ref AS partnercode,
        cust.name AS partnername,
        cust.displayname AS partnerdisplayname,
        cust.phone AS partnerphone,
        COALESCE(NULLIF(so.code, ''), so.name) AS saleordername,
        COALESCE(p.payment_date, p.created_at)::date AS paymentdate,
        ${allocatedAmountExpr} AS row_amount,
        COALESCE(p.amount, 0) AS payment_amount,
        COALESCE(p.cash_amount, 0) AS payment_cash_amount,
        COALESCE(p.bank_amount, 0) AS payment_bank_amount,
        COALESCE(p.deposit_used, 0) AS payment_deposit_used,
        sale_staff.name AS salestaffname,
        cskh_staff.name AS cskhname,
        doc.name AS doctorname,
        asst.name AS assistantname,
        da.name AS dentalaidename,
        cs.name AS customersourcename,
        p.created_at
      FROM payment_allocations pa
      JOIN payments p ON p.id = pa.payment_id
      LEFT JOIN allocation_totals at ON at.payment_id = p.id
      JOIN saleorders so ON so.id = pa.invoice_id
      LEFT JOIN partners cust ON cust.id = COALESCE(p.customer_id, so.partnerid)
      LEFT JOIN partners sale_staff ON sale_staff.id = cust.salestaffid
      LEFT JOIN partners cskh_staff ON cskh_staff.id = cust.cskhid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = cust.sourceid
      WHERE ${where}
    )
  `;
}

async function getRevenueRows(filters, maxRows) {
  const { where, params } = buildRevenueWhere(filters);
  const sql = `
    ${revenueCte(where)}
    SELECT
      companyname,
      partnercode,
      partnername,
      partnerdisplayname,
      partnerphone,
      saleordername,
      paymentdate,
      row_amount,
      CASE WHEN ABS(payment_amount) > 0 THEN payment_cash_amount * row_amount / payment_amount ELSE 0 END AS row_cash_amount,
      CASE WHEN ABS(payment_amount) > 0 THEN payment_bank_amount * row_amount / payment_amount ELSE 0 END AS row_bank_amount,
      CASE WHEN ABS(payment_amount) > 0 THEN payment_deposit_used * row_amount / payment_amount ELSE 0 END AS row_deposit_used,
      salestaffname,
      cskhname,
      doctorname,
      assistantname,
      dentalaidename,
      customersourcename
    FROM revenue_rows
    ORDER BY paymentdate DESC NULLS LAST, created_at DESC NULLS LAST, saleordername NULLS LAST
    LIMIT ${maxRows + 1}
  `;
  return query(sql, params);
}

async function previewRevenue(filters) {
  const { where, params } = buildRevenueWhere(filters);
  const sql = `
    ${revenueCte(where)}
    SELECT COUNT(*) AS total, COALESCE(SUM(row_amount), 0) AS total_amount
    FROM revenue_rows
  `;
  const rows = await query(sql, params);
  return rows[0] || { total: '0', total_amount: '0' };
}

module.exports = {
  getRevenueRows,
  previewRevenue,
};
