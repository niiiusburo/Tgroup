'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[api/src/server.js global /api auth gate]
 * @crossref:uses[product-map/domains/ctv.yaml, api/src/routes/discountCodes.js (public QR landing/claim paths), api/src/routes/publicBangGia.js]
 */

/** Exact paths that skip requireAuth (login, health, telemetry, etc.). */
const PUBLIC_EXACT_PATHS = new Set([
  '/api/Auth/login',
  '/api/auth/login',
  '/api/Account/Login',
  '/api/account/login',
  '/api/IpAccess/check',
  '/api/ipaccess/check',
  '/api/health',
  '/api/telemetry/version',
]);

/**
 * Returns true when the request may pass the global /api requireAuth gate.
 * Route-level guards (requireStaff, requireCtvSelf) still apply afterward.
 */
function isPublicApiPath(fullPath, method = 'GET') {
  if (PUBLIC_EXACT_PATHS.has(fullPath)) return true;

  // NK3 CTV discount QR — fan landing + claim (Mode A) must work without login.
  if (fullPath.startsWith('/api/discount-codes/landing/')) return true;
  if (fullPath === '/api/discount-codes/check-existing') return true;
  if (fullPath === '/api/discount-codes/generate' && method === 'POST') return true;

  // Bảng giá sync health (no auth — CTV pricing page polls indirectly via static reload).
  if (fullPath === '/api/public/bang-gia/status') return true;

  return false;
}

module.exports = {
  PUBLIC_EXACT_PATHS,
  isPublicApiPath,
};