'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/dashboard]
 * @crossref:uses[dbo.appointments, dbo.saleorders, dbo.payments, dbo.dotkhams]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/dashboard
 * Returns: next appointment, treatment status, outstanding balance, unread notifications count
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    // Next appointment
    const nextAppt = await db(
      `SELECT a.id, a.name, a.date, a.time, a.state, a.note, a.color,
              c.name as company_name, c.taxunitaddress as company_address, c.phone as company_phone,
              p.name as doctor_name, pr.name as product_name
       FROM dbo.appointments a
       LEFT JOIN dbo.companies c ON c.id = a.companyid
       LEFT JOIN dbo.partners p ON p.id = a.doctorid
       LEFT JOIN dbo.products pr ON pr.id = a.productid
       WHERE a.partnerid = $1 AND a.date >= NOW() - INTERVAL '1 day'
         AND a.state NOT IN ('cancelled', 'cancel')
       ORDER BY a.date ASC LIMIT 1`,
      [partnerId]
    );

    // Outstanding balance (sum of non-deleted saleorders residual)
    const balance = await db(
      `SELECT COALESCE(SUM(residual), 0)::float as outstanding
       FROM dbo.saleorders
       WHERE partnerid = $1 AND COALESCE(isdeleted, false) = false`,
      [partnerId]
    );

    // Treatment status (most recent active saleorder)
    const treatment = await db(
      `SELECT s.id, s.name, s.code, s.state, s.amounttotal, s.residual, s.totalpaid,
              s.datestart, s.dateend, s.notes, s.datecreated,
              c.name as company_name, p.name as doctor_name
       FROM dbo.saleorders s
       LEFT JOIN dbo.companies c ON c.id = s.companyid
       LEFT JOIN dbo.partners p ON p.id = s.doctorid
       WHERE s.partnerid = $1 AND COALESCE(s.isdeleted, false) = false
       ORDER BY s.datecreated DESC LIMIT 1`,
      [partnerId]
    );

    // Unread notification count
    const unreadCount = await db(
      `SELECT COUNT(*) as count
       FROM dbo.patient_notifications
       WHERE partner_id = $1 AND read_at IS NULL`,
      [partnerId]
    );

    return res.json({
      success: true,
      dashboard: {
        nextAppointment: nextAppt[0] || null,
        outstandingBalance: balance[0]?.outstanding || 0,
        treatment: treatment[0] || null,
        unreadNotifications: parseInt(unreadCount[0]?.count || 0, 10),
      }
    });
  } catch (err) {
    console.error('[patientDashboard] error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
