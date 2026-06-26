'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[/api/investor/auth mounted by investor router]
 * @crossref:uses[dbo.investor_accounts, bcryptjs, jsonwebtoken, investorAuth middleware]
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  InvestorLoginRequestSchema,
  InvestorPasswordResetRequestSchema,
  InvestorPasswordResetConfirmSchema,
} = require('@tgroup/contracts');
const { getQuery } = require('../../db');
const { requireInvestorAuth, getInvestorJwtSecret } = require('../../middleware/investorAuth');
const { logInvestorView } = require('./services/audit');
const {
  TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
} = require('./services/passwordReset');

const router = express.Router();
const TOKEN_EXPIRY = process.env.INVESTOR_TOKEN_EXPIRY || '7d';

async function findInvestorByEmail(email) {
  for (const lob of ['dental', 'cosmetic']) {
    const db = getQuery(lob);
    const rows = await db(
      `SELECT id, email, password_hash, investor_name, lob, is_active
       FROM dbo.investor_accounts
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );
    if (rows && rows.length > 0) {
      return { account: rows[0], lob };
    }
  }
  return null;
}

function generateInvestorToken(account) {
  return jwt.sign(
    {
      type: 'investor',
      sub: account.id,
      lob: account.lob,
    },
    getInvestorJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * POST /api/investor/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const parsed = InvestorLoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Email and password are required', code: 'VALIDATION' });
    }

    const { email, password } = parsed.data;
    const found = await findInvestorByEmail(email);
    if (!found) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    const { account } = found;
    if (!account.is_active) {
      return res.status(403).json({ error: 'Account deactivated', code: 'S_INVESTOR_DEACTIVATED' });
    }

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    const db = getQuery(account.lob);
    await db('UPDATE dbo.investor_accounts SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [account.id]);

    const token = generateInvestorToken(account);
    const investor = {
      id: account.id,
      email: account.email,
      investor_name: account.investor_name,
      lob: account.lob,
    };

    await logInvestorView(investor, 'login', req);

    return res.json({
      success: true,
      token,
      investor,
      permissions: ['investor.read'],
    });
  } catch (err) {
    console.error('[investorAuth] login error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

/**
 * GET /api/investor/auth/me
 */
router.get('/me', requireInvestorAuth, async (req, res) => {
  try {
    return res.json({
      success: true,
      investor: {
        id: req.investor.id,
        email: req.investor.email,
        investor_name: req.investor.investorName,
        lob: req.investor.lob,
      },
      permissions: ['investor.read'],
    });
  } catch (err) {
    console.error('[investorAuth] me error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

const GENERIC_RESET_MESSAGE =
  'If an account exists for that email, a reset link has been sent.';

/**
 * POST /api/investor/auth/password-reset-request
 */
router.post('/password-reset-request', async (req, res) => {
  try {
    const parsed = InvestorPasswordResetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid email required', code: 'VALIDATION' });
    }

    const { email } = parsed.data;
    const found = await findInvestorByEmail(email);

    const response = { success: true, message: GENERIC_RESET_MESSAGE };

    if (found && found.account.is_active) {
      const { account, lob } = found;
      const db = getQuery(lob);
      const rawToken = generateResetToken();
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await db(
        `UPDATE dbo.investor_password_reset_tokens
         SET used_at = NOW()
         WHERE investor_id = $1 AND used_at IS NULL`,
        [account.id]
      );

      await db(
        `INSERT INTO dbo.investor_password_reset_tokens
           (investor_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [account.id, tokenHash, expiresAt]
      );

      const exposeDevToken =
        process.env.NODE_ENV !== 'production' || process.env.INVESTOR_RESET_DEV_EXPOSE === 'true';
      if (exposeDevToken) {
        response.resetUrl = `/investor/reset-password?token=${rawToken}`;
        response.token = rawToken;
      }
    }

    return res.json(response);
  } catch (err) {
    console.error('[investorAuth] reset-request error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_FETCH_FAILED' });
  }
});

/**
 * POST /api/investor/auth/password-reset
 */
router.post('/password-reset', async (req, res) => {
  try {
    const parsed = InvestorPasswordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      const weak = parsed.error?.issues?.some((i) => i.path?.includes('password'));
      if (weak) {
        return res.status(400).json({ error: 'Password too weak', code: 'U_WEAK_PASSWORD' });
      }
      return res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
    }

    const { token, password } = parsed.data;
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password too weak', code: 'U_WEAK_PASSWORD' });
    }

    const tokenHash = hashResetToken(token);

    for (const lob of ['dental', 'cosmetic']) {
      const db = getQuery(lob);
      const rows = await db(
        `SELECT t.id AS token_id, t.investor_id, t.expires_at, t.used_at, ia.is_active
         FROM dbo.investor_password_reset_tokens t
         JOIN dbo.investor_accounts ia ON ia.id = t.investor_id
         WHERE t.token_hash = $1
         LIMIT 1`,
        [tokenHash]
      );

      if (!rows || rows.length === 0) continue;

      const row = rows[0];
      if (row.used_at) {
        return res.status(400).json({ error: 'Token already used', code: 'U_RESET_TOKEN_INVALID' });
      }
      if (new Date(row.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Token expired', code: 'U_RESET_TOKEN_INVALID' });
      }
      if (!row.is_active) {
        return res.status(403).json({ error: 'Account deactivated', code: 'S_INVESTOR_DEACTIVATED' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await db('UPDATE dbo.investor_accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        passwordHash,
        row.investor_id,
      ]);
      await db(
        'UPDATE dbo.investor_password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [row.token_id]
      );

      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid or expired token', code: 'U_RESET_TOKEN_INVALID' });
  } catch (err) {
    console.error('[investorAuth] reset error:', err);
    return res.status(500).json({ error: 'Server error', code: 'E_UPDATE_FAILED' });
  }
});

module.exports = router;