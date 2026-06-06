'use strict';

const { query, getQuery } = require('../db');

const ADMIN_GROUP_ID = '11111111-0000-0000-0000-000000000001';

/**
 * V2 Cosmetic LOB + CTV permission keys (registered per v2 spec D5/D14 + PLAN).
 * These are enforced via requirePermission('xxx') on future cosmetic/ctv/commission routes.
 * LOB hard-gating is done via requireLobScope() in addition to these soft perms.
 * Source of truth for list also lives in product-map/contracts/permission-registry.yaml
 */
const V2_LOB_PERMISSIONS = [
  'cosmetic.access',            // admins + cosmetic staff for /api/cosmetic/* mirrors
  'dental.access',              // legacy (backfilled)
  'ctv.dashboard.view',         // CTV users only — /ctv surface
  'ctv.commission.view.self',   // CTV self commissions
  'ctv.referrals.view.self',    // CTV referred clients
  'commissions.view.team',      // admin/manager team view
  'commissions.payout.run',     // admin payout batches
  'commissions.export',         // admin/manager export
  'lob.crossview',              // admin only — cross-LOB client badge probe
];

function isAdminPermissionState(permissionState) {
  const groupId = String(permissionState?.groupId || '').trim().toLowerCase();
  const groupName = String(permissionState?.groupName || '').trim().toLowerCase();
  return (
    groupId === ADMIN_GROUP_ID ||
    groupName === 'admin' ||
    groupName === 'super admin' ||
    groupName === 'system administrator'
  );
}

/**
 * SINGLE SOURCE OF TRUTH for permission resolution.
 *
 * Previously duplicated in:
 *   - middleware/auth.js → requirePermission()
 *   - routes/auth.js → resolvePermissions()
 *
 * Both now import from here. Update ONE file, both paths stay in sync.
 *
 * Identity & permissions are CANONICAL in the caller's HOME database (authLob),
 * NOT the request's data-LOB. On /api/cosmetic/* mirror routes the AsyncLocalStorage
 * context is 'cosmetic', so the bare dynamic query() would resolve permissions against
 * the cosmetic DB — which is not seeded with the full permission model — and would
 * wrongly under-permission a real admin (observed: 403 "Admin only" on CTV management,
 * 403 "Permission denied: reports.view" on revenue reports). Pass the caller's authLob
 * (from the JWT) so resolution always targets their home DB regardless of request context.
 *
 * @param {string} employeeId - UUID of the employee
 * @param {('dental'|'cosmetic')} [authLob] - caller's home LOB (req.user.authLob). When
 *   omitted, falls back to the legacy ALS-following query() for backward compatibility.
 * @returns {Promise<{
 *   groupId: string|null,
 *   groupName: string|null,
 *   effectivePermissions: string[],
 *   locations: Array<{id:string, name:string}>
 * }>}
 */
// In-memory permission cache (perf): requireAuth resolves permissions on EVERY
// request, so a page firing 6-15 concurrent XHRs re-runs this 6-15x for the same
// (employeeId, authLob). We cache the in-flight PROMISE keyed on the only two
// inputs, so concurrent callers share one resolution and repeat calls within the
// TTL skip the DB entirely. TTL is short (default 5s) so permission edits propagate
// quickly; set PERM_CACHE_TTL_MS=0 to disable (tests). A rejected resolve is evicted
// so failures are never cached.
const PERM_CACHE = new Map();
const PERM_CACHE_TTL_MS = parseInt(process.env.PERM_CACHE_TTL_MS || '5000', 10);

async function resolveEffectivePermissions(employeeId, authLob) {
  if (PERM_CACHE_TTL_MS <= 0) {
    return _resolveEffectivePermissionsUncached(employeeId, authLob);
  }
  const key = `${employeeId}::${authLob || 'dental'}`;
  const hit = PERM_CACHE.get(key);
  if (hit && (Date.now() - hit.ts) < PERM_CACHE_TTL_MS) {
    return hit.promise;
  }
  const promise = _resolveEffectivePermissionsUncached(employeeId, authLob);
  PERM_CACHE.set(key, { ts: Date.now(), promise });
  promise.catch(() => {
    const cur = PERM_CACHE.get(key);
    if (cur && cur.promise === promise) PERM_CACHE.delete(key);
  });
  return promise;
}

