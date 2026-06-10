'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/routes/newClients.js, api/src/services/exports/builders/newClientsExport.js]
 * @crossref:uses[api/src/db.js (getDb dual-LOB; dbo.partners/saleorders/earnings), api/src/services/referralCard.js (pricetotal=0 anchor convention), product-map/domains/ctv.yaml, docs/TEST-MATRIX.md]
 */
/**
 * newClientsQuery.js — shared query for the admin "New Clients" surface.
 *
 * A "New Client" is a CTV-referred customer. The surface starts as a callback
 * lead list, then remains the admin referral-performance audit once the client
 * converts so staff can see service revenue and CTV commission side by side.
 *
 * The predicate mirrors the CTV journey's "referred" stage (stage 1):
 *   - referred_by_ctv_id IS NOT NULL (a CTV brought them in)
 *   - they are a customer, not a CTV, not deleted
 *   - service/revenue/commission totals are left-joined aggregates, not filters.
 *     The "Referral Start" anchor card (services/referralCard.js) is written
 *     with pricetotal = 0, so > 0 cleanly excludes it from service revenue.
 *
 * Clients live in exactly one LOB database (the refer flow writes to getDb(lob)
 * only), so we query each requested LOB DB independently and concat — no cross-DB
 * SQL. Date filtering uses datecreated::date (VN-local naive timestamp; no
 * AT TIME ZONE conversion, per project timestamp convention).
 *
 * @crossref:used-by[routes/newClients.js, services/exports/builders/newClientsExport.js]
 */

const { getDb } = require('../db');

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function queryRows(db, sql, params = []) {
  if (typeof db.queryRows === 'function') return db.queryRows(sql, params);
  return toRows(await db.query(sql, params));
}

