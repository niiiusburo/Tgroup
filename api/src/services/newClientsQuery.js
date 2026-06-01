'use strict';

/**
 * newClientsQuery.js — shared query for the admin "New Clients" surface.
 *
 * A "New Client" is a referral-only lead: a customer a CTV referred who has NOT
 * yet converted to a real (paid) service, so clinic staff can phone them to book.
 *
 * The predicate mirrors the CTV journey's "referred" stage (stage 1):
 *   - referred_by_ctv_id IS NOT NULL (a CTV brought them in)
 *   - they are a customer, not a CTV, not deleted
 *   - NO sale-order line with pricetotal > 0. The "Referral Start" anchor card
 *     (services/referralCard.js) is written with pricetotal = 0, so > 0 cleanly
 *     excludes it while catching any real priced treatment line.
 *   - NO payment with amount > 0 (they have not paid us yet)
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

  // Exclude clients who already have a real (priced) service line.
  conditions.push(`NOT EXISTS (
    SELECT 1 FROM dbo.saleorders so
    JOIN dbo.saleorderlines sol ON sol.orderid = so.id
    WHERE so.partnerid = c.id
      AND COALESCE(sol.isdeleted, false) = false
      AND COALESCE(sol.pricetotal, 0) > 0
  )`);

  // Exclude clients who have already paid us anything.
  conditions.push(`NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.customer_id = c.id AND p.amount > 0
  )`);

  return { where: conditions.join(' AND '), params, nextIdx: idx };
}

async function listForLob(lob, filters) {
  const db = getDb(lob);
  const { where, params, nextIdx } = buildWhere(filters);
  let idx = nextIdx;

  const rows = await queryRows(db, `
    SELECT c.id, c.name, c.phone, c.email, c.datecreated AS referred_at,
           c.referred_by_ctv_id AS referring_ctv_id,
           r.name AS referring_ctv_name, r.phone AS referring_ctv_phone
    FROM dbo.partners c
    LEFT JOIN dbo.partners r ON r.id = c.referred_by_ctv_id
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
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      referred_at: row.referred_at,
      referring_ctv_id: row.referring_ctv_id,
      referring_ctv_name: row.referring_ctv_name || '',
      referring_ctv_phone: row.referring_ctv_phone || '',
      lob,
    })),
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
