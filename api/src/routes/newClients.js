'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 Express API route: api/src/routes/newClients]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
/**
 * newClients.js — Admin "New Clients" referral revenue/COM audit.
 * Mounted at /api/NewClients and /api/cosmetic/NewClients. The top-level route
 * can read one or both LOB DBs based on ?lob=; the cosmetic mirror forces req.lob
 * so /api/cosmetic/NewClients stays cosmetic-only.
 *
 * @crossref:used-by[website/src/components/commission/NewClientsTab.tsx]
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
const { listNewClients } = require('../services/newClientsQuery');

const router = express.Router();

async function adminOrPerm(employeeId, perm, authLob = 'dental') {
  try {
    const state = await resolveEffectivePermissions(employeeId, authLob);
    const list = (state && state.effectivePermissions) || [];
    return isAdminPermissionState(state) || list.includes('*') || list.includes(perm);
  } catch (e) {
    return false;
  }
}

// GET /api/NewClients?lob=all|dental|cosmetic&date_from=&date_to=&limit=&offset=
// GET /api/cosmetic/NewClients?date_from=&date_to=&limit=&offset=
router.get('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await adminOrPerm(employeeId, 'commissions.view.team', req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  try {
    const result = await listNewClients({
      lob: req.lob || req.query.lob,
      // apiFetch snake-cases query params (dateFrom -> date_from); accept both.
      dateFrom: req.query.date_from || req.query.dateFrom || '',
      dateTo: req.query.date_to || req.query.dateTo || '',
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(result);
  } catch (err) {
    console.error('[NewClients GET /] error:', err);
    return res.status(500).json({ error: 'Failed to fetch new clients' });
  }
});

module.exports = router;
