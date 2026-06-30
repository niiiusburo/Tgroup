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
} = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');

const router = express.Router();

// ── Customers Summary ────────────────────────────────────────────────

router.post('/customers/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);
    const companyScope = await resolveReportCompanyScope(req, res, companyId);
    if (!companyScope) return;

    // Total active customers
    const totalConds = ['customer=true', 'isdeleted=false'];
    let totalParams = [];
    appendCompanyScopeCondition(totalConds, totalParams, companyScope, 'companyid');
    if (investorScope.isInvestor) {
      totalParams.push(investorScope.allowedCustomerIds);
      totalConds.push(`id = ANY($${totalParams.length}::uuid[])`);
    }
    const totalWhere = totalConds.join(' AND ');
    const total = await query(`SELECT COUNT(*) as cnt FROM dbo.partners WHERE ${totalWhere}`, totalParams);

    // New customers in period
    const cf = dateCompanyScopeFilter(dateFrom, dateTo, companyScope, 'datecreated');
    let cfWhere = cf.where;
    let cfParams = [...cf.params];
    if (investorScope.isInvestor) {
      cfParams.push(investorScope.allowedCustomerIds);
      cfWhere += ` AND id = ANY($${cf.params.length + 1}::uuid[])`;
    }
    const newCust = await query(
      `SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false ${cfWhere}`, cfParams);

    // By source (moved to services breakdown — placeholder kept for compatibility)
    const sources = [];

    // By gender
    const genderConds = ['customer=true', 'isdeleted=false', 'gender IS NOT NULL'];
    let genderParams = [];
    appendCompanyScopeCondition(genderConds, genderParams, companyScope, 'companyid');
    if (investorScope.isInvestor) {
      genderParams.push(investorScope.allowedCustomerIds);
      genderConds.push(`id = ANY($${genderParams.length}::uuid[])`);
    }
    const genderWhere = genderConds.join(' AND ');
    const gender = await query(
      `SELECT gender, COUNT(*) as cnt FROM dbo.partners WHERE ${genderWhere} GROUP BY gender`, genderParams);

    // By city
    const cityConds = ['customer=true', 'isdeleted=false', 'cityname IS NOT NULL'];
    let cityParams = [];
    appendCompanyScopeCondition(cityConds, cityParams, companyScope, 'companyid');
    if (investorScope.isInvestor) {
      cityParams.push(investorScope.allowedCustomerIds);
      cityConds.push(`id = ANY($${cityParams.length}::uuid[])`);
    }
    const cityWhere = cityConds.join(' AND ');
    const cities = await query(
      `SELECT cityname, COUNT(*) as cnt FROM dbo.partners WHERE ${cityWhere} GROUP BY cityname ORDER BY cnt DESC LIMIT 10`, cityParams);

    // Lifetime value (top spenders)
    const ltvConds = ['p.customer=true', 'p.isdeleted=false'];
    let ltvParams = [];
    appendCompanyScopeCondition(ltvConds, ltvParams, companyScope, 'p.companyid');
    if (investorScope.isInvestor) {
      ltvParams.push(investorScope.allowedCustomerIds);
      ltvConds.push(`p.id = ANY($${ltvParams.length}::uuid[])`);
    }
    const ltvWhere = ltvConds.join(' AND ');
    const ltv = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.totalpaid),0) as total_paid, COUNT(so.id) as order_count
       FROM dbo.partners p
       LEFT JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale'
       WHERE ${ltvWhere}
       GROUP BY p.id, p.name ORDER BY total_paid DESC LIMIT 20`, ltvParams);

    // Outstanding balances
    const outConds = ['p.customer=true', 'p.isdeleted=false', 'so.residual > 0'];
    let outParams = [];
    appendCompanyScopeCondition(outConds, outParams, companyScope, 'p.companyid');
    if (investorScope.isInvestor) {
      outParams.push(investorScope.allowedCustomerIds);
      outConds.push(`p.id = ANY($${outParams.length}::uuid[])`);
    }
    const outWhere = outConds.join(' AND ');
    const outstanding = await query(
      `SELECT p.id, p.name, COALESCE(SUM(so.residual),0) as outstanding
       FROM dbo.partners p
       JOIN dbo.saleorders so ON so.partnerid=p.id AND so.isdeleted=false AND so.state='sale'
       WHERE ${outWhere}
       GROUP BY p.id, p.name ORDER BY outstanding DESC LIMIT 20`, outParams);

    // Growth trend (new customers per month)
    const growthF = dateCompanyScopeFilter(dateFrom, dateTo, companyScope, 'datecreated');
    let growthWhere = growthF.where;
    let growthParams = [...growthF.params];
    if (investorScope.isInvestor) {
      growthParams.push(investorScope.allowedCustomerIds);
      growthWhere += ` AND id = ANY($${growthF.params.length + 1}::uuid[])`;
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
