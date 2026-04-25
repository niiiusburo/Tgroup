const { query } = require('../../db');
const { fetchSaleOrderById } = require('./fetchSaleOrderById');

async function getSaleOrderById(req, res) {
  try {
    const { id } = req.params;
    const rows = await fetchSaleOrderById(id);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const lines = await query(
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
