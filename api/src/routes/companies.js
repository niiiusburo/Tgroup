const express = require('express');
const { query, pool } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /Companies - List all companies
router.get('/', requirePermission('locations.view'), async (req, res) => {
  let items = [];
  try {
    items = await query('SELECT * FROM dbo.companies');
  } catch (err) {
    items = [];
  }

  return res.json({
    offset: 0,
    limit: 20,
    totalItems: items.length,
    items,
    aggregates: null,
  });
});

// GET /Companies/:id - Get single company
router.get('/:id', requirePermission('locations.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query('SELECT * FROM dbo.companies WHERE id = $1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching company:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /Companies - Create new company
router.post('/', requirePermission('locations.add'), async (req, res) => {
  const client = await (req.db ? req.db.connect() : pool.connect());
  try {
    const { name, email, phone, active = true, taxcode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    await client.query('BEGIN');

    // Create a linked partner record first (partnerid is NOT NULL on companies)
    const partnerResult = await client.query(
      `INSERT INTO dbo.partners (id, name, employee, customer, supplier, isagent, isinsurance, iscompany, ishead, active, isdeleted, isbusinessinvoice, isdoctor, isassistant, isreceptionist, datecreated, lastupdated)
       VALUES (gen_random_uuid(), $1, false, false, false, false, false, true, false, true, false, false, false, false, false,
               NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh',
               NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
       RETURNING id`,
      [name.trim()]
    );
    const partnerId = partnerResult.rows[0].id;

    const result = await client.query(
      `INSERT INTO dbo.companies (
        id, partnerid, name, email, phone, active, taxcode,
        notallowexportinventorynegative, isuppercasepartnername, ishead,
        paymentsmsvalidation, isconnectconfigmedicalprescription,
        datecreated, lastupdated
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        false, false, false, false, false,
        NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh',
        NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'
      ) RETURNING *`,
      [partnerId, name.trim(), email || null, phone || null, active, taxcode || null]
    );

    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating company:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /Companies/:id - Update company
router.put('/:id', requirePermission('locations.edit'), async (req, res) => {
  const client = await (req.db ? req.db.connect() : pool.connect());
  try {
    const { id } = req.params;
    const { name, email, phone, active, taxcode, address, manager } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(name.trim());
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIdx++}`);
      values.push(email || null);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIdx++}`);
      values.push(phone || null);
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIdx++}`);
      values.push(active);
    }
    if (taxcode !== undefined) {
      updates.push(`taxcode = $${paramIdx++}`);
      values.push(taxcode || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`lastupdated = NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'`);
    values.push(id);

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE dbo.companies SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values
    );

    if (!result || result.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Company not found' });
    }

    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating company:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
