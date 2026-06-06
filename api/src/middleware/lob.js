'use strict';

const { getDb, runWithLob } = require('../db');

/**
 * attachLobDb(lob) middleware factory for explicit LOB-aware routes.
 * Sets req.lob and req.db (the correct Pool with queryRows helper) on the request.
 * Wraps downstream with runWithLob(lob, ...) so that the dynamic legacy `query()` export
 * (which calls getCurrentLob() from ALS) targets tcosmetic_demo for ALL handlers under the mount.
 *
 * This provides a universal runWithLob wrapper for the cosmeticRouter (and early mounts),
 * achieving 100% safe DB isolation on every /api/cosmetic/* path — even for remaining bare
 * `const { query } = require('../db')` sites in products.js, all reports/*, saleOrderLines,
 * dashboardReports, accountPayments, crmTasks, monthlyPlans, etc. (no per-file edits needed).
 *
 * Explicit `getQuery(req)` / `req.db` usage in migrated handlers (partners, appts, payments, etc.)
 * remains the preferred pattern for new code and continues to work (ignores ALS, uses req directly).
 *
 * Dental mounts never use this; they continue to use static dental {query} import → zero change.
 * Pool.connect() sites still require explicit `req.db ? req.db.connect() : pool.connect()` fix.
 *
 * Also supports explicit ?lob= or X-LOB header for future /api/dental/* explicit if needed.
 * Do not use this override-enabled factory for fixed mirror prefixes such as /api/cosmetic/*.
 */
function attachLobDb(defaultLob = 'cosmetic') {
  return (req, res, next) => {
    // Priority: explicit param (for /:lob routes if used), header, query, then default for this mount
    const lob = (req.params && req.params.lob) ||
                req.header('x-lob') ||
                req.query.lob ||
                defaultLob;

    if (lob !== 'dental' && lob !== 'cosmetic') {
      return res.status(400).json({ error: { code: 'S_INVALID_LOB', message: `Invalid lob: ${lob}` } });
    }

    req.lob = lob;
    req.db = getDb(lob);

    // Activate ALS context for this request subtree. This makes bare legacy query() calls
    // (in unmigrated handlers) resolve via getCurrentLob() to the correct cosmetic pool.
    // next() is invoked inside the run cb so express downstream (handlers) inherit the store
    // for the full async execution (awaits preserve ALS).
    runWithLob(lob, next);
  };
}

/**
 * Fixed cosmetic DB for the /api/cosmetic/* router subtree.
 *
 * Query/header overrides are intentionally ignored here. A cosmetic URL is a hard
 * routing boundary, so /api/cosmetic/* must not be able to switch to dental or
 * "all" through ?lob= or X-LOB.
 */
const attachCosmeticDb = (req, _res, next) => {
  const lob = 'cosmetic';
  req.lob = lob;
  req.db = getDb(lob);
  runWithLob(lob, next);
};

module.exports = { attachLobDb, attachCosmeticDb };
