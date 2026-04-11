const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Valid states for appointments
const VALID_STATES = ['draft', 'scheduled', 'confirmed', 'arrived', 'in Examination', 'in-progress', 'done', 'cancelled'];

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

// Check if foreign key exists
async function foreignKeyExists(table, id) {
  const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  return result.length > 0;
}

/**
 * GET /api/Appointments
 * Query params: partner_id, offset, limit, search, sortField, sortOrder, dateFrom, dateTo
 * Returns: customer's appointments
 */
router.get('/', async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'date',
      sortOrder = 'desc',
      date_from = '',  // Frontend sends snake_case via toSnakeCase()
      date_to = '',    // Frontend sends snake_case via toSnakeCase()
      dateFrom = '',   // Legacy camelCase fallback
      dateTo = '',
      state = '',
    } = req.query;

    // Accept either date_from (snake_case from frontend) or dateFrom (camelCase)
    const effectiveDateFrom = date_from || dateFrom;
    const effectiveDateTo = date_to || dateTo;

    // Validate offset and limit
    const offsetNum = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(offsetNum) || offsetNum < 0) {
      return errorResponse(res, 400, 'INVALID_OFFSET', 'offset must be a non-negative integer');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return errorResponse(res, 400, 'INVALID_LIMIT', 'limit must be between 1 and 500');
    }

    // Validate date range (accept both snake_case and camelCase)
    const df = effectiveDateFrom;
    const dt = effectiveDateTo;

    if (df && !isValidISODate(df)) {
      return errorResponse(res, 400, 'INVALID_DATE_FROM', 'dateFrom must be a valid ISO date (YYYY-MM-DD)');
    }

    if (dt && !isValidISODate(dt)) {
      return errorResponse(res, 400, 'INVALID_DATE_TO', 'dateTo must be a valid ISO date (YYYY-MM-DD)');
    }

    // Validate state filter
    if (state && !VALID_STATES.includes(state)) {
      return errorResponse(res, 400, 'INVALID_STATE', `state must be one of: ${VALID_STATES.join(', ')}`);
    }

    const allowedSortFields = {
      name: 'a.name',
      date: 'a.date',
      time: 'a.time',
      state: 'a.state',
      datetimeappointment: 'a.datetimeappointment',
      createdat: 'a.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'a.date';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (partner_id) {
      if (!isValidUUID(partner_id)) {
        return errorResponse(res, 400, 'INVALID_PARTNER_ID', 'partner_id must be a valid UUID');
      }
      conditions.push(`a.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    if (state) {
      conditions.push(`a.state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }

    if (df) {
      conditions.push(`a.date >= $${paramIdx}`);
      params.push(df);
      paramIdx++;
    }

    if (dt) {
      // If date_to is just a date (YYYY-MM-DD), convert to end of day (YYYY-MM-DD 23:59:59)
      // to include all appointments on that day
      const dateToValue = dt.length <= 10 ? `${dt} 23:59:59` : dt;
      conditions.push(`a.date <= $${paramIdx}`);
      params.push(dateToValue);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(a.name ILIKE $${paramIdx} OR a.note ILIKE $${paramIdx} OR a.reason ILIKE $${paramIdx} OR p.name ILIKE $${paramIdx} OR p.namenosign ILIKE $${paramIdx} OR p.ref ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.datetimeappointment,
        a.dateappointmentreminder,
        a.timeexpected,
        a.note,
        a.state,
        a.reason,
        a.aptstate,
        a.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.userid,
        au.name AS username,
        a.doctorid,
        doc.name AS doctorname,
        a.dotkhamid,
        dk.name AS dotkhamname,
        a.saleorderid,
        so.name AS saleordername,
        a.isrepeatcustomer,
        a.color,
        a.datetimearrived,
        a.datetimeseated,
        a.datetimedismissed,
        a.datedone,
        a.lastdatereminder,
        a.customercarestatus,
        a.isnotreatment,
        a.leadid,
        a.callid,
        a.teamid,
        t.name AS teamname,
        a.customerreceiptid,
        cr.dateexamination AS receiptdate,
        a.datecreated,
        a.lastupdated,
        a.createdbyid,
        a.writebyid
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN aspnetusers au ON au.id = a.userid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN dotkhams dk ON dk.id = a.dotkhamid
      LEFT JOIN saleorders so ON so.id = a.saleorderid
      LEFT JOIN crmteams t ON t.id = a.teamid
      LEFT JOIN customerreceipts cr ON cr.id = a.customerreceiptid
      ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM appointments a LEFT JOIN partners p ON p.id = a.partnerid ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      byState: {},
    };

    const stateCounts = await query(
      `SELECT a.state, COUNT(*) AS count
       FROM appointments a LEFT JOIN partners p ON p.id = a.partnerid
       ${whereClause}
       GROUP BY a.state`,
      params
    );
    stateCounts.forEach((row) => {
      aggregates.byState[row.state || 'unknown'] = parseInt(row.count, 10);
    });

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Appointments/:id
 * Returns: single appointment with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return errorResponse(res, 400, 'INVALID_ID', 'id must be a valid UUID');
    }

    const rows = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.datetimeappointment,
        a.dateappointmentreminder,
        a.timeexpected,
        a.note,
        a.state,
        a.reason,
        a.aptstate,
        a.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        p.email AS partneremail,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.userid,
        au.name AS username,
        a.doctorid,
        doc.name AS doctorname,
        a.dotkhamid,
        dk.name AS dotkhamname,
        a.saleorderid,
        so.name AS saleordername,
        a.isrepeatcustomer,
        a.color,
        a.datetimearrived,
        a.datetimeseated,
        a.datetimedismissed,
        a.datedone,
        a.lastdatereminder,
        a.customercarestatus,
        a.isnotreatment,
        a.leadid,
        a.callid,
        a.teamid,
        t.name AS teamname,
        a.customerreceiptid,
        cr.dateexamination AS receiptdate,
        a.datecreated,
        a.lastupdated,
        a.createdbyid,
        a.writebyid
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN aspnetusers au ON au.id = a.userid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN dotkhams dk ON dk.id = a.dotkhamid
      LEFT JOIN saleorders so ON so.id = a.saleorderid
      LEFT JOIN crmteams t ON t.id = a.teamid
      LEFT JOIN customerreceipts cr ON cr.id = a.customerreceiptid
      WHERE a.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Appointment not found');
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching appointment:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/Appointments
 * Body: { date, partnerId, doctorId, companyId, note, timeExpected, color, state }
 * Returns: created appointment
 */
router.post('/', async (req, res) => {
  try {
    // Accept both camelCase and lowercase field names (frontend sends lowercase)
    const b = req.body;
    const date = b.date;
    const time = b.time;
    const partnerId = b.partnerId || b.partnerid;
    const doctorId = b.doctorId || b.doctorid;
    const companyId = b.companyId || b.companyid;
    const note = b.note || '';
    const timeExpected = b.timeExpected || b.timeexpected || 30;
    const color = b.color || '1';
    const state = b.state || 'confirmed';

    // Validate required fields
    const missingFields = [];
    if (!date) missingFields.push('date');
    if (!partnerId) missingFields.push('partnerId');
    if (!companyId) missingFields.push('companyId');

    if (missingFields.length > 0) {
      return errorResponse(res, 400, 'MISSING_REQUIRED_FIELDS', `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate date format
    if (!isValidISODate(date)) {
      return errorResponse(res, 400, 'INVALID_DATE', 'date must be a valid ISO date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)');
    }

    // Validate UUIDs
    if (!isValidUUID(partnerId)) {
      return errorResponse(res, 400, 'INVALID_PARTNER_ID', 'partnerId must be a valid UUID');
    }

    if (!isValidUUID(companyId)) {
      return errorResponse(res, 400, 'INVALID_COMPANY_ID', 'companyId must be a valid UUID');
    }

    if (doctorId && !isValidUUID(doctorId)) {
      return errorResponse(res, 400, 'INVALID_DOCTOR_ID', 'doctorId must be a valid UUID');
    }

    // Validate state
    if (!VALID_STATES.includes(state)) {
      return errorResponse(res, 400, 'INVALID_STATE', `state must be one of: ${VALID_STATES.join(', ')}`);
    }

    // Validate timeExpected
    const timeExpectedNum = parseInt(timeExpected, 10);
    if (isNaN(timeExpectedNum) || timeExpectedNum < 1 || timeExpectedNum > 480) {
      return errorResponse(res, 400, 'INVALID_TIME_EXPECTED', 'timeExpected must be between 1 and 480 minutes');
    }

    // Check foreign keys exist
    if (!(await foreignKeyExists('partners', partnerId))) {
      return errorResponse(res, 404, 'PARTNER_NOT_FOUND', 'Partner with given partnerId does not exist');
    }

    if (!(await foreignKeyExists('companies', companyId))) {
      return errorResponse(res, 404, 'COMPANY_NOT_FOUND', 'Company with given companyId does not exist');
    }

    if (doctorId && !(await foreignKeyExists('employees', doctorId))) {
      return errorResponse(res, 404, 'DOCTOR_NOT_FOUND', 'Doctor with given doctorId does not exist');
    }

    // Generate appointment name (AP + sequence)
    const nameResult = await query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1 AS next_seq FROM appointments WHERE name LIKE 'AP%'"
    );
    const nextSeq = nameResult[0]?.next_seq || 1;
    const name = `AP${String(nextSeq).padStart(6, '0')}`;

    // Create appointment
    const result = await query(
      `INSERT INTO appointments (
        id, name, date, time, partnerid, doctorid, companyid, note, timeexpected,
        color, state, aptstate, isrepeatcustomer, isnotreatment, datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, NOW(), NOW()
      ) RETURNING *`,
      [name, date, time || null, partnerId, doctorId || null, companyId, note, timeExpectedNum, color, state, state]
    );

    const newAppointment = result[0];

    // Fetch full details with joins
    const rows = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.state,
        a.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.doctorid,
        doc.name AS doctorname,
        a.note,
        a.datecreated,
        a.lastupdated
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      WHERE a.id = $1`,
      [newAppointment.id]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating appointment:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/Appointments/:id
 * Body: { date, doctorId, note, state, timeExpected, color }
 * Returns: updated appointment
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Accept both camelCase and lowercase field names
    const b = req.body;
    const date = b.date;
    const doctorId = b.doctorId || b.doctorid;
    const note = b.note;
    const state = b.state;
    const timeExpected = b.timeExpected || b.timeexpected;
    const color = b.color;
    const time = b.time;

    // Validate ID
    if (!isValidUUID(id)) {
      return errorResponse(res, 400, 'INVALID_ID', 'id must be a valid UUID');
    }

    // Validate fields if provided (before existence check for consistent error handling)
    if (date !== undefined && !isValidISODate(date)) {
      return errorResponse(res, 400, 'INVALID_DATE', 'date must be a valid ISO date');
    }

    if (doctorId !== undefined) {
      if (!isValidUUID(doctorId)) {
        return errorResponse(res, 400, 'INVALID_DOCTOR_ID', 'doctorId must be a valid UUID');
      }
    }

    if (state !== undefined && !VALID_STATES.includes(state)) {
      return errorResponse(res, 400, 'INVALID_STATE', `state must be one of: ${VALID_STATES.join(', ')}`);
    }

    if (timeExpected !== undefined) {
      const timeExpectedNum = parseInt(timeExpected, 10);
      if (isNaN(timeExpectedNum) || timeExpectedNum < 1 || timeExpectedNum > 480) {
        return errorResponse(res, 400, 'INVALID_TIME_EXPECTED', 'timeExpected must be between 1 and 480 minutes');
      }
    }

    // Check if appointment exists
    const existing = await query('SELECT id FROM appointments WHERE id = $1', [id]);
    if (!existing || existing.length === 0) {
      return errorResponse(res, 404, 'NOT_FOUND', 'Appointment not found');
    }

    // Check foreign key constraints after validation and existence check
    if (doctorId !== undefined && !(await foreignKeyExists('employees', doctorId))) {
      return errorResponse(res, 404, 'DOCTOR_NOT_FOUND', 'Doctor with given doctorId does not exist');
    }

    // Build update fields
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (date !== undefined) {
      updates.push(`date = $${paramIdx}`);
      params.push(date);
      paramIdx++;
    }
    if (doctorId !== undefined) {
      updates.push(`doctorid = $${paramIdx}`);
      params.push(doctorId);
      paramIdx++;
    }
    if (note !== undefined) {
      updates.push(`note = $${paramIdx}`);
      params.push(note);
      paramIdx++;
    }
    if (state !== undefined) {
      updates.push(`state = $${paramIdx}`);
      updates.push(`aptstate = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }
    if (timeExpected !== undefined) {
      updates.push(`timeexpected = $${paramIdx}`);
      params.push(parseInt(timeExpected, 10));
      paramIdx++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIdx}`);
      params.push(color);
      paramIdx++;
    }
    if (time !== undefined) {
      updates.push(`time = $${paramIdx}`);
      params.push(time);
      paramIdx++;
    }

    // Always update lastupdated
    updates.push(`lastupdated = NOW()`);

    if (updates.length === 0) {
      return errorResponse(res, 400, 'NO_FIELDS_TO_UPDATE', 'No valid fields provided to update');
    }

    params.push(id);

    await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      params
    );

    // Fetch updated appointment
    const rows = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.state,
        a.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.doctorid,
        doc.name AS doctorname,
        a.note,
        a.datecreated,
        a.lastupdated
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      WHERE a.id = $1`,
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating appointment:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
