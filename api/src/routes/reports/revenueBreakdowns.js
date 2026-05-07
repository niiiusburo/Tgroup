const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, resolveReportCompanyScope, dateCompanyScopeFilter } = require('./helpers');

const router = express.Router();

// ── Revenue by Doctor ────────────────────────────────────────────────

router.post('/revenue/by-doctor', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'so.datecreated', 'so.companyid');
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

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'so.datecreated');
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

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'mp.created_at', 'mp.company_id');
    const plans = await query(
      `SELECT mp.status, COUNT(*) as cnt, COALESCE(SUM(mp.total_amount),0) as total,
              COALESCE(SUM(mp.down_payment),0) as down_payment
       FROM dbo.monthlyplans mp WHERE 1=1 ${f.where}
       GROUP BY mp.status`, f.params);

    const instConds = [];
    const instParams = [];
    if (dateFrom) {
      instParams.push(dateFrom);
      instConds.push(`pi.due_date::date >= $${instParams.length}`);
    }
    if (dateTo) {
      instParams.push(dateTo);
      instConds.push(`pi.due_date::date <= $${instParams.length}`);
    }
    if (!scope.all) {
      instParams.push(scope.companyIds);
      instConds.push(`mp.company_id = ANY($${instParams.length}::uuid[])`);
    }
    const installments = await query(
      `SELECT pi.status, COUNT(*) as cnt, COALESCE(SUM(pi.amount),0) as total,
	              COALESCE(SUM(pi.paid_amount),0) as paid
	       FROM dbo.planinstallments pi
	       JOIN dbo.monthlyplans mp ON mp.id=pi.plan_id
	       WHERE ${instConds.length ? instConds.join(' AND ') : '1=1'}
	       GROUP BY pi.status`,
      instParams);

    return res.json({ success: true, data: {
      plans: plans.map(p => ({ status: p.status, count: parseInt(p.cnt), total: parseFloat(p.total), downPayment: parseFloat(p.down_payment) })),
      installments: installments.map(i => ({ status: i.status, count: parseInt(i.cnt), total: parseFloat(i.total), paid: parseFloat(i.paid) })),
    }});
  } catch (e) { console.error('reports/revenue/payment-plans:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Source + Branch ───────────────────────────────────────

router.post('/revenue/by-source-branch', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'p.payment_date', 'c.id');
    const rows = await query(
      `SELECT c.id, c.name AS branch, p.method,
              COUNT(*) AS cnt, COALESCE(SUM(p.amount),0) AS total
       FROM dbo.payments p
       JOIN dbo.partners cust ON cust.id = p.customer_id
       JOIN dbo.companies c ON c.id = cust.companyid
       WHERE p.status = 'posted' ${f.where}
       GROUP BY c.id, c.name, p.method
       ORDER BY c.name, p.method`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, cnt: parseInt(r.cnt), total: parseFloat(r.total) })) });
  } catch (e) { console.error('reports/revenue/by-source-branch:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue Daily Branch Breakdown ───────────────────────────────────

router.post('/revenue/daily-branch', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'so.datecreated', 'so.companyid');
    const rows = await query(
      `SELECT DATE_TRUNC('day', so.datecreated)::date AS day, c.id, c.name AS branch,
              COUNT(so.id) AS order_count,
              COALESCE(SUM(so.amounttotal),0) AS invoiced,
              COALESCE(SUM(so.totalpaid),0) AS paid,
              COALESCE(SUM(so.residual),0) AS outstanding
       FROM dbo.saleorders so
       JOIN dbo.companies c ON c.id = so.companyid
       WHERE so.isdeleted = false AND so.state = 'sale' ${f.where}
       GROUP BY day, c.id, c.name
       ORDER BY day DESC, branch`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: parseInt(r.order_count), invoiced: parseFloat(r.invoiced), paid: parseFloat(r.paid), outstanding: parseFloat(r.outstanding) })) });
  } catch (e) { console.error('reports/revenue/daily-branch:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Person / Role / Date ──────────────────────────────────

router.post('/revenue/by-person', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId, role } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'so.datecreated', 'so.companyid');
    const roleConds = [];
    if (role === 'doctor') roleConds.push("p.isdoctor = true");
    if (role === 'assistant') roleConds.push("p.isassistant = true");
    if (role === 'receptionist') roleConds.push("p.isreceptionist = true");
    const roleWhere = roleConds.length ? 'AND ' + roleConds.join(' AND ') : '';

    const rows = await query(
      `SELECT p.id, p.name,
              CASE WHEN p.isdoctor THEN 'doctor' WHEN p.isassistant THEN 'assistant' WHEN p.isreceptionist THEN 'receptionist' ELSE 'other' END AS role,
              DATE_TRUNC('day', so.datecreated)::date AS day,
              COUNT(so.id) AS order_count,
              COALESCE(SUM(so.amounttotal),0) AS invoiced,
              COALESCE(SUM(so.totalpaid),0) AS paid
       FROM dbo.partners p
       LEFT JOIN dbo.saleorders so ON so.doctorid = p.id AND so.isdeleted = false AND so.state = 'sale' ${f.where}
       WHERE p.employee = true AND p.isdeleted = false ${roleWhere}
       GROUP BY p.id, p.name, role, day
       ORDER BY day DESC, paid DESC LIMIT 2000`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: parseInt(r.order_count), invoiced: parseFloat(r.invoiced), paid: parseFloat(r.paid) })) });
  } catch (e) { console.error('reports/revenue/by-person:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Service ───────────────────────────────────────────────

router.post('/revenue/by-service', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = dateCompanyScopeFilter(dateFrom, dateTo, scope, 'so.datecreated');
    const rows = await query(
      `SELECT pr.id, pr.name AS service, pc.name AS category,
              COUNT(sol.id) AS quantity,
              COALESCE(SUM(sol.pricetotal),0) AS revenue,
              COALESCE(SUM(so.totalpaid * sol.pricetotal / NULLIF(so.amounttotal,0)),0) AS paid_revenue
       FROM dbo.products pr
       JOIN dbo.productcategories pc ON pc.id = pr.categid
       LEFT JOIN dbo.saleorderlines sol ON sol.productid = pr.id AND sol.isdeleted = false
       LEFT JOIN dbo.saleorders so ON so.id = sol.orderid AND so.isdeleted = false AND so.state = 'sale' ${f.where}
       WHERE pr.active = true AND pr.type = 'service'
       GROUP BY pr.id, pr.name, pc.name
       ORDER BY revenue DESC LIMIT 200`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, quantity: parseInt(r.quantity), revenue: parseFloat(r.revenue), paidRevenue: parseFloat(r.paid_revenue) })) });
  } catch (e) { console.error('reports/revenue/by-service:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
