/**
 * profile.js — CTV profile/self-settings routes.
 * Extracted from the original ctv.js (pure mechanical split; no logic/SQL changes).
 *
 * Routes mounted under /api/ctv (see ctv/index.js).
 *
 * @crossref:endpoint[POST /api/ctv]
 * @crossref:domain[ctv-creation]
 * @crossref:uses[api/src/db.js (getDb dual), api/src/services/permissionService.js, api/src/routes/ctvHelpers.js (isCtvUser), api/src/routes/ctv/_shared.js]
 */
const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { getDb } = require('../../db');
const { isCtvUser } = require('../ctvHelpers');
const { safeQueryRows } = require('./_shared');

const router = express.Router();

// NOTE: GET /api/ctv/me is served by ctvProfileRoutes (mounted before ctvRoutes
// in server.js). It returns the DB-backed profile (real phone/email) that the
// portal "Me" tab consumes. A duplicate lightweight /me handler used to live
// here but was permanently shadowed by that mount order — it has been removed to
// avoid dead code that would silently win if the mount order ever changed.

/**
 * POST /api/ctv
 * Create a new CTV (commission-tracking vendor).
 * CTV users can create their own CTV profile with self-referral.
 * Admins can create CTVs and optionally set referred_by_ctv_id.
 *
 * Body: { name, phone, email, password, referred_by_ctv_id? }
 * Auth: requireAuth + (is_ctv=true OR admin permission)
 *
 * @crossref:domain[ctv-creation]
 * Backend endpoint: POST /api/ctv (authed CTV recruit or admin create)
 *
 * Absolute path references (SSOT + consumers + governance):
 *   SSOT: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/shared/CtvCreationForm/
 *   Call sites:
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/commission/CtvManagementTab.tsx (AddCtvModal, mode 'admin', uses createCtv)
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/components/ctv/CtvRecruitModal.tsx (mode 'portal-recruit', uses createCtv)
 *     - /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/pages/CTV/JoinCtv.tsx (mode 'public-join' uses joinCtv; parity maintained)
 *   Governance: /Users/thuanle/Documents/TamTMV/Tgrouptest/AGENTS.md §5.1 (CTV / Identity Domain SSOT Enforcement)
 *   Product map: /Users/thuanle/Documents/TamTMV/Tgrouptest/product-map/domains/ctv.yaml (creation subsection)
 *   Types/contract: /Users/thuanle/Documents/TamTMV/Tgrouptest/website/src/lib/api/ctv.ts (CreateCtvInput, createCtv, CtvJoinInput parity for public path)
 *
 * Invariants (must match SSOT + public join path; see AGENTS.md §5.1):
 *   - Email OPTIONAL (only name/phone/password required; duplicate-email guard runs ONLY if email supplied; stores NULL when blank/omitted).
 *   - lob_scope: dental is ALWAYS forced + prepended (Array.from(new Set(['dental', ...]))); ensures login works against dental partners; cosmetic is additive.
 *   - Cross-DB atomic: always write dental row (for auth), write cosmetic only if scoped; on partial failure the caller sees E_CTV_CREATE_FAILED (note: current impl does not auto-rollback on Promise.all fail here, unlike explicit rollback in ctvPublic join).
 *   - Auth/perms: is_ctv or ctv.manage; uses permissionService + isCtvUser from ctvHelpers.
 *   - Errors: VALIDATION, U_DUPLICATE_PHONE (cross both DBs), U_DUPLICATE_EMAIL (only if supplied), S_CTV_CREATE_FORBIDDEN.
 *
 * @crossref:uses[./ctvHelpers (isCtvUser), ../services/permissionService (resolveEffectivePermissions for admin), ../db (getDb dual), local safeQueryRows for dual-DB dup checks + inserts]
 * @crossref:used-in[authed CTV create flows (admin Add CTV + portal recruit); complements public /ctv-public/join; frontend client website/src/lib/api/ctv.ts]
 */
