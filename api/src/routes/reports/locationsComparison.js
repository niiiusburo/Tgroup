/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[POST /api/Reports/locations/comparison: mounted via api/src/routes/reports.js; called by website/src/hooks/useReportData.ts]
 * @crossref:uses[api/src/db.js, api/src/middleware/auth.js, api/src/routes/reports/helpers.js, api/src/services/reports/canonicalRevenue.js (getCanonicalRevenueByLocation), product-map/domains/reports-analytics.yaml]
 */
const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter, resolveReportCompanyScope } = require('./helpers');
const { getCanonicalRevenueByLocation } = require('../../services/reports/canonicalRevenue');

const router = express.Router();

// ── Locations Comparison ─────────────────────────────────────────────

router.post('/locations/comparison', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');
    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const params = [];
    let idx = 1;
    const af = dateCompanyFilter(dateFrom, dateTo, scope.companyIds, 'date', 'companyid', idx);
    params.push(...af.params);
    idx = af.idx;
    const soF = dateCompanyFilter(dateFrom, dateTo, scope.companyIds, 'datecreated', 'companyid', idx);
    params.push(...soF.params);
    idx = soF.idx;
    const empF = dateCompanyFilter(undefined, undefined, scope.companyIds, 'datecreated', 'companyid', idx);
    params.push(...empF.params);
    idx = empF.idx;
    const locF = dateCompanyFilter(undefined, undefined, scope.companyIds, 'c.datecreated', 'c.id', idx);
    params.push(...locF.params);

    const locations = await query(
      `SELECT c.id, c.name, c.active,
              COALESCE(appt.cnt, 0) as appointment_count,
              COALESCE(appt.done, 0) as done_count,
              COALESCE(so.order_count, 0) as order_count,
              COALESCE(emp.cnt, 0) as employee_count
       FROM dbo.companies c
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt, SUM(CASE WHEN state IN ('done','completed') THEN 1 ELSE 0 END) as done FROM dbo.appointments WHERE 1=1 ${af.where} GROUP BY companyid) appt ON appt.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as order_count FROM dbo.saleorders WHERE isdeleted=false ${soF.where} GROUP BY companyid) so ON so.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt FROM dbo.partners WHERE employee=true AND isdeleted=false ${empF.where} GROUP BY companyid) emp ON emp.companyid=c.id
       WHERE 1=1 ${locF.where}`, params);

    // Get canonical revenue by location and merge into locations
    const revenueData = await getCanonicalRevenueByLocation({ dateFrom, dateTo, companyIds: scope.companyIds });
    const revenueMap = new Map(revenueData.map(r => [r.companyId, r.revenue]));

    // Inject revenue into each location and sort by revenue DESC
    locations.forEach(loc => {
      loc.revenue = revenueMap.get(loc.id) || 0;
    });
    locations.sort((a, b) => b.revenue - a.revenue);

    // Location growth trend
    const trendF = dateCompanyFilter(dateFrom, dateTo, scope.companyIds, 'a.date', 'a.companyid');
    const trend = await query(
      `SELECT c.name, DATE_TRUNC('month', a.date) as month, COUNT(*) as cnt
       FROM dbo.companies c
       JOIN dbo.appointments a ON a.companyid=c.id
       WHERE 1=1 ${trendF.where}
       GROUP BY c.name, month ORDER BY c.name, month`, trendF.params);

    return res.json({ success: true, data: {
      locations: locations.map(l => ({ ...l, appointmentCount: parseInt(l.appointment_count), doneCount: parseInt(l.done_count), revenue: parseFloat(l.revenue), orderCount: parseInt(l.order_count), employeeCount: parseInt(l.employee_count) })),
      trend: trend.map(t => ({ location: t.name, month: t.month, count: parseInt(t.cnt) })),
    }});
  } catch (e) { console.error('reports/locations/comparison:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
