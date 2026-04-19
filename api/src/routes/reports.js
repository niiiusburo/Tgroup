const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { getVietnamToday } = require('../lib/dateUtils');

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────

function err(res, status, msg) {
  return res.status(status).json({ success: false, error: msg });
}

function validDate(s) {
  if (s === undefined || s === null) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());
}

function validUUID(s) {
  if (s === undefined || s === null) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Builds WHERE clause fragments for date range + company filtering.
 * Returns { where: string, params: any[], idx: number }
 * `idx` is the next param index after the ones used.
 */
function dateCompanyFilter(dateFrom, dateTo, companyId, dateCol = 'datecreated', companyCol = 'companyid') {
  const conds = [];
  const params = [];
  let idx = 1;
  if (dateFrom) { conds.push(`${dateCol}::date >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conds.push(`${dateCol}::date <= $${idx}`); params.push(dateTo); idx++; }
  if (companyId) { conds.push(`${companyCol} = $${idx}`); params.push(companyId); idx++; }
  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params, idx };
}

// ── Dashboard Summary ────────────────────────────────────────────────

router.post('/dashboard', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    // Current period: revenue from saleorders
    const so = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const rev = await query(
      `SELECT COALESCE(SUM(amounttotal),0) as invoiced,
              COALESCE(SUM(totalpaid),0) as paid,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false AND state='sale' ${so.where}`, so.params);

    // Appointments
    const af = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    const appt = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM dbo.appointments WHERE 1=1 ${af.where}`, af.params);

    // New customers
    const cf = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    const cust = await query(
      `SELECT COUNT(*) as new_customers FROM dbo.partners WHERE customer=true AND isdeleted=false ${cf.where}`, cf.params);

    // Previous period for comparison
    const days = dateFrom && dateTo ? Math.ceil((new Date(dateTo + 'T00:00:00Z') - new Date(dateFrom + 'T00:00:00Z')) / 86400000) : 30;
    const prevTo = dateFrom || dateTo || getVietnamToday();
    const prevFromDate = new Date(new Date(prevTo + 'T00:00:00Z') - days * 86400000);
    const prevFrom = prevFromDate.toISOString().split('T')[0];

    const pso = dateCompanyFilter(prevFrom, prevTo, companyId, 'datecreated');
    const prevRev = await query(
      `SELECT COALESCE(SUM(totalpaid),0) as paid FROM dbo.saleorders WHERE isdeleted=false AND state='sale' ${pso.where}`, pso.params);

    const curPaid = parseFloat(rev[0]?.paid || 0);
    const prevPaid = parseFloat(prevRev[0]?.paid || 0);
    const revChange = prevPaid > 0 ? ((curPaid - prevPaid) / prevPaid * 100).toFixed(1) : null;

    const curAppt = parseInt(appt[0]?.total || 0);
    const paf = dateCompanyFilter(prevFrom, prevTo, companyId, 'date');
    const prevAppt = await query(`SELECT COUNT(*) as total FROM dbo.appointments WHERE 1=1 ${paf.where}`, paf.params);
    const prevApptCount = parseInt(prevAppt[0]?.total || 0);
    const apptChange = prevApptCount > 0 ? ((curAppt - prevApptCount) / prevApptCount * 100).toFixed(1) : null;

    // 12-month revenue trend
    const trend = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month,
              COALESCE(SUM(totalpaid),0) as revenue,
              COALESCE(SUM(amounttotal),0) as invoiced
       FROM dbo.saleorders WHERE isdeleted=false AND state='sale'
       AND datecreated >= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '12 months'
       ${companyId ? 'AND companyid = $1' : ''}
       GROUP BY month ORDER BY month`,
      companyId ? [companyId] : []);

    return res.json({
      success: true,
      data: {
        revenue: { invoiced: parseFloat(rev[0]?.invoiced || 0), paid: curPaid, outstanding: parseFloat(rev[0]?.outstanding || 0), change: revChange ? parseFloat(revChange) : null },
        appointments: { total: curAppt, done: parseInt(appt[0]?.done || 0), cancelled: parseInt(appt[0]?.cancelled || 0), change: apptChange ? parseFloat(apptChange) : null },
        customers: { newCustomers: parseInt(cust[0]?.new_customers || 0) },
        trend: trend.map(t => ({ month: t.month, revenue: parseFloat(t.revenue), invoiced: parseFloat(t.invoiced) })),
      }
    });
  } catch (e) { console.error('reports/dashboard:', e); return err(res, 500, 'Internal error'); }
});

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

// ── Appointments Summary ─────────────────────────────────────────────

router.post('/appointments/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    const states = await query(
      `SELECT state, COUNT(*) as cnt FROM dbo.appointments WHERE 1=1 ${f.where} GROUP BY state`, f.params);

    const total = states.reduce((s, r) => s + parseInt(r.cnt), 0);
    const done = parseInt(states.find(s => s.state === 'done')?.cnt || 0);
    const cancelled = parseInt(states.find(s => s.state === 'cancel' || s.state === 'cancelled')?.cnt || 0);

    // Conversion rate: appointments with saleorderid
    const conv = await query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN saleorderid IS NOT NULL THEN 1 ELSE 0 END) as converted
       FROM dbo.appointments WHERE 1=1 ${f.where}`, f.params);

    // Repeat vs new
    const repeat = await query(
      `SELECT SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) as repeat_cust,
              SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) as new_cust
       FROM (SELECT partnerid, COUNT(*) as cnt FROM dbo.appointments WHERE 1=1 ${f.where} GROUP BY partnerid) sub`, f.params);

    return res.json({ success: true, data: {
      total, done, cancelled,
      completionRate: total > 0 ? (done / total * 100).toFixed(1) : '0',
      cancellationRate: total > 0 ? (cancelled / total * 100).toFixed(1) : '0',
      conversionRate: parseInt(conv[0]?.total || 0) > 0 ? (parseInt(conv[0]?.converted || 0) / parseInt(conv[0]?.total || 0) * 100).toFixed(1) : '0',
      states: states.map(s => ({ state: s.state, count: parseInt(s.cnt) })),
      repeatCustomers: parseInt(repeat[0]?.repeat_cust || 0),
      newCustomers: parseInt(repeat[0]?.new_cust || 0),
    }});
  } catch (e) { console.error('reports/appointments/summary:', e); return err(res, 500, 'Internal error'); }
});

