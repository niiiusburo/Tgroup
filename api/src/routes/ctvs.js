'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[mounted at /api/Ctvs (+/api/cosmetic mirror) by api/src/server.js; frontend client website/src/lib/api/ctv.ts (fetchCtvOptions/fetchAdminCtvs/updateCtv/setCtvActive/fetchCtvHierarchyById/moveCtv)]
 * @crossref:uses[api/src/db.js (getDb dental+cosmetic — dbo.partners/saleorders/earnings/audit_logs), api/src/services/ctvNetwork.js (getCtvHierarchy), api/src/services/permissionService.js (admin gate), api/src/middleware/auth.js (requireAuth), product-map/domains/ctv.yaml]
 */
/**
 * ctvs.js — Admin CTV management (list + suspend/reactivate).
 * Mounted at /api/Ctvs (admin-scoped). Read-only listing + active-flag toggle.
 * Distinct from /api/ctv (the CTV-facing self portal).
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../db');
const { getCtvHierarchy } = require('../services/ctvNetwork');

const router = express.Router();

async function isAdminCaller(employeeId, authLob) {
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');
    // Admin identity is canonical in the caller's home DB (authLob), not the cosmetic
    // mirror DB. The CTV roster itself is read from the dental/auth DB (getDb('dental')
    // below), so the authorization check must resolve from the same canonical source.
    const permState = await resolveEffectivePermissions(employeeId, authLob);
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
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
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
      SELECT p.id, p.name, p.phone, p.email, p.lob_scope, p.active, p.is_live,
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
 * GET /api/Ctvs/:id/hierarchy
 * Admin-only. Returns the upline chain + flat downline for an ARBITRARY CTV
 * (CtvHierarchyResponse: { current, upline[], downline[], totals }).
 * Reuses the same builder as the CTV self-portal's /api/ctv/hierarchy; the
 * hierarchy spans both LOB DBs, so the result is LOB-independent.
 */
router.get('/:id/hierarchy', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: { code: 'U_INVALID_INPUT', message: 'CTV id is required' } });

  try {
    const hierarchy = await getCtvHierarchy(id);
    return res.json(hierarchy);
  } catch (e) {
    console.error('[Ctvs GET /:id/hierarchy] error:', e.message);
    return res.status(500).json({ error: { code: 'E_SYSTEM', message: 'Failed to load hierarchy' } });
  }
});

/**
 * PATCH /api/Ctvs/:id  Body: { active: boolean }
 * Admin-only suspend/reactivate. Mirrors the change into cosmetic DB if the row exists there.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
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
 * POST /api/Ctvs/:id/move  Body: { uplineId | null }  — §12 admin hierarchy move.
 * Admin-only. A CTV may be moved ONLY when it is fresh: no referred customers, no
 * CTV-attached services, and no earnings — in EITHER LOB. Updates referred_by_ctv_id in
 * both DBs and writes an automatic audit_logs row (no free-text reason required).
 */
