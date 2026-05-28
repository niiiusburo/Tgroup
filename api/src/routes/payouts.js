const { requireAdminScope } = require('../middleware/auth');
const payoutService = require('../services/payoutService');

/**
 * @param {import('express').Router} router
 */
module.exports = function(router) {
  /**
   * POST /api/payouts
   * Admin-only endpoint to create a payout batch from pending earnings.
   * Body: { earning_ids: string[], cycle_name: string }
   */
  router.post('/payouts', requireAdminScope, async (req, res) => {
    try {
      const { earning_ids, cycle_name } = req.body;

      if (!Array.isArray(earning_ids) || earning_ids.length === 0) {
        return res.status(400).json({ error: 'earning_ids must be a non-empty array' });
      }

      if (!cycle_name || typeof cycle_name !== 'string' || cycle_name.trim().length === 0) {
        return res.status(400).json({ error: 'cycle_name is required' });
      }

      const result = await payoutService.createPayoutBatch(
        earning_ids,
        req.user.id,
        cycle_name.trim()
      );

      res.status(201).json(result);
    } catch (err) {
      console.error('Payout creation failed:', err);
      res.status(500).json({ error: 'Failed to create payout' });
    }
  });
}