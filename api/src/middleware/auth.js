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

      req.userPermissions = effectivePermissions;

      if (effectivePermissions.includes('*')) {
        return next();
      }

      const required = Array.isArray(permission) ? permission : [permission];
      const hasPermission = required.some(p => effectivePermissions.includes(p));
      if (!hasPermission) {
        return res.status(403).json({ error: `Permission denied: ${required.join(' or ')}` });
      }

      next();
    } catch (err) {
      console.error('requirePermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * requireAnyPermission([permission1, permission2, ...]) middleware factory
 *
 * Allows the request if the user has ANY of the listed permissions (or wildcard *).
 */
function requireAnyPermission(permissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;
      const resolved = await resolveEffectivePermissions(employeeId);

      if (resolved.effectivePermissions.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      const hasWildcard = resolved.effectivePermissions.includes('*');
      const hasAny = permissions.some((p) => resolved.effectivePermissions.includes(p));

      if (!hasWildcard && !hasAny) {
        return res.status(403).json({ error: `Permission denied: need one of [${permissions.join(', ')}]` });
      }

      // Attach resolved permissions so downstream handlers can enforce scope
      req.userPermissions = resolved;
      next();
    } catch (err) {
      console.error('requireAnyPermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireAuth, requirePermission, requireAnyPermission };
