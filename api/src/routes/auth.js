'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions } = require('../services/permissionService');

const router = express.Router();

function normalizeLoginEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function findStaffLoginCandidate(email) {
  const rows = await query(
    `SELECT p.id, p.name, p.email, p.password_hash, p.companyid AS "companyId", c.name AS "companyName"
     FROM partners p
     LEFT JOIN companies c ON c.id = p.companyid
     WHERE p.email = $1 AND p.employee = true AND p.isdeleted = false AND p.active = true`,
    [email]
  );

  return rows?.[0] ? { ...rows[0], loginSource: 'partners' } : null;
}

async function findInvestorLoginCandidate(email) {
  const rows = await query(
    `SELECT p.id, p.name, ia.email, ia.password_hash, p.companyid AS "companyId", c.name AS "companyName",
            ia.id AS "investorAccountId"
     FROM dbo.investor_accounts ia
     JOIN dbo.partners p ON p.id = ia.partner_id
     JOIN dbo.permission_groups pg ON pg.id = p.tier_id
     LEFT JOIN dbo.companies c ON c.id = p.companyid
     WHERE lower(ia.email) = lower($1)
       AND ia.active = true
       AND p.employee = true
       AND p.isdeleted = false
       AND pg.name = 'investor'`,
    [email]
  );

  return rows?.[0] ? { ...rows[0], loginSource: 'investor_accounts' } : null;
}

async function verifyCandidate(candidate, password) {
  if (!candidate?.password_hash) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, candidate.password_hash);
  return passwordMatch ? candidate : null;
}

async function resolveLoginCandidate(email, password) {
  const staffCandidate = await findStaffLoginCandidate(email);
  const verifiedStaff = await verifyCandidate(staffCandidate, password);
  if (verifiedStaff) {
    return verifiedStaff;
  }

  return verifyCandidate(await findInvestorLoginCandidate(email), password);
}

async function markLogin(candidate) {
  await query(
    `UPDATE partners SET last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') WHERE id = $1`,
    [candidate.id]
  );

  if (candidate.loginSource === 'investor_accounts') {
    await query(
      `UPDATE dbo.investor_accounts
       SET last_login = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
           lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
       WHERE id = $1`,
      [candidate.investorAccountId]
    );
  }
}

/**
 * POST /api/Auth/login
 * Body: { email, password }
 * Returns JWT token + user info + permissions
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeLoginEmail(req.body?.email);

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const employee = await resolveLoginCandidate(email, password);
    if (!employee) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await markLogin(employee);

    const permissions = await resolveEffectivePermissions(employee.id);

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
    const permissions = await resolveEffectivePermissions(employeeId);

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
