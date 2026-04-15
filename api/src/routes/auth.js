'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Resolve effective permissions + locations for a given employee ID.
 * Returns { groupId, groupName, effectivePermissions, locations }
 */
async function resolvePermissions(employeeId) {
  const epRows = await query(
    `SELECT ep.group_id, pg.name AS group_name
     FROM employee_permissions ep
     JOIN permission_groups pg ON pg.id = ep.group_id
     WHERE ep.employee_id = $1`,
    [employeeId]
  );

  if (!epRows || epRows.length === 0) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  const { group_id: groupId, group_name: groupName } = epRows[0];

  const [basePermRows, overrideRows, locRows] = await Promise.all([
    query(
      `SELECT permission FROM group_permissions WHERE group_id = $1 ORDER BY permission`,
      [groupId]
    ),
    query(
      `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
    query(
      `SELECT c.id, c.name
       FROM employee_location_scope els
       JOIN companies c ON c.id = els.location_id
       WHERE els.employee_id = $1`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map(r => r.permission);
  const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
  const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return {
    groupId,
    groupName,
    effectivePermissions: [...effectiveSet].sort(),
    locations: locRows.map(l => ({ id: l.id, name: l.name })),
  };
}

/**
 * POST /api/Auth/login
 * Body: { email, password }
 * Returns JWT token + user info + permissions
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const rows = await query(
      `SELECT p.id, p.name, p.email, p.password_hash, p.companyid AS "companyId", c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.email = $1 AND p.employee = true AND p.isdeleted = false`,
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const employee = rows[0];

    if (!employee.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, employee.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last_login
    await query(
      `UPDATE partners SET last_login = NOW() WHERE id = $1`,
      [employee.id]
    );

    const permissions = await resolvePermissions(employee.id);

    const tokenPayload = {
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.json({
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
      },
      permissions,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Auth/me
 * Authorization: Bearer <token>
 * Returns current user info + permissions
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.user;

    const rows = await query(
      `SELECT p.id, p.name, p.email, p.companyid AS "companyId", c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
      [employeeId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const employee = rows[0];
    const permissions = await resolvePermissions(employeeId);

    return res.json({
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
      },
      permissions,
    });
  } catch (err) {
    console.error('/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
