'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../db');

/**
 * requireAuth middleware
 * Verifies Bearer JWT token from Authorization header.
 * Sets req.user to decoded JWT payload on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * requirePermission(permission) middleware factory
 * Loads user's effective permissions from DB and checks if the given
 * permission is in their effective set. Returns 403 if not.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(employeeId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Look up group from employee_permissions table
      const permRows = await query(
        `SELECT ep.group_id
         FROM dbo.employee_permissions ep
         WHERE ep.employee_id = $1
         LIMIT 1`,
        [employeeId]
      );

      if (!permRows || permRows.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      const groupId = permRows[0].group_id;

      const [basePermRows, overrideRows] = await Promise.all([
        query(
          `SELECT permission FROM dbo.group_permissions WHERE group_id = $1`,
          [groupId]
        ),
        query(
          `SELECT permission, override_type FROM dbo.permission_overrides WHERE employee_id = $1`,
          [employeeId]
        ),
      ]);

      const basePerms = basePermRows.map(r => r.permission);
      const granted = overrideRows.filter(r => r.override_type === 'grant').map(r => r.permission);
      const revoked = overrideRows.filter(r => r.override_type === 'revoke').map(r => r.permission);

      const effectiveSet = new Set([...basePerms, ...granted]);
      for (const p of revoked) effectiveSet.delete(p);

      if (!effectiveSet.has('*') && !effectiveSet.has(permission)) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }

      next();
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireAuth, requirePermission };