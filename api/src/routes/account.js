const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');

const router = express.Router();

router.post('/Login', async (req, res) => {
  const { userName, password } = req.body;

  if (!userName || !password) {
    return res.status(400).json({ succeeded: false, message: 'userName and password are required' });
  }

  let userRow = null;
  try {
    const rows = await query(
      'SELECT id, name, username, email, partnerid, companyid FROM dbo.aspnetusers WHERE username = $1 LIMIT 1',
      [userName]
    );
    userRow = rows[0] || null;
  } catch (err) {
    // DB not available
    userRow = null;
  }

  if (!userRow) {
    return res.status(401).json({ succeeded: false, message: 'Invalid credentials' });
  }

  const userId = userRow.id;
  const userEmail = userRow.email;
  const partnerId = userRow.partnerid;
  const companyId = userRow.companyid;
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
      name: userRow.name || userName,
      userName,
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
