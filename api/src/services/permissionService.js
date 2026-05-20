'use strict';

const { query } = require('../db');

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
 * @param {string} employeeId - UUID of the employee
 * @returns {Promise<{
 *   groupId: string|null,
 *   groupName: string|null,
 *   effectivePermissions: string[],
 *   locations: Array<{id:string, name:string}>
 * }>}
 */
async function resolveEffectivePermissions(employeeId) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(employeeId)) {
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  // Read tier_id from partners (primary source, matches middleware/auth.js lookup)
  const partnerRows = await query(
    `SELECT p.tier_id, pg.name AS group_name
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

  // CTV self-only perms (v2): is_ctv users (no tier/group) get dashboard/commission/referrals self-view automatically.
  // This allows ctv-demo@clinic.vn (and future CTVs) to hit /api/ctv/* without needing group assignment.
  // Soft-gated by is_ctv flag in JWT + route logic; additive, does not affect admin groups.
  if (!groupId) {
    const ctvCheck = await query(`SELECT is_ctv FROM dbo.partners WHERE id = $1 LIMIT 1`, [employeeId]);
    if (ctvCheck && ctvCheck[0] && ctvCheck[0].is_ctv) {
      return {
        groupId: null,
        groupName: 'CTV',
        effectivePermissions: ['ctv.dashboard.view', 'ctv.commission.view.self', 'ctv.referrals.view.self'],
        locations: [],
      };
    }
    return { groupId: null, groupName: null, effectivePermissions: [], locations: [] };
  }

  // Resolve base permissions, overrides, and location scope in parallel
  const [basePermRows, overrideRows, locationRows] = await Promise.all([
    query(
      `SELECT permission FROM dbo.group_permissions WHERE group_id = $1`,
      [groupId]
    ),
    query(
      `SELECT permission, override_type FROM dbo.permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
    query(
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
async function hasPermission(employeeId, permission) {
  const { effectivePermissions } = await resolveEffectivePermissions(employeeId);
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
};
