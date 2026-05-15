'use strict';

const jwt = require('jsonwebtoken');
const { resolveEffectivePermissions } = require('../services/permissionService');

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
 *
 * Uses the SINGLE shared permissionService — no more duplication.
 * Previously this file had its own copy of the resolution logic
 * that was subtly different from routes/auth.js.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;
      const { effectivePermissions } = await resolveEffectivePermissions(employeeId);

      if (effectivePermissions.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      if (!effectivePermissions.includes('*') && !effectivePermissions.includes(permission)) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }

      next();
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * requireAnyPermission(permissions) middleware factory
 *
 * Allows access if the user has '*' or ANY of the provided permission strings.
 * Useful for shared read surfaces (e.g., customer picker used by appointments).
 */
function requireAnyPermission(permissions) {
  const required = Array.isArray(permissions) ? permissions.filter(Boolean) : [];
  if (required.length === 0) {
    throw new Error('requireAnyPermission requires a non-empty permissions array');
  }

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;
      const { effectivePermissions } = await resolveEffectivePermissions(employeeId);

      if (effectivePermissions.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      if (effectivePermissions.includes('*')) {
        return next();
      }

      const ok = required.some((p) => effectivePermissions.includes(p));
      if (!ok) {
        return res.status(403).json({ error: `Permission denied (any): ${required.join(', ')}` });
      }

      next();
    } catch (err) {
      console.error('requireAnyPermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireAuth, requirePermission, requireAnyPermission };
