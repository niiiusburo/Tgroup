'use strict';

/**
 * @crossref:domain[auth]
 * @crossref:used-in[api/src/server.js — mounted on /api before the legacy dental route mounts]
 * @crossref:uses[api/src/middleware/auth.js requireLobScope, product-map/domains/auth.yaml, docs/INVARIANTS.md INV-008A, docs/SECURITY.md]
 *
 * dentalLobGate — symmetric LOB hard gate for the LEGACY dental routes.
 *
 * The /api/cosmetic/* mirror is gated by requireLobScope('cosmetic'), but the un-prefixed
 * dental routes (/api/Partners, /api/Appointments, ...) historically had NO LOB gate — they
 * relied on the frontend LOB pin (INV-008A / INV-009) for isolation. That leaves a
 * defense-in-depth hole: a cosmetic-only (or CTV) token can read dental data — including
 * patient PHI via GET /api/Partners — by calling the routes directly, bypassing the UI.
 *
 * This gate closes the hole for the EXACT set of LOB-scoped data surfaces that the cosmetic
 * mirror exposes (so the two sides are symmetric). Cross-cutting routes (Auth, Feedback,
 * telemetry, face, settings, Places, SystemPreferences, Ip/config, etc.) are NOT gated.
 *
 * Pass logic (via requireLobScope('dental')):
 *   - Admin            → lob_scope ['dental','cosmetic']  → PASS
 *   - Dental staff     → lob_scope ['dental']             → PASS
 *   - Cosmetic-only    → lob_scope ['cosmetic']           → 403 S_LOB_FORBIDDEN (use /api/cosmetic/*)
 *   - CTV (is_ctv)     → always                            → 403 (CTVs use /api/ctv/* only)
 */

const { requireLobScope } = require('./auth');

// Exactly the surfaces mirrored under /api/cosmetic/* in server.js (the LOB-scoped set).
const DENTAL_LOB_SCOPED = new Set([
  'Partners',
  'Employees',
  'Products',
  'ProductCategories',
  'SaleOrders',
  'SaleOrderLines',
  'Appointments',
  'Payments',
  'Companies',
  'Reports',
  'DashboardReports',
  'CustomerBalance',
  'CustomerReceipts',
  'CustomerSources',
  'CommissionConfig',
  'Ctvs',
  'NewClients',
  'Permissions',
  'AccountPayments',
  'DotKhams',
  'MonthlyPlans',
  'ExternalCheckups',
]);

const dentalScopeGuard = requireLobScope('dental');

/**
 * Express middleware. Mount with `app.use('/api', dentalLobGate)` AFTER requireAuth and
 * BEFORE the legacy dental route mounts. `req.path` is relative to the `/api` mount
 * (e.g. "/Partners/123" or "/cosmetic/Partners").
 */
function dentalLobGate(req, res, next) {
  const first = req.path.split('/').filter(Boolean)[0];
  // The cosmetic mirror enforces its own requireLobScope('cosmetic') — never double-gate it.
  if (first === 'cosmetic') return next();
  // Only gate the LOB-scoped dental data surfaces; everything else passes through unchanged.
  if (!DENTAL_LOB_SCOPED.has(first)) return next();
  return dentalScopeGuard(req, res, next);
}

module.exports = { dentalLobGate, DENTAL_LOB_SCOPED };
