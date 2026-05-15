'use strict';

const { query } = require('../../../db');
const { addCommonDateFilters } = require('./legacyFlatReportFilters');

function buildDepositWhere(filters) {
  const conditions = [
    "p.status = 'posted'",
    "p.payment_category = 'deposit'",
    "p.deposit_type = 'deposit'",
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
      p.reference_code ILIKE $${idx}
      OR pr.ref ILIKE $${idx}
      OR pr.name ILIKE $${idx}
      OR pr.displayname ILIKE $${idx}
      OR pr.phone ILIKE $${idx}
    )`);
    params.push(`%${filters.search}%`);
    idx += 1;
  }

  if (filters.companyId && filters.companyId !== 'all') {
    conditions.push(`pr.companyid = $${idx}`);
    params.push(filters.companyId);
    idx += 1;
  }

  if (filters.doctorId) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM payment_allocations doctor_pa
      JOIN saleorders doctor_so ON doctor_so.id = doctor_pa.invoice_id
      WHERE doctor_pa.payment_id = p.id
        AND doctor_so.doctorid = $${idx}
    )`);
    params.push(filters.doctorId);
  }

  return { where: conditions.join(' AND '), params };
}

function depositSelect(where) {
  return `
    SELECT
      customer_company.name AS companyname,
      pr.ref AS partnercode,
      pr.name AS partnername,
      pr.displayname AS partnerdisplayname,
      pr.phone AS partnerphone,
      COALESCE(p.payment_date, p.created_at)::date AS paymentdate,
      p.amount,
      p.cash_amount,
      p.bank_amount,
      sale_staff.name AS salestaffname,
      cskh_staff.name AS cskhname,
      cs.name AS customersourcename,
      p.created_at
    FROM payments p
    LEFT JOIN partners pr ON pr.id = p.customer_id
    LEFT JOIN partners sale_staff ON sale_staff.id = pr.salestaffid
    LEFT JOIN partners cskh_staff ON cskh_staff.id = pr.cskhid
    LEFT JOIN companies customer_company ON customer_company.id = pr.companyid
    LEFT JOIN customersources cs ON cs.id = pr.sourceid
    WHERE ${where}
  `;
}

async function getDepositRows(filters, maxRows) {
  const { where, params } = buildDepositWhere(filters);
  const sql = `
    ${depositSelect(where)}
    ORDER BY paymentdate DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT ${maxRows + 1}
  `;
  return query(sql, params);
}

async function previewDeposit(filters) {
  const { where, params } = buildDepositWhere(filters);
  const sql = `
    SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS total_amount
    FROM (${depositSelect(where)}) deposit_rows
  `;
  const rows = await query(sql, params);
  return rows[0] || { total: '0', total_amount: '0' };
}

module.exports = {
  getDepositRows,
  previewDeposit,
};
