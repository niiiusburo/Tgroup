const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID } = require('./helpers');
const {
  SERVICE_REVENUE_PAYMENT_CONDITION,
  ALLOCATION_TOTALS_CTE,
  CAPPED_ALLOCATED_AMOUNT_SQL,
  buildPaymentRevenueFilter,
  toNumber,
  toInt,
} = require('./revenueRecognition');

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

    const f = buildPaymentRevenueFilter({ dateFrom, dateTo, companyId });
    // Revenue by category via posted payment allocations.
    const revByCat = await query(
      `WITH line_totals AS (
         SELECT orderid, NULLIF(SUM(ABS(COALESCE(pricetotal, 0))), 0) AS line_total
         FROM dbo.saleorderlines
         WHERE COALESCE(isdeleted, false) = false
         GROUP BY orderid
       ),
       allocation_totals AS (
         SELECT payment_id, SUM(allocated_amount) AS total_allocated_for_payment
         FROM dbo.payment_allocations
         GROUP BY payment_id
       )
       SELECT pc.name as category, COUNT(DISTINCT sol.id) as order_count,
              COALESCE(SUM(
                CASE
                  WHEN lt.line_total IS NULL THEN
                    CASE
                      WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
                      THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
                      ELSE pa.allocated_amount
                    END
                  ELSE (
                    CASE
                      WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
                      THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
                      ELSE pa.allocated_amount
                    END
                  ) * ABS(COALESCE(sol.pricetotal, 0)) / lt.line_total
                END
              ),0) as revenue
       FROM dbo.payment_allocations pa
       JOIN dbo.payments p ON p.id = pa.payment_id
       LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
       JOIN dbo.saleorders so ON so.id=pa.invoice_id AND so.isdeleted=false AND so.state='sale'
       JOIN dbo.saleorderlines sol
         ON sol.orderid=so.id
        AND COALESCE(sol.isdeleted, false)=false
        AND COALESCE(sol.isactive, true)=true
       LEFT JOIN line_totals lt ON lt.orderid=so.id
       JOIN dbo.products pr ON pr.id=sol.productid
       JOIN dbo.productcategories pc ON pc.id=pr.categid
       WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.where}
       GROUP BY pc.name ORDER BY revenue DESC`, f.params);

    // Revenue by source via posted payment allocations.
    const revBySource = await query(
      `WITH ${ALLOCATION_TOTALS_CTE}
       SELECT cs.name as source, COUNT(DISTINCT so.id) as order_count,
              COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as revenue
       FROM dbo.customersources cs
       LEFT JOIN dbo.saleorders so ON so.sourceid=cs.id AND so.isdeleted=false AND so.state='sale'
       LEFT JOIN dbo.payment_allocations pa ON pa.invoice_id=so.id
       LEFT JOIN dbo.payments p ON p.id=pa.payment_id
       LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
       WHERE (pa.id IS NULL OR (${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.where}))
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
      categories: cats.map(c => ({ category: c.category, productCount: toInt(c.product_count), avgPrice: toNumber(c.avg_price) })),
      revenueByCategory: revByCat.map(r => ({ category: r.category, orderCount: toInt(r.order_count), revenue: toNumber(r.revenue) })),
      revenueBySource: revBySource.map(r => ({ source: r.source, orderCount: toInt(r.order_count), revenue: toNumber(r.revenue) })),
      popularProducts: popular.map(p => ({ name: p.name, category: p.category, price: toNumber(p.listprice), orderCount: toInt(p.order_count) })),
    }});
  } catch (e) { console.error('reports/services/breakdown:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
