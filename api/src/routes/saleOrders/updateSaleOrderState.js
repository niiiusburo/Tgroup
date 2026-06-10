/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[PATCH /api/SaleOrders/:id/state handler: api/src/routes/saleOrders.js; called by website/src/lib/api/saleOrders.ts (updateSaleOrderState)]
 * @crossref:uses[api/src/db.js (getQuery), api/src/routes/saleOrders/fetchSaleOrderById.js, saleorder_state_logs audit table, product-map/domains/services-catalog.yaml]
 */
const crypto = require('crypto');
const { getQuery } = require('../../db');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');

async function updateSaleOrderState(req, res) {
  try {
    const q = getQuery(req);
    const { id } = req.params;
    const { state } = req.body;
    const changedBy = req.user?.employeeId || req.user?.id || null;

    const validStates = ['sale', 'done', 'cancel', 'draft'];
    if (!state || !validStates.includes(state)) {
      return res.status(400).json({ error: `Invalid state. Must be one of: ${validStates.join(', ')}` });
    }

    const oldRows = await q(
      `SELECT state FROM saleorders WHERE id = $1 AND isdeleted = false`,
      [id],
    );
    if (!oldRows || oldRows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const oldState = oldRows[0].state;
    await q(
      `UPDATE saleorders SET state = $1 WHERE id = $2 AND isdeleted = false RETURNING id, state`,
      [state, id],
    );

    try {
      await q(
        `INSERT INTO saleorder_state_logs (id, saleorder_id, old_state, new_state, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))`,
        [crypto.randomUUID(), id, oldState, state, changedBy],
      );
    } catch (logErr) {
      console.error('Failed to write saleorder_state_logs:', logErr);
    }

    const rows = await fetchSaleOrderById(id, q);
    return res.json(rows[0]);
  } catch (err) {
    console.error('[PATCH /SaleOrders/:id/state] Unhandled error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = { updateSaleOrderState };
