/**
 * @crossref:domain[services-catalog]
 * @crossref:used-in[NK3 Express API route: api/src/routes/saleOrders/getSaleOrderById]
 * @crossref:uses[product-map/domains/services-catalog.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const { query: legacyQuery, getQuery } = require('../../db');
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
