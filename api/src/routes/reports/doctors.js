const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');
const { getCanonicalRevenueByDoctor } = require('../../services/reports/canonicalRevenue');

const router = express.Router();

// ── Doctors Performance ──────────────────────────────────────────────

router.post('/doctors/performance', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'a.date');
    const rows = await query(
      `SELECT p.id, p.name, COUNT(a.id) as total_appointments,
              SUM(CASE WHEN a.state IN ('done','completed') THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN a.state IN ('cancel','cancelled') THEN 1 ELSE 0 END) as cancelled
       FROM dbo.partners p
       LEFT JOIN dbo.appointments a ON a.doctorid=p.id ${f.where}
       WHERE p.isdoctor=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY done DESC LIMIT 100`, f.params);

    // Canonical revenue grouped by saleorder.doctorid (matches Excel attribution).
    const revenueByDoctor = await getCanonicalRevenueByDoctor({ dateFrom, dateTo, companyId });
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
