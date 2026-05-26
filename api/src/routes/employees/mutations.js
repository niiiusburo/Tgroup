const express = require('express');
const { query, pool } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { fetchLocationScopeIds } = require('./locationScopes');
const { getVietnamNow } = require('../../lib/dateUtils');

const router = express.Router();

// Well-known permission group IDs (seeded by migration 008/030)
const TIER_EDITOR = '11111111-0000-0000-0000-000000000003';
const TIER_RECEPTIONIST = '11111111-0000-0000-0000-000000000004';
const TIER_ASSISTANT = '11111111-0000-0000-0000-000000000005';

/**
 * Derive a default tier_id from role flags when the caller does not supply one.
 * Mirrors the mapping used in migration 031_assign_default_tiers.sql.
 */
function inferDefaultTier({ isdoctor, isassistant, isreceptionist }) {
  if (isdoctor) return TIER_EDITOR;
  if (isreceptionist) return TIER_RECEPTIONIST;
  if (isassistant) return TIER_ASSISTANT;
  return TIER_ASSISTANT; // safe fallback: lowest-privilege tier
}

/**
 * POST /api/Employees (dental) or /api/cosmetic/Employees (cosmetic)
 * Creates a new employee (inserts into partners table with employee=true)
 * Body: { name, phone?, email?, companyid?, active?, password? }
 *
 * lob_scope is inferred from req.lob (set by attachCosmeticDb middleware for cosmetic routes)
 * or defaults to ['dental'] for dental routes.
 */
router.post('/', requirePermission('employees.edit'), async (req, res) => {
  const client = await (req.db ? req.db.connect() : pool.connect());
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
      wage = null,
      allowance = null,
      hrjobid = null,
      tierId = null,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = require('crypto').randomUUID();
    const now = getVietnamNow();

    // Determine lob_scope from route context (req.lob set by attachCosmeticDb middleware)
    const lobScope = req.lob === 'cosmetic' ? ['cosmetic'] : ['dental'];

    // Assign a default permission tier when the caller does not supply one.
    // Without this, newly created employees have tier_id = NULL and receive 403
    // on every guarded route because resolveEffectivePermissions() returns [].
    const effectiveTierId = tierId || inferDefaultTier({ isdoctor, isassistant, isreceptionist });

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    }

    await client.query('BEGIN');

    // Insert into partners table with employee=true and lob_scope
    const result = await client.query(
      `INSERT INTO partners (
        id, name, phone, email, companyid,
        employee, customer, supplier, isagent, isinsurance,
        active, isdoctor, isassistant, isreceptionist, startworkdate,
        iscompany, ishead, isdeleted, isbusinessinvoice,
        password_hash, jobtitle, wage, allowance, hrjobid, tier_id,
        lob_scope,
        datecreated, lastupdated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
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
        wage,
        allowance,
        hrjobid,
        effectiveTierId,
        lobScope,
        now,    // datecreated
        now,    // lastupdated
      ]
    );

    // Mirror tier assignment to employee_permissions for backward compatibility.
    // Auth resolution reads partners.tier_id (primary), but legacy code paths
    // and the permissions API still consult this table.
    if (effectiveTierId) {
      await client.query(
        `INSERT INTO employee_permissions (employee_id, group_id, loc_scope, lastupdated)
         VALUES ($1, $2, 'all', $3)
         ON CONFLICT (employee_id) DO UPDATE
           SET group_id = EXCLUDED.group_id,
               loc_scope = EXCLUDED.loc_scope,
               lastupdated = EXCLUDED.lastupdated`,
        [id, effectiveTierId, now]
      );
    }

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
 * PUT /api/Employees/:id (dental) or /api/cosmetic/Employees/:id (cosmetic)
 * Updates an existing employee (updates partners table)
 *
 * lob_scope is inferred from req.lob if not explicitly provided in the body.
 */
router.put('/:id', requirePermission('employees.edit'), async (req, res) => {
  const client = await (req.db ? req.db.connect() : pool.connect());
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
      tierId,
      wage,
      allowance,
      hrjobid,
      lob_scope,
    } = req.body;

    // Determine lob_scope: use explicit value from body, or infer from route context
    const effectiveLobScope = lob_scope || (req.lob === 'cosmetic' ? ['cosmetic'] : ['dental']);

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
      wage,
      allowance,
      hrjobid,
    };

    if (tierId !== undefined) {
      updates.push(`tier_id = $${paramIdx}`);
      values.push(tierId || null);
      paramIdx++;
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    // Always set lob_scope on update (inferred from route or explicit)
    updates.push(`lob_scope = $${paramIdx}`);
    values.push(effectiveLobScope);
    paramIdx++;

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
      values.push(getVietnamNow());
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

    // Mirror tier assignment to employee_permissions for backward compatibility
    if (tierId !== undefined && tierId) {
      await client.query(
        `INSERT INTO employee_permissions (employee_id, group_id, loc_scope, lastupdated)
         VALUES ($1, $2, 'all', (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
         ON CONFLICT (employee_id) DO UPDATE
           SET group_id = EXCLUDED.group_id,
               loc_scope = EXCLUDED.loc_scope,
               lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
        [id, tierId]
      );
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
    updatedEmployee.locationScopeIds = await fetchLocationScopeIds(id);

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
      `UPDATE partners SET active = false, lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1 AND employee = true RETURNING id`,
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
