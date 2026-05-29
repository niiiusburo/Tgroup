'use strict';

/**
 * ctvs.js — Admin CTV management (list + suspend/reactivate).
 * Mounted at /api/Ctvs (admin-scoped). Read-only listing + active-flag toggle.
 * Distinct from /api/ctv (the CTV-facing self portal).
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');

const router = express.Router();

async function isAdminCaller(employeeId) {
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId);
    const list = (permState && permState.effectivePermissions) || [];
    return isAdminPermissionState(permState) || list.includes('*') || list.includes('ctv.manage');
  } catch (e) {
    return false;
  }
}

/**
 * GET /api/Ctvs?status=active|suspended
 * Admin-only. Lists CTV partners from the dental (auth) DB with their upline name.
 */
router.get('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { status } = req.query;
  const requestedLob = req.lob === 'cosmetic'
    ? 'cosmetic'
    : (req.query.lob === 'dental' || req.query.lob === 'cosmetic' ? req.query.lob : null);
  const db = getDb('dental');
  const where = ['p.is_ctv = true', 'p.isdeleted = false'];
  const params = [];
  if (status === 'active') where.push('p.active = true');
  if (status === 'suspended') where.push('p.active = false');
  if (requestedLob) {
    params.push(requestedLob);
    where.push(`COALESCE(p.lob_scope, ARRAY[]::text[]) @> ARRAY[$${params.length}]::text[]`);
  }

  try {
    const sql = `
      SELECT p.id, p.name, p.phone, p.email, p.lob_scope, p.active,
             p.referred_by_ctv_id, p.ref AS legacy_code, p.created_via,
             CASE
               WHEN p.created_via LIKE 'legacy_ctv_import%' THEN 'legacy_ctv'
               ELSE COALESCE(NULLIF(p.created_via, ''), 'tmv')
             END AS source,
             up.name AS upline_name
      FROM dbo.partners p
      LEFT JOIN dbo.partners up ON up.id = p.referred_by_ctv_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.datecreated DESC NULLS LAST
    `;
    const rows = await db.queryRows(sql, params);
    return res.json({ ctvs: rows });
  } catch (e) {
    console.error('[Ctvs GET /] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/Ctvs/options?lob=dental|cosmetic
 * Lightweight active-CTV list (id, name, phone) for populating the CTV selector in the
 * service/appointment forms. Available to any authenticated staff member (not admin-gated)
 * since assigning a CTV requires only customers.edit / appointments.add. CTV auth rows live
 * in the dental (default) DB; results are filtered by lob_scope so the cosmetic LOB only
 * offers cosmetic-scoped CTVs (which are mirrored into the cosmetic DB for earnings FK).
 */
router.get('/options', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  const requestedLob = req.lob === 'cosmetic'
    ? 'cosmetic'
    : (req.query.lob === 'dental' || req.query.lob === 'cosmetic' ? req.query.lob : null);

  const db = getDb('dental');
  const where = ['p.is_ctv = true', 'p.isdeleted = false', 'p.active = true'];
  const params = [];
  if (requestedLob) {
    params.push(requestedLob);
    where.push(`COALESCE(p.lob_scope, ARRAY[]::text[]) @> ARRAY[$${params.length}]::text[]`);
  }

  try {
    const sql = `
      SELECT p.id, p.name, p.phone, p.lob_scope
      FROM dbo.partners p
      WHERE ${where.join(' AND ')}
      ORDER BY p.name ASC NULLS LAST
    `;
    const rows = await db.queryRows(sql, params);
    return res.json({ ctvs: rows });
  } catch (e) {
    console.error('[Ctvs GET /options] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/Ctvs/:id  Body: { active: boolean }
 * Admin-only suspend/reactivate. Mirrors the change into cosmetic DB if the row exists there.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { id } = req.params;
  const { active } = req.body || {};
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'active (boolean) is required' } });
  }

  try {
    const updateSql = `
      UPDATE dbo.partners SET active = $1, lastupdated = now()
      WHERE id = $2 AND is_ctv = true
      RETURNING id, name, active
    `;
    const dRows = await getDb('dental').queryRows(updateSql, [active, id]);
    // Best-effort mirror to cosmetic (row may not exist there).
    try { await getDb('cosmetic').queryRows(updateSql, [active, id]); } catch (e) { /* not scoped to cosmetic */ }

    const updated = dRows[0];
    if (!updated) return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'CTV not found' } });
    return res.json(updated);
  } catch (e) {
    console.error('[Ctvs PATCH /:id] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/Ctvs/:id  Body: { name?, phone?, email?, password? }
 * Admin-only full edit of a CTV's profile fields. Any subset of fields may be
 * supplied; only the provided ones are updated. A non-empty password is
 * bcrypt-hashed into password_hash (login tries bcrypt.compare first, so this
 * works for legacy CTVs too). Mirrors the change into the cosmetic DB best-effort
 * (the row shares the same id when the CTV is cosmetic-scoped).
 */
router.put('/:id', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { id } = req.params;
  const body = req.body || {};

  // Only treat a field as "provided" when it is present as a string.
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const password = typeof body.password === 'string' ? body.password : undefined;

  // Provided fields must be non-empty. Crucially, email/phone are login identifiers:
  // a non-legacy CTV can ONLY log in by email, so blanking it would lock them out
  // permanently. To leave a field unchanged, OMIT it — never send an empty string.
  if (name !== undefined && !name) {
    return res.status(400).json({ error: { code: 'U_INVALID_NAME', message: 'Name cannot be empty' } });
  }
  if (email !== undefined && !email) {
    return res.status(400).json({ error: { code: 'U_INVALID_EMAIL', message: 'Email cannot be empty' } });
  }
  if (email !== undefined && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: { code: 'U_INVALID_EMAIL', message: 'Invalid email format' } });
  }
  if (phone !== undefined && !phone) {
    return res.status(400).json({ error: { code: 'U_INVALID_PHONE', message: 'Phone cannot be empty' } });
  }
  if (password !== undefined && password && password.length < 6) {
    return res.status(400).json({ error: { code: 'U_WEAK_PASSWORD', message: 'Password must be at least 6 characters' } });
  }

  const hasUpdate = name !== undefined || phone !== undefined || email !== undefined || !!password;
  if (!hasUpdate) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'No fields to update' } });
  }

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    const existing = await dentalDb.queryRows(
      `SELECT id FROM dbo.partners WHERE id = $1 AND is_ctv = true AND isdeleted = false LIMIT 1`,
      [id]
    );
    if (!existing[0]) {
      return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'CTV not found' } });
    }

    // Duplicate guards exclude this CTV's own id (mirrored rows share the id).
    if (phone) {
      const dupSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) AND id <> $2 LIMIT 1`;
      const [dDup, cDup] = await Promise.all([
        dentalDb.queryRows(dupSql, [phone, id]),
        cosmeticDb.queryRows(dupSql, [phone, id]).catch(() => []),
      ]);
      if (dDup[0] || cDup[0]) {
        return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
      }
    }
    if (email) {
      const dupSql = `SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`;
      const [dDup, cDup] = await Promise.all([
        dentalDb.queryRows(dupSql, [email, id]),
        cosmeticDb.queryRows(dupSql, [email, id]).catch(() => []),
      ]);
      if (dDup[0] || cDup[0]) {
        return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
      }
    }

    // Build dynamic SET clause from provided fields only.
    const sets = [];
    const params = [];
    const addSet = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
    if (name !== undefined) addSet('name', name);
    if (phone !== undefined) addSet('phone', phone);
    if (email !== undefined) addSet('email', email);
    if (password) {
      const bcrypt = require('bcryptjs');
      addSet('password_hash', await bcrypt.hash(password, 10));
    }
    sets.push('lastupdated = now()');
    params.push(id);

    const updateSql = `
      UPDATE dbo.partners SET ${sets.join(', ')}
      WHERE id = $${params.length} AND is_ctv = true
      RETURNING id, name, phone, email, lob_scope, active, referred_by_ctv_id, created_via
    `;

    const dRows = await dentalDb.queryRows(updateSql, params);
    // Best-effort mirror to cosmetic (row may not exist there).
    try { await cosmeticDb.queryRows(updateSql, params); } catch (e) { /* not scoped to cosmetic */ }

    const updated = dRows[0];
    if (!updated) return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'CTV not found' } });
    return res.json(updated);
  } catch (e) {
    console.error('[Ctvs PUT /:id] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
