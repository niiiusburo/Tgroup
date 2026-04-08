const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');

const router = express.Router();

router.post('/Login', async (req, res) => {
  const { userName, password } = req.body;

  // Hardcoded admin acceptance for local dev
  if (!userName || !password) {
    return res.status(400).json({ succeeded: false, message: 'userName and password are required' });
  }

  const isAdmin = userName === 'admin' && password === 'admin123';
  if (!isAdmin) {
    return res.status(401).json({ succeeded: false, message: 'Invalid credentials' });
  }

  let userRow = null;
  try {
    const rows = await query(
      'SELECT id, name, username, email, partnerid, companyid FROM dbo.aspnetusers WHERE username = $1 LIMIT 1',
      [userName]
    );
    userRow = rows[0] || null;
  } catch (err) {
    // DB not available — use fallback values
    userRow = null;
  }

  const userId = userRow ? userRow.id : 'local-admin-id';
  const userEmail = userRow ? userRow.email : 'admin@tamdentist.local';
  const partnerId = userRow ? userRow.partnerid : null;
  const companyId = userRow ? userRow.companyid : null;
  const sessionId = crypto.randomUUID();

  // Match EXACT live site JWT claim names
  const payload = {
    nameid: userId,
    unique_name: userName,
    company_id: companyId,
    user_root: 'True',
    partner_id: partnerId,
    is_head_office: 'False',
    session_id: sessionId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  // Set the .NET identity cookie — Angular app checks for its existence
  res.cookie('.AspNetCore.Identity.Application', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  // Also set cache-control headers to match live site
  res.set('Cache-Control', 'no-cache,no-store');
  res.set('Pragma', 'no-cache');

  return res.json({
    succeeded: true,
    message: 'Authentication succeeded',
    token,
    refreshToken: 'local-dev-refresh-token',
    tenantId: 'tamdentist',
    configs: null,
    user: {
      id: userId,
      name: 'Admin',
      userName: 'admin',
      partnerId,
      phone: null,
      email: userEmail,
      avatar: null,
      companyId,
    },
    sessionId,
    requiresTwoFactor: false,
    userId: null,
    deviceId: 'local-dev',
  });
});

router.post('/Logout', (req, res) => {
  return res.json({ succeeded: true });
});

module.exports = router;
