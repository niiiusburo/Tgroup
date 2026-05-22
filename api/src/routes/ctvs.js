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
    const { resolveEffectivePermissions } = require('../services/permissionService');
    const perms = await resolveEffectivePermissions(employeeId);
    const list = Array.isArray(perms) ? perms : (perms && perms.effectivePermissions) || [];
    return list.includes('*') || list.includes('ctv.manage');
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
  const db = getDb('dental');
  const where = ['p.is_ctv = true', 'p.isdeleted = false'];
  if (status === 'active') where.push('p.active = true');
  if (status === 'suspended') where.push('p.active = false');

  try {
    const sql = `
      SELECT p.id, p.name, p.phone, p.email, p.lob_scope, p.active,
             p.referred_by_ctv_id, up.name AS upline_name
      FROM dbo.partners p
      LEFT JOIN dbo.partners up ON up.id = p.referred_by_ctv_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.datecreated DESC NULLS LAST
    `;
    const rows = await db.queryRows(sql);
    return res.json({ ctvs: rows });
  } catch (e) {
    console.error('[Ctvs GET /] error:', e.message);
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

module.exports = router;
