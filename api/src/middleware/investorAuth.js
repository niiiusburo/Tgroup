'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/* routes]
 * @crossref:uses[dbo.investor_accounts, INVESTOR_JWT_SECRET, product-map/domains/investor-portal.yaml]
 */
const { getQuery } = require('../db');
const { createJwtAuth } = require('./createJwtAuth');

function getInvestorJwtSecret() {
  const secret = process.env.INVESTOR_JWT_SECRET;
  if (!secret) {
    throw new Error('INVESTOR_JWT_SECRET is required for investor portal auth');
  }
  return secret;
}

/**
 * validateInvestor — post-decode validation for investor tokens.
 * Checks token type, LOB, and that the investor account still exists and is active.
 * Overwrites req.investor with the DB account record on success.
 */
async function validateInvestor(decoded, req) {
  if (decoded.type !== 'investor') {
    return { status: 403, error: 'Forbidden', code: 'S_INVESTOR_ONLY' };
  }

  const lob = decoded.lob;
  if (lob !== 'dental' && lob !== 'cosmetic') {
    return { status: 403, error: 'Forbidden', code: 'INVALID_LOB' };
  }

  const db = getQuery(lob);
  const rows = await db(
    `SELECT id, email, investor_name, lob, is_active
     FROM dbo.investor_accounts
     WHERE id = $1`,
    [decoded.sub]
  );

  if (!rows || rows.length === 0) {
    return { status: 401, error: 'Unauthorized', code: 'U_INVESTOR_NOT_FOUND' };
  }

  const account = rows[0];
  if (!account.is_active) {
    return { status: 403, error: 'Account deactivated', code: 'S_INVESTOR_DEACTIVATED' };
  }

  req.investor = {
    id: account.id,
    email: account.email,
    investorName: account.investor_name,
    lob: account.lob,
  };
  return true;
}

const requireInvestorAuth = createJwtAuth({
  secretEnvVar: 'INVESTOR_JWT_SECRET',
  userKey: 'investor',
  validateFn: validateInvestor,
});

module.exports = { requireInvestorAuth, getInvestorJwtSecret };
