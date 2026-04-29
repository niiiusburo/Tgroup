/**
 * Global error handler middleware for Express
 * Catches unhandled route errors and sends them to the error_events table.
 * @crossref:used-in[api/src/server.js]
 */
const { query } = require('../db');
const crypto = require('crypto');

function makeFingerprint(err, route) {
  const msg = (err.message || '').slice(0, 200);
  const raw = `server|${msg}|${route || 'unknown'}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'authorization',
  'cookie',
  'api_key',
  'apikey',
  'secret',
]);

function redactValue(value) {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redactValue(nestedValue),
    ])
  );
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? (err.message || 'Bad request') : 'Internal server error';

  // Log to console
  console.error(`[${req.method}] ${req.path} — ${status}: ${err.message}`);
  if (status >= 500) {
    console.error(err.stack);
  }

  // Persist to error_events for AutoDebugger (fire-and-forget)
  const fingerprint = makeFingerprint(err, req.originalUrl);
  query(
    `INSERT INTO dbo.error_events
       (fingerprint, error_type, message, stack,
        route, api_endpoint, api_method, api_status, ip_address, metadata)
     VALUES ($1,'Server',$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (fingerprint) DO UPDATE
       SET last_seen_at = NOW(),
           occurrence_count = error_events.occurrence_count + 1,
           stack = EXCLUDED.stack`,
    [
      fingerprint,
      err.message || 'Unknown server error',
      err.stack || '',
      req.originalUrl,
      req.originalUrl,
      req.method,
      status,
      req.ip || '',
      JSON.stringify({ body: redactValue(req.body), query: redactValue(req.query) }),
    ]
  ).catch(dbErr => {
    console.error('Failed to persist server error:', dbErr.message);
  });

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
