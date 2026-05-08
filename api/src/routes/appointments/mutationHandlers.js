const { query } = require('../../db');
const { errorResponse, foreignKeyExists, isValidISODate, isValidUUID, readBodyField, VALID_STATES } = require('./helpers');

const VIETNAM_NOW_SQL = `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')`;

/**
 * POST /api/Appointments
 * Body: { date, partnerId, doctorId, companyId, note, timeExpected, color, state }
 * Returns: created appointment
 */
async function createAppointment(req, res) {
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
    const productId = b.productId || b.productid || null;
    const assistantId = b.assistantId || b.assistantid || null;
    const dentalAideId = b.dentalAideId || b.dentalaideid || null;

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
        color, state, aptstate, isrepeatcustomer, isnotreatment, productid, assistantid, dentalaideid,
        datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, $12, $13, $14, ${VIETNAM_NOW_SQL}, ${VIETNAM_NOW_SQL}
      ) RETURNING *`,
      [name, date, time || null, partnerId, doctorId || null, companyId, note, timeExpectedNum, color, state, state, productId, assistantId, dentalAideId]
    );

    const newAppointment = result[0];

    // Fetch full details with joins
    const rows = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.timeexpected,
        a.note,
        a.state,
        a.reason,
        a.color,
        a.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.doctorid,
        doc.name AS doctorname,
        a.productid,
        prod.name AS productname,
        a.datecreated,
        a.lastupdated,
        a.assistantid,
        ass.name AS assistantname,
        a.dentalaideid,
        da.name AS dentalaidename
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN employees ass ON ass.id = a.assistantid
      LEFT JOIN employees da ON da.id = a.dentalaideid
      LEFT JOIN products prod ON prod.id = a.productid
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
}

/**
 * PUT /api/Appointments/:id
 * Body: { date, doctorId, note, state, timeExpected, color }
 * Returns: updated appointment
 */
async function updateAppointment(req, res) {
  try {
    const { id } = req.params;
    // Accept both camelCase and lowercase field names
    const b = req.body;
    const date = b.date;
    const doctorId = readBodyField(b, 'doctorId', 'doctorid');
    const note = b.note;
    const state = b.state;
    const timeExpected = readBodyField(b, 'timeExpected', 'timeexpected');
    const color = b.color;
    const time = b.time;
    const productId = readBodyField(b, 'productId', 'productid');
    const assistantId = readBodyField(b, 'assistantId', 'assistantid');
    const dentalAideId = readBodyField(b, 'dentalAideId', 'dentalaideid');

    // Validate ID
    if (!isValidUUID(id)) {
      return errorResponse(res, 400, 'INVALID_ID', 'id must be a valid UUID');
    }

    // Validate fields if provided (before existence check for consistent error handling)
    if (date !== undefined && !isValidISODate(date)) {
      return errorResponse(res, 400, 'INVALID_DATE', 'date must be a valid ISO date');
    }

    if (doctorId !== undefined && doctorId !== null) {
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
    if (doctorId !== undefined && doctorId !== null && !(await foreignKeyExists('employees', doctorId))) {
      return errorResponse(res, 404, 'DOCTOR_NOT_FOUND', 'Doctor with given doctorId does not exist');
    }

    // Build update fields
    const updates = [];
    const params = [];
    let paramIdx = 1;
    const nowSql = VIETNAM_NOW_SQL;

    if (date !== undefined) {
      updates.push(`date = $${paramIdx}`);
      params.push(date);
      paramIdx++;
    }
    if (doctorId !== undefined) {
      updates.push(`doctorid = $${paramIdx}`);
      params.push(doctorId || null);
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
      if (state === 'arrived') {
        // Reset datetimearrived when transitioning INTO 'arrived' from any
        // other state (re-activation after done/cancelled, or first arrival).
        // Only preserve the existing value if the row was already 'arrived' —
        // otherwise a re-arrival would inherit a stale check-in timestamp and
        // the wait timer would count from the previous visit.
        updates.push(`datetimearrived = CASE WHEN state = 'arrived' THEN COALESCE(datetimearrived, ${nowSql}) ELSE ${nowSql} END`);
        // Clear datedone so the previous "done" timestamp doesn't bleed into
        // the new visit. datetimeseated is also cleared so re-seating fires.
        updates.push(`datedone = CASE WHEN state = 'arrived' THEN datedone ELSE NULL END`);
        updates.push(`datetimeseated = CASE WHEN state = 'arrived' THEN datetimeseated ELSE NULL END`);
      }
      if (state === 'in Examination' || state === 'in-progress') {
        updates.push(`datetimeseated = COALESCE(datetimeseated, ${nowSql})`);
      }
      if (state === 'done') {
        updates.push(`datedone = COALESCE(datedone, ${nowSql})`);
      }
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
    if (productId !== undefined) {
      updates.push(`productid = $${paramIdx}`);
      params.push(productId || null);
      paramIdx++;
    }
    if (assistantId !== undefined) {
      updates.push(`assistantid = $${paramIdx}`);
      params.push(assistantId || null);
      paramIdx++;
    }
    if (dentalAideId !== undefined) {
      updates.push(`dentalaideid = $${paramIdx}`);
      params.push(dentalAideId || null);
      paramIdx++;
    }

    // Always update lastupdated
    updates.push(`lastupdated = ${nowSql}`);

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
        a.timeexpected,
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
        a.datetimearrived,
        a.datetimeseated,
        a.datetimedismissed,
        a.datedone,
        a.productid,
        prod.name AS productname,
        a.datecreated,
        a.lastupdated,
        a.assistantid,
        ass.name AS assistantname,
        a.dentalaideid,
        da.name AS dentalaidename
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN employees ass ON ass.id = a.assistantid
      LEFT JOIN employees da ON da.id = a.dentalaideid
      LEFT JOIN products prod ON prod.id = a.productid
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
}

module.exports = {
  createAppointment,
  updateAppointment,
};
