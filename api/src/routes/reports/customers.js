const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Customers Summary ────────────────────────────────────────────────

router.post('/customers/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    // Total active customers
    const total = await query(`SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false`);

    // New customers in period
    const cf = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const newCust = await query(
      `SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false ${cf.where}`, cf.params);

    // By source (moved to services breakdown — placeholder kept for compatibility)
    const sources = [];

    // By gender
    const gender = await query(
      `SELECT gender, COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false AND gender IS NOT NULL GROUP BY gender`);

    // By city
    const cities = await query(
      `SELECT cityname, COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false AND cityname IS NOT NULL GROUP BY cityname ORDER BY cnt DESC LIMIT 10`);

    // Lifetime value (top spenders)
    const ltv = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.totalpaid),0) as total_paid, COUNT(so.id) as order_count
       FROM dbo.partners p
       LEFT JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale'
       WHERE p.customer=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY total_paid DESC LIMIT 20`);

    // Outstanding balances
    const outstanding = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.residual),0) as outstanding
       FROM dbo.partners p
       JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale' AND so.residual > 0
       WHERE p.customer=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY outstanding DESC LIMIT 20`);

    // Growth trend (new customers per month)
    const growthF = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const growth = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month, COUNT(*) as cnt
       FROM dbo.partners WHERE customer=true AND isdeleted=false ${growthF.where}
       GROUP BY month ORDER BY month`, growthF.params);

    return res.json({ success: true, data: {
      total: parseInt(total[0]?.cnt || 0),
      newInPeriod: parseInt(newCust[0]?.cnt || 0),
      gender: gender.map(g => ({ gender: g.gender || 'Unknown', count: parseInt(g.cnt) })),
      cities: cities.map(c => ({ city: c.cityname, count: parseInt(c.cnt) })),
      topSpenders: ltv.map(l => ({ id: l.id, name: l.name, totalPaid: parseFloat(l.total_paid), orderCount: parseInt(l.order_count) })),
      outstanding: outstanding.map(o => ({ id: o.id, name: o.name, outstanding: parseFloat(o.outstanding) })),
      growth: growth.map(g => ({ month: g.month, count: parseInt(g.cnt) })),
    }});
  } catch (e) { console.error('reports/customers/summary:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
