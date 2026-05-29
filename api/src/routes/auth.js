'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getQuery, runWithLob } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
const { canUseLegacyCtvPassword, verifyLegacyCtvPassword } = require('../services/legacyCtvPassword');
const { findLoginPartner, normalizeLoginIdentifier } = require('../services/loginIdentifier');

const router = express.Router();

function isCosmeticAuthEnabled() {
  return process.env.COSMETIC_LOB_ENABLED === 'true';
}

function getEmployeeLobScope(employee) {
  if (Array.isArray(employee?.lob_scope)) return employee.lob_scope;
  if (Array.isArray(employee?.lobScope)) return employee.lobScope;
  return employee?.lob_scope || employee?.lobScope;
}

function isEmployeeCtv(employee) {
  return employee?.is_ctv === true || employee?.isCtv === true;
}

async function resolvePermissionsForLob(employeeId, lob) {
  return runWithLob(lob, () => resolveEffectivePermissions(employeeId));
}

async function findLoginPartnerForAuth(loginIdentifier) {
  const dentalQuery = getQuery('dental');
  const dentalRows = await findLoginPartner(dentalQuery, loginIdentifier);

  if ((dentalRows && dentalRows.length > 0) || !isCosmeticAuthEnabled()) {
    return { rows: dentalRows, authLob: 'dental', queryFn: dentalQuery };
  }

  const cosmeticQuery = getQuery('cosmetic');
  const cosmeticRows = await findLoginPartner(cosmeticQuery, loginIdentifier);
  return { rows: cosmeticRows, authLob: 'cosmetic', queryFn: cosmeticQuery };
}

async function findEmployeeForCurrentToken(employeeId, preferredLob) {
  const searchLobs = [];
  if (preferredLob === 'cosmetic' || preferredLob === 'dental') {
    searchLobs.push(preferredLob);
  }
  if (!searchLobs.includes('dental')) {
    searchLobs.push('dental');
  }
  if (isCosmeticAuthEnabled() && !searchLobs.includes('cosmetic')) {
    searchLobs.push('cosmetic');
  }

  for (const lob of searchLobs) {
    const q = getQuery(lob);
    const rows = await q(
      `SELECT p.id, p.name, p.email, p.companyid AS "companyId", p.is_ctv, p.lob_scope, c.name AS "companyName"
       FROM partners p
       LEFT JOIN companies c ON c.id = p.companyid
       WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
      [employeeId]
    );

    if (rows && rows.length > 0) {
      return { employee: rows[0], authLob: lob };
    }
  }

  return null;
}

/**
 * POST /api/Auth/login
 * Body: { email, password }
 * The email field accepts an email address for staff/admins or a legacy CTV
 * phone/ref code for imported legacy CTV rows.
 * Returns JWT token + user info + permissions
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginIdentifier = normalizeLoginIdentifier(email);
    const invalidLoginError = { error: 'Invalid login or password' };

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    const { rows, authLob, queryFn } = await findLoginPartnerForAuth(loginIdentifier);

    if (!rows || rows.length !== 1) {
      return res.status(401).json(invalidLoginError);
    }

    const employee = rows[0];

    if (!employee.password_hash) {
      return res.status(401).json(invalidLoginError);
    }

    let migratedPasswordHash = null;
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, employee.password_hash);
    } catch (_err) {
      passwordMatch = false;
    }

    if (!passwordMatch && canUseLegacyCtvPassword(employee)) {
      passwordMatch = verifyLegacyCtvPassword(password, employee.password_hash);
      if (passwordMatch) {
        migratedPasswordHash = await bcrypt.hash(password, 10);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json(invalidLoginError);
    }

    if (migratedPasswordHash) {
      await queryFn(
        `UPDATE partners
         SET password_hash = $1,
             last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
         WHERE id = $2`,
        [migratedPasswordHash, employee.id]
      );
    } else {
      await queryFn(
        `UPDATE partners SET last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1`,
        [employee.id]
      );
    }

    const permissions = await resolvePermissionsForLob(employee.id, authLob);

    // Admins implicitly get both LOB scopes so they can access /api/cosmetic/* mirrors
    // without requiring manual lob_scope DB updates for pre-migration admin accounts.
    const isAdmin = isAdminPermissionState(permissions);
    const adminLobScope = ['dental', 'cosmetic'];
    const employeeLobScope = getEmployeeLobScope(employee);
    const effectiveLobScope = (Array.isArray(employeeLobScope) && employeeLobScope.length > 0)
      ? employeeLobScope
      : (isAdmin ? adminLobScope : employeeLobScope);
    const employeeIsCtv = isEmployeeCtv(employee);

    const tokenPayload = {
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      companyId: employee.companyId,
      isCtv: employeeIsCtv,
      lobScope: effectiveLobScope,
      authLob,
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
        is_ctv: employeeIsCtv,
        lob_scope: effectiveLobScope,
      },
      permissions,
      redirectTo: employeeIsCtv ? '/ctv' : null,
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

    const current = await findEmployeeForCurrentToken(employeeId, req.user.authLob || req.user.auth_lob);

    if (!current) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { employee, authLob } = current;
    const permissions = await resolvePermissionsForLob(employeeId, authLob);

    // Admins implicitly get both LOB scopes (same logic as /login)
    const isAdmin = isAdminPermissionState(permissions);
    const adminLobScope = ['dental', 'cosmetic'];
    const employeeLobScope = getEmployeeLobScope(employee);
    const effectiveLobScope = (Array.isArray(employeeLobScope) && employeeLobScope.length > 0)
      ? employeeLobScope
      : (isAdmin ? adminLobScope : employeeLobScope);

    return res.json({
      user: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        companyId: employee.companyId,
        companyName: employee.companyName,
        is_ctv: isEmployeeCtv(employee),
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
