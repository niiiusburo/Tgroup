const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Revenue by Doctor ────────────────────────────────────────────────

router.post('/revenue/by-doctor', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'so.datecreated', 'so.companyid');
    const rows = await query(
      `SELECT p.id, p.name, COUNT(so.id) as order_count,
              COALESCE(SUM(so.amounttotal),0) as invoiced,
              COALESCE(SUM(so.totalpaid),0) as paid
       FROM dbo.partners p
       LEFT JOIN dbo.saleorders so ON so.doctorid=p.id AND so.isdeleted=false AND so.state='sale' ${f.where}
       WHERE p.isdoctor=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY paid DESC LIMIT 100`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: parseInt(r.order_count), invoiced: parseFloat(r.invoiced), paid: parseFloat(r.paid) })) });
  } catch (e) { console.error('reports/revenue/by-doctor:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Category ──────────────────────────────────────────────

router.post('/revenue/by-category', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'so.datecreated');
    const rows = await query(
      `SELECT pc.id, pc.name as category, COUNT(sol.id) as line_count,
              COALESCE(SUM(sol.pricetotal),0) as revenue
       FROM dbo.productcategories pc
       LEFT JOIN dbo.products pr ON pr.categid=pc.id AND pr.active=true
       LEFT JOIN dbo.saleorderlines sol ON sol.productid=pr.id
       LEFT JOIN dbo.saleorders so ON so.id=sol.orderid AND so.isdeleted=false AND so.state='sale' ${f.where}
       WHERE pc.active=true
       GROUP BY pc.id, pc.name ORDER BY revenue DESC LIMIT 100`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, lineCount: parseInt(r.line_count), revenue: parseFloat(r.revenue) })) });
  } catch (e) { console.error('reports/revenue/by-category:', e); return err(res, 500, 'Internal error'); }
});


// ── Payment Plans ────────────────────────────────────────────────────

router.post('/revenue/payment-plans', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'mp.created_at', 'mp.company_id');
    const plans = await query(
      `SELECT mp.status, COUNT(*) as cnt, COALESCE(SUM(mp.total_amount),0) as total,
              COALESCE(SUM(mp.down_payment),0) as down_payment
       FROM dbo.monthlyplans mp WHERE 1=1 ${f.where}
       GROUP BY mp.status`, f.params);

    const instConds = ['pi.due_date::date >= $1', 'pi.due_date::date <= $2'];
    const instParams = [dateFrom, dateTo];
    if (companyId) {
      instConds.push('mp.company_id = $3');
      instParams.push(companyId);
    }
    const installments = await query(
      `SELECT pi.status, COUNT(*) as cnt, COALESCE(SUM(pi.amount),0) as total,
              COALESCE(SUM(pi.paid_amount),0) as paid
       FROM dbo.planinstallments pi
       JOIN dbo.monthlyplans mp ON mp.id=pi.plan_id
       WHERE ${instConds.join(' AND ')}
       GROUP BY pi.status`,
      instParams);

    return res.json({ success: true, data: {
      plans: plans.map(p => ({ status: p.status, count: parseInt(p.cnt), total: parseFloat(p.total), downPayment: parseFloat(p.down_payment) })),
      installments: installments.map(i => ({ status: i.status, count: parseInt(i.cnt), total: parseFloat(i.total), paid: parseFloat(i.paid) })),
    }});
  } catch (e) { console.error('reports/revenue/payment-plans:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
