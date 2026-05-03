'use strict';

const { query } = require('../../db');

/**
 * Admin check helper.
 * Admin = belongs to 'System Administrator' group OR has permissions.view
 */
async function isAdmin(employeeId) {
  const epRows = await query(
    `SELECT ep.group_id, pg.name AS group_name
     FROM employee_permissions ep
     JOIN permission_groups pg ON pg.id = ep.group_id
     WHERE ep.employee_id = $1`,
    [employeeId]
  );

  if (!epRows || epRows.length === 0) return false;

  const groupName = epRows[0].group_name;
  if (groupName === 'System Administrator') return true;

  const [basePermRows, overrideRows] = await Promise.all([
    query(
      `SELECT permission FROM group_permissions WHERE group_id = $1`,
      [epRows[0].group_id]
    ),
    query(
      `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`,
      [employeeId]
    ),
  ]);

  const basePerms = basePermRows.map(r => r.permission);
  const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
  const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

  const effectiveSet = new Set([...basePerms, ...granted]);
  for (const p of revoked) effectiveSet.delete(p);

  return effectiveSet.has('permissions.view');
}

function requireAdmin(req, res, next) {
  isAdmin(req.user.employeeId)
    .then((admin) => {
      if (admin) return next();
      return res.status(403).json({ error: 'Admin access required' });
    })
    .catch((err) => {
      console.error('requireAdmin error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    });
}

module.exports = {
  isAdmin,
  requireAdmin,
};
