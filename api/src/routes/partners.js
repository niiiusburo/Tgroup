const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { PartnerCreateSchema, PartnerUpdateSchema } = require('@tgroup/contracts');
const { applyPartnerListFilters } = require('./partners/listFilters');
const { applyPartnerSearchFilter } = require('./partners/searchFilters');
const { getPartnerById } = require('./partners/getPartnerById');

const router = express.Router();

// All uuid columns in dbo.partners — empty strings → null for PostgreSQL
const UUID_FIELDS = [
  'companyid','titleid','agentid','countryid','stateid',
  'stageid','contactstatusid','marketingteamid','saleteamid',
  'cskhid','salestaffid','sourceid','hrjobid','tier_id',
];
function sanitizeUuids(o){for(const f of UUID_FIELDS)if(o[f]===''||o[f]===undefined)o[f]=null;}

/**
 * GET /api/Partners
 * Query params: offset, limit, search, sortField, sortOrder, filters
 * Returns: {offset, limit, totalItems, items[], aggregates}
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'datecreated',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'p.name',
      displayname: 'p.displayname',
      ref: 'p.ref',
      phone: 'p.phone',
      email: 'p.email',
      datecreated: 'p.datecreated',
      city: 'p.cityname',
      status: 'p.treatmentstatus',
    };

    const orderByCol = allowedSortFields[sortField] || 'p.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['p.customer = true', 'p.isdeleted = false'];
    const params = [];
    let paramIdx = 1;

    paramIdx = applyPartnerSearchFilter({ search, conditions, params, paramIdx });
    paramIdx = applyPartnerListFilters({ query: req.query, conditions, params, paramIdx });

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        p.id,
        p.ref AS code,
        p.displayname,
        p.name,
        p.phone,
        p.email,
        p.street,
        p.cityname AS city,
        p.districtname AS district,
        p.wardname AS ward,
        p.gender,
        p.birthyear,
        p.birthmonth,
        p.birthday,
        p.medicalhistory,
        p.comment,
        p.note,
        p.active AS status,
        p.treatmentstatus,
        p.sourceid, cs.name AS sourcename, p.referraluserid,
        p.agentid,
        a.name AS agentname,
        p.cskhid,
        cskh_staff.name AS cskhname,
        p.salestaffid,
        sales_staff.name AS salestaffname,
        p.companyid,
        c.name AS companyname,
        p.datecreated,
        p.lastupdated,
        p.createdbyid,
        p.writebyid,
        p.avatar,
        p.zaloid,
        p.taxcode,
        p.identitynumber,
        p.healthinsurancecardnumber,
        p.emergencyphone,
        p.weight,
        0 AS appointmentcount,
        0 AS ordercount,
        0 AS dotkhamcount
      FROM partners p LEFT JOIN customersources cs ON cs.id = p.sourceid
      LEFT JOIN companies c ON c.id = p.companyid
      LEFT JOIN agents a ON a.id = p.agentid
      LEFT JOIN partners cskh_staff ON cskh_staff.id = p.cskhid
      LEFT JOIN partners sales_staff ON sales_staff.id = p.salestaffid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    // Single query: get total, active, and inactive counts in one pass
    const countResult = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE p.active = true)::int AS active,
        COUNT(*) FILTER (WHERE p.active = false)::int AS inactive
      FROM partners p WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0]?.total || 0;

    const aggregates = {
      total: totalItems,
      active: countResult[0]?.active || 0,
      inactive: countResult[0]?.inactive || 0,
    };

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching partners:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      aggregates: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// declared before /:id to prevent Express matching 'check-unique' as an id param.
router.get('/check-unique', async (req, res) => {
  try {
    const { field, value, excludeId } = req.query;

    if (!field || !['phone', 'email'].includes(field)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: "Tham số 'field' phải là 'phone' hoặc 'email'",
        },
      });
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (!trimmed) {
      return res.json({ unique: true });
    }

    let rows;
    if (field === 'phone') {
      if (excludeId) {
        rows = await query(
          'SELECT id FROM partners WHERE phone = $1 AND id <> $2 LIMIT 1',
          [trimmed, excludeId]
        );
      } else {
        rows = await query(
          'SELECT id FROM partners WHERE phone = $1 LIMIT 1',
          [trimmed]
        );
      }
    } else {
      // email — case-insensitive comparison
      if (excludeId) {
        rows = await query(
          'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
          [trimmed, excludeId]
        );
      } else {
        rows = await query(
          'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [trimmed]
        );
      }
    }

    if (rows && rows.length > 0) {
      return res.json({ unique: false, conflictField: field });
    }

    return res.json({ unique: true });
  } catch (err) {
    console.error('Error checking field uniqueness:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

router.get('/:id', requirePermission('customers.view'), getPartnerById);

/**
 * GET /api/Partners/:id/GetKPIs
 * Returns: {totalTreatmentAmount, expectedRevenue, actualRevenue, debt, advancePayment, pointBalance}
 */
router.get('/:id/GetKPIs', requirePermission('customers.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const kpiResult = await query(
      `SELECT
        COALESCE((
          SELECT SUM(sol.pricetotal)
          FROM saleorderlines sol
          JOIN saleorders so ON so.id = sol.orderid
          WHERE so.partnerid = $1 AND so.isdeleted = false AND sol.isdeleted = false
        ), 0) AS totaltreatmentamount,
        COALESCE((
          SELECT SUM(so.amounttotal)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS expectedrevenue,
        COALESCE((
          SELECT SUM(so.totalpaid)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS actualrevenue,
        COALESCE((
          SELECT SUM(so.residual)
          FROM saleorders so
          WHERE so.partnerid = $1 AND so.isdeleted = false
        ), 0) AS debt,
        COALESCE((
          SELECT SUM(ap.amount)
          FROM accountpayments ap
          WHERE ap.partnerid = $1 AND ap.paymenttype = 'inbound' AND ap.state = 'posted'
        ), 0) AS advancepayment,
        0 AS pointbalance`,
      [id]
    );

    const kpi = kpiResult[0] || {};

    return res.json({
      totalTreatmentAmount: parseFloat(kpi.totaltreatmentamount || 0),
      expectedRevenue: parseFloat(kpi.expectedrevenue || 0),
      actualRevenue: parseFloat(kpi.actualrevenue || 0),
      debt: parseFloat(kpi.debt || 0),
      advancePayment: parseFloat(kpi.advancepayment || 0),
      pointBalance: parseInt(kpi.pointbalance || 0, 10),
    });
  } catch (err) {
    console.error('Error fetching partner KPIs:', err);
    return res.status(500).json({
      totalTreatmentAmount: 0,
      expectedRevenue: 0,
      actualRevenue: 0,
      debt: 0,
      advancePayment: 0,
      pointBalance: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/Partners
 * Creates a new customer/partner
 * Body: partner fields
 */
router.post('/', requirePermission('customers.add'), validate(PartnerCreateSchema), async (req, res) => {
  try {
    sanitizeUuids(req.body);
    const {
      name,
      phone,
      email,
      companyid,
      gender,
      birthday,
      birthmonth,
      birthyear,
      street,
      cityname,
      districtname,
      wardname,
      medicalhistory,
      note,
      comment,
      sourceid,
      referraluserid,
      weight,
      identitynumber,
      healthinsurancecardnumber,
      emergencyphone,
      jobtitle,
      taxcode,
      unitname,
      unitaddress,
      isbusinessinvoice,
      personalname,
      personalidentitycard,
      personaltaxcode,
      personaladdress,
      salestaffid,
      cskhid,
      customer = true,
      status = true,
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'Vui lòng nhập đầy đủ tên và số điện thoại',
        },
      });
    }

    const phoneDup = await query(
      'SELECT id FROM partners WHERE phone = $1 LIMIT 1',
      [phone]
    );
    if (phoneDup && phoneDup.length > 0) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_FIELD',
          field: 'phone',
          message: 'Số điện thoại này đã được sử dụng',
        },
      });
    }
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    if (trimmedEmail) {
      const emailDup = await query(
        'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [trimmedEmail]
      );
      if (emailDup && emailDup.length > 0) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_FIELD',
            field: 'email',
            message: 'Email này đã được sử dụng',
          },
        });
      }
    }

    // Generate a new UUID
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // Generate customer code (T + random 6 digits)
    const code = 'T' + Math.floor(100000 + Math.random() * 900000);

    const result = await query(
      `INSERT INTO partners (
        id, name, phone, email, companyid, gender,
        birthday, birthmonth, birthyear, street, cityname, districtname, wardname,
        medicalhistory, note, comment, referraluserid, sourceid,
        weight, identitynumber, healthinsurancecardnumber, emergencyphone, jobtitle,
        taxcode, unitname, unitaddress, isbusinessinvoice, personalname,
        personalidentitycard, personaltaxcode, personaladdress, salestaffid, cskhid,
        customer, active, ref, datecreated, lastupdated, isdeleted,
        supplier, employee, isagent, isinsurance, iscompany, ishead
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), false, false, false, false, false, false, false)
      RETURNING *`,
      [
        id,
        name,
        phone,
        email || null,
        companyid || null,
        gender || null,
        birthday || null,
        birthmonth || null,
        birthyear || null,
        street || null,
        cityname || null,
        districtname || null,
        wardname || null,
        medicalhistory || null,
        note || null,
        comment || null,
        referraluserid || null,
        sourceid || null,
        weight || null,
        identitynumber || null,
        healthinsurancecardnumber || null,
        emergencyphone || null,
        jobtitle || null,
        taxcode || null,
        unitname || null,
        unitaddress || null,
        isbusinessinvoice || false,
        personalname || null,
        personalidentitycard || null,
        personaltaxcode || null,
        personaladdress || null,
        salestaffid || null,
        cskhid || null,
        customer,
        status,
        code,
      ]
    );

    return res.status(201).json(result[0]);
  } catch (err) {
    console.error('Error creating partner:', err);
    const pg = err || {};
    return res.status(500).json({
      error: {
        code: pg.code || 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error',
        detail: pg.detail || null,
        field: pg.column || null,
        hint: pg.hint || null,
      },
    });
  }
});

/**
 * PUT /api/Partners/:id
 * Updates an existing customer/partner
 * Body: partner fields to update
 */
router.put('/:id', requirePermission('customers.edit'), validate(PartnerUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    sanitizeUuids(req.body);
    const {
      name, phone, email, companyid, gender, birthday, birthmonth, birthyear,
      street, cityname, districtname, wardname, medicalhistory, note, comment,
      sourceid,
      referraluserid, weight, identitynumber, healthinsurancecardnumber,
      emergencyphone, jobtitle, taxcode, unitname, unitaddress, isbusinessinvoice,
      personalname, personalidentitycard, personaltaxcode, personaladdress, ref,
      cskhid, salestaffid,
    } = req.body;

    // Check if partner exists
    const existing = await query(
      'SELECT id FROM partners WHERE id = $1 AND isdeleted = false',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check phone uniqueness excluding this partner
    if (phone !== undefined) {
      const phoneDup = await query(
        'SELECT id FROM partners WHERE phone = $1 AND id <> $2 LIMIT 1',
        [phone, id]
      );
      if (phoneDup && phoneDup.length > 0) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_FIELD',
            field: 'phone',
            message: 'Số điện thoại này đã được sử dụng',
          },
        });
      }
    }
    // Check email uniqueness (case-insensitive) excluding this partner
    const trimmedEmailPut = typeof email === 'string' ? email.trim() : '';
    if (trimmedEmailPut) {
      const emailDup = await query(
        'SELECT id FROM partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1',
        [trimmedEmailPut, id]
      );
      if (emailDup && emailDup.length > 0) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_FIELD',
            field: 'email',
            message: 'Email này đã được sử dụng',
          },
        });
      }
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = {
      name, phone, email, companyid, gender, birthday, birthmonth, birthyear,
      street, medicalhistory, note, comment, sourceid, referraluserid,
      cityname, districtname, wardname, weight, identitynumber,
      healthinsurancecardnumber, emergencyphone, jobtitle, taxcode,
      unitname, unitaddress, isbusinessinvoice, personalname,
      personalidentitycard, personaltaxcode, personaladdress, ref, cskhid, salestaffid,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    values.push(id);

    const result = await query(
      `UPDATE partners SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating partner:', err);
    const pg = err || {};
    return res.status(500).json({
      error: {
        code: pg.code || 'UNKNOWN',
        message: err instanceof Error ? err.message : 'Unknown error',
        detail: pg.detail || null,
        field: pg.column || null,
        hint: pg.hint || null,
      },
    });
  }
});

/**
 * PATCH /api/Partners/:id/soft-delete
 * Soft-deletes a partner by setting isdeleted = true
 */
router.patch('/:id/soft-delete', requirePermission('customers.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE partners SET
        isdeleted = true,
        lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      WHERE id = $1 AND customer = true AND isdeleted = false
      RETURNING *`,
      [id]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json(result[0]);
  } catch (err) {
    console.error('Error soft-deleting partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/Partners/:id/hard-delete
 * Hard-deletes a partner after FK-safe checks
 */
router.delete('/:id/hard-delete', requirePermission('customers.hard_delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id FROM partners WHERE id = $1 AND customer = true',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const [
      aptResult, soResult, dkResult,
      payResult, acpResult, crResult,
      crmResult, spResult, mpResult,
      epResult, elsResult
    ] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM appointments WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM saleorders WHERE partnerid = $1 AND isdeleted = false', [id]),
      query('SELECT COUNT(*) AS count FROM dotkhams WHERE partnerid = $1 AND isdeleted = false', [id]),
      query('SELECT COUNT(*) AS count FROM payments WHERE customer_id = $1', [id]),
      query('SELECT COUNT(*) AS count FROM accountpayments WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM customerreceipts WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM crmtasks WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM stockpickings WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM monthlyplans WHERE customer_id = $1', [id]),
      query('SELECT COUNT(*) AS count FROM employee_permissions WHERE employee_id = $1', [id]),
      query('SELECT COUNT(*) AS count FROM employee_location_scope WHERE employee_id = $1', [id]),
    ]);

    const appointments = parseInt(aptResult[0]?.count || '0', 10);
    const saleorders = parseInt(soResult[0]?.count || '0', 10);
    const dotkhams = parseInt(dkResult[0]?.count || '0', 10);
    const payments = parseInt(payResult[0]?.count || '0', 10);
    const accountpayments = parseInt(acpResult[0]?.count || '0', 10);
    const customerreceipts = parseInt(crResult[0]?.count || '0', 10);
    const crmtasks = parseInt(crmResult[0]?.count || '0', 10);
    const stockpickings = parseInt(spResult[0]?.count || '0', 10);
    const monthlyplans = parseInt(mpResult[0]?.count || '0', 10);
    const employeePermissions = parseInt(epResult[0]?.count || '0', 10);
    const employeeLocationScopes = parseInt(elsResult[0]?.count || '0', 10);

    if (
      appointments > 0 || saleorders > 0 || dotkhams > 0 ||
      payments > 0 || accountpayments > 0 || customerreceipts > 0 ||
      crmtasks > 0 || stockpickings > 0 || monthlyplans > 0 ||
      employeePermissions > 0 || employeeLocationScopes > 0
    ) {
      return res.status(409).json({
        error: 'Partner has linked records',
        linked: {
          appointments, saleorders, dotkhams, payments, accountpayments,
          customerreceipts, crmtasks, stockpickings, monthlyplans,
          employeePermissions, employeeLocationScopes,
        },
      });
    }

    const deleteResult = await query(
      'DELETE FROM partners WHERE id = $1 AND customer = true RETURNING id',
      [id]
    );

    if (!deleteResult || deleteResult.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json({ success: true, id: deleteResult[0].id });
  } catch (err) {
    console.error('Error hard-deleting partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
