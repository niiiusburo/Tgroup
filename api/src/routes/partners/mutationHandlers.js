const { query } = require('../../db');

const UUID_FIELDS = [
  'companyid','titleid','agentid','countryid','stateid',
  'stageid','contactstatusid','marketingteamid','saleteamid',
  'cskhid','salestaffid','sourceid','hrjobid','tier_id',
];

function sanitizeUuids(o) {
  for (const f of UUID_FIELDS) if (o[f] === '' || o[f] === undefined) o[f] = null;
}

/**
 * POST /api/Partners
 * Creates a new customer/partner
 * Body: partner fields
 */
async function createPartner(req, res) {
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
}

/**
 * PUT /api/Partners/:id
 * Updates an existing customer/partner
 * Body: partner fields to update
 */
async function updatePartner(req, res) {
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
}

/**
 * PATCH /api/Partners/:id/soft-delete
 * Soft-deletes a partner by setting isdeleted = true
 */
async function softDeletePartner(req, res) {
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
}

/**
 * DELETE /api/Partners/:id/hard-delete
 * Hard-deletes a partner after FK-safe checks
 */
async function hardDeletePartner(req, res) {
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
}

module.exports = {
  createPartner,
  hardDeletePartner,
  softDeletePartner,
  updatePartner,
};
