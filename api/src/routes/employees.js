const express = require('express');
const { query, pool } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/Employees
 * Query params: offset, limit, search, isDoctor, isAssistant, active, companyId
 * Returns: {offset, limit, totalItems, items[]}
 *
 * Used for: Doctor/assistant dropdowns, employee lists
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '100',
      search = '',
      isDoctor = '',
      isAssistant = '',
      active = 'true',
      companyId = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    // Active filter
    if (active === 'true') {
      conditions.push(`e.active = true`);
    } else if (active === 'false') {
      conditions.push(`e.active = false`);
    }

    // Company filter
    if (companyId) {
      conditions.push(`e.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    // Doctor filter
    if (isDoctor === 'true') {
      conditions.push(`e.isdoctor = true`);
    }

    // Assistant filter
    if (isAssistant === 'true') {
      conditions.push(`e.isassistant = true`);
    }

    // Search by name, ref, phone, email
    if (search) {
      conditions.push(
        `(e.name ILIKE $${paramIdx} OR e.namenosign ILIKE $${paramIdx} OR e.ref ILIKE $${paramIdx} OR e.phone ILIKE $${paramIdx} OR e.email ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        e.id,
        e.name,
        e.ref,
        e.phone,
        e.email,
        e.avatar,
        e.isdoctor,
        e.isassistant,
        e.isreceptionist,
        e.active,
        e.jobtitle,
        e.companyid,
        c.name AS companyname,
        e.hrjobid,
        j.name AS hrjobname,
        e.wage,
        e.allowance,
        e.startworkdate,
        e.datecreated,
        e.lastupdated
      FROM employees e
      LEFT JOIN companies c ON c.id = e.companyid
      LEFT JOIN hrjobs j ON j.id = e.hrjobid
      WHERE ${whereClause}
      ORDER BY e.name ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM employees e WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Attach location scopes
    if (items.length > 0) {
      const employeeIds = items.map((i) => i.id);
      const scopeRows = await query(
        'SELECT employee_id, company_id FROM employee_location_scope WHERE employee_id = ANY($1)',
        [employeeIds]
      );
      for (const item of items) {
        item.locationScopeIds = scopeRows
          .filter((r) => r.employee_id === item.id)
          .map((r) => r.company_id);
      }
    }

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Employees/:id
 * Returns: Single employee details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        e.id,
        e.name,
        e.ref,
        e.phone,
        e.email,
        e.address,
        e.identitycard,
        e.birthday,
        e.avatar,
        e.isdoctor,
        e.isassistant,
        e.isreceptionist,
        e.active,
        e.companyid,
        c.name AS companyname,
        e.hrjobid,
        j.name AS hrjobname,
        e.wage,
        e.hourlywage,
        e.allowance,
        e.startworkdate,
        e.leavepermonth,
        e.regularhour,
        e.overtimerate,
        e.restdayrate,
        e.enrollnumber,
        e.medicalprescriptioncode,
        e.datecreated,
        e.lastupdated
      FROM employees e
      LEFT JOIN companies c ON c.id = e.companyid
      LEFT JOIN hrjobs j ON j.id = e.hrjobid
      WHERE e.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const scopes = await query(
      'SELECT company_id FROM employee_location_scope WHERE employee_id = $1',
      [id]
    );
    rows[0].locationScopeIds = scopes.map((s) => s.company_id);

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/Employees
 * Creates a new employee (inserts into partners table with employee=true)
 * Body: { name, phone?, email?, companyid?, active? }
 */
router.post('/', requirePermission('employees.edit'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name,
      phone = null,
      email = null,
      companyid = null,
      active = true,
      isdoctor = false,
      isassistant = false,
      isreceptionist = false,
      startworkdate = null,
      password = null,
      jobtitle = null,
      locationScopeIds = [],
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    }

    await client.query('BEGIN');

    // Insert into partners table with employee=true
    const result = await client.query(
      `INSERT INTO partners (
        id, name, phone, email, companyid,
        employee, customer, supplier, isagent, isinsurance,
        active, isdoctor, isassistant, isreceptionist, startworkdate,
        iscompany, ishead, isdeleted, isbusinessinvoice,
        password_hash, jobtitle, datecreated, lastupdated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        id,
        name.trim(),
        phone,
        email,
        companyid,
        true,   // employee = true
        false,  // customer = false
        false,  // supplier = false
        false,  // isagent = false
        false,  // isinsurance = false
        active,
        !!isdoctor,
        !!isassistant,
        !!isreceptionist,
        startworkdate || null,
        false,  // iscompany = false
        false,  // ishead = false
        false,  // isdeleted = false
        false,  // isbusinessinvoice = false
        passwordHash,
        jobtitle,
        now,    // datecreated
        now,    // lastupdated
      ]
    );

    // Insert scope records (skip primary companyid to avoid duplicate)
    const scopes = Array.isArray(locationScopeIds) ? locationScopeIds : [];
    const primaryId = companyid || null;
    for (const scopeId of scopes) {
      if (scopeId && scopeId !== primaryId) {
        await client.query(
          'INSERT INTO employee_location_scope (employee_id, company_id) VALUES ($1, $2)',
          [id, scopeId]
        );
      }
    }

    await client.query('COMMIT');

    const employee = result.rows[0];
    employee.locationScopeIds = scopes.filter((sid) => sid && sid !== primaryId);
    return res.status(201).json(employee);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/Employees/:id
 * Updates an existing employee (updates partners table)
 */
router.put('/:id', requirePermission('employees.edit'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      companyid,
      active,
      isdoctor,
      isassistant,
      isreceptionist,
      startworkdate,
      password,
      jobtitle,
      locationScopeIds,
    } = req.body;

    // Build dynamic update query for partners table
    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = {
      name,
      phone,
      email,
      companyid,
      active,
      isdoctor,
      isassistant,
      isreceptionist,
      startworkdate,
      jobtitle,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    // Hash password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIdx}`);
      values.push(passwordHash);
      paramIdx++;
    }

    if (updates.length === 0 && locationScopeIds === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await client.query('BEGIN');

    let result;
    if (updates.length > 0) {
      // Add lastupdated
      updates.push(`lastupdated = $${paramIdx}`);
      values.push(new Date().toISOString());
      paramIdx++;

      values.push(id);

      result = await client.query(
        `UPDATE partners SET ${updates.join(', ')} WHERE id = $${paramIdx} AND employee = true RETURNING *`,
        values
      );

      if (!result || result.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }
    } else {
      result = await client.query(
        'SELECT * FROM partners WHERE id = $1 AND employee = true',
        [id]
      );
      if (!result || result.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found' });
      }
    }

    // Update location scopes if provided
    if (locationScopeIds !== undefined) {
      await client.query(
        'DELETE FROM employee_location_scope WHERE employee_id = $1',
        [id]
      );
      const scopes = Array.isArray(locationScopeIds) ? locationScopeIds : [];
      const primaryId = companyid !== undefined ? companyid : result.rows[0].companyid;
      for (const scopeId of scopes) {
        if (scopeId && scopeId !== primaryId) {
          await client.query(
            'INSERT INTO employee_location_scope (employee_id, company_id) VALUES ($1, $2)',
            [id, scopeId]
          );
        }
      }
    }

    await client.query('COMMIT');

    const updatedEmployee = result.rows[0];
    const finalScopes = await query(
      'SELECT company_id FROM employee_location_scope WHERE employee_id = $1',
      [id]
    );
    updatedEmployee.locationScopeIds = finalScopes.map((s) => s.company_id);

    return res.json(updatedEmployee);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/Employees/:id
 * Soft-deletes an employee by setting active = false
 */
router.delete('/:id', requirePermission('employees.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE partners SET active = false, lastupdated = NOW() WHERE id = $1 AND employee = true RETURNING id',
      [id]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
