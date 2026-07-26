const db = require('../../db');

const legacyQuery = db.query;
const getRequestQuery = (req) => (
  typeof db.getQuery === 'function' ? db.getQuery(req) : legacyQuery
);

const CUSTOMER_CODE_DIGITS = 6;
const CUSTOMER_CODE_MAX_ATTEMPTS = 20;

const UUID_FIELDS = [
  'companyid','titleid','agentid','countryid','stateid',
  'stageid','contactstatusid','marketingteamid','saleteamid',
  'cskhid','salestaffid','sourceid','hrjobid','tier_id',
];

function sanitizeUuids(o, { preserveUndefined = false } = {}) {
  for (const f of UUID_FIELDS) {
    if (o[f] === '' || (!preserveUndefined && o[f] === undefined)) o[f] = null;
  }
}

function rejectPartnerSourceMutation(res) {
  return res.status(400).json({
    error: {
      code: 'PARTNER_SOURCE_READ_ONLY',
      message: 'Nguồn khách hàng không thể thay đổi từ hồ sơ khách hàng',
    },
  });
}

function sameNullableUuid(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function isCosmeticRequest(req) {
  const lob = req?.lob || req?.query?.lob || req?.headers?.['x-lob'];
  if (lob === 'cosmetic') return true;

  const routeText = [
    req?.baseUrl,
    req?.originalUrl,
    req?.path,
  ].filter(Boolean).join(' ').toLowerCase();

  return routeText.includes('/cosmetic/');
}

function getCustomerCodePrefix(req) {
  return isCosmeticRequest(req) ? 'TM' : 'T';
}

function randomCustomerCode(prefix) {
  const min = 10 ** (CUSTOMER_CODE_DIGITS - 1);
  const range = 9 * min;
  return `${prefix}${Math.floor(min + Math.random() * range)}`;
}

async function generateCustomerCode(q, prefix) {
  for (let attempt = 0; attempt < CUSTOMER_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = randomCustomerCode(prefix);
    const existing = await q('SELECT id FROM partners WHERE ref = $1 LIMIT 1', [code]);
    if (!existing || existing.length === 0) return code;
  }

  throw new Error(`Unable to generate unique customer code with prefix ${prefix}`);
}

/**
 * POST /api/Partners
 * Creates a new customer/partner
 * Body: partner fields
 */
async function createPartner(req, res) {
  try {
    const q = getRequestQuery(req);
    if (req.body.sourceid !== undefined && req.body.sourceid !== null && req.body.sourceid !== '') {
      return rejectPartnerSourceMutation(res);
    }
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
      const emailDup = await q(
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

    const code = await generateCustomerCode(q, getCustomerCodePrefix(req));

    const result = await q(
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
    const q = getRequestQuery(req);
    const { id } = req.params;
    const sourceWasSubmitted = Object.prototype.hasOwnProperty.call(req.body, 'sourceid')
      && req.body.sourceid !== undefined;
    sanitizeUuids(req.body, { preserveUndefined: true });
    const {
      name, phone, email, companyid, gender, birthday, birthmonth, birthyear,
      street, cityname, districtname, wardname, medicalhistory, note, comment,
      referraluserid, weight, identitynumber, healthinsurancecardnumber,
      emergencyphone, jobtitle, taxcode, unitname, unitaddress, isbusinessinvoice,
      personalname, personalidentitycard, personaltaxcode, personaladdress, ref,
      cskhid, salestaffid,
    } = req.body;

    // Check if partner exists
    const existing = await q(
      'SELECT * FROM partners WHERE id = $1 AND isdeleted = false',
      [id]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    if (sourceWasSubmitted && !sameNullableUuid(req.body.sourceid, existing[0].sourceid ?? null)) {
      return rejectPartnerSourceMutation(res);
    }

    // Check email uniqueness (case-insensitive) excluding this partner
    const trimmedEmailPut = typeof email === 'string' ? email.trim() : '';
    if (trimmedEmailPut) {
      const emailDup = await q(
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
      street, medicalhistory, note, comment, referraluserid,
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
      if (sourceWasSubmitted) return res.json(existing[0]);
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
    values.push(id);

    const result = await q(
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
    const q = getRequestQuery(req);
    const { id } = req.params;

    const result = await q(
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
// Tables checked before a partner may be hard-deleted. Each entry is
// [responseKey, SQL] and the SQL takes the partner id as $1.
// NOTE: crmtasks and stockpickings were removed here — neither table exists in
// tdental_demo, so every hard-delete request threw
// 'relation "crmtasks" does not exist' and returned 500. See docs/CHANGELOG.md 0.32.60.
const HARD_DELETE_REFERENCE_CHECKS = [
  ['appointments', 'SELECT COUNT(*) AS count FROM appointments WHERE partnerid = $1'],
  ['saleorders', 'SELECT COUNT(*) AS count FROM saleorders WHERE partnerid = $1 AND isdeleted = false'],
  ['dotkhams', 'SELECT COUNT(*) AS count FROM dotkhams WHERE partnerid = $1 AND isdeleted = false'],
  ['payments', 'SELECT COUNT(*) AS count FROM payments WHERE customer_id = $1'],
  ['accountpayments', 'SELECT COUNT(*) AS count FROM accountpayments WHERE partnerid = $1'],
  ['customerreceipts', 'SELECT COUNT(*) AS count FROM customerreceipts WHERE partnerid = $1'],
  ['monthlyplans', 'SELECT COUNT(*) AS count FROM monthlyplans WHERE customer_id = $1'],
  ['employeePermissions', 'SELECT COUNT(*) AS count FROM employee_permissions WHERE employee_id = $1'],
  ['employeeLocationScopes', 'SELECT COUNT(*) AS count FROM employee_location_scope WHERE employee_id = $1'],
];

async function hardDeletePartner(req, res) {
  try {
    const { id } = req.params;

    // The reference checks and the DELETE run in one transaction with the partner
    // row locked, so a concurrent write cannot slip a reference in between the
    // check and the delete. (The FK constraints added in migration 055 are the
    // hard guarantee; this narrows the window for the columns that still lack one.)
    const outcome = await db.withTransaction(async (tx) => {
      const existing = await tx(
        'SELECT id FROM partners WHERE id = $1 AND customer = true FOR UPDATE',
        [id]
      );

      if (!existing || existing.length === 0) {
        return { status: 404, body: { error: 'Partner not found' } };
      }

      const linked = {};
      for (const [key, sql] of HARD_DELETE_REFERENCE_CHECKS) {
        const rows = await tx(sql, [id]);
        linked[key] = parseInt(rows[0]?.count || '0', 10);
      }

      if (Object.values(linked).some((count) => count > 0)) {
        return {
          status: 409,
          body: { error: 'Partner has linked records', linked },
        };
      }

      const deleteResult = await tx(
        'DELETE FROM partners WHERE id = $1 AND customer = true RETURNING id',
        [id]
      );

      if (!deleteResult || deleteResult.length === 0) {
        return { status: 404, body: { error: 'Partner not found' } };
      }

      return { status: 200, body: { success: true, id: deleteResult[0].id } };
    });

    return res.status(outcome.status).json(outcome.body);
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
