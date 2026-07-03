/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[POST /api/Reports/employees/overview: mounted via api/src/routes/reports.js; called by website/src/hooks/useReportData.ts]
 * @crossref:uses[api/src/db.js, api/src/middleware/auth.js, api/src/routes/reports/helpers.js (err, validUUID), product-map/domains/reports-analytics.yaml]
 */
const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validUUID, dateCompanyFilter, resolveReportCompanyScope } = require('./helpers');

const router = express.Router();

// ── Employees Overview ───────────────────────────────────────────────

router.post('/employees/overview', requirePermission('reports.view'), async (req, res) => {
  try {
    const { companyId } = req.body || {};
    if (!validUUID(companyId)) return err(res, 400, 'Invalid params');
    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const employeeFilter = dateCompanyFilter(undefined, undefined, scope.companyIds, 'datecreated', 'companyid');
    const employeeAliasFilter = dateCompanyFilter(undefined, undefined, scope.companyIds, 'p.datecreated', 'p.companyid');
    const locationFilter = dateCompanyFilter(undefined, undefined, scope.companyIds, 'c.datecreated', 'c.id');

    const roles = await query(
      `SELECT
         SUM(CASE WHEN isdoctor THEN 1 ELSE 0 END) as doctors,
         SUM(CASE WHEN isassistant THEN 1 ELSE 0 END) as assistants,
         SUM(CASE WHEN isreceptionist THEN 1 ELSE 0 END) as receptionists,
         COUNT(*) as total
       FROM dbo.partners WHERE employee=true AND isdeleted=false ${employeeFilter.where}`,
      employeeFilter.params);

    const byLocation = await query(
      `SELECT c.name as location, COUNT(e.id) as cnt,
            SUM(CASE WHEN e.isdoctor THEN 1 ELSE 0 END) as doctors,
            SUM(CASE WHEN e.isassistant THEN 1 ELSE 0 END) as assistants
       FROM dbo.companies c
       LEFT JOIN dbo.partners e ON e.companyid=c.id AND e.employee=true AND e.isdeleted=false
       WHERE 1=1 ${locationFilter.where}
       GROUP BY c.name ORDER BY cnt DESC`,
      locationFilter.params);

    const list = await query(
      `SELECT p.id, p.name, p.isdoctor, p.isassistant, p.isreceptionist,
              p.jobtitle, c.name as location, p.startworkdate, p.active
       FROM dbo.partners p
       LEFT JOIN dbo.companies c ON c.id=p.companyid
       WHERE p.employee=true AND p.isdeleted=false ${employeeAliasFilter.where}
       ORDER BY p.name`, employeeAliasFilter.params);

    return res.json({ success: true, data: {
      roles: { doctors: parseInt(roles[0]?.doctors || 0), assistants: parseInt(roles[0]?.assistants || 0), receptionists: parseInt(roles[0]?.receptionists || 0), total: parseInt(roles[0]?.total || 0) },
      byLocation: byLocation.map(l => ({ location: l.location, count: parseInt(l.cnt), doctors: parseInt(l.doctors), assistants: parseInt(l.assistants) })),
      employees: list.map(e => ({ ...e, isdoctor: !!e.isdoctor, isassistant: !!e.isassistant, isreceptionist: !!e.isreceptionist, active: !!e.active })),
    }});
  } catch (e) { console.error('reports/employees/overview:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
