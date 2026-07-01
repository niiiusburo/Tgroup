/**
 * _shared.js — Shared helpers extracted from the original ctv.js during the
 * module split (pure mechanical extraction; no logic/SQL changes).
 *
 * Provides the cross-DB query helper + the requireCtvUser gate used by every
 * CTV sub-router. Kept here so each sub-module imports the same behavior that
 * the monolithic ctv.js used to define inline.
 *
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/routes/ctv/commission.js, clients.js, bookings.js, network.js, profile.js]
 * @crossref:uses[api/src/routes/ctvHelpers.js (isCtvUser), api/src/db.js (getDb)]
 */
const { isCtvUser } = require('../ctvHelpers');

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result && result.rows) return result.rows;
  return [];
}

async function safeQueryRows(db, sql, params = []) {
  try {
    if (typeof db.queryRows === 'function') {
      return await db.queryRows(sql, params);
    }
    const r = await db.query(sql, params);
    return toRows(r);
  } catch (e) {
    console.error('[ctv] query error:', e.message);
    return [];
  }
}

function requireCtvUser(req, res, next) {
  if (!req.user?.employeeId) {
    return res.status(401).json({ error: 'No token' });
  }
  if (!isCtvUser(req.user)) {
    return res.status(403).json({
      error: { code: 'S_CTV_ONLY', message: 'CTV access required' },
    });
  }
  next();
}

module.exports = { toRows, safeQueryRows, requireCtvUser };
