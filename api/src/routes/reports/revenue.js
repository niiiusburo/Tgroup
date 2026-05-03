const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Revenue Summary ──────────────────────────────────────────────────

router.post('/revenue/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const orders = await query(
      `SELECT state, COUNT(*) as cnt, COALESCE(SUM(amounttotal),0) as total,
              COALESCE(SUM(totalpaid),0) as paid, COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false ${f.where}
       GROUP BY state`, f.params);

    // Payment method breakdown
    const pf = dateCompanyFilter(dateFrom, dateTo, companyId, 'payment_date');
    const methods = await query(
      `SELECT method, status, COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
       FROM dbo.payments WHERE 1=1 ${pf.where}
       GROUP BY method, status`, pf.params);

    return res.json({ success: true, data: { orders: orders.map(o => ({ ...o, cnt: parseInt(o.cnt), total: parseFloat(o.total), paid: parseFloat(o.paid), outstanding: parseFloat(o.outstanding) })), payments: methods.map(m => ({ ...m, cnt: parseInt(m.cnt), total: parseFloat(m.total) })) } });
  } catch (e) { console.error('reports/revenue/summary:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue Trend ────────────────────────────────────────────────────

router.post('/revenue/trend', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const trend = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month,
              COUNT(*) as order_count,
              COALESCE(SUM(amounttotal),0) as invoiced,
              COALESCE(SUM(totalpaid),0) as paid,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false ${f.where}
       GROUP BY month ORDER BY month`, f.params);

    return res.json({ success: true, data: trend.map(t => ({ month: t.month, orderCount: parseInt(t.order_count), invoiced: parseFloat(t.invoiced), paid: parseFloat(t.paid), outstanding: parseFloat(t.outstanding) })) });
  } catch (e) { console.error('reports/revenue/trend:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Location ──────────────────────────────────────────────

router.post('/revenue/by-location', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, null, 'so.datecreated');
    const rows = await query(
      `SELECT c.id, c.name, COUNT(so.id) as order_count,
              COALESCE(SUM(so.amounttotal),0) as invoiced,
              COALESCE(SUM(so.totalpaid),0) as paid,
              COALESCE(SUM(so.residual),0) as outstanding
       FROM dbo.companies c
       LEFT JOIN dbo.saleorders so ON so.companyid=c.id AND so.isdeleted=false ${f.where}
       GROUP BY c.id, c.name ORDER BY paid DESC`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: parseInt(r.order_count), invoiced: parseFloat(r.invoiced), paid: parseFloat(r.paid), outstanding: parseFloat(r.outstanding) })) });
  } catch (e) { console.error('reports/revenue/by-location:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
