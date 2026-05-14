const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/Permissions/groups
 * Returns all permission groups with their permissions array
 */
router.get('/groups', requirePermission('permissions.view'), async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        pg.id,
        pg.name,
        pg.color,
        pg.description,
        pg.is_system AS "isSystem",
        pg.datecreated,
        pg.lastupdated,
        COALESCE(
          ARRAY_AGG(gp.permission ORDER BY gp.permission) FILTER (WHERE gp.permission IS NOT NULL),
          '{}'::TEXT[]
        ) AS permissions
      FROM permission_groups pg
      LEFT JOIN group_permissions gp ON gp.group_id = pg.id
      GROUP BY pg.id, pg.name, pg.color, pg.description, pg.is_system, pg.datecreated, pg.lastupdated
      ORDER BY pg.datecreated ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching permission groups:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Permissions/groups
 * Body: { name, color, description, permissions: [] }
 * Creates a new permission group
 */
router.post('/groups', requirePermission('permissions.edit'), async (req, res) => {
  try {
    const { name, color = '#94A3B8', description = null, permissions = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const groupRows = await query(
      `INSERT INTO permission_groups (name, color, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, description, is_system AS "isSystem", datecreated, lastupdated`,
      [name, color, description]
    );
    const group = groupRows[0];

    if (permissions.length > 0) {
      const placeholders = permissions.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `INSERT INTO group_permissions (group_id, permission) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        [group.id, ...permissions]
      );
    }

    const result = await query(
      `SELECT
        pg.id, pg.name, pg.color, pg.description, pg.is_system AS "isSystem", pg.datecreated, pg.lastupdated,
        COALESCE(ARRAY_AGG(gp.permission ORDER BY gp.permission) FILTER (WHERE gp.permission IS NOT NULL), '{}'::TEXT[]) AS permissions
       FROM permission_groups pg
       LEFT JOIN group_permissions gp ON gp.group_id = pg.id
       WHERE pg.id = $1
       GROUP BY pg.id, pg.name, pg.color, pg.description, pg.is_system, pg.datecreated, pg.lastupdated`,
      [group.id]
    );

    return res.status(201).json(result[0]);
  } catch (err) {
    console.error('Error creating permission group:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/Permissions/groups/:groupId
 * Body: { name, color, description, permissions: [] }
 * Updates a permission group
 */
router.put('/groups/:groupId', requirePermission('permissions.edit'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, color, description, permissions = [] } = req.body;

    const updateFields = [];
    const params = [];
    let paramIdx = 1;

    if (name !== undefined) { updateFields.push(`name = $${paramIdx++}`); params.push(name); }
    if (color !== undefined) { updateFields.push(`color = $${paramIdx++}`); params.push(color); }
    if (description !== undefined) { updateFields.push(`description = $${paramIdx++}`); params.push(description); }
    updateFields.push(`lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`);

    if (updateFields.length > 1) {
      params.push(groupId);
      await query(
        `UPDATE permission_groups SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        params
      );
    }

    // Replace permissions
    await query(`DELETE FROM group_permissions WHERE group_id = $1`, [groupId]);
    if (permissions.length > 0) {
      const placeholders = permissions.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `INSERT INTO group_permissions (group_id, permission) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        [groupId, ...permissions]
      );
    }

    const result = await query(
      `SELECT
        pg.id, pg.name, pg.color, pg.description, pg.is_system AS "isSystem", pg.datecreated, pg.lastupdated,
        COALESCE(ARRAY_AGG(gp.permission ORDER BY gp.permission) FILTER (WHERE gp.permission IS NOT NULL), '{}'::TEXT[]) AS permissions
       FROM permission_groups pg
       LEFT JOIN group_permissions gp ON gp.group_id = pg.id
       WHERE pg.id = $1
       GROUP BY pg.id, pg.name, pg.color, pg.description, pg.is_system, pg.datecreated, pg.lastupdated`,
      [groupId]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Permission group not found' });
    }

    return res.json(result[0]);
  } catch (err) {
    console.error('Error updating permission group:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/Permissions/groups/:groupId
 * Deletes a permission group. System groups cannot be deleted.
 * Employees in the group have their tier_id set to NULL.
 */
router.delete('/groups/:groupId', requirePermission('permissions.edit'), async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify group exists and is not a system group
    const checkRows = await query(
      `SELECT id, is_system FROM permission_groups WHERE id = $1`,
      [groupId]
    );

    if (!checkRows || checkRows.length === 0) {
      return res.status(404).json({ error: 'Permission group not found' });
    }

    if (checkRows[0].is_system) {
      return res.status(403).json({ error: 'System groups cannot be deleted' });
    }

    // Unassign all employees from this group
    await query(
      `UPDATE partners SET tier_id = NULL, lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE tier_id = $1`,
      [groupId]
    );

    // Remove employee_permissions references
    await query(
      `DELETE FROM employee_permissions WHERE group_id = $1`,
      [groupId]
    );

    // Remove group permissions
    await query(
      `DELETE FROM group_permissions WHERE group_id = $1`,
      [groupId]
    );

    // Delete the group
    await query(
      `DELETE FROM permission_groups WHERE id = $1`,
      [groupId]
    );

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting permission group:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Permissions/employees
 * Returns all employee permission assignments
 */
router.get('/employees', requirePermission('permissions.view'), async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        p.id AS "employeeId",
        p.name AS "employeeName",
        p.email AS "employeeEmail",
        p.tier_id AS "groupId",
        pg.name AS "groupName",
        pg.color AS "groupColor",
        COALESCE(ep.loc_scope, 'all') AS "locScope"
      FROM partners p
      LEFT JOIN permission_groups pg ON pg.id = p.tier_id
      LEFT JOIN employee_permissions ep ON ep.employee_id = p.id
      WHERE p.employee = true AND p.isdeleted = false
      ORDER BY p.name ASC
    `);

    const employeeIds = rows.map(r => r.employeeId);

    let locationMap = {};
    let overridesMap = {};

    if (employeeIds.length > 0) {
      const locRows = await query(`
        WITH location_candidates AS (
          SELECT
            p.id AS employee_id,
            c.id AS location_id,
            c.name AS location_name,
            0 AS sort_order
          FROM partners p
          JOIN companies c ON c.id = p.companyid
          WHERE p.id = ANY($1::uuid[]) AND p.companyid IS NOT NULL

          UNION ALL

          SELECT
            els.employee_id,
            c.id AS location_id,
            c.name AS location_name,
            1 AS sort_order
          FROM employee_location_scope els
          JOIN companies c ON c.id = els.company_id
          WHERE els.employee_id = ANY($1::uuid[])
        ),
        deduped_locations AS (
          SELECT DISTINCT ON (employee_id, location_id)
            employee_id,
            location_id,
            location_name,
            sort_order
          FROM location_candidates
          ORDER BY employee_id, location_id, sort_order
        )
        SELECT employee_id, location_id, location_name
        FROM deduped_locations
        ORDER BY employee_id, sort_order, location_name
      `, [employeeIds]);

      for (const loc of locRows) {
        if (!locationMap[loc.employee_id]) locationMap[loc.employee_id] = [];
        locationMap[loc.employee_id].push({ id: loc.location_id, name: loc.location_name });
      }

      const overrideRows = await query(`
        SELECT employee_id, permission, override_type
        FROM permission_overrides
        WHERE employee_id = ANY($1::uuid[])
      `, [employeeIds]);

      for (const ov of overrideRows) {
        if (!overridesMap[ov.employee_id]) overridesMap[ov.employee_id] = { grant: [], revoke: [] };
        overridesMap[ov.employee_id][ov.override_type].push(ov.permission);
      }
    }

    const result = rows.map(r => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeeEmail: r.employeeEmail,
      groupId: r.groupId,
      groupName: r.groupName,
      groupColor: r.groupColor,
      locScope: r.locScope,
      locations: locationMap[r.employeeId] || [],
      overrides: overridesMap[r.employeeId] || { grant: [], revoke: [] },
    }));

    return res.json(result);
  } catch (err) {
    console.error('Error fetching employee permissions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/Permissions/employees/:employeeId
 * Body: { groupId, locScope, locationIds: [], overrides: { grant: [], revoke: [] } }
 * Updates employee permission assignment
 */
router.put('/employees/:employeeId', requirePermission('permissions.edit'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { groupId, locScope = 'assigned', locationIds = [], overrides = { grant: [], revoke: [] } } = req.body;

    const isUnassign = groupId === null || groupId === undefined;

    // Self-lockout guard: admin cannot strip their own permissions.edit without confirmation
    if (!isUnassign && employeeId === req.user?.employeeId) {
      const groupPermRows = await query(
        `SELECT permission FROM group_permissions WHERE group_id = $1`,
        [groupId]
      );
      const groupPerms = groupPermRows.map(r => r.permission);
      const granted = overrides.grant || [];
      const revoked = overrides.revoke || [];
      const wouldHaveEdit = groupPerms.includes('permissions.edit') || granted.includes('permissions.edit');
      const explicitlyRevoked = revoked.includes('permissions.edit');
      const keepsEdit = wouldHaveEdit && !explicitlyRevoked;

      if (!keepsEdit && req.query.confirm !== 'true') {
        return res.status(409).json({
          error: 'SELF_LOCKOUT_RISK',
          message: 'Removing your own permission-management access requires explicit confirmation.',
        });
      }
    }

    if (isUnassign) {
      // UNASSIGN: clear tier, remove from employee_permissions, clear scopes/overrides
      await query(
        `UPDATE partners SET tier_id = NULL, lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1`,
        [employeeId]
      );
      await query(`DELETE FROM employee_permissions WHERE employee_id = $1`, [employeeId]);
      await query(`DELETE FROM employee_location_scope WHERE employee_id = $1`, [employeeId]);
      await query(`DELETE FROM permission_overrides WHERE employee_id = $1`, [employeeId]);

      return res.json({
        employeeId,
        employeeName: null,
        employeeEmail: null,
        groupId: null,
        groupName: null,
        groupColor: null,
        locScope: 'assigned',
        locations: [],
        overrides: { grant: [], revoke: [] },
      });
    }

    // ASSIGN/UPDATE: normal flow
    await query(
      `UPDATE partners SET tier_id = $1, lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $2`,
      [groupId, employeeId]
    );

    // Upsert employee_permissions for backward compatibility
    await query(
      `INSERT INTO employee_permissions (employee_id, group_id, loc_scope, lastupdated)
       VALUES ($1, $2, $3, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
       ON CONFLICT (employee_id) DO UPDATE
         SET group_id = EXCLUDED.group_id,
             loc_scope = EXCLUDED.loc_scope,
             lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
      [employeeId, groupId, locScope]
    );

    // Replace location scopes
    await query(`DELETE FROM employee_location_scope WHERE employee_id = $1`, [employeeId]);
    if (locationIds.length > 0) {
      const placeholders = locationIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `INSERT INTO employee_location_scope (employee_id, company_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        [employeeId, ...locationIds]
      );
    }

    // Replace permission overrides
    await query(`DELETE FROM permission_overrides WHERE employee_id = $1`, [employeeId]);
    const allOverrides = [
      ...(overrides.grant || []).map(p => ({ permission: p, type: 'grant' })),
      ...(overrides.revoke || []).map(p => ({ permission: p, type: 'revoke' })),
    ];
    if (allOverrides.length > 0) {
      const placeholders = allOverrides.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ');
      const params = [employeeId];
      for (const ov of allOverrides) {
        params.push(ov.permission, ov.type);
      }
      await query(
        `INSERT INTO permission_overrides (employee_id, permission, override_type) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        params
      );
    }

    // Return updated employee data
    const epRows = await query(
      `SELECT
        ep.employee_id AS "employeeId",
        p.name AS "employeeName",
        p.email AS "employeeEmail",
        ep.group_id AS "groupId",
        pg.name AS "groupName",
        pg.color AS "groupColor",
        ep.loc_scope AS "locScope"
       FROM employee_permissions ep
       JOIN partners p ON p.id = ep.employee_id
       JOIN permission_groups pg ON pg.id = ep.group_id
       WHERE ep.employee_id = $1`,
      [employeeId]
    );

    if (!epRows || epRows.length === 0) {
      return res.status(404).json({ error: 'Employee permission not found' });
    }

    const locRows = await query(
      `WITH location_candidates AS (
         SELECT c.id AS location_id, c.name AS location_name, 0 AS sort_order
         FROM partners p
         JOIN companies c ON c.id = p.companyid
         WHERE p.id = $1 AND p.companyid IS NOT NULL

         UNION ALL

         SELECT c.id AS location_id, c.name AS location_name, 1 AS sort_order
         FROM employee_location_scope els
         JOIN companies c ON c.id = els.company_id
         WHERE els.employee_id = $1
       ),
       deduped_locations AS (
         SELECT DISTINCT ON (location_id) location_id, location_name, sort_order
         FROM location_candidates
         ORDER BY location_id, sort_order
       )
       SELECT location_id, location_name
       FROM deduped_locations
       ORDER BY sort_order, location_name`,
      [employeeId]
    );

    const overrideRows = await query(
      `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`,
      [employeeId]
    );

    const emp = epRows[0];
    const resultOverrides = { grant: [], revoke: [] };
    for (const ov of overrideRows) {
      resultOverrides[ov.override_type].push(ov.permission);
    }

    return res.json({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeEmail: emp.employeeEmail,
      groupId: emp.groupId,
      groupName: emp.groupName,
      groupColor: emp.groupColor,
      locScope: emp.locScope,
      locations: locRows.map(l => ({ id: l.location_id, name: l.location_name })),
      overrides: resultOverrides,
    });
  } catch (err) {
    console.error('Error updating employee permissions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Permissions/resolve/:employeeId
 * Returns effective permissions for an employee (base group + overrides applied)
 */
router.get('/resolve/:employeeId', requirePermission('permissions.view'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { resolveEffectivePermissions } = require('../services/permissionService');

    // Fetch employee + group metadata
    const empRows = await query(
      `SELECT
        p.id AS employee_id,
        p.name AS employee_name,
        p.tier_id AS group_id,
        pg.name AS group_name,
        pg.color AS group_color
       FROM partners p
       LEFT JOIN permission_groups pg ON pg.id = p.tier_id
       WHERE p.id = $1`,
      [employeeId]
    );

    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = empRows[0];

    if (!emp.group_id) {
      return res.json({
        employeeId: emp.employee_id,
        employeeName: emp.employee_name,
        group: null,
        overrides: { grant: [], revoke: [] },
        effectivePermissions: [],
        locations: [],
      });
    }

    const resolved = await resolveEffectivePermissions(employeeId);

    return res.json({
      employeeId: emp.employee_id,
      employeeName: emp.employee_name,
      group: {
        id: emp.group_id,
        name: emp.group_name,
        color: emp.group_color,
        basePermissions: resolved.basePermissions || [],
      },
      overrides: resolved.overrides || { grant: [], revoke: [] },
      effectivePermissions: resolved.effectivePermissions || [],
      locations: resolved.locations || [],
    });
  } catch (err) {
    console.error('Error resolving permissions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