router.post('/:id/move', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { id } = req.params;
  const uplineId = (req.body && (req.body.uplineId || req.body.upline_id)) || null;
  if (uplineId && uplineId === id) {
    return res.status(400).json({ error: { code: 'U_SELF_UPLINE', message: 'A CTV cannot be its own upline' } });
  }

  const safeQuery = async (db, sql, params) => {
    try { return await db.queryRows(sql, params); } catch (_e) { return []; }
  };

  try {
    const dental = getDb('dental');
    const cosmetic = getDb('cosmetic');

    // Fresh-CTV guard — no referred customers, services, or earnings in EITHER LOB.
    const activityCount = async (db) => {
      const r = await safeQuery(db, 'SELECT COUNT(*)::int AS n FROM dbo.partners WHERE referred_by_ctv_id = $1', [id]);
      const o = await safeQuery(db, 'SELECT COUNT(*)::int AS n FROM dbo.saleorders WHERE ctv_id = $1', [id]);
      const e = await safeQuery(db, 'SELECT COUNT(*)::int AS n FROM dbo.earnings WHERE recipient_partner_id = $1', [id]);
      return (r[0]?.n || 0) + (o[0]?.n || 0) + (e[0]?.n || 0);
    };
    const activity = (await activityCount(dental)) + (await activityCount(cosmetic));
    if (activity > 0) {
      return res.status(409).json({
        error: { code: 'B_CTV_HAS_ACTIVITY', message: 'CTV has referrals, services, or earnings and cannot be moved', activity },
      });
    }

    if (uplineId) {
      const u = await safeQuery(dental, 'SELECT id FROM dbo.partners WHERE id = $1 AND is_ctv = true LIMIT 1', [uplineId]);
      if (!u[0]) return res.status(404).json({ error: { code: 'U_INVALID_UPLINE', message: 'Upline CTV not found' } });
    }

    const cur = await safeQuery(dental, 'SELECT referred_by_ctv_id FROM dbo.partners WHERE id = $1 AND is_ctv = true', [id]);
    if (!cur[0]) return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'CTV not found' } });
    const oldUpline = cur[0].referred_by_ctv_id || null;

    const moveSql = 'UPDATE dbo.partners SET referred_by_ctv_id = $1, lastupdated = now() WHERE id = $2 AND is_ctv = true RETURNING id';
    await dental.queryRows(moveSql, [uplineId, id]);
    try { await cosmetic.queryRows(moveSql, [uplineId, id]); } catch (_e) { /* cosmetic row may not exist */ }

    // Automatic audit trail (canonical: dental).
    try {
      await dental.queryRows(
        `INSERT INTO dbo.audit_logs (entity_type, entity_id, action, old_value, new_value, created_by)
         VALUES ('ctv', $1, 'move', $2, $3, $4)`,
        [id, oldUpline, uplineId, employeeId]
      );
    } catch (auditErr) {
      console.error('[Ctvs move audit] error:', auditErr.message);
    }

    return res.json({ ok: true, id, oldUpline, newUpline: uplineId });
  } catch (e) {
    console.error('[Ctvs POST /:id/move] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/Ctvs/:id  Body: { name?, phone?, email?, password?, lob_scope? }
 * Admin-only full edit of a CTV's profile fields and/or LOB scope.
 * Any subset of fields may be supplied; only the provided ones are updated.
 * A non-empty password is bcrypt-hashed into password_hash (login tries
 * bcrypt.compare first, so this works for legacy CTVs too).
 * lob_scope: string[] e.g. ['dental'] or ['dental','cosmetic']. 'dental' is
 * always forced (CTV auth row lives in dental DB).
 * Mirrors profile + lob_scope into the cosmetic DB best-effort (creates the
 * mirror row if 'cosmetic' is newly added and the row did not exist).
 */
router.put('/:id', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  const { id } = req.params;
  const body = req.body || {};

  // Only treat a field as "provided" when it is present as a string.
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const password = typeof body.password === 'string' ? body.password : undefined;
  const is_live = typeof body.is_live === 'boolean' ? body.is_live : undefined;
  // lob_scope for admin edit of CTV participation in LOBs (cosmetic earnings etc.)
  const lob_scope = Array.isArray(body.lob_scope)
    ? Array.from(new Set(['dental', ...body.lob_scope.filter((l) => typeof l === 'string' && ['dental', 'cosmetic'].includes(l))]))
    : undefined;
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

  const hasUpdate = name !== undefined || phone !== undefined || email !== undefined || !!password || lob_scope !== undefined || is_live !== undefined;
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

    // Duplicate guards: only collide with OTHER CTV LOGIN ACCOUNTS (is_ctv = true), excluding
    // this CTV's own id (mirrored rows share the id). Phone/email are CTV login identifiers, but
    // they are NOT unique across all partners: migration 044 deliberately allows customers to
    // share a phone, and a CTV commonly shares their phone/email with their own client rows
    // (is_ctv = false). Guarding against every partner row wrongly blocked editing a CTV whose
    // phone also appears on a customer (the reported bug). Scope the check to is_ctv = true.
    if (phone) {
      const dupSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) AND id <> $2 AND is_ctv = true AND COALESCE(isdeleted, false) = false LIMIT 1`;
      const [dDup, cDup] = await Promise.all([
        dentalDb.queryRows(dupSql, [phone, id]),
        cosmeticDb.queryRows(dupSql, [phone, id]).catch(() => []),
      ]);
      if (dDup[0] || cDup[0]) {
        return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
      }
    }
    if (email) {
      const dupSql = `SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) AND id <> $2 AND is_ctv = true AND COALESCE(isdeleted, false) = false LIMIT 1`;
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
    if (lob_scope !== undefined) addSet('lob_scope', lob_scope);
    if (is_live !== undefined) addSet('is_live', is_live);
    sets.push('lastupdated = now()');
    params.push(id);

    const updateSql = `
      UPDATE dbo.partners SET ${sets.join(', ')}
      WHERE id = $${params.length} AND is_ctv = true
      RETURNING id, name, phone, email, lob_scope, active, is_live, referred_by_ctv_id, created_via
    `;

    const dRows = await dentalDb.queryRows(updateSql, params);
    // Best-effort mirror to cosmetic (row may not exist there).
    try { await cosmeticDb.queryRows(updateSql, params); } catch (e) { /* not scoped to cosmetic */ }

    const updated = dRows[0];
    if (!updated) return res.status(404).json({ error: { code: 'S_NOT_FOUND', message: 'CTV not found' } });

    // If lob_scope change added 'cosmetic', ensure the mirror row exists in cosmetic DB
    // (the blind UPDATE above only affects existing rows).
    if (lob_scope !== undefined && lob_scope.includes('cosmetic')) {
      try {
        const cExists = await cosmeticDb.queryRows(
          `SELECT id FROM dbo.partners WHERE id = $1 AND is_ctv = true LIMIT 1`,
          [id]
        );
        if (!cExists[0]) {
          const now = new Date().toISOString();
          // Re-fetch full current (incl. password_hash) from dental for the INSERT copy.
          const dentalFull = await dentalDb.queryRows(
            `SELECT name, phone, email, password_hash, referred_by_ctv_id FROM dbo.partners WHERE id = $1 LIMIT 1`,
            [id]
          );
          const full = dentalFull[0] || updated;
          let pwHash = full.password_hash || null;
          if (password) {
            const bcrypt = require('bcryptjs');
            pwHash = await bcrypt.hash(password, 10);
          }
          const mirParams = [
            id,
            full.name || updated.name,
            full.phone || updated.phone || null,
            full.email || updated.email || null,
            pwHash,
            lob_scope,
            full.referred_by_ctv_id || updated.referred_by_ctv_id || null,
            now,
          ];
          const mirSql = `
            INSERT INTO dbo.partners (
              id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
              active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
              isbusinessinvoice, isdeleted, datecreated, lastupdated
            ) VALUES (
              $1, $2, $3, $4, $5, true, $6, $7,
              true, true, false, false, false, false, false, false,
              false, false, $8, $8
            )
          `;
          await cosmeticDb.queryRows(mirSql, mirParams).catch((e) => {
            console.error('[Ctvs PUT /:id] cosmetic mirror INSERT on lob_scope add:', e.message);
          });
        }
      } catch (e) {
        console.error('[Ctvs PUT /:id] ensure cosmetic mirror for lob_scope:', e.message);
      }
    }

    return res.json(updated);
  } catch (e) {
    console.error('[Ctvs PUT /:id] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
