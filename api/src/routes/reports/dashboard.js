'use strict';

const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { getVietnamToday } = require('../../lib/dateUtils');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');
const {
  getCanonicalRevenue,
  getCanonicalRevenueByMonth,
} = require('../../services/reports/canonicalRevenue');

const router = express.Router();

function applyInvestorPartnerScope(filter, column, investorScope) {
  const params = [...filter.params];
  let where = filter.where;
  if (investorScope.isInvestor) {
    params.push(investorScope.allowedCustomerIds);
    where += ` AND ${column} = ANY($${params.length}::uuid[])`;
  }
  return { where, params };
}

function investorRevenueFilters(baseFilters, investorScope) {
  return investorScope.isInvestor
    ? { ...baseFilters, allowedCustomerIds: investorScope.allowedCustomerIds }
    : baseFilters;
}

router.post('/', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    // Invoiced/outstanding still come from saleorders — they are different concepts
    // than "collected revenue" (which now matches the Excel canonical formula below).
    const so = applyInvestorPartnerScope(
      dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated'),
      'partnerid',
      investorScope
    );
    // No state filter — matches Revenue page behavior. Filtering to state='sale' alone
    // excludes 99%+ of orders (most live in 'pending'/'completed') and shrinks the
    // invoiced/outstanding KPIs by ~3 orders of magnitude.
    const rev = await query(
      `SELECT COALESCE(SUM(amounttotal),0) as invoiced,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false ${so.where}`, so.params);

    // Collected revenue — single source of truth shared with the Excel revenue-flat export.
    const curPaid = await getCanonicalRevenue(investorRevenueFilters({ dateFrom, dateTo, companyId }, investorScope));

    // Appointments
    const af = applyInvestorPartnerScope(
      dateCompanyFilter(dateFrom, dateTo, companyId, 'date'),
      'partnerid',
      investorScope
    );
    const appt = await query(
      // 'completed' is the canonical finished state in this DB (~84% of appointments);
      // 'done' is a legacy spelling kept for backward compat with older imports.
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN state IN ('done','completed') THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN state IN ('cancel','cancelled') THEN 1 ELSE 0 END) as cancelled
       FROM dbo.appointments WHERE 1=1 ${af.where}`, af.params);

    // New customers
    const cf = applyInvestorPartnerScope(
      dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated'),
      'id',
      investorScope
    );
    const cust = await query(
      `SELECT COUNT(*) as new_customers FROM dbo.partners WHERE customer=true AND isdeleted=false ${cf.where}`, cf.params);

    // Previous period for comparison
    const days = dateFrom && dateTo ? Math.ceil((new Date(dateTo + 'T00:00:00Z') - new Date(dateFrom + 'T00:00:00Z')) / 86400000) : 30;
    const prevTo = dateFrom || dateTo || getVietnamToday();
    const prevFromDate = new Date(new Date(prevTo + 'T00:00:00Z') - days * 86400000);
    const prevFrom = prevFromDate.toISOString().split('T')[0];

    const prevPaid = await getCanonicalRevenue(investorRevenueFilters({ dateFrom: prevFrom, dateTo: prevTo, companyId }, investorScope));
    const revChange = prevPaid > 0 ? ((curPaid - prevPaid) / prevPaid * 100).toFixed(1) : null;

    const curAppt = parseInt(appt[0]?.total || 0, 10);
    const paf = applyInvestorPartnerScope(
      dateCompanyFilter(prevFrom, prevTo, companyId, 'date'),
      'partnerid',
      investorScope
    );
    const prevAppt = await query(`SELECT COUNT(*) as total FROM dbo.appointments WHERE 1=1 ${paf.where}`, paf.params);
    const prevApptCount = parseInt(prevAppt[0]?.total || 0, 10);
    const apptChange = prevApptCount > 0 ? ((curAppt - prevApptCount) / prevApptCount * 100).toFixed(1) : null;

    // 12-month revenue trend — canonical (matches Excel) for the revenue line.
    // "invoiced" line keeps reading from saleorders since it's a different concept.
    const today = getVietnamToday();
    const trendFromDate = new Date(new Date(today + 'T00:00:00Z') - 365 * 86400000);
    const trendFrom = trendFromDate.toISOString().split('T')[0];

    const canonicalMonths = await getCanonicalRevenueByMonth(
      investorRevenueFilters({ dateFrom: trendFrom, dateTo: today, companyId }, investorScope)
    );
    const invoicedFilter = dateCompanyFilter(trendFrom, today, companyId, 'datecreated');
    const invoicedParams = [...invoicedFilter.params];
    let invoicedWhere = invoicedFilter.where;
    if (investorScope.isInvestor) {
      invoicedParams.push(investorScope.allowedCustomerIds);
      invoicedWhere += ` AND partnerid = ANY($${invoicedParams.length}::uuid[])`;
    }
    const invoicedByMonth = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month,
              COALESCE(SUM(amounttotal),0) as invoiced
       FROM dbo.saleorders
       WHERE isdeleted=false ${invoicedWhere}
       GROUP BY month`,
      invoicedParams);

    const invoicedMap = new Map();
    for (const row of invoicedByMonth) {
      const key = row.month instanceof Date ? row.month.toISOString() : String(row.month);
      invoicedMap.set(key, parseFloat(row.invoiced || 0));
    }
    const monthKey = (m) => (m instanceof Date ? m.toISOString() : String(m));
    const monthsSet = new Map();
    for (const row of canonicalMonths) {
      monthsSet.set(monthKey(row.month), row.month);
    }
    for (const row of invoicedByMonth) {
      monthsSet.set(monthKey(row.month), row.month);
    }
    const canonicalMap = new Map(canonicalMonths.map((r) => [monthKey(r.month), r.revenue]));
    const trend = Array.from(monthsSet.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, month]) => ({
        month,
        revenue: canonicalMap.get(key) || 0,
        invoiced: invoicedMap.get(key) || 0,
      }));

    return res.json({
      success: true,
      data: {
        revenue: { invoiced: parseFloat(rev[0]?.invoiced || 0), paid: curPaid, outstanding: parseFloat(rev[0]?.outstanding || 0), change: revChange ? parseFloat(revChange) : null },
        appointments: { total: curAppt, done: parseInt(appt[0]?.done || 0, 10), cancelled: parseInt(appt[0]?.cancelled || 0, 10), change: apptChange ? parseFloat(apptChange) : null },
        customers: { newCustomers: parseInt(cust[0]?.new_customers || 0, 10) },
        trend,
      }
    });
  } catch (e) { console.error('reports/dashboard:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
