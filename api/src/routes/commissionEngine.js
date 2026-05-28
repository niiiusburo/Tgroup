const express = require('express');
const { requireAdminScope } = require('../middleware/auth');
const { triggerCommissionEngine } = require('../services/commissionEngine');

const router = express.Router();

/**
 * POST /api/commissionEngine/trigger
 * Manual trigger for commission calculation (for testing, debugging, or event replay).
 * Body: {
 *   serviceLineId: string,
 *   clientId: string,
 *   partnerId: string,
 *   lob: 'dental' | 'cosmetic'
 * }
 */
router.post('/commissionEngine/trigger', requireAdminScope, async (req, res) => {
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