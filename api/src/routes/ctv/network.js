/**
 * network.js — hierarchy/network routes.
 * Extracted from the original ctv.js (pure mechanical split; no logic/SQL changes).
 *
 * Routes mounted under /api/ctv (see ctv/index.js).
 *
 * @crossref:endpoint[GET /api/ctv/network, GET /api/ctv/hierarchy]
 * @crossref:domain[ctv]
 * @crossref:uses[api/src/db.js (getDb dual), api/src/services/ctvNetwork.js, api/src/routes/ctv/_shared.js]
 */
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getDb } = require('../../db');
const { buildCtvNetwork, getCtvHierarchy } = require('../../services/ctvNetwork');
const { safeQueryRows } = require('./_shared');

const router = express.Router();

/**
 * GET /api/ctv/network
 * Returns the authenticated CTV's direct recruits and recursive downline (max 5 levels)
 * plus client counts. Privacy: exposes CTV partner profile basics only; no client PII.
 *
 * @note Network `client_count` is profile-based (`partners.referred_by_ctv_id`), distinct from
 * Theo dõi card count on `GET /referrals` (appointments.ctv_id ∪ saleorders.ctv_id).
 */
router.get('/network', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  try {
    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');
    const ctvSql = `
      SELECT id, name, phone, email, active, referred_by_ctv_id, datecreated
      FROM dbo.partners
      WHERE is_ctv = true AND isdeleted = false
    `;
    const [dCtvs, cCtvs, dClientCounts, cClientCounts, dEarnRows, cEarnRows] = await Promise.all([
      safeQueryRows(dentalDb, ctvSql),
      safeQueryRows(cosmeticDb, ctvSql),
      safeQueryRows(dentalDb, `SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id`),
      safeQueryRows(cosmeticDb, `SELECT referred_by_ctv_id AS ctv_id, COUNT(*) AS count FROM dbo.partners WHERE customer = true AND referred_by_ctv_id IS NOT NULL GROUP BY referred_by_ctv_id`),
      safeQueryRows(dentalDb, `SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id`),
      safeQueryRows(cosmeticDb, `SELECT recipient_partner_id AS ctv_id, COALESCE(SUM(amount),0) AS amount FROM dbo.earnings GROUP BY recipient_partner_id`),
    ]);

    return res.json(buildCtvNetwork({
      ctvId: employeeId,
      dentalCtvs: dCtvs,
      cosmeticCtvs: cCtvs,
      dentalClientCounts: dClientCounts,
      cosmeticClientCounts: cClientCounts,
      dentalEarnings: dEarnRows,
      cosmeticEarnings: cEarnRows,
    }));
  } catch (e) {
    console.error('[ctv GET /network] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ctv/hierarchy
 * Shaped for the NEW portal's Network tab (CtvHierarchyPanel → CtvHierarchyResponse):
 * { current, upline[], downline[] (flat), totals }. Delegates to getCtvHierarchy so the
 * cross-DB source fetch AND the downline-earnings / projected-override rollup
 * (commission_level_config-driven) live in ONE place shared with the admin hierarchy view.
 */
router.get('/hierarchy', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  try {
    const result = await getCtvHierarchy(employeeId);
    return res.json(result);
  } catch (e) {
    console.error('[ctv GET /hierarchy] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
