'use strict';

const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { getVietnamToday } = require('../../lib/dateUtils');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');

const router = express.Router();

router.post('/', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    // Current period: revenue from saleorders
    const so = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    let soWhere = so.where;
    let soParams = [...so.params];
    if (investorScope.isInvestor) {
      soParams.push(investorScope.allowedCustomerIds);
      soWhere += ` AND partnerid = ANY($${so.params.length + 1}::uuid[])`;
    }
    const rev = await query(
      `SELECT COALESCE(SUM(amounttotal),0) as invoiced,
              COALESCE(SUM(totalpaid),0) as paid,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false AND state='sale' ${soWhere}`, soParams);

    // Appointments
    const af = dateCompanyFilter(dateFrom, dateTo, companyId, 'date');
    let afWhere = af.where;
    let afParams = [...af.params];
    if (investorScope.isInvestor) {
      afParams.push(investorScope.allowedCustomerIds);
      afWhere += ` AND partnerid = ANY($${af.params.length + 1}::uuid[])`;
    }
    const appt = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM dbo.appointments WHERE 1=1 ${afWhere}`, afParams);

    // New customers
    const cf = dateCompanyFilter(dateFrom, dateTo, companyId, 'datecreated');
    let cfWhere = cf.where;
    let cfParams = [...cf.params];
    if (investorScope.isInvestor) {
      cfParams.push(investorScope.allowedCustomerIds);
      cfWhere += ` AND id = ANY($${cf.params.length + 1}::uuid[])`;
    }
    const cust = await query(
      `SELECT COUNT(*) as new_customers FROM dbo.partners WHERE customer=true AND isdeleted=false ${cfWhere}`, cfParams);

    // Previous period for comparison
    const days = dateFrom && dateTo ? Math.ceil((new Date(dateTo + 'T00:00:00Z') - new Date(dateFrom + 'T00:00:00Z')) / 86400000) : 30;
    const prevTo = dateFrom || dateTo || getVietnamToday();
    const prevFromDate = new Date(new Date(prevTo + 'T00:00:00Z') - days * 86400000);
    const prevFrom = prevFromDate.toISOString().split('T')[0];

    const pso = dateCompanyFilter(prevFrom, prevTo, companyId, 'datecreated');
    let psoWhere = pso.where;
    let psoParams = [...pso.params];
    if (investorScope.isInvestor) {
      psoParams.push(investorScope.allowedCustomerIds);
      psoWhere += ` AND partnerid = ANY($${pso.params.length + 1}::uuid[])`;
    }
    const prevRev = await query(
      `SELECT COALESCE(SUM(totalpaid),0) as paid FROM dbo.saleorders WHERE isdeleted=false AND state='sale' ${psoWhere}`, psoParams);

    const curPaid = parseFloat(rev[0]?.paid || 0);
    const prevPaid = parseFloat(prevRev[0]?.paid || 0);
    const revChange = prevPaid > 0 ? ((curPaid - prevPaid) / prevPaid * 100).toFixed(1) : null;

    const curAppt = parseInt(appt[0]?.total || 0);
    const paf = dateCompanyFilter(prevFrom, prevTo, companyId, 'date');
    let pafWhere = paf.where;
    let pafParams = [...paf.params];
    if (investorScope.isInvestor) {
      pafParams.push(investorScope.allowedCustomerIds);
      pafWhere += ` AND partnerid = ANY($${paf.params.length + 1}::uuid[])`;
    }
    const prevAppt = await query(`SELECT COUNT(*) as total FROM dbo.appointments WHERE 1=1 ${pafWhere}`, pafParams);
    const prevApptCount = parseInt(prevAppt[0]?.total || 0);
    const apptChange = prevApptCount > 0 ? ((curAppt - prevApptCount) / prevApptCount * 100).toFixed(1) : null;

    // 12-month revenue trend
    const trendConds = ['isdeleted=false', 'state=\'sale\'', 'datecreated >= (NOW() AT TIME ZONE \'UTC\' AT TIME ZONE \'Asia/Ho_Chi_Minh\') - INTERVAL \'12 months\''];
    const trendParams = [];
    let trendIdx = 1;
    if (companyId) { trendConds.push(`companyid = $${trendIdx}`); trendParams.push(companyId); trendIdx++; }
    if (investorScope.isInvestor) { trendConds.push(`partnerid = ANY($${trendIdx}::uuid[])`); trendParams.push(investorScope.allowedCustomerIds); trendIdx++; }
    const trendWhere = trendConds.join(' AND ');
    const trend = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month,
              COALESCE(SUM(totalpaid),0) as revenue,
              COALESCE(SUM(amounttotal),0) as invoiced
       FROM dbo.saleorders WHERE ${trendWhere}
       GROUP BY month ORDER BY month`,
      trendParams);

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

module.exports = router;