// ── Appointments Trend ───────────────────────────────────────────────

router.post('/appointments/trend', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    const trend = await query(
      `SELECT DATE_TRUNC('week', date) as week, COUNT(*) as total,
              SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM dbo.appointments WHERE 1=1 ${f.where}
       GROUP BY week ORDER BY week`, f.params);

    // Peak hours
    const hours = await query(
      `SELECT EXTRACT(HOUR FROM date) as hour, COUNT(*) as cnt
       FROM dbo.appointments WHERE 1=1 ${f.where}
       GROUP BY hour ORDER BY hour`, f.params);

    return res.json({ success: true, data: {
      trend: trend.map(t => ({ week: t.week, total: parseInt(t.total), done: parseInt(t.done), cancelled: parseInt(t.cancelled) })),
      peakHours: hours.map(h => ({ hour: parseInt(h.hour), count: parseInt(h.cnt) })),
    }});
  } catch (e) { console.error('reports/appointments/trend:', e); return err(res, 500, 'Internal error'); }
});

// ── Doctors Performance ──────────────────────────────────────────────

router.post('/doctors/performance', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'a.date');
    const rows = await query(
      `SELECT p.id, p.name, COUNT(a.id) as total_appointments,
              SUM(CASE WHEN a.state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN a.state='cancel' OR a.state='cancelled' THEN 1 ELSE 0 END) as cancelled,
              COALESCE(SUM(so.totalpaid),0) as revenue
       FROM dbo.partners p
       LEFT JOIN dbo.appointments a ON a.doctorid=p.id ${f.where}
       LEFT JOIN dbo.saleorders so ON a.saleorderid=so.id AND so.isdeleted=false
       WHERE p.isdoctor=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY done DESC LIMIT 100`, f.params);

    return res.json({ success: true, data: rows.map(r => ({
      ...r, totalAppointments: parseInt(r.total_appointments), done: parseInt(r.done),
      cancelled: parseInt(r.cancelled), revenue: parseFloat(r.revenue),
    }))});
  } catch (e) { console.error('reports/doctors/performance:', e); return err(res, 500, 'Internal error'); }
});

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

// ── Employees Overview ───────────────────────────────────────────────

