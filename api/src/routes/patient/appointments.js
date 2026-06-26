'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/appointments]
 * @crossref:uses[dbo.appointments, dbo.companies, dbo.partners, dbo.products]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/appointments
 * Query: ?status=upcoming|past|all (default: all)
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const status = req.query.status || 'all';

    let dateFilter = '';
    if (status === 'upcoming') {
      dateFilter = "AND a.date >= NOW() - INTERVAL '1 day'";
    } else if (status === 'past') {
      dateFilter = "AND a.date < NOW() - INTERVAL '1 day'";
    }

    const rows = await db(
      `SELECT a.id, a.name, a.date, a.time, a.state, a.note, a.color,
              c.name as company_name, c.taxunitaddress as company_address,
              p.name as doctor_name, pr.name as product_name
       FROM dbo.appointments a
       LEFT JOIN dbo.companies c ON c.id = a.companyid
       LEFT JOIN dbo.partners p ON p.id = a.doctorid
       LEFT JOIN dbo.products pr ON pr.id = a.productid
       WHERE a.partnerid = $1 ${dateFilter}
       ORDER BY a.date DESC`,
      [partnerId]
    );

    return res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error('[patientAppointments] list error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/patient/appointments/:id
 */
router.get('/:id', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;
    const appointmentId = req.params.id;

    const rows = await db(
      `SELECT a.id, a.name, a.date, a.time, a.state, a.note, a.color,
              a.datetimearrived, a.datetimeseated, a.datedone,
              c.name as company_name, c.taxunitaddress as company_address, c.phone as company_phone,
              p.name as doctor_name,
              pr.name as product_name
       FROM dbo.appointments a
       LEFT JOIN dbo.companies c ON c.id = a.companyid
       LEFT JOIN dbo.partners p ON p.id = a.doctorid
       LEFT JOIN dbo.products pr ON pr.id = a.productid
       WHERE a.id = $1 AND a.partnerid = $2`,
      [appointmentId, partnerId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found', code: 'NOT_FOUND' });
    }

    return res.json({ success: true, appointment: rows[0] });
  } catch (err) {
    console.error('[patientAppointments] detail error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
