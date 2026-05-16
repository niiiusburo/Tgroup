'use strict';

// Canonical revenue source-of-truth — the same formula the Excel "revenue-flat"
// export uses (see api/src/services/exports/builders/legacyFlatRevenueQuery.js).
//
// Filter constants live in routes/reports/revenueRecognition.js so every report
// (Dashboard, Revenue, Doctors, Locations, Services) shares one source of truth.

const { query } = require('../../db');
const {
  SERVICE_REVENUE_PAYMENT_CONDITION,
  ALLOCATION_TOTALS_CTE,
  CAPPED_ALLOCATED_AMOUNT_SQL,
} = require('../../routes/reports/revenueRecognition');

function buildWhere({ dateFrom, dateTo, companyId }) {
  const conditions = [SERVICE_REVENUE_PAYMENT_CONDITION, 'COALESCE(so.isdeleted, false) = false'];
  const params = [];
  let idx = 1;

  if (dateFrom) {
    conditions.push(`COALESCE(p.payment_date, p.created_at)::date >= $${idx}`);
    params.push(dateFrom);
    idx += 1;
  }
  if (dateTo) {
    conditions.push(`COALESCE(p.payment_date, p.created_at)::date <= $${idx}`);
    params.push(dateTo);
    idx += 1;
  }
  if (companyId) {
    conditions.push(`so.companyid = $${idx}`);
    params.push(companyId);
    idx += 1;
  }

  return { where: conditions.join(' AND '), params };
}

const BASE_JOINS = `
  FROM dbo.payment_allocations pa
  JOIN dbo.payments p ON p.id = pa.payment_id
  LEFT JOIN allocation_totals at ON at.payment_id = p.id
  JOIN dbo.saleorders so ON so.id = pa.invoice_id
`;

/**
 * Total revenue for a period, matching the Excel revenue-flat export's grand total.
 * @returns {Promise<number>} VND total
 */
async function getCanonicalRevenue(filters = {}) {
  const { where, params } = buildWhere(filters);
  const sql = `
    WITH ${ALLOCATION_TOTALS_CTE}
    SELECT COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}), 0) AS total
    ${BASE_JOINS}
    WHERE ${where}
  `;
  const rows = await query(sql, params);
  return parseFloat(rows[0]?.total || 0);
}

/**
 * Revenue grouped by calendar month, same canonical formula.
 * @returns {Promise<Array<{month: string, revenue: number}>>}
 */
async function getCanonicalRevenueByMonth(filters = {}) {
  const { where, params } = buildWhere(filters);
  const sql = `
    WITH ${ALLOCATION_TOTALS_CTE}
    SELECT DATE_TRUNC('month', COALESCE(p.payment_date, p.created_at)) AS month,
           COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}), 0) AS revenue
    ${BASE_JOINS}
    WHERE ${where}
    GROUP BY month
    ORDER BY month
  `;
  const rows = await query(sql, params);
  return rows.map((r) => ({ month: r.month, revenue: parseFloat(r.revenue || 0) }));
}

/**
 * Revenue grouped by saleorder.doctorid — credit goes to the doctor on the invoice,
 * which matches how Excel attributes per-doctor revenue.
 * Rows with NULL doctorid are bucketed as { doctorId: null }.
 * @returns {Promise<Array<{doctorId: string|null, revenue: number}>>}
 */
async function getCanonicalRevenueByDoctor(filters = {}) {
  const { where, params } = buildWhere(filters);
  const sql = `
    WITH ${ALLOCATION_TOTALS_CTE}
    SELECT so.doctorid AS doctor_id,
           COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}), 0) AS revenue
    ${BASE_JOINS}
    WHERE ${where}
    GROUP BY so.doctorid
  `;
  const rows = await query(sql, params);
  return rows.map((r) => ({ doctorId: r.doctor_id, revenue: parseFloat(r.revenue || 0) }));
}

/**
 * Revenue grouped by saleorder.companyid (branch). Pass companyId=null to get
 * every branch back. Used by Locations comparison and Locations dashboard tiles.
 * @returns {Promise<Array<{companyId: string|null, revenue: number}>>}
 */
async function getCanonicalRevenueByLocation(filters = {}) {
  const { where, params } = buildWhere(filters);
  const sql = `
    WITH ${ALLOCATION_TOTALS_CTE}
    SELECT so.companyid AS company_id,
           COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}), 0) AS revenue
    ${BASE_JOINS}
    WHERE ${where}
    GROUP BY so.companyid
  `;
  const rows = await query(sql, params);
  return rows.map((r) => ({ companyId: r.company_id, revenue: parseFloat(r.revenue || 0) }));
}

module.exports = {
  getCanonicalRevenue,
  getCanonicalRevenueByMonth,
  getCanonicalRevenueByDoctor,
  getCanonicalRevenueByLocation,
};
