'use strict';

/**
 * @crossref:domain[auth]
 * @crossref:used-in[JWT + permission + LOB gate for nearly all routes: api/src/server.js, api/src/routes/auth.js, api/src/routes/payments.js, api/src/routes/ctv.js, api/src/routes/exports.js, api/src/middleware/dentalLobGate.js]
 * @crossref:uses[api/src/services/permissionService.js, product-map/domains/auth.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
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
      // Resolve against the caller's HOME db (authLob), not the request's data-LOB.
      // On /api/cosmetic/* the ALS context is cosmetic; resolving perms there would
      // under-permission a real admin (see permissionService.resolveEffectivePermissions).
      const { effectivePermissions } = await resolveEffectivePermissions(employeeId, req.user.authLob || 'dental');

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
 * requireLobScope(lob) middleware factory (Cosmetic LOB v2, D5/D14/D15)
 *
 * Hard gate for LOB-scoped routes (e.g. /api/cosmetic/*).
 * CTV users (is_ctv=true) typically have empty lob_scope and are redirected at login layer.
 * Returns S_LOB_FORBIDDEN (per v2 spec) when scope missing.
 * The lob_scope and is_ctv live on partners (canonical auth source, not a users table).
 */
function requireLobScope(lob) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    const scopes = req.user.lob_scope || req.user.lobScope || [];
    const isCtv = req.user.is_ctv === true || req.user.isCtv === true;

    // CTV never has LOB scope; explicit 403 prevents any leakage
    if (isCtv || !scopes.includes(lob)) {
      return res.status(403).json({
        error: {
          code: 'S_LOB_FORBIDDEN',
          message: `LOB scope '${lob}' required`,
          required: lob,
          has: scopes,
          is_ctv: isCtv,
        },
      });
    }

    next();
  };
}

module.exports = { requireAuth, requirePermission, requireLobScope };
