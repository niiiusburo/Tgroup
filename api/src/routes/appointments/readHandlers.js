const { query } = require('../../db');
const { errorResponse, isValidISODate, isValidUUID, VALID_STATES } = require('./helpers');

/**
 * GET /api/Appointments
 * Query params: partner_id, offset, limit, search, sortField, sortOrder, dateFrom, dateTo
 * Returns: customer's appointments
 */
async function listAppointments(req, res) {
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
      company_id = '',
      doctor_id = '',
      companyId = '',
      doctorId = '',
      calendar_mode = '',
      calendarMode = '',
      include_counts = '',
      includeCounts = '',
    } = req.query;

    // Accept either snake_case (current frontend) or camelCase (new passthrough casing)
    const effectiveCompanyId = company_id || companyId;
    const effectiveDoctorId = doctor_id || doctorId;
    const calendarModeEnabled = String(calendar_mode || calendarMode).toLowerCase() === 'true';
    const includeCountsEnabled = String(include_counts || includeCounts).toLowerCase() !== 'false';

    // Accept either date_from (snake_case from frontend) or dateFrom (camelCase)
    const effectiveDateFrom = date_from || dateFrom;
    const effectiveDateTo = date_to || dateTo;

    // Validate offset and limit
    const offsetNum = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(offsetNum) || offsetNum < 0) {
      return errorResponse(res, 400, 'INVALID_OFFSET', 'offset must be a non-negative integer');
    }

    const maxLimit = calendarModeEnabled ? 3000 : 500;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) {
      return errorResponse(res, 400, 'INVALID_LIMIT', `limit must be between 1 and ${maxLimit}`);
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

    if (effectiveCompanyId) {
      if (!isValidUUID(effectiveCompanyId)) {
        return errorResponse(res, 400, 'INVALID_COMPANY_ID', 'company_id must be a valid UUID');
      }
      conditions.push(`a.companyid = $${paramIdx}`);
      params.push(effectiveCompanyId);
      paramIdx++;
    }

    if (effectiveDoctorId) {
      if (!isValidUUID(effectiveDoctorId)) {
        return errorResponse(res, 400, 'INVALID_DOCTOR_ID', 'doctor_id must be a valid UUID');
      }
      conditions.push(`a.doctorid = $${paramIdx}`);
      params.push(effectiveDoctorId);
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


    const calendarSelect = `
        a.id,
        a.name,
        a.date,
        a.time,
        a.datetimeappointment,
        a.timeexpected,
        a.note,
        a.state,
        a.reason,
        a.partnerid,
        p.name AS partnername,
        p.phone AS partnerphone,
        p.ref AS partnercode,
        a.companyid,
        c.name AS companyname,
        a.doctorid,
        doc.name AS doctorname,
        a.assistantid,
        ass.name AS assistantname,
        a.dentalaideid,
        da.name AS dentalaidename,
        a.color,
        a.datetimearrived,
        a.datetimeseated,
        a.datetimedismissed,
        a.datedone,
        a.datecreated,
        a.lastupdated,
        a.productid,
        prod.name AS productname`;

    const fullSelect = `
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
        a.assistantid,
        ass.name AS assistantname,
        a.dentalaideid,
        da.name AS dentalaidename,
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
        a.writebyid,
        a.productid,
        prod.name AS productname`;

    const calendarJoins = `
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN employees ass ON ass.id = a.assistantid
      LEFT JOIN employees da ON da.id = a.dentalaideid
      LEFT JOIN products prod ON prod.id = a.productid`;

    const fullJoins = `
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN aspnetusers au ON au.id = a.userid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN employees ass ON ass.id = a.assistantid
      LEFT JOIN employees da ON da.id = a.dentalaideid
      LEFT JOIN dotkhams dk ON dk.id = a.dotkhamid
      LEFT JOIN saleorders so ON so.id = a.saleorderid
      LEFT JOIN crmteams t ON t.id = a.teamid
      LEFT JOIN customerreceipts cr ON cr.id = a.customerreceiptid
      LEFT JOIN products prod ON prod.id = a.productid`;

    const items = await query(
      `SELECT
      ${calendarModeEnabled ? calendarSelect : fullSelect}
      ${calendarModeEnabled ? calendarJoins : fullJoins}
      ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    let totalItems = offsetNum + items.length;
    let aggregates = null;
    if (includeCountsEnabled) {
      const countResult = await query(
        `SELECT COUNT(*) AS count FROM appointments a LEFT JOIN partners p ON p.id = a.partnerid ${whereClause}`,
        params
      );
      totalItems = parseInt(countResult[0]?.count || '0', 10);

      aggregates = {
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
    }


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
}

/**
 * GET /api/Appointments/:id
 * Returns: single appointment with details
 */
async function getAppointmentById(req, res) {
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
        a.writebyid,
        a.productid,
        prod.name AS productname,
        a.assistantid,
        ass.name AS assistantname,
        a.dentalaideid,
        da.name AS dentalaidename
      FROM appointments a
      LEFT JOIN partners p ON p.id = a.partnerid
      LEFT JOIN companies c ON c.id = a.companyid
      LEFT JOIN aspnetusers au ON au.id = a.userid
      LEFT JOIN employees doc ON doc.id = a.doctorid
      LEFT JOIN employees ass ON ass.id = a.assistantid
      LEFT JOIN employees da ON da.id = a.dentalaideid
      LEFT JOIN dotkhams dk ON dk.id = a.dotkhamid
      LEFT JOIN saleorders so ON so.id = a.saleorderid
      LEFT JOIN crmteams t ON t.id = a.teamid
      LEFT JOIN customerreceipts cr ON cr.id = a.customerreceiptid
      LEFT JOIN products prod ON prod.id = a.productid
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
}

module.exports = {
  getAppointmentById,
  listAppointments,
};
