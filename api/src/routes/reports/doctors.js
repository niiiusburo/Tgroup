const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');

const router = express.Router();

// ── Doctors Performance ──────────────────────────────────────────────

router.post('/doctors/performance', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'a.date');
    const rows = await query(
      `SELECT p.id, p.name, COUNT(a.id) as total_appointments,
              SUM(CASE WHEN a.state='done' THEN 1 ELSE 0 END) as done,
              SUM(CASE WHEN a.state='cancel' OR a.state='cancelled' THEN 1 ELSE 0 END) as cancelled,
              COALESCE(SUM(so.totalpaid),0) as revenue
       FROM dbo.partners p
       LEFT JOIN dbo.appointments a ON a.doctorid=p.id ${f.where}
       LEFT JOIN dbo.saleorders so ON a.saleorderid=so.id AND so.isdeleted=false
       WHERE p.isdoctor=true AND p.isdeleted=false
       GROUP BY p.id, p.name ORDER BY done DESC LIMIT 100`, f.params);

    return res.json({ success: true, data: rows.map(r => ({
      ...r, totalAppointments: parseInt(r.total_appointments), done: parseInt(r.done),
      cancelled: parseInt(r.cancelled), revenue: parseFloat(r.revenue),
    }))});
  } catch (e) { console.error('reports/doctors/performance:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
