const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Valid states for appointments
const VALID_STATES = ['draft', 'confirmed', 'arrived', 'in Examination', 'done', 'cancelled'];

// Error response helper
function errorResponse(res, status, errorCode, message) {
  return res.status(status).json({ errorCode, message });
}

// Validate UUID format
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validate date format (ISO 8601)
function isValidISODate(str) {
  if (!str || typeof str !== 'string') return false;
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.match(/^\d{4}-\d{2}-\d{2}/);
}

/**
 * Map database state to calendar status
 */
function mapStateToStatus(state) {
  const s = state?.toLowerCase() || '';
  if (s === 'arrived' || s === 'confirmed') return 'arrived';
  if (s === 'cancel' || s === 'cancelled') return 'cancelled';
  if (s === 'no_show') return 'no-show';
  if (s === 'done' || s === 'completed') return 'completed';
  if (s === 'in examination' || s === 'in-progress') return 'in-progress';
  return 'scheduled';
}

/**
 * GET /api/Customers/Calendar
 * Query params: dateFrom, dateTo, companyId
 * Returns: appointments with customer info grouped by date
 */
router.get('/', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      companyId,
    } = req.query;

    // Validate date range
    if (!dateFrom || !isValidISODate(dateFrom)) {
      return errorResponse(res, 400, 'INVALID_DATE_FROM', 'dateFrom must be a valid ISO date (YYYY-MM-DD)');
    }

    if (!dateTo || !isValidISODate(dateTo)) {
      return errorResponse(res, 400, 'INVALID_DATE_TO', 'dateTo must be a valid ISO date (YYYY-MM-DD)');
    }

    // Validate companyId if provided
    if (companyId && !isValidUUID(companyId)) {
      return errorResponse(res, 400, 'INVALID_COMPANY_ID', 'companyId must be a valid UUID');
    }

    const conditions = ['a.date >= $1', 'a.date <= $2'];
    const params = [dateFrom, dateTo];
    let paramIdx = 3;

    if (companyId) {
      conditions.push(`a.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Fetch appointments with customer info
    const rows = await query(
      `SELECT
        a.id,
        a.date,
        a.time,
        a.datetimeappointment,
        a.name AS service_name,
        a.note,
        a.state,
        a.color,
        a.partnerid AS customer_id,
        p.name AS customer_name,
        p.phone AS customer_phone,
        p.displayname AS customer_display_name,
        a.doctorid,
        doc.name AS doctor_name,
        a.companyid,
        c.name AS company_name
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN companies c ON c.id = a.companyid
      ${whereClause}
      ORDER BY a.date ASC, a.time ASC NULLS LAST`,
      params
    );

    // Group by date
    const groupedByDate = {};

    rows.forEach((row) => {
      const date = row.date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }

      const time = row.time || (row.datetimeappointment ? row.datetimeappointment.slice(11, 16) : null) || '09:00';
      
      groupedByDate[date].push({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_display_name || row.customer_name || 'Unknown',
        customerPhone: row.customer_phone || '',
        doctorId: row.doctorid,
        doctorName: row.doctor_name || '---',
        time: time,
        serviceName: row.service_name || row.note || 'Khám tổng quát',
        status: mapStateToStatus(row.state),
        notes: row.note || '',
        color: row.color,
        locationId: row.companyid,
        locationName: row.company_name,
      });
    });

    // Convert to array format
    const items = Object.keys(groupedByDate)
      .sort()
      .map((date) => ({
        date,
        appointments: groupedByDate[date],
      }));

    return res.json({
      dateFrom,
      dateTo,
      companyId: companyId || null,
      totalItems: rows.length,
      items,
    });
  } catch (err) {
    console.error('Error fetching customer calendar:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
