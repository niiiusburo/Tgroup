'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/clients]
 * @crossref:uses[clientProjection service, requireInvestorAuth]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requireInvestorAuth } = require('../../middleware/investorAuth');
const { listVisibleClients, getVisibleClient } = require('./services/clientProjection');
const { logInvestorView } = require('./services/audit');

const router = express.Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function parsePagination(query) {
  const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
  let limit = parseInt(query.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  limit = Math.min(Math.max(1, limit), MAX_LIMIT);
  return { offset, limit };
}

/**
 * GET /api/investor/clients
 */
router.get('/', requireInvestorAuth, async (req, res) => {
  try {
    const { offset, limit } = parsePagination(req.query);
    const db = getQuery(req.investor.lob);
    const { totalItems, items } = await listVisibleClients(db, req.investor.id, req.investor.lob, { offset, limit });

    await logInvestorView(req.investor, 'list', req, { rowCount: items.length });

    return res.json({
      success: true,
      offset,
      limit,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('[investorClients] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

/**
 * GET /api/investor/clients/:partnerId
 */
router.get('/:partnerId', requireInvestorAuth, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const db = getQuery(req.investor.lob);
    const client = await getVisibleClient(db, req.investor.id, req.investor.lob, partnerId);

    if (!client) {
      return res.status(404).json({ error: 'Client not found', code: 'U_INVESTOR_NOT_FOUND' });
    }

    await logInvestorView(req.investor, 'detail', req, { resourceId: partnerId });

    return res.json({ success: true, client });
  } catch (err) {
    console.error('[investorClients] detail error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

module.exports = router;