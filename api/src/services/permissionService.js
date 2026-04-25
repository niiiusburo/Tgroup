'use strict';

const { query } = require('../db');

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

  if (!groupId) {
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
      `SELECT c.id, c.name
       FROM dbo.employee_location_scope els
       JOIN dbo.companies c ON c.id = els.company_id
       WHERE els.employee_id = $1`,
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

module.exports = { resolveEffectivePermissions, hasPermission };