router.post('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  const isCTV = isCtvUser(req.user);
  if (!employeeId) return res.status(401).json({ error: 'No token' });

  // Caller must be a CTV (recruiting downline) or an admin.
  let isAdmin = false;
  try {
    const { resolveEffectivePermissions, isAdminPermissionState } = require('../../services/permissionService');
    const permState = await resolveEffectivePermissions(employeeId, req.user?.authLob || 'dental');
    const list = (permState && permState.effectivePermissions) || [];
    isAdmin = isAdminPermissionState(permState) || list.includes('*') || list.includes('ctv.manage');
  } catch (e) {
    isAdmin = false;
  }

  if (!isCTV && !isAdmin) {
    return res.status(403).json({
      error: { code: 'S_CTV_CREATE_FORBIDDEN', message: 'Only CTVs or admins can create new CTVs' },
    });
  }

  const { name, phone, email, password, lob_scope: bodyScope, referred_by_ctv_id: bodyReferredBy } = req.body || {};

  if (!name || !phone || !password) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Missing required fields: name, phone, password' },
    });
  }
  // email is optional (consistent with public /ctv-public/join and recent spec for CTV self-signup);
  // store as NULL if blank (skips dup check, allows root CTVs without email).
  // [enhanced per task with @crossref block above; see also "Email is OPTIONAL (spec §12)" in ctvPublic.js]

  // Normalize requested LOB scope; dental is always included so the CTV can
  // authenticate (login resolves against the default/dental partners table).
  const requested = Array.isArray(bodyScope) && bodyScope.length
    ? bodyScope.filter((l) => l === 'dental' || l === 'cosmetic')
    : ['dental'];
  const lobScope = Array.from(new Set(['dental', ...requested]));

  const dentalDb = getDb('dental');
  const cosmeticDb = getDb('cosmetic');

  try {
    // Duplicate phone/email guard across both physical DBs.
    const phoneCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(phone) = LOWER($1) LIMIT 1`;
    const [dPhones, cPhones] = await Promise.all([
      safeQueryRows(dentalDb, phoneCheckSql, [phone]),
      safeQueryRows(cosmeticDb, phoneCheckSql, [phone]),
    ]);
    if (dPhones.length > 0 || cPhones.length > 0) {
      return res.status(400).json({ error: { code: 'U_DUPLICATE_PHONE', message: 'Phone number already exists' } });
    }

    if (email) {
      const emailCheckSql = `SELECT id FROM dbo.partners WHERE LOWER(email) = LOWER($1) LIMIT 1`;
      const [dEmails, cEmails] = await Promise.all([
        safeQueryRows(dentalDb, emailCheckSql, [email]),
        safeQueryRows(cosmeticDb, emailCheckSql, [email]),
      ]);
      if (dEmails.length > 0 || cEmails.length > 0) {
        return res.status(400).json({ error: { code: 'U_DUPLICATE_EMAIL', message: 'Email already exists' } });
      }
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // CTV caller becomes the upline; admin may specify (or leave empty).
    const referredById = isCTV && !bodyReferredBy ? employeeId : (bodyReferredBy || null);

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const now = new Date().toISOString();

    // employee=true so the CTV can log in (auth requires employee=true).
    // lob_scope is passed as a JS array → node-postgres binds it as text[].
    const insertSql = `
      INSERT INTO dbo.partners (
        id, name, phone, email, password_hash, is_ctv, lob_scope, referred_by_ctv_id,
        active, employee, customer, supplier, isagent, isinsurance, iscompany, ishead,
        isbusinessinvoice, isdeleted, datecreated, lastupdated
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7,
        true, true, false, false, false, false, false, false,
        false, false, $8, $8
      ) RETURNING id, name, phone, email, is_ctv, lob_scope, referred_by_ctv_id, active, datecreated
    `;
    const params = [id, name, phone, email || null, passwordHash, lobScope, referredById, now];

    // Always create the auth row in dental (default DB); mirror into cosmetic
    // only when the CTV is scoped there, so cosmetic earnings can FK to them.
    const writes = [safeQueryRows(dentalDb, insertSql, params)];
    if (lobScope.includes('cosmetic')) {
      writes.push(safeQueryRows(cosmeticDb, insertSql, params));
    }
    const results = await Promise.all(writes);

    const created = results[0][0];
    if (!created) return res.status(500).json({ error: 'Failed to create CTV' });
    return res.status(201).json(created);
  } catch (e) {
    console.error('[ctv POST /] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
