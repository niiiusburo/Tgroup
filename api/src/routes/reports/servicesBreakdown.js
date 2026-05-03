const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Services Breakdown ───────────────────────────────────────────────

router.post('/services/breakdown', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    // Products by category
    const cats = await query(
      `SELECT pc.name as category, COUNT(p.id) as product_count,
              COALESCE(AVG(p.listprice),0) as avg_price
       FROM dbo.productcategories pc
       LEFT JOIN dbo.products p ON p.categid=pc.id AND p.active=true
       WHERE pc.active=true
       GROUP BY pc.name ORDER BY product_count DESC`);

    // Revenue by category via sale order lines
    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'so.datecreated', 'so.companyid');
    const revByCat = await query(
      `SELECT pc.name as category, COUNT(sol.id) as order_count,
              COALESCE(SUM(sol.pricetotal),0) as revenue
       FROM dbo.productcategories pc
       JOIN dbo.products p ON p.categid=pc.id
       JOIN dbo.saleorderlines sol ON sol.productid=p.id
       JOIN dbo.saleorders so ON so.id=sol.orderid AND so.isdeleted=false AND so.state='sale' ${f.where}
       GROUP BY pc.name ORDER BY revenue DESC`, f.params);

    // Revenue by source via sale orders
    const revBySource = await query(
      `SELECT cs.name as source, COUNT(so.id) as order_count,
              COALESCE(SUM(so.amounttotal),0) as revenue
       FROM dbo.customersources cs
       LEFT JOIN dbo.saleorders so ON so.sourceid=cs.id AND so.isdeleted=false AND so.state='sale' ${f.where}
       GROUP BY cs.name ORDER BY revenue DESC`, f.params);

    // Popular products
    const popular = await query(
      `SELECT p.name, pc.name as category, p.listprice, COUNT(sol.id) as order_count
       FROM dbo.products p
       LEFT JOIN dbo.productcategories pc ON pc.id=p.categid
       LEFT JOIN dbo.saleorderlines sol ON sol.productid=p.id
       WHERE p.active=true
       GROUP BY p.name, pc.name, p.listprice
       ORDER BY order_count DESC LIMIT 20`);

    return res.json({ success: true, data: {
      categories: cats.map(c => ({ category: c.category, productCount: parseInt(c.product_count), avgPrice: parseFloat(c.avg_price) })),
      revenueByCategory: revByCat.map(r => ({ category: r.category, orderCount: parseInt(r.order_count), revenue: parseFloat(r.revenue) })),
      revenueBySource: revBySource.map(r => ({ source: r.source, orderCount: parseInt(r.order_count), revenue: parseFloat(r.revenue) })),
      popularProducts: popular.map(p => ({ name: p.name, category: p.category, price: parseFloat(p.listprice || 0), orderCount: parseInt(p.order_count) })),
    }});
  } catch (e) { console.error('reports/services/breakdown:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