function buildWhere(filters) {
  const conditions = [
    'c.referred_by_ctv_id IS NOT NULL',
    'COALESCE(c.is_ctv, false) = false',
    'COALESCE(c.isdeleted, false) = false',
    'c.customer = true',
  ];
  const params = [];
  let idx = 1;

  if (filters.dateFrom) {
    conditions.push(`c.datecreated::date >= $${idx++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`c.datecreated::date <= $${idx++}`);
    params.push(filters.dateTo);
  }

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function listForLob(lob, filters) {
  const db = getDb(lob);
  const { where, params, nextIdx } = buildWhere(filters);
  let idx = nextIdx;

  const rows = await queryRows(db, `
    WITH service_agg AS (
      SELECT
        so.partnerid AS client_id,
        COUNT(DISTINCT so.id) FILTER (WHERE COALESCE(sol.pricetotal, 0) > 0) AS service_count,
        COUNT(DISTINCT sol.id) FILTER (WHERE COALESCE(sol.pricetotal, 0) > 0) AS service_line_count,
        COALESCE(SUM(CASE WHEN COALESCE(sol.pricetotal, 0) > 0 THEN COALESCE(sol.pricetotal, 0) ELSE 0 END), 0) AS service_total,
        COUNT(DISTINCT so.id) FILTER (
          WHERE COALESCE(sol.pricetotal, 0) > 0 AND so.ctv_id IS NULL
        ) AS service_missing_ctv_count
      FROM dbo.saleorders so
      JOIN dbo.saleorderlines sol ON sol.orderid = so.id
      WHERE COALESCE(so.isdeleted, false) = false
        AND COALESCE(sol.isdeleted, false) = false
      GROUP BY so.partnerid
    ),
    paid_agg AS (
      SELECT partnerid AS client_id, COALESCE(SUM(COALESCE(totalpaid, 0)), 0) AS paid_total
      FROM dbo.saleorders
      WHERE COALESCE(isdeleted, false) = false
      GROUP BY partnerid
    ),
    earning_agg AS (
      SELECT
        client_id,
        COUNT(*) FILTER (WHERE COALESCE(status, 'pending') <> 'reversed') AS earnings_count,
        COUNT(DISTINCT service_line_id) FILTER (WHERE service_line_id IS NOT NULL AND COALESCE(status, 'pending') <> 'reversed') AS commissioned_service_line_count,
        COALESCE(SUM(CASE WHEN COALESCE(status, 'pending') <> 'reversed' THEN COALESCE(amount, 0) ELSE 0 END), 0) AS commission_total
      FROM dbo.earnings
      GROUP BY client_id
    )
    SELECT c.id, c.name, c.phone, c.email, c.datecreated AS referred_at,
           c.referred_by_ctv_id AS referring_ctv_id,
           r.name AS referring_ctv_name, r.phone AS referring_ctv_phone,
           COALESCE(sa.service_count, 0) AS service_count,
           COALESCE(sa.service_line_count, 0) AS service_line_count,
           COALESCE(sa.service_total, 0) AS service_total,
           COALESCE(pa.paid_total, 0) AS paid_total,
           COALESCE(ea.earnings_count, 0) AS earnings_count,
           COALESCE(ea.commissioned_service_line_count, 0) AS commissioned_service_line_count,
           COALESCE(ea.commission_total, 0) AS commission_total,
           COALESCE(sa.service_missing_ctv_count, 0) AS service_missing_ctv_count
    FROM dbo.partners c
    LEFT JOIN dbo.partners r ON r.id = c.referred_by_ctv_id
    LEFT JOIN service_agg sa ON sa.client_id = c.id
    LEFT JOIN paid_agg pa ON pa.client_id = c.id
    LEFT JOIN earning_agg ea ON ea.client_id = c.id
    WHERE ${where}
    ORDER BY c.datecreated DESC NULLS LAST
    LIMIT $${idx++} OFFSET $${idx++}
  `, [...params, filters.limit, filters.offset || 0]);

  const countRows = await queryRows(
    db,
    `SELECT COUNT(*) AS count FROM dbo.partners c WHERE ${where}`,
    params
  );

  return {
    rows: rows.map((row) => {
      const serviceCount = toNumber(row.service_count);
      const serviceLineCount = toNumber(row.service_line_count);
      const commissionedLineCount = toNumber(row.commissioned_service_line_count);
      const commissionTotal = toNumber(row.commission_total);
      const missingCommission = serviceLineCount > commissionedLineCount;
      return {
        id: row.id,
        name: row.name || '',
        phone: row.phone || '',
        email: row.email || '',
        referred_at: row.referred_at,
        referring_ctv_id: row.referring_ctv_id,
        referring_ctv_name: row.referring_ctv_name || '',
        referring_ctv_phone: row.referring_ctv_phone || '',
        service_count: serviceCount,
        service_line_count: serviceLineCount,
        service_total: toNumber(row.service_total),
        paid_total: toNumber(row.paid_total),
        earnings_count: toNumber(row.earnings_count),
        commissioned_service_line_count: commissionedLineCount,
        commission_total: commissionTotal,
        service_missing_ctv_count: toNumber(row.service_missing_ctv_count),
        missing_commission: missingCommission,
        commission_status: serviceLineCount === 0 ? 'lead' : missingCommission ? 'missing_commission' : 'commission_recorded',
        lob,
      };
    }),
    count: parseInt(countRows[0]?.count || '0', 10),
  };
}

/**
 * @param {object} filters { lob?: 'all'|'dental'|'cosmetic', dateFrom?, dateTo?, limit?, offset? }
 * @returns {Promise<{ items, totalItems, limit, offset }>}
 */
async function listNewClients(filters = {}) {
  const lob = filters.lob === 'dental' || filters.lob === 'cosmetic' ? filters.lob : 'all';
  const limit = Math.min(Math.max(parseInt(filters.limit || '100', 10) || 100, 1), 100000);
  const offset = Math.max(parseInt(filters.offset || '0', 10) || 0, 0);
  const f = {
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    limit,
    offset,
  };

  const lobs = lob === 'all' ? ['dental', 'cosmetic'] : [lob];
  const parts = await Promise.all(lobs.map((l) => listForLob(l, f)));

  // Clients live in one LOB DB; concat. Dedupe by id defensively, then sort by referral date.
  const byId = new Map();
  parts.flatMap((p) => p.rows).forEach((row) => {
    if (!byId.has(row.id)) byId.set(row.id, row);
  });

  const items = Array.from(byId.values())
    .sort((a, b) => new Date(b.referred_at || 0).getTime() - new Date(a.referred_at || 0).getTime())
    .slice(0, limit);

  return {
    items,
    totalItems: parts.reduce((sum, p) => sum + p.count, 0),
    limit,
    offset,
  };
}

module.exports = { listNewClients };
