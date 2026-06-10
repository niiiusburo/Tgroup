/**
 * @crossref:domain[earnings-commissions]
 * @crossref:used-in[NOT mounted in api/src/server.js — manual/admin commission-replay tool (see NOTE below); no frontend client]
 * @crossref:uses[api/src/services/commissionEngine.js (triggerCommissionEngine), api/src/middleware/auth.js (requirePermission), product-map/domains/earnings-commissions.yaml]
 */
const express = require('express');
// NOTE: this router is intentionally NOT mounted in server.js — it is a manual/admin
// commission-replay tool kept for debugging. It previously imported `requireAdminScope`
// (never exported by middleware/auth) and `triggerCommissionEngine` (never exported by the
// service), so requiring this file threw at load. Both are now fixed: the gate uses the real
// `requirePermission('ctv.manage')` factory and the service exports `triggerCommissionEngine`.
const { requirePermission } = require('../middleware/auth');
const { triggerCommissionEngine } = require('../services/commissionEngine');

const router = express.Router();

/**
 * POST /trigger  (only reachable if this router is mounted, e.g. app.use('/api/CommissionEngine', ...))
 * Manual trigger for commission calculation (for testing, debugging, or event replay).
 * Body: {
 *   serviceLineId: string,
 *   clientId: string,
 *   partnerId: string,
 *   lob: 'dental' | 'cosmetic'
 * }
 */
router.post('/trigger', requirePermission('ctv.manage'), async (req, res) => {
  try {
    const { serviceLineId, clientId, partnerId, lob } = req.body;

    if (!serviceLineId || !clientId || !partnerId || !['dental', 'cosmetic'].includes(lob)) {
      return res.status(400).json({ error: 'Missing required fields: serviceLineId, clientId, partnerId, lob' });
    }

    const result = await triggerCommissionEngine(serviceLineId, clientId, partnerId, lob);
    res.status(201).json(result);
  } catch (err) {
    console.error('Commission engine trigger failed:', err);
    res.status(500).json({ error: 'Failed to trigger commission engine' });
  }
});

module.exports = router;