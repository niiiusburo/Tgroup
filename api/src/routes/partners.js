const express = require('express');
const { query } = require('../db');

const router = express.Router();

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

    if (search) {
      conditions.push(
        `(p.name ILIKE $${paramIdx} OR p.namenosign ILIKE $${paramIdx} OR p.phone ILIKE $${paramIdx} OR p.ref ILIKE $${paramIdx} OR p.email ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

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
        p.sourceid,
        ps.name AS sourcename,
        p.referraluserid,
        p.agentid,
        a.name AS agentname,
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
      FROM partners p
      LEFT JOIN companies c ON c.id = p.companyid
      LEFT JOIN partnersources ps ON ps.id = p.sourceid
      LEFT JOIN agents a ON a.id = p.agentid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM partners p WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      active: await query(
        `SELECT COUNT(*) AS count FROM partners p WHERE ${whereClause} AND p.active = true`,
        params
      ).then(r => parseInt(r[0]?.count || '0', 10)),
      inactive: await query(
        `SELECT COUNT(*) AS count FROM partners p WHERE ${whereClause} AND p.active = false`,
        params
      ).then(r => parseInt(r[0]?.count || '0', 10)),
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

/**
 * GET /api/Partners/:id
 * Returns: full partner/customer profile with all fields
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        p.id,
        p.ref AS code,
        p.displayname,
        p.name,
        p.phone,
        p.email,
        p.street,
        p.citycode,
        p.cityname AS city,
        p.districtcode,
        p.districtname AS district,
        p.wardcode,
        p.wardname AS ward,
        p.citycodev2,
        p.citynamev2,
        p.wardcodev2,
        p.wardnamev2,
        p.usedaddressv2,
        p.gender,
        p.birthyear,
        p.birthmonth,
        p.birthday,
        p.medicalhistory,
        p.comment,
        p.note,
        p.active AS status,
        p.treatmentstatus,
        p.sourceid,
        ps.name AS sourcename,
        p.referraluserid,
        p.agentid,
        a.name AS agentname,
        p.companyid,
        c.name AS companyname,
        p.datecreated,
        p.lastupdated,
        p.createdbyid,
        au1.name AS createdbyname,
        p.writebyid,
        au2.name AS updatedbyname,
        p.avatar,
        p.zaloid,
        p.taxcode,
        p.identitynumber,
        p.healthinsurancecardnumber,
        p.emergencyphone,
        p.weight,
        p.barcode,
        p.fax,
        p.hotline,
        p.website,
        p.jobtitle,
        p.iscompany,
        p.ishead,
        p.isbusinessinvoice,
        p.unitname,
        p.unitaddress,
        p.customername,
        p.invoicereceivingmethod,
        p.receiveremail,
        p.receiverzalonumber,
        p.personalidentitycard,
        p.personaltaxcode,
        p.personaladdress,
        p.personalname,
        p.stageid,
        p.lasttreatmentcompletedate,
        p.sequencenumber,
        p.sequenceprefix,
        p.supplier,
        p.customer,
        p.isagent,
        p.isinsurance,
        p.employee,
        (SELECT COUNT(*) FROM appointments apt WHERE apt.partnerid = p.id) AS appointmentcount,
        (SELECT COUNT(*) FROM saleorders so WHERE so.partnerid = p.id AND so.isdeleted = false) AS ordercount,
        (SELECT COUNT(*) FROM dotkhams dk WHERE dk.partnerid = p.id AND dk.isdeleted = false) AS dotkhamcount
      FROM partners p
      LEFT JOIN companies c ON c.id = p.companyid
      LEFT JOIN partnersources ps ON ps.id = p.sourceid
      LEFT JOIN agents a ON a.id = p.agentid
      LEFT JOIN aspnetusers au1 ON au1.id = p.createdbyid
      LEFT JOIN aspnetusers au2 ON au2.id = p.writebyid
      WHERE p.id = $1 AND p.isdeleted = false`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Partners/:id/GetKPIs
 * Returns: {totalTreatmentAmount, expectedRevenue, actualRevenue, debt, advancePayment, pointBalance}
 */
router.get('/:id/GetKPIs', async (req, res) => {
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
router.post('/', async (req, res) => {
  try {
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
      medicalhistory,
      note,
      comment,
      sourceid,
      referraluserid,
      customer = true,
      status = true,
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const duplicate = await query(
      'SELECT id FROM partners WHERE phone = $1 LIMIT 1',
      [phone]
    );
    if (duplicate && duplicate.length > 0) {
      return res.status(409).json({ error: 'Phone number already exists' });
    }

    // Generate a new UUID
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // Generate customer code (T + random 6 digits)
    const code = 'T' + Math.floor(100000 + Math.random() * 900000);

    const result = await query(
      `INSERT INTO partners (
        id, name, phone, email, companyid, gender,
        birthday, birthmonth, birthyear, street,
        medicalhistory, note, comment, sourceid, referraluserid,
        customer, active, ref, datecreated, lastupdated, isdeleted,
        supplier, employee, isagent, isinsurance, iscompany, ishead, isbusinessinvoice
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW(), false, false, false, false, false, false, false, false)
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
        medicalhistory || null,
        note || null,
        comment || null,
        sourceid || null,
        referraluserid || null,
        customer,
        status,
        code,
      ]
    );

    return res.status(201).json(result[0]);
  } catch (err) {
    console.error('Error creating partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/Partners/:id
 * Updates an existing customer/partner
 * Body: partner fields to update
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      medicalhistory,
      note,
      comment,
      sourceid,
      referraluserid,
    } = req.body;

    // Check if partner exists
    const existing = await query(
      'SELECT id FROM partners WHERE id = $1 AND isdeleted = false',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const result = await query(
      `UPDATE partners SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        companyid = COALESCE($4, companyid),
        gender = COALESCE($5, gender),
        birthday = COALESCE($6, birthday),
        birthmonth = COALESCE($7, birthmonth),
        birthyear = COALESCE($8, birthyear),
        street = COALESCE($9, street),
        medicalhistory = COALESCE($10, medicalhistory),
        note = COALESCE($11, note),
        comment = COALESCE($12, comment),
        sourceid = COALESCE($13, sourceid),
        referraluserid = COALESCE($14, referraluserid),
        lastupdated = NOW()
      WHERE id = $15
      RETURNING *`,
      [
        name,
        phone,
        email,
        companyid,
        gender,
        birthday,
        birthmonth,
        birthyear,
        street,
        medicalhistory,
        note,
        comment,
        sourceid,
        referraluserid,
        id,
      ]
    );

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating partner:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/Partners/:id/soft-delete
 * Soft-deletes a partner by setting isdeleted = true
 */
router.patch('/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE partners SET
        isdeleted = true,
        lastupdated = NOW()
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
router.delete('/:id/hard-delete', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id FROM partners WHERE id = $1 AND customer = true',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const [aptResult, soResult, dkResult] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM appointments WHERE partnerid = $1', [id]),
      query('SELECT COUNT(*) AS count FROM saleorders WHERE partnerid = $1 AND isdeleted = false', [id]),
      query('SELECT COUNT(*) AS count FROM dotkhams WHERE partnerid = $1 AND isdeleted = false', [id]),
    ]);

    const appointments = parseInt(aptResult[0]?.count || '0', 10);
    const saleorders = parseInt(soResult[0]?.count || '0', 10);
    const dotkhams = parseInt(dkResult[0]?.count || '0', 10);

    if (appointments > 0 || saleorders > 0 || dotkhams > 0) {
      return res.status(409).json({
        error: 'Partner has linked records',
        linked: { appointments, saleorders, dotkhams },
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
