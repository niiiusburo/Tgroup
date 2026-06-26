const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');

const router = express.Router();

// ── Appointments Summary ─────────────────────────────────────────────

router.post('/appointments/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    let fWhere = f.where;
    let fParams = [...f.params];
    if (investorScope.isInvestor) {
      fParams.push(investorScope.allowedCustomerIds);
      fWhere += ` AND partnerid = ANY($${f.params.length + 1}::uuid[])`;
    }
    const states = await query(
      `SELECT state, COUNT(*) as cnt FROM dbo.appointments WHERE 1=1 ${fWhere} GROUP BY state`, fParams);

    const total = states.reduce((s, r) => s + parseInt(r.cnt), 0);
    const done = parseInt(states.find(s => s.state === 'done')?.cnt || 0);
    const cancelled = parseInt(states.find(s => s.state === 'cancel' || s.state === 'cancelled')?.cnt || 0);

    // Conversion rate: appointments with saleorderid
    const conv = await query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN saleorderid IS NOT NULL THEN 1 ELSE 0 END) as converted
       FROM dbo.appointments WHERE 1=1 ${fWhere}`, fParams);

    // Repeat vs new
    const repeat = await query(
      `SELECT SUM(CASE WHEN cnt > 1 THEN 1 ELSE 0 END) as repeat_cust,
              SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END) as new_cust
       FROM (SELECT partnerid, COUNT(*) as cnt FROM dbo.appointments WHERE 1=1 ${fWhere} GROUP BY partnerid) sub`, fParams);

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

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    let fWhere = f.where;
    let fParams = [...f.params];
    if (investorScope.isInvestor) {
      fParams.push(investorScope.allowedCustomerIds);
      fWhere += ` AND partnerid = ANY($${f.params.length + 1}::uuid[])`;
    }
    const trend = await query(
      `SELECT DATE_TRUNC('week', date) as week, COUNT(*) as total,
              SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM dbo.appointments WHERE 1=1 ${fWhere}
       GROUP BY week ORDER BY week`, fParams);

    // Peak hours
    const hours = await query(
      `SELECT EXTRACT(HOUR FROM date) as hour, COUNT(*) as cnt
       FROM dbo.appointments WHERE 1=1 ${fWhere}
       GROUP BY hour ORDER BY hour`, fParams);

    return res.json({ success: true, data: {
      trend: trend.map(t => ({ week: t.week, total: parseInt(t.total), done: parseInt(t.done), cancelled: parseInt(t.cancelled) })),
      peakHours: hours.map(h => ({ hour: parseInt(h.hour), count: parseInt(h.cnt) })),
    }});
  } catch (e) { console.error('reports/appointments/trend:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
