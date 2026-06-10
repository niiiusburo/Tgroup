/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[GET /api/SaleOrders/:id handler: api/src/routes/saleOrders.js; called by website/src/lib/api/saleOrders.ts]
 * @crossref:uses[api/src/db.js (getQuery), api/src/routes/saleOrders/fetchSaleOrderById.js, product-map/domains/services-catalog.yaml]
 */
const { getQuery } = require('../../db');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');

async function getSaleOrderById(req, res) {
  try {
    const q = getQuery(req);
    const { id } = req.params;
    const rows = await fetchSaleOrderById(id, q);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const lines = await q(
      `SELECT
        sol.id,
        sol.orderid,
        sol.pricetotal,
        sol.isdeleted
      FROM saleorderlines sol
      WHERE sol.orderid = $1 AND sol.isdeleted = false`,
      [id],
    );

    return res.json({
      ...rows[0],
      lines,
    });
  } catch (err) {
    console.error('Error fetching sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

module.exports = { getSaleOrderById };