router.post('/employees/overview', requirePermission('reports.view'), async (req, res) => {
  try {
    const { companyId } = req.body || {};
    if (!validUUID(companyId)) return err(res, 400, 'Invalid params');

    const companyFilter = companyId ? 'AND companyid = $1' : '';
    const params = companyId ? [companyId] : [];

    const roles = await query(
      `SELECT
         SUM(CASE WHEN isdoctor THEN 1 ELSE 0 END) as doctors,
         SUM(CASE WHEN isassistant THEN 1 ELSE 0 END) as assistants,
         SUM(CASE WHEN isreceptionist THEN 1 ELSE 0 END) as receptionists,
         COUNT(*) as total
       FROM dbo.partners WHERE employee=true AND isdeleted=false ${companyFilter}`, params);

    const byLocation = await query(
      `SELECT c.name as location, COUNT(e.id) as cnt,
            SUM(CASE WHEN e.isdoctor THEN 1 ELSE 0 END) as doctors,
            SUM(CASE WHEN e.isassistant THEN 1 ELSE 0 END) as assistants
       FROM dbo.companies c
       LEFT JOIN dbo.partners e ON e.companyid=c.id AND e.employee=true AND e.isdeleted=false
       GROUP BY c.name ORDER BY cnt DESC`);

    const list = await query(
      `SELECT p.id, p.name, p.isdoctor, p.isassistant, p.isreceptionist,
              p.jobtitle, c.name as location, p.startworkdate, p.active
       FROM dbo.partners p
       LEFT JOIN dbo.companies c ON c.id=p.companyid
       WHERE p.employee=true AND p.isdeleted=false ${companyFilter}
       ORDER BY p.name`, params);

    return res.json({ success: true, data: {
      roles: { doctors: parseInt(roles[0]?.doctors || 0), assistants: parseInt(roles[0]?.assistants || 0), receptionists: parseInt(roles[0]?.receptionists || 0), total: parseInt(roles[0]?.total || 0) },
      byLocation: byLocation.map(l => ({ location: l.location, count: parseInt(l.cnt), doctors: parseInt(l.doctors), assistants: parseInt(l.assistants) })),
      employees: list.map(e => ({ ...e, isdoctor: !!e.isdoctor, isassistant: !!e.isassistant, isreceptionist: !!e.isreceptionist, active: !!e.active })),
    }});
  } catch (e) { console.error('reports/employees/overview:', e); return err(res, 500, 'Internal error'); }
});

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

// ── Locations Comparison ─────────────────────────────────────────────

router.post('/locations/comparison', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo)) return err(res, 400, 'Invalid params');

    const af = dateCompanyFilter(dateFrom, dateTo, null, 'date');
    // Offset sf params by af.idx so $N is correct in combined query
    const sfConds = [];
    const sfParams = [...af.params];
    let sfIdx = af.idx;
    if (dateFrom) { sfConds.push(`datecreated::date >= $${sfIdx}`); sfParams.push(dateFrom); sfIdx++; }
    if (dateTo) { sfConds.push(`datecreated::date <= $${sfIdx}`); sfParams.push(dateTo); sfIdx++; }
    const sfWhere = sfConds.length ? 'AND ' + sfConds.join(' AND ') : '';

    const locations = await query(
      `SELECT c.id, c.name, c.active,
              COALESCE(appt.cnt, 0) as appointment_count,
              COALESCE(appt.done, 0) as done_count,
              COALESCE(so.revenue, 0) as revenue,
              COALESCE(so.order_count, 0) as order_count,
              COALESCE(emp.cnt, 0) as employee_count
       FROM dbo.companies c
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt, SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done FROM dbo.appointments WHERE 1=1 ${af.where} GROUP BY companyid) appt ON appt.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as order_count, COALESCE(SUM(totalpaid),0) as revenue FROM dbo.saleorders WHERE isdeleted=false AND state='sale' ${sfWhere} GROUP BY companyid) so ON so.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt FROM dbo.partners WHERE employee=true AND isdeleted=false GROUP BY companyid) emp ON emp.companyid=c.id
       ORDER BY revenue DESC`, sfParams);

    // Location growth trend
    const trend = await query(
      `SELECT c.name, DATE_TRUNC('month', a.date) as month, COUNT(*) as cnt
       FROM dbo.companies c
       JOIN dbo.appointments a ON a.companyid=c.id AND a.date::date >= $1 AND a.date::date <= $2
       GROUP BY c.name, month ORDER BY c.name, month`, [dateFrom, dateTo]);

    return res.json({ success: true, data: {
      locations: locations.map(l => ({ ...l, appointmentCount: parseInt(l.appointment_count), doneCount: parseInt(l.done_count), revenue: parseFloat(l.revenue), orderCount: parseInt(l.order_count), employeeCount: parseInt(l.employee_count) })),
      trend: trend.map(t => ({ location: t.name, month: t.month, count: parseInt(t.cnt) })),
    }});
  } catch (e) { console.error('reports/locations/comparison:', e); return err(res, 500, 'Internal error'); }
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
