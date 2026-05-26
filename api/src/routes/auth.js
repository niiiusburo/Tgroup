'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery, runWithLob } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');

const router = express.Router();

const VALID_LOBS = ['dental', 'cosmetic'];

function isValidLob(lob) {
  return lob === 'dental' || lob === 'cosmetic';
}

function normalizeLobScope(scope, fallbackLob) {
  const normalized = Array.isArray(scope)
    ? scope.filter(isValidLob)
    : [];
  if (normalized.length > 0) return normalized;
  return isValidLob(fallbackLob) ? [fallbackLob] : [];
}

function visibleLobScopeForUser(rawScope, permissions, fallbackLob) {
  const normalized = normalizeLobScope(rawScope, fallbackLob);
  if (isAdminPermissionState(permissions)) return normalized;
  return normalized.slice(0, 1);
}

function authLobFromToken(user) {
  if (isValidLob(user?.auth_lob)) return user.auth_lob;
  if (isValidLob(user?.lob_context)) return user.lob_context;
  const scope = normalizeLobScope(user?.lob_scope);
  return scope.length === 1 ? scope[0] : 'dental';
}

const EMPLOYEE_LOGIN_SQL = `
  SELECT p.id, p.name, p.email, p.password_hash, p.companyid AS "companyId", c.name AS "companyName",
         p.lob_scope AS "lobScope", p.is_ctv AS "isCtv"
  FROM partners p
  LEFT JOIN companies c ON c.id = p.companyid
  WHERE p.email = $1 AND p.employee = true AND p.isdeleted = false AND p.active = true
`;

async function findEmployeeLoginRows(email) {
  const candidates = [];
  for (const lob of VALID_LOBS) {
    const q = getQuery(lob);
    const rows = await q(EMPLOYEE_LOGIN_SQL, [email]);
    for (const row of rows || []) {
      candidates.push({ ...row, authLob: lob });
    }
  }
  return candidates;
}

function resolvePermissionsForLob(employeeId, lob) {
  return runWithLob(lob, () => resolveEffectivePermissions(employeeId));
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

    const rows = await findEmployeeLoginRows(email);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let employee = null;

    for (const candidate of rows) {
      if (!candidate.password_hash) continue;
      const passwordMatch = await bcrypt.compare(password, candidate.password_hash);
      if (passwordMatch) {
        employee = candidate;
        break;
      }
    }

    if (!employee) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const authLob = employee.authLob;
    const q = getQuery(authLob);

    // Update last_login
    await q(
      `UPDATE partners SET last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1`,
      [employee.id]
    );

    const permissions = await resolvePermissionsForLob(employee.id, authLob);

    const lobScope = visibleLobScopeForUser(employee.lobScope, permissions, authLob);
    const isCtv = !!employee.isCtv;

    const tokenPayload = {
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId,
      lob_scope: lobScope,
      auth_lob: authLob,
      lob_context: authLob,
      is_ctv: isCtv,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // CTV redirect decision lives on backend (per task): non-CTV admins/staff use normal flow;
    // CTV users should be sent to /ctv dashboard and never reach admin UI.
    const redirectTo = isCtv ? '/ctv' : null;

    return res.json({
      token,
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
        lob_scope: lobScope,
        auth_lob: authLob,
        lob_context: authLob,
        is_ctv: isCtv,
      },
      permissions,
      redirectTo, // backend-driven CTV redirect hook
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
    const authLob = authLobFromToken(req.user);
    const q = getQuery(authLob);

    const rows = await q(
      `SELECT p.id, p.name, p.email, p.companyid AS "companyId", c.name AS "companyName",
              p.lob_scope AS "lobScope", p.is_ctv AS "isCtv"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
      [employeeId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const employee = rows[0];
    const permissions = await resolvePermissionsForLob(employeeId, authLob);

    const lobScope = visibleLobScopeForUser(employee.lobScope, permissions, authLob);
    const isCtv = !!employee.isCtv;

    return res.json({
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
        lob_scope: lobScope,
        auth_lob: authLob,
        lob_context: authLob,
        is_ctv: isCtv,
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
    const authLob = authLobFromToken(req.user);
    const q = getQuery(authLob);

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    }

    const rows = await q(
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
    await q(
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