function _clearPermissionCache() {
  PERM_CACHE.clear();
}

async function _resolveEffectivePermissionsUncached(employeeId, authLob) {
  // Resolve against the caller's home DB explicitly when known; otherwise keep the
  // legacy dynamic query() so existing callers/tests are unaffected.
  const q = (authLob === 'dental' || authLob === 'cosmetic') ? getQuery(authLob) : query;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(employeeId)) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  // Read tier_id + is_ctv from partners (primary source, matches middleware/auth.js lookup)
  const partnerRows = await q(
    `SELECT p.tier_id, p.is_ctv, pg.name AS group_name
     FROM dbo.partners p
     LEFT JOIN dbo.permission_groups pg ON pg.id = p.tier_id
     WHERE p.id = $1 AND p.employee = true AND p.isdeleted = false`,
    [employeeId]
  );

  if (!partnerRows || partnerRows.length === 0) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  const groupId = partnerRows[0].tier_id;
  const groupName = partnerRows[0].group_name;
  const isCtv = partnerRows[0].is_ctv === true;

  // CTV self-only perms (v2): is_ctv users get dashboard/commission/referrals self-view
  // automatically and NEVER inherit staff permission groups. A CTV is an external vendor,
  // not a staff member, so this must hold even when a staff tier_id was erroneously stamped
  // on the CTV row (NK3 data drift stamped tier_id="Editor", which both denied
  // ctv.dashboard.view and leaked payment.edit/appointments.add). Checking is_ctv before the
  // groupId branch fixes the 403 and removes the privilege escalation in one place.
  if (isCtv) {
    return {
      groupId: null,
      groupName: 'CTV',
      effectivePermissions: ['ctv.dashboard.view', 'ctv.commission.view.self', 'ctv.referrals.view.self'],
      locations: [],
    };
  }

  if (!groupId) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  // Resolve base permissions, overrides, and location scope in parallel
  const [basePermRows, overrideRows, locationRows] = await Promise.all([
    q(
      `SELECT permission FROM dbo.group_permissions WHERE group_id = $1`,
      [groupId]
    ),
    q(
      `SELECT permission, override_type FROM dbo.permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
    q(
      `WITH location_candidates AS (
         SELECT c.id, c.name, 0 AS sort_order
         FROM dbo.partners p
         JOIN dbo.companies c ON c.id = p.companyid
         WHERE p.id = $1 AND p.companyid IS NOT NULL

         UNION ALL

         SELECT c.id, c.name, 1 AS sort_order
         FROM dbo.employee_location_scope els
         JOIN dbo.companies c ON c.id = els.company_id
         WHERE els.employee_id = $1
       ),
       deduped_locations AS (
         SELECT DISTINCT ON (id) id, name, sort_order
         FROM location_candidates
         ORDER BY id, sort_order
       )
       SELECT id, name
       FROM deduped_locations
       ORDER BY sort_order, name`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map(r => r.permission);
  const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
  const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return {
    groupId,
    groupName,
    effectivePermissions: [...effectiveSet],
    locations: locationRows.map(l => ({ id: l.id, name: l.name })),
  };
}

/**
 * Check if employee has a specific permission.
 * @param {string} employeeId
 * @param {string} permission - e.g., 'customers.view'
 * @returns {Promise<boolean>}
 */
async function hasPermission(employeeId, permission, authLob) {
  const { effectivePermissions } = await resolveEffectivePermissions(employeeId, authLob);
  if (effectivePermissions.length === 0) return false;
  if (effectivePermissions.includes('*')) return true;
  return effectivePermissions.includes(permission);
}

module.exports = {
  resolveEffectivePermissions,
  hasPermission,
  V2_LOB_PERMISSIONS,
  ADMIN_GROUP_ID,
  isAdminPermissionState,
  _clearPermissionCache,
};
