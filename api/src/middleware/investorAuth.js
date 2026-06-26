'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/* routes]
 * @crossref:uses[dbo.investor_accounts, INVESTOR_JWT_SECRET, product-map/domains/investor-portal.yaml]
 */
const jwt = require('jsonwebtoken');
const { getQuery } = require('../db');

function getInvestorJwtSecret() {
  const secret = process.env.INVESTOR_JWT_SECRET;
  if (!secret) {
    throw new Error('INVESTOR_JWT_SECRET is required for investor portal auth');
  }
  return secret;
}

async function requireInvestorAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getInvestorJwtSecret());
    if (decoded.type !== 'investor') {
      return res.status(403).json({ error: 'Forbidden', code: 'S_INVESTOR_ONLY' });
    }

    const lob = decoded.lob;
    if (lob !== 'dental' && lob !== 'cosmetic') {
      return res.status(403).json({ error: 'Forbidden', code: 'INVALID_LOB' });
    }

    const db = getQuery(lob);
    const rows = await db(
      `SELECT id, email, investor_name, lob, is_active
       FROM dbo.investor_accounts
       WHERE id = $1`,
      [decoded.sub]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', code: 'U_INVESTOR_NOT_FOUND' });
    }

    const account = rows[0];
    if (!account.is_active) {
      return res.status(403).json({ error: 'Account deactivated', code: 'S_INVESTOR_DEACTIVATED' });
    }

    req.investor = {
      id: account.id,
      email: account.email,
      investorName: account.investor_name,
      lob: account.lob,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN', message: err.message });
  }
}

module.exports = { requireInvestorAuth, getInvestorJwtSecret };