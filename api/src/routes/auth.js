'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');

const router = express.Router();

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
      `SELECT p.id, p.name, p.email, p.password_hash, p.companyid AS "companyId", p.is_ctv, p.lob_scope, c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.email = $1 AND p.employee = true AND p.isdeleted = false AND p.active = true`,
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
      `UPDATE partners SET last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1`,
      [employee.id]
    );

    const permissions = await resolveEffectivePermissions(employee.id);

    // Admins implicitly get both LOB scopes so they can access /api/cosmetic/* mirrors
    // without requiring manual lob_scope DB updates for pre-migration admin accounts.
    const isAdmin = isAdminPermissionState(permissions);
    const adminLobScope = ['dental', 'cosmetic'];
    const effectiveLobScope = (Array.isArray(employee.lob_scope) && employee.lob_scope.length > 0)
      ? employee.lob_scope
      : (isAdmin ? adminLobScope : employee.lob_scope);

    const tokenPayload = {
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId,
      isCtv: employee.is_ctv === true,
      lobScope: effectiveLobScope,
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
        is_ctv: employee.is_ctv === true,
        lob_scope: effectiveLobScope,
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
      `SELECT p.id, p.name, p.email, p.companyid AS "companyId", p.is_ctv, p.lob_scope, c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
      [employeeId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const employee = rows[0];
    const permissions = await resolveEffectivePermissions(employeeId);

    // Admins implicitly get both LOB scopes (same logic as /login)
    const isAdmin = isAdminPermissionState(permissions);
    const adminLobScope = ['dental', 'cosmetic'];
    const effectiveLobScope = (Array.isArray(employee.lob_scope) && employee.lob_scope.length > 0)
      ? employee.lob_scope
      : (isAdmin ? adminLobScope : employee.lob_scope);

    return res.json({
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
        is_ctv: employee.is_ctv === true,
        lob_scope: effectiveLobScope,
      },
      permissions,
    });
  } catch (err) {
    console.error('/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/Auth/change-password
 * Body: { oldPassword, newPassword }
 * Allows an authenticated employee to change their own password.
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { employeeId } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    }

    const rows = await query(
      `SELECT password_hash FROM partners WHERE id = $1 AND employee = true AND isdeleted = false`,
      [employeeId]
    );

    if (!rows || rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({ error: 'User not found or no password set' });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE partners SET password_hash = $1 WHERE id = $2`,
      [newHash, employeeId]
    );

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
