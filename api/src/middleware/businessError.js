/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 API routes for standardized business-error responses]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md]
 *
 * Standardized business-error responses + internal logging.
 * Business errors are 4xx/200 responses where the operation was rejected by
 * business rules (duplicate record, insufficient balance, invalid state, etc.).
 * They are NOT thrown exceptions — they are intentional rejections.
 */

const { query } = require('../db');
const crypto = require('crypto');

function makeFingerprint(code, route, message) {
  const norm = (message || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>')
    .replace(/\d+/g, '<N>')
    .slice(0, 200);
  const raw = `business|${code || 'UNKNOWN'}|${norm}|${route || 'unknown'}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

/**
 * Send a business-logic error response.
 * Always returns { success: false, error: { code, message, field? } }.
 * Also logs to error_events so the admin panel can track frequency.
 */
function sendBusinessError(res, status, code, message, field) {
  const route = res.req?.originalUrl || 'unknown';
  const method = res.req?.method || 'GET';
  const fingerprint = makeFingerprint(code, route, message);

  // Fire-and-forget: log business error to error_events
  query(
    `INSERT INTO dbo.error_events
       (fingerprint, error_type, message, stack,
        route, api_endpoint, api_method, api_status, metadata)
     VALUES ($1,'Business',$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (fingerprint) DO UPDATE
       SET last_seen_at = NOW(),
           occurrence_count = error_events.occurrence_count + 1`,
    [
      fingerprint,
      message || 'Business rule rejected the request',
      '',
      route,
      route,
      method,
      status,
      JSON.stringify({ code, field }),
    ]
  ).catch((dbErr) => {
    console.error('Failed to persist business error:', dbErr.message);
  });

  return res.status(status).json({
    success: false,
    error: {
      code: code || 'BUSINESS_ERROR',
      message: message || 'Request rejected by server',
      ...(field ? { field } : {}),
    },
  });
}

/**
 * Convenience: 400 Bad Request with a specific business error code.
 */
function badRequest(res, code, message, field) {
  return sendBusinessError(res, 400, code, message, field);
}

/**
 * Convenience: 409 Conflict (duplicate, conflicting state).
 */
function conflict(res, code, message, field) {
  return sendBusinessError(res, 409, code, message, field);
}

/**
 * Convenience: 403 Forbidden (permission denied).
 */
function forbidden(res, code, message) {
  return sendBusinessError(res, 403, code, message);
}

/**
 * Convenience: 404 Not Found.
 */
function notFound(res, code, message) {
  return sendBusinessError(res, 404, code, message);
}

module.exports = {
  sendBusinessError,
  badRequest,
  conflict,
  forbidden,
  notFound,
};
