'use strict';

const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { getVietnamToday } = require('../../lib/dateUtils');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

router.post('/', requirePermission('reports.view'), async (req, res) => {
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

module.exports = router;
