'use strict';

/**
 * ctvPublic.js — PUBLIC (unauthenticated) CTV self-signup via a referral link.
 * Mounted at /api/ctv-public (NO auth) so a shared link `CTV-XXXXXX` lets a new person
 * register themselves as a CTV under the sharer (referred_by_ctv_id = the sharer).
 *
 *   GET  /api/ctv-public/refcode/:code   -> { ok, uplineId, uplineName }   (resolve a link)
 *   POST /api/ctv-public/join            -> creates the CTV under the upline
 *
 * The referral code is `CTV-` + the first 6 hex of the upline's partners.id (see CtvMeTab).
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

async function safeRows(db, sql, params = []) {
  try {
    return await db.queryRows(sql, params);
  } catch (e) {
    console.error('[ctvPublic] query error:', e.message);
    return [];
  }
}

/** "CTV-79DFCE" -> "79dfce" (lowercased hex prefix), or null if malformed. */
function codeToPrefix(code) {
  if (!code || typeof code !== 'string') return null;
  const hex = code.replace(/^CTV-/i, '').trim().toLowerCase();
  return /^[0-9a-f]{4,12}$/.test(hex) ? hex : null;
}

/** Resolve a referral code to its upline CTV (dental row is authoritative — every CTV has one). */
async function resolveUpline(code) {
  const prefix = codeToPrefix(code);
  if (!prefix) return null;
  const rows = await safeRows(
    getDb('dental'),
    `SELECT id, name, lob_scope FROM dbo.partners
      WHERE is_ctv = true AND COALESCE(isdeleted,false) = false AND id::text LIKE $1
      ORDER BY datecreated ASC LIMIT 1`,
    [`${prefix}%`]
  );
  return rows[0] || null;
}

// GET /api/ctv-public/refcode/:code — public; reveals only the upline's display name.
router.get('/refcode/:code', async (req, res) => {
  try {
    const upline = await resolveUpline(req.params.code);
    if (!upline) return res.status(404).json({ ok: false, error: { code: 'U_INVALID_CODE', message: 'Referral code not found' } });
    return res.json({ ok: true, uplineId: upline.id, uplineName: upline.name || null });
  } catch (e) {
    console.error('[ctvPublic GET /refcode] error:', e.message);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /api/ctv-public/join — public self-signup under the referral code's upline.
router.post('/join', async (req, res) => {
  const { code, name, phone, email, password } = req.body || {};
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, email, password' } });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: { code: 'U_WEAK_PASSWORD', message: 'Password must be at least 6 characters' } });
  }

  try {
    const upline = await resolveUpline(code);
    if (!upline) {
      return res.status(404).json({ error: { code: 'U_INVALID_CODE', message: 'Referral code not found' } });
    }

    const dentalDb = getDb('dental');
    const cosmeticDb = getDb('cosmetic');

    // Duplicate phone/email guard across both physical DBs.
    const [dPhone, cPhone, dEmail, cEmail] = await Promise.all([
      safeRows(dentalDb, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]),
      safeRows(cosmeticDb, 'SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1', [phone]),
      safeRows(dentalDb, 'SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]),
      safeRows(cosmeticDb, 'SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]),
    ]);
    if (dPhone.length || cPhone.length) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }
    if (dEmail.length || cEmail.length) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
    }

    // Inherit the upline's LOB scope so the new CTV lives in the same line(s) of business.
    const uplineScope = Array.isArray(upline.lob_scope) && upline.lob_scope.length ? upline.lob_scope : ['dental'];
    const lobScope = Array.from(new Set(['dental', ...uplineScope.filter((l) => l === 'dental' || l === 'cosmetic')]));

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = uuidv4();
    const now = new Date().toISOString();
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
        active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7,
        true, true, false, false, false, false, false, false,
        false, false, $8, $8
      ) RETURNING id, name, phone, email, referred_by_ctv_id
    `;
    const params = [id, name, phone, email, passwordHash, lobScope, upline.id, now];

    const writes = [safeRows(dentalDb, insertSql, params)];
    if (lobScope.includes('cosmetic')) writes.push(safeRows(cosmeticDb, insertSql, params));
    const results = await Promise.all(writes);
    const created = results[0][0];
    if (!created) return res.status(500).json({ error: 'Failed to create CTV' });

    return res.status(201).json({ ok: true, id: created.id, name: created.name, uplineName: upline.name || null });
  } catch (e) {
    console.error('[ctvPublic POST /join] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
