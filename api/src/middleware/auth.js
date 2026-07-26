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
 * requireNonInvestorPermission(permission, notFoundError) middleware factory
 *
 * Same contract as requirePermission for everyone except investors.
 *
 * D21 (DECISIONS.md) keeps investor WRITES forbidden until a decision names the exact write
 * permission and scope; investor_clients allowlists scope reads only. So an investor is
 * refused here BEFORE the permission comparison and before the handler runs — meaning the
 * response never varies with which permissions the investor happens to hold, and the request
 * body is never validated or acted on. (Express parses JSON app-wide before routing; what
 * this guard prevents is the handler inspecting or using that body.)
 *
 * Responds 404 (not 403) so a mounted write route cannot be used to confirm that a record
 * exists, matching the record-safe pattern in routes/saleOrders.js.
 *
 * Sets req.nonInvestorVerified so handlers that keep their own defence-in-depth investor
 * check (for direct invocation outside the router) can skip a redundant scope query on the
 * real mounted route.
 */
function requireNonInvestorPermission(permission, notFoundError = 'Not found') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No token' });
    }
    try {
      const { employeeId } = req.user;
      const { groupName, effectivePermissions } = await resolveEffectivePermissions(employeeId);

      if (String(groupName || '').trim().toLowerCase() === 'investor') {
        return res.status(404).json({ error: notFoundError });
      }

      if (effectivePermissions.length === 0) {
        return res.status(403).json({ error: 'No permission assignment found' });
      }

      if (!effectivePermissions.includes('*') && !effectivePermissions.includes(permission)) {
        return res.status(403).json({ error: `Permission denied: ${permission}` });
      }

      req.nonInvestorVerified = true;
      next();
    } catch (err) {
      console.error('requireNonInvestorPermission error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { requireAuth, requirePermission, requireNonInvestorPermission };
