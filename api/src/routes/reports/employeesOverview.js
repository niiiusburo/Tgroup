const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Employees Overview ───────────────────────────────────────────────

router.post('/employees/overview', requirePermission('reports.view'), async (req, res) => {
  try {
    const { companyId } = req.body || {};
    if (!validUUID(companyId)) return err(res, 400, 'Invalid params');

    const companyFilter = companyId ? 'AND companyid = $1' : '';
    const params = companyId ? [companyId] : [];

    const roles = await query(
      `SELECT
         SUM(CASE WHEN isdoctor THEN 1 ELSE 0 END) as doctors,
         SUM(CASE WHEN isassistant THEN 1 ELSE 0 END) as assistants,
         SUM(CASE WHEN isreceptionist THEN 1 ELSE 0 END) as receptionists,
         COUNT(*) as total
       FROM dbo.partners WHERE employee=true AND isdeleted=false ${companyFilter}`, params);

    const byLocation = await query(
      `SELECT c.name as location, COUNT(e.id) as cnt,
            SUM(CASE WHEN e.isdoctor THEN 1 ELSE 0 END) as doctors,
            SUM(CASE WHEN e.isassistant THEN 1 ELSE 0 END) as assistants
       FROM dbo.companies c
       LEFT JOIN dbo.partners e ON e.companyid=c.id AND e.employee=true AND e.isdeleted=false
       GROUP BY c.name ORDER BY cnt DESC`);

    const list = await query(
      `SELECT p.id, p.name, p.isdoctor, p.isassistant, p.isreceptionist,
              p.jobtitle, c.name as location, p.startworkdate, p.active
       FROM dbo.partners p
       LEFT JOIN dbo.companies c ON c.id=p.companyid
       WHERE p.employee=true AND p.isdeleted=false ${companyFilter}
       ORDER BY p.name`, params);

    return res.json({ success: true, data: {
      roles: { doctors: parseInt(roles[0]?.doctors || 0), assistants: parseInt(roles[0]?.assistants || 0), receptionists: parseInt(roles[0]?.receptionists || 0), total: parseInt(roles[0]?.total || 0) },
      byLocation: byLocation.map(l => ({ location: l.location, count: parseInt(l.cnt), doctors: parseInt(l.doctors), assistants: parseInt(l.assistants) })),
      employees: list.map(e => ({ ...e, isdoctor: !!e.isdoctor, isassistant: !!e.isassistant, isreceptionist: !!e.isreceptionist, active: !!e.active })),
    }});
  } catch (e) { console.error('reports/employees/overview:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
