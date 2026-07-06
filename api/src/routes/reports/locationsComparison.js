const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, dateCompanyFilter, resolveReportCompanyScope } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');
const { getCanonicalRevenueByLocation } = require('../../services/reports/canonicalRevenue');

const router = express.Router();

// ── Locations Comparison ─────────────────────────────────────────────

router.post('/locations/comparison', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, undefined);
    if (!scope) return;

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const af = dateCompanyFilter(dateFrom, dateTo, null, 'date');
    const queryParams = [...af.params];
    let afWhere = af.where;
    if (investorScope.isInvestor) {
      queryParams.push(investorScope.allowedCustomerIds);
      afWhere += ` AND partnerid = ANY($${queryParams.length}::uuid[])`;
    }

    // Offset saleorder params after appointment params so $N is correct in the combined query.
    const soConds = [];
    let soIdx = queryParams.length + 1;
    if (dateFrom) { soConds.push(`datecreated::date >= $${soIdx}`); queryParams.push(dateFrom); soIdx++; }
    if (dateTo) { soConds.push(`datecreated::date <= $${soIdx}`); queryParams.push(dateTo); soIdx++; }
    if (investorScope.isInvestor) {
      soConds.push(`partnerid = ANY($${soIdx}::uuid[])`);
      queryParams.push(investorScope.allowedCustomerIds);
      soIdx++;
    }
    const soWhere = soConds.length ? 'AND ' + soConds.join(' AND ') : '';

    // Build location scope condition: restrict to caller's allowed locations when not null (unrestricted)
    let locWhere = '';
    if (scope.companyIds !== null && scope.companyIds.length > 0) {
      locWhere = `WHERE c.id = ANY($${queryParams.length + 1}::uuid[])`;
      queryParams.push(scope.companyIds);
    }

    const locations = await query(
      `SELECT c.id, c.name, c.active,
              COALESCE(appt.cnt, 0) as appointment_count,
              COALESCE(appt.done, 0) as done_count,
              COALESCE(so.order_count, 0) as order_count,
              COALESCE(emp.cnt, 0) as employee_count
       FROM dbo.companies c
       ${locWhere}
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt, SUM(CASE WHEN state IN ('done','completed') THEN 1 ELSE 0 END) as done FROM dbo.appointments WHERE 1=1 ${afWhere} GROUP BY companyid) appt ON appt.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as order_count FROM dbo.saleorders WHERE isdeleted=false ${soWhere} GROUP BY companyid) so ON so.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt FROM dbo.partners WHERE employee=true AND isdeleted=false GROUP BY companyid) emp ON emp.companyid=c.id`, queryParams);

    // Get canonical revenue by location and merge into locations.
    const revenueFilters = investorScope.isInvestor
      ? { dateFrom, dateTo, allowedCustomerIds: investorScope.allowedCustomerIds }
      : { dateFrom, dateTo };
    const revenueData = await getCanonicalRevenueByLocation(revenueFilters);
    const revenueMap = new Map(revenueData.map(r => [r.companyId, r.revenue]));

    // Inject revenue into each location and sort by revenue DESC.
    locations.forEach(loc => {
      loc.revenue = revenueMap.get(loc.id) || 0;
    });
    locations.sort((a, b) => b.revenue - a.revenue);

    // Location growth trend
    const trendParams = [dateFrom, dateTo];
    let trendWhere = 'a.date::date >= $1 AND a.date::date <= $2';
    if (investorScope.isInvestor) {
      trendParams.push(investorScope.allowedCustomerIds);
      trendWhere += ` AND a.partnerid = ANY($${trendParams.length}::uuid[])`;
    }
    let trendCompanyFilter = '';
    if (scope.companyIds !== null && scope.companyIds.length > 0) {
      trendParams.push(scope.companyIds);
      trendCompanyFilter = ` AND c.id = ANY($${trendParams.length}::uuid[])`;
    }
    const trend = await query(
      `SELECT c.name, DATE_TRUNC('month', a.date) as month, COUNT(*) as cnt
       FROM dbo.companies c
       JOIN dbo.appointments a ON a.companyid=c.id AND ${trendWhere}${trendCompanyFilter}
       GROUP BY c.name, month ORDER BY c.name, month`, trendParams);

    return res.json({ success: true, data: {
      locations: locations.map(l => ({ ...l, appointmentCount: parseInt(l.appointment_count, 10), doneCount: parseInt(l.done_count, 10), revenue: parseFloat(l.revenue), orderCount: parseInt(l.order_count, 10), employeeCount: parseInt(l.employee_count, 10) })),
      trend: trend.map(t => ({ location: t.name, month: t.month, count: parseInt(t.cnt, 10) })),
    }});
  } catch (e) { console.error('reports/locations/comparison:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
