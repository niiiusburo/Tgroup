/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[POST /api/Reports/doctors/performance: mounted via api/src/routes/reports.js; called by website/src/hooks/useReportData.ts]
 * @crossref:uses[api/src/db.js, api/src/middleware/auth.js, api/src/routes/reports/helpers.js, api/src/services/reports/canonicalRevenue.js (getCanonicalRevenueByDoctor), product-map/domains/reports-analytics.yaml]
 */
const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, resolveReportCompanyScope } = require('./helpers');
const { getCanonicalRevenueByDoctor } = require('../../services/reports/canonicalRevenue');

const router = express.Router();

// ── Doctors Performance ──────────────────────────────────────────────

router.post('/doctors/performance', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');
    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const joinConds = [];
    const doctorConds = [];
    const params = [];
    let idx = 1;
    if (dateFrom) { joinConds.push(`a.date::date >= $${idx}`); params.push(dateFrom); idx++; }
    if (dateTo) { joinConds.push(`a.date::date <= $${idx}`); params.push(dateTo); idx++; }
    if (Array.isArray(scope.companyIds)) {
      if (scope.companyIds.length === 0) {
        joinConds.push('FALSE');
        doctorConds.push('FALSE');
      } else {
        const ref = `$${idx}::uuid[]`;
        joinConds.push(`a.companyid = ANY(${ref})`);
        doctorConds.push(`p.companyid = ANY(${ref})`);
        params.push(scope.companyIds);
      }
    }
    const appointmentWhere = joinConds.length ? 'AND ' + joinConds.join(' AND ') : '';
    const doctorWhere = doctorConds.length ? 'AND ' + doctorConds.join(' AND ') : '';
    const rows = await query(
      `SELECT p.id, p.name, COUNT(a.id) as total_appointments,
              SUM(CASE WHEN a.state IN ('done','completed') THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN a.state IN ('cancel','cancelled') THEN 1 ELSE 0 END) as cancelled
       FROM dbo.partners p
       LEFT JOIN dbo.appointments a ON a.doctorid=p.id ${appointmentWhere}
       WHERE p.isdoctor=true AND p.isdeleted=false ${doctorWhere}
       GROUP BY p.id, p.name ORDER BY done DESC LIMIT 100`, params);

    // Canonical revenue grouped by saleorder.doctorid (matches Excel attribution).
    const revenueByDoctor = await getCanonicalRevenueByDoctor({ dateFrom, dateTo, companyIds: scope.companyIds });
    const revenueMap = new Map(revenueByDoctor.map(r => [r.doctorId, r.revenue]));

    const doctorRows = rows.map(r => ({
      ...r, totalAppointments: parseInt(r.total_appointments), done: parseInt(r.done),
      cancelled: parseInt(r.cancelled), revenue: revenueMap.get(r.id) || 0,
    }));

    // Capture revenue that isn't attributable to a known doctor (NULL doctorid on the
    // invoice OR doctorid pointing to a non-doctor partner) so the sum reconciles with
    // the Dashboard. Same pattern as how the Excel revenue-flat export surfaces it.
    const attributedDoctorIds = new Set(doctorRows.map(d => d.id));
    const unassignedRevenue = revenueByDoctor
      .filter(r => !attributedDoctorIds.has(r.doctorId))
      .reduce((sum, r) => sum + r.revenue, 0);

    if (unassignedRevenue > 0) {
      doctorRows.push({
        id: null,
        name: 'Chưa gán bác sĩ',
        total_appointments: 0,
        done: 0,
        cancelled: 0,
        totalAppointments: 0,
        revenue: unassignedRevenue,
        unassigned: true,
      });
    }

    return res.json({ success: true, data: doctorRows });
  } catch (e) { console.error('reports/doctors/performance:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
