'use strict';

/**
 * earnings.js — Admin earnings ledger for CTV/MLM commissions.
 * Mounted at /api/Earnings. Reads BOTH dental and cosmetic DBs in the API layer;
 * never performs cross-DB SQL joins.
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
const { getDb } = require('../db');

const router = express.Router();

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

async function queryRows(db, sql, params = []) {
  if (typeof db.queryRows === 'function') return db.queryRows(sql, params);
  return toRows(await db.query(sql, params));
}

function parseLimitOffset(query) {
  const limit = Math.min(Math.max(parseInt(query.limit || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
  return { limit, offset };
}

async function adminOrPerm(employeeId, perm, authLob = 'dental') {
  try {
    const state = await resolveEffectivePermissions(employeeId, authLob);
    const list = (state && state.effectivePermissions) || [];
    return isAdminPermissionState(state) || list.includes('*') || list.includes(perm);
  } catch (e) {
    return false;
  }
}

async function listForLob(lob, filters) {
  const db = getDb(lob);
  const conditions = ['1=1'];
  const params = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`e.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.ctvId) {
    conditions.push(`e.recipient_partner_id = $${idx++}`);
    params.push(filters.ctvId);
  }
  if (filters.clientId) {
    conditions.push(`e.client_id = $${idx++}`);
    params.push(filters.clientId);
  }
  if (filters.dateFrom) {
    conditions.push(`COALESCE(e.earned_at, e.created_at) >= $${idx++}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`COALESCE(e.earned_at, e.created_at) <= $${idx++}`);
    params.push(filters.dateTo);
  }

  const where = conditions.join(' AND ');
  const rows = await queryRows(db, `
    SELECT
      e.id,
      e.client_id,
      e.recipient_partner_id,
      e.payment_id,
      e.service_line_id,
      e.source,
      e.level,
      e.amount,
      e.status,
      e.payout_id,
      e.earned_at,
      e.created_at,
      client.name AS client_name,
      recipient.name AS recipient_name,
      sol.productid AS product_id,
      product.name AS product_name
    FROM dbo.earnings e
    LEFT JOIN dbo.partners client ON client.id = e.client_id
    LEFT JOIN dbo.partners recipient ON recipient.id = e.recipient_partner_id
    LEFT JOIN dbo.saleorderlines sol ON sol.id = e.service_line_id
    LEFT JOIN dbo.products product ON product.id = sol.productid
    WHERE ${where}
    ORDER BY COALESCE(e.earned_at, e.created_at) DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `, [...params, filters.limit, filters.offset]);

  const countRows = await queryRows(db, `SELECT COUNT(*) AS count, COALESCE(SUM(e.amount), 0) AS total FROM dbo.earnings e WHERE ${where}`, params);
  return {
    rows: rows.map((row) => ({ ...row, lob, amount: parseFloat(row.amount || 0) })),
    count: parseInt(countRows[0]?.count || '0', 10),
    total: parseFloat(countRows[0]?.total || '0'),
  };
}

router.get('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.view.team', req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  try {
    const { limit, offset } = parseLimitOffset(req.query);
    const lob = req.query.lob === 'dental' || req.query.lob === 'cosmetic' ? req.query.lob : 'all';
    const filters = {
      limit,
      offset,
      status: req.query.status || '',
      ctvId: req.query.ctvId || req.query.recipientPartnerId || '',
      clientId: req.query.clientId || '',
      dateFrom: req.query.dateFrom || '',
      dateTo: req.query.dateTo || '',
    };

    const lobs = lob === 'all' ? ['dental', 'cosmetic'] : [lob];
    const parts = await Promise.all(lobs.map((l) => listForLob(l, filters)));
    const items = parts.flatMap((p) => p.rows)
      .sort((a, b) => new Date(b.earned_at || b.created_at || 0) - new Date(a.earned_at || a.created_at || 0))
      .slice(0, limit);

    return res.json({
      items,
      totalItems: parts.reduce((sum, p) => sum + p.count, 0),
      totals: {
        amount: Math.round(parts.reduce((sum, p) => sum + p.total, 0)),
        byLob: Object.fromEntries(parts.map((p, i) => [lobs[i], Math.round(p.total)])),
      },
      offset,
      limit,
    });
  } catch (err) {
    console.error('[Earnings GET /] error:', err);
    return res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

module.exports = router;
