const express = require('express');
const { query } = require('../db');

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
router.post('/', async (req, res) => {
  try {
    const {
      name,
      phone = null,
      email = null,
      companyid = null,
      active = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();

    // Insert into partners table with employee=true
    const result = await query(
      `INSERT INTO partners (
        id, name, phone, email, companyid,
        employee, customer, supplier, isagent, isinsurance,
        active, iscompany, ishead, isdeleted, isbusinessinvoice,
        datecreated, lastupdated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        false,  // iscompany = false
        false,  // ishead = false
        false,  // isdeleted = false
        false,  // isbusinessinvoice = false
        now,    // datecreated
        now,    // lastupdated
      ]
    );

    return res.status(201).json(result[0]);
  } catch (err) {
    console.error('Error creating employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/Employees/:id
 * Updates an existing employee (updates partners table)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      companyid,
      active,
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

    // Add lastupdated
    updates.push(`lastupdated = $${paramIdx}`);
    values.push(new Date().toISOString());
    paramIdx++;

    values.push(id);

    const result = await query(
      `UPDATE partners SET ${updates.join(', ')} WHERE id = $${paramIdx} AND employee = true RETURNING *`,
      values
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating employee:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/Employees/:id
 * Deletes an employee (deletes from partners table where employee=true)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM partners WHERE id = $1 AND employee = true RETURNING id',
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
