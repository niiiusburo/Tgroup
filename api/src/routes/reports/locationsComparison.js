const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

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

module.exports = router;
