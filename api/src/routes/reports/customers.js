const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter, resolveReportCompanyScope } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');

const router = express.Router();

// ── Customers Summary ────────────────────────────────────────────────

router.post('/customers/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    // Total active customers
    let totalWhere = 'customer=true AND isdeleted=false';
    let totalParams = [];
    let totalIdx = 1;
    if (scope.companyIds !== null) {
      totalParams.push(scope.companyIds);
      totalWhere += ` AND companyid = ANY($${totalIdx}::uuid[])`;
      totalIdx++;
    }
    if (investorScope.isInvestor) {
      totalParams.push(investorScope.allowedCustomerIds);
      totalWhere += ` AND id = ANY($${totalIdx}::uuid[])`;
      totalIdx++;
    }
    const total = await query(`SELECT COUNT(*) as cnt FROM dbo.partners WHERE ${totalWhere}`, totalParams);

    // New customers in period
    const cf = dateCompanyFilter(dateFrom, dateTo, scope.companyIds, 'datecreated');
    let cfWhere = cf.where;
    let cfParams = [...cf.params];
    if (investorScope.isInvestor) {
      cfParams.push(investorScope.allowedCustomerIds);
      cfWhere += ` AND id = ANY($${cf.idx}::uuid[])`;
    }
    const newCust = await query(
      `SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false ${cfWhere}`, cfParams);

    // By source (moved to services breakdown — placeholder kept for compatibility)
    const sources = [];

    // By gender
    let genderWhere = 'customer=true AND isdeleted=false AND gender IS NOT NULL';
    let genderParams = [];
    let genderIdx = 1;
    if (scope.companyIds !== null) {
      genderParams.push(scope.companyIds);
      genderWhere += ` AND companyid = ANY($${genderIdx}::uuid[])`;
      genderIdx++;
    }
    if (investorScope.isInvestor) {
      genderParams.push(investorScope.allowedCustomerIds);
      genderWhere += ` AND id = ANY($${genderIdx}::uuid[])`;
      genderIdx++;
    }
    const gender = await query(
      `SELECT gender, COUNT(*) as cnt FROM dbo.partners WHERE ${genderWhere} GROUP BY gender`, genderParams);

    // By city
    let cityWhere = 'customer=true AND isdeleted=false AND cityname IS NOT NULL';
    let cityParams = [];
    let cityIdx = 1;
    if (scope.companyIds !== null) {
      cityParams.push(scope.companyIds);
      cityWhere += ` AND companyid = ANY($${cityIdx}::uuid[])`;
      cityIdx++;
    }
    if (investorScope.isInvestor) {
      cityParams.push(investorScope.allowedCustomerIds);
      cityWhere += ` AND id = ANY($${cityIdx}::uuid[])`;
      cityIdx++;
    }
    const cities = await query(
      `SELECT cityname, COUNT(*) as cnt FROM dbo.partners WHERE ${cityWhere} GROUP BY cityname ORDER BY cnt DESC LIMIT 10`, cityParams);

    // Lifetime value (top spenders)
    let ltvWhere = 'p.customer=true AND p.isdeleted=false';
    let ltvParams = [];
    let ltvIdx = 1;
    if (scope.companyIds !== null) {
      ltvParams.push(scope.companyIds);
      ltvWhere += ` AND p.companyid = ANY($${ltvIdx}::uuid[])`;
      ltvIdx++;
    }
    if (investorScope.isInvestor) {
      ltvParams.push(investorScope.allowedCustomerIds);
      ltvWhere += ` AND p.id = ANY($${ltvIdx}::uuid[])`;
      ltvIdx++;
    }
    const ltv = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.totalpaid),0) as total_paid, COUNT(so.id) as order_count
       FROM dbo.partners p
       LEFT JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale'
       WHERE ${ltvWhere}
       GROUP BY p.id, p.name ORDER BY total_paid DESC LIMIT 20`, ltvParams);

    // Outstanding balances
    let outWhere = 'p.customer=true AND p.isdeleted=false AND so.residual > 0';
    let outParams = [];
    let outIdx = 1;
    if (scope.companyIds !== null) {
      outParams.push(scope.companyIds);
      outWhere += ` AND p.companyid = ANY($${outIdx}::uuid[])`;
      outIdx++;
    }
    if (investorScope.isInvestor) {
      outParams.push(investorScope.allowedCustomerIds);
      outWhere += ` AND p.id = ANY($${outIdx}::uuid[])`;
      outIdx++;
    }
    const outstanding = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.residual),0) as outstanding
       FROM dbo.partners p
       JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale'
       WHERE ${outWhere}
       GROUP BY p.id, p.name ORDER BY outstanding DESC LIMIT 20`, outParams);

    // Growth trend (new customers per month)
    const growthF = dateCompanyFilter(dateFrom, dateTo, scope.companyIds, 'datecreated');
    let growthWhere = growthF.where;
    let growthParams = [...growthF.params];
    if (investorScope.isInvestor) {
      growthParams.push(investorScope.allowedCustomerIds);
      growthWhere += ` AND id = ANY($${growthF.idx}::uuid[])`;
    }
    const growth = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month, COUNT(*) as cnt
       FROM dbo.partners WHERE customer=true AND isdeleted=false ${growthWhere}
       GROUP BY month ORDER BY month`, growthParams);

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

module.exports = router;
