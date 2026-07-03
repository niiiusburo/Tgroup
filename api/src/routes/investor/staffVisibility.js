'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[GET /api/investor-visibility mounted in server.js]
 * @crossref:uses[dbo.investor_accounts, dbo.investor_clients, getQuery]
 */
const express = require('express');
const { requirePermission } = require('../../middleware/auth');
const { getQuery } = require('../../db');

const router = express.Router();
const MAX_BATCH = 50;

/**
 * GET /api/investor-visibility
 * Query: partnerId (uuid), optional investorId
 *        OR partnerIds (comma-separated, max 50) for batch list column
 */
router.get('/', requirePermission('customers.set_investor_visibility'), async (req, res) => {
  try {
    const lob = (req.query.lob === 'cosmetic' || req.query.lob === 'dental')
      ? req.query.lob
      : (req.lob || 'dental');
    const db = getQuery(lob);

    const { partnerId, partnerIds, investorId } = req.query;

    if (partnerIds) {
      const ids = String(partnerIds)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_BATCH);

      if (ids.length === 0) {
        return res.status(400).json({ error: 'partnerIds required', code: 'VALIDATION' });
      }

      const investors = await db(
        `SELECT id, investor_name, email, is_active
         FROM dbo.investor_accounts
         WHERE lob = $1 AND is_active = true
         ORDER BY investor_name NULLS LAST, email`,
        [lob]
      );

      if (!investors || investors.length === 0) {
        return res.json({ success: true, batch: {} });
      }

      const visibilityRows = await db(
        `SELECT partner_id, investor_id, is_visible
         FROM dbo.investor_clients
         WHERE lob = $1 AND partner_id = ANY($2::uuid[])`,
        [lob, ids]
      );

      const visMap = new Map();
      for (const row of visibilityRows || []) {
        const key = `${row.partner_id}:${row.investor_id}`;
        visMap.set(key, row.is_visible);
      }

      const batch = {};
      for (const pid of ids) {
        batch[pid] = investors.map((inv) => ({
          investorId: inv.id,
          investorName: inv.investor_name || inv.email,
          isVisible: visMap.get(`${pid}:${inv.id}`) === true,
          isActive: true,
        }));
      }

      return res.json({ success: true, batch });
    }

    if (!partnerId) {
      return res.status(400).json({ error: 'partnerId or partnerIds required', code: 'VALIDATION' });
    }

    let investorFilter = '';
    const params = [lob, partnerId];
    if (investorId) {
      investorFilter = ' AND ia.id = $3';
      params.push(investorId);
    }

    const rows = await db(
      `SELECT ia.id AS investor_id,
              COALESCE(ia.investor_name, ia.email) AS investor_name,
              ia.is_active,
              COALESCE(ic.is_visible, false) AS is_visible
       FROM dbo.investor_accounts ia
       LEFT JOIN dbo.investor_clients ic
         ON ic.investor_id = ia.id
        AND ic.partner_id = $2
        AND ic.lob = $1
       WHERE ia.lob = $1${investorFilter}
       ORDER BY ia.investor_name NULLS LAST, ia.email`,
      params
    );

    const items = (rows || []).map((r) => ({
      investorId: r.investor_id,
      investorName: r.investor_name,
      isVisible: r.is_active ? r.is_visible === true : false,
      isActive: r.is_active,
    }));

    return res.json({ success: true, items });
  } catch (err) {
    console.error('[investorVisibility] GET error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

module.exports = router;