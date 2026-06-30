const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const {
  err,
  validDate,
  validUUID,
  dateCompanyScopeFilter,
  resolveReportCompanyScope,
  appendCompanyScopeCondition,
  companyScopeWhere,
} = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');
const { getCanonicalRevenueByLocation } = require('../../services/reports/canonicalRevenue');

const router = express.Router();

// ── Locations Comparison ─────────────────────────────────────────────

router.post('/locations/comparison', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);
    const companyScope = await resolveReportCompanyScope(req, res, companyId);
    if (!companyScope) return;

    const af = dateCompanyScopeFilter(dateFrom, dateTo, companyScope, 'date');
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
    appendCompanyScopeCondition(soConds, queryParams, companyScope, 'companyid');
    soIdx = queryParams.length + 1;
    if (investorScope.isInvestor) {
      soConds.push(`partnerid = ANY($${soIdx}::uuid[])`);
      queryParams.push(investorScope.allowedCustomerIds);
      soIdx++;
    }
    const soWhere = soConds.length ? 'AND ' + soConds.join(' AND ') : '';
    const locationFilter = companyScopeWhere(companyScope, 'c.id', queryParams);
    const employeeWhere = investorScope.isInvestor ? 'false' : 'employee=true AND isdeleted=false';

    const locations = await query(
      `SELECT c.id, c.name, c.active,
              COALESCE(appt.cnt, 0) as appointment_count,
              COALESCE(appt.done, 0) as done_count,
              COALESCE(so.order_count, 0) as order_count,
              COALESCE(emp.cnt, 0) as employee_count
       FROM dbo.companies c
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt, SUM(CASE WHEN state IN ('done','completed') THEN 1 ELSE 0 END) as done FROM dbo.appointments WHERE 1=1 ${afWhere} GROUP BY companyid) appt ON appt.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as order_count FROM dbo.saleorders WHERE isdeleted=false ${soWhere} GROUP BY companyid) so ON so.companyid=c.id
       LEFT JOIN (SELECT companyid, COUNT(*) as cnt FROM dbo.partners WHERE ${employeeWhere} GROUP BY companyid) emp ON emp.companyid=c.id
       WHERE 1=1 ${locationFilter}`, queryParams);

    // Get canonical revenue by location and merge into locations.
    const revenueFilters = investorScope.isInvestor
      ? { dateFrom, dateTo, companyIds: companyScope.companyIds, allowedCustomerIds: investorScope.allowedCustomerIds }
      : { dateFrom, dateTo, companyIds: companyScope.companyIds };
    const revenueData = await getCanonicalRevenueByLocation(revenueFilters);
    const revenueMap = new Map(revenueData.map(r => [r.companyId, r.revenue]));

    // Inject revenue into each location and sort by revenue DESC.
    locations.forEach(loc => {
      loc.revenue = revenueMap.get(loc.id) || 0;
    });
    locations.sort((a, b) => b.revenue - a.revenue);

    // Location growth trend
    const trendParams = [dateFrom, dateTo];
    const trendConds = ['a.date::date >= $1', 'a.date::date <= $2'];
    appendCompanyScopeCondition(trendConds, trendParams, companyScope, 'a.companyid');
    if (investorScope.isInvestor) {
      trendParams.push(investorScope.allowedCustomerIds);
      trendConds.push(`a.partnerid = ANY($${trendParams.length}::uuid[])`);
    }
    const trendWhere = trendConds.join(' AND ');
    const trend = await query(
      `SELECT c.name, DATE_TRUNC('month', a.date) as month, COUNT(*) as cnt
       FROM dbo.companies c
       JOIN dbo.appointments a ON a.companyid=c.id AND ${trendWhere}
       GROUP BY c.name, month ORDER BY c.name, month`, trendParams);

    return res.json({ success: true, data: {
      locations: locations.map(l => ({ ...l, appointmentCount: parseInt(l.appointment_count, 10), doneCount: parseInt(l.done_count, 10), revenue: parseFloat(l.revenue), orderCount: parseInt(l.order_count, 10), employeeCount: parseInt(l.employee_count, 10) })),
      trend: trend.map(t => ({ location: t.name, month: t.month, count: parseInt(t.cnt, 10) })),
    }});
  } catch (e) { console.error('reports/locations/comparison:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
