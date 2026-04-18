/**
 * IP Access Control Middleware
 * Enforces IP-based access restrictions before authentication
 */

const { query } = require('../db');
const { getVietnamNow } = require('../lib/dateUtils');

// In-memory cache for settings to avoid DB query per request
let cachedSettings = null;
let cachedEntries = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Get client IP from various sources
 * Order: X-Forwarded-For → X-Real-IP → req.socket.remoteAddress
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;
  return req.socket?.remoteAddress || null;
}

/**
 * Fetch current IP access settings and active entries from DB
 */
async function fetchIpAccessSettings() {
  const settingsRows = await query('SELECT mode, last_updated FROM dbo.ip_access_settings LIMIT 1');
  const settings = settingsRows[0] || { mode: 'allow_all', last_updated: getVietnamNow() };

  const entriesRows = await query(
    `SELECT id, ip_address::text AS ip_address, type, description, is_active, created_at, created_by
     FROM dbo.ip_access_entries WHERE is_active = true`
  );

  return { settings, entries: entriesRows };
}

/**
 * Check if a client IP is allowed based on mode and entries
 */
function checkIpAccess(clientIp, mode, entries) {
  switch (mode) {
    case 'allow_all':
      return { allowed: true };

    case 'block_all':
      return { allowed: false, reason: 'Access denied: all IPs are blocked' };

    case 'whitelist_only': {
      const match = entries.find((e) => e.type === 'whitelist' && e.ip_address === clientIp);
      if (match) {
        return { allowed: true, matchedEntry: match };
      }
      return { allowed: false, reason: 'Access denied: IP address is not in the whitelist' };
    }

    case 'blacklist_block': {
      const match = entries.find((e) => e.type === 'blacklist' && e.ip_address === clientIp);
      if (match) {
        return { allowed: false, reason: 'Access denied: IP address is in the blacklist', matchedEntry: match };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Invalidate the in-memory cache (call after settings/entries mutations)
 */
function invalidateIpAccessCache() {
  cachedSettings = null;
  cachedEntries = null;
  cacheTimestamp = 0;
}

/**
 * Express middleware to enforce IP access control
 */
async function enforceIpAccess(req, res, next) {
  // Allow access to IP management endpoints to prevent admin lockout.
  // Route handlers still enforce settings.view / settings.edit permissions.
  if (req.path && req.path.startsWith('/IpAccess/')) {
    return next();
  }

  // Revalidate cache if stale
  const now = Date.now();
  if (!cachedSettings || now - cacheTimestamp > CACHE_TTL_MS) {
    try {
      const { settings, entries } = await fetchIpAccessSettings();
      cachedSettings = settings;
      cachedEntries = entries;
      cacheTimestamp = now;
    } catch (err) {
      console.error('[IP ACCESS] Failed to fetch settings:', err);
      // Fail open: if DB is unreachable, allow access
      return next();
    }
  }

  const clientIp = getClientIp(req);
  if (!clientIp) {
    // No IP detected — allow (could happen in some proxy setups)
    return next();
  }

  const result = checkIpAccess(clientIp, cachedSettings.mode, cachedEntries);

  if (!result.allowed) {
    console.warn(`[IP ACCESS BLOCKED] ${new Date().toISOString()} - IP: ${clientIp} - Path: ${req.path} - Reason: ${result.reason}`);
    return res.status(403).json({ error: result.reason || 'Access denied from this IP address' });
  }

  next();
}

module.exports = {
  getClientIp,
  checkIpAccess,
  enforceIpAccess,
  invalidateIpAccessCache,
};
