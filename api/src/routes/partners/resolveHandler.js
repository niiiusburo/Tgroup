'use strict';

const { query } = require('../../db');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Strip everything that isn't a digit. Leading 0 stays — the DB stores phones
// the way staff type them, so we don't try to be clever with country codes.
function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 500;
const cache = new Map(); // key -> { value, expiresAt }

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const CANDIDATE_FIELDS = `
  p.id,
  p.ref AS code,
  p.name,
  p.displayname,
  p.phone,
  p.lastupdated
`;

async function lookupCandidates(key) {
  const trimmed = String(key || '').trim();
  if (!trimmed) return { matchedBy: null, rows: [] };

  if (UUID_RE.test(trimmed)) {
    const rows = await query(
      `SELECT ${CANDIDATE_FIELDS} FROM partners p WHERE p.id = $1 AND p.customer = true LIMIT 5`,
      [trimmed]
    );
    return { matchedBy: 'uuid', rows };
  }

  // Try exact ref match
  const byRef = await query(
    `SELECT ${CANDIDATE_FIELDS} FROM partners p WHERE p.ref = $1 AND p.customer = true LIMIT 5`,
    [trimmed]
  );
  if (byRef.length > 0) return { matchedBy: 'ref', rows: byRef };

  // Try normalized phone
  const phone = normalizePhone(trimmed);
  if (phone.length >= 6) {
    const byPhone = await query(
      `SELECT ${CANDIDATE_FIELDS} FROM partners p WHERE regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g') = $1 AND p.customer = true LIMIT 5`,
      [phone]
    );
    if (byPhone.length > 0) return { matchedBy: 'phone', rows: byPhone };
  }

  return { matchedBy: null, rows: [] };
}

async function resolvePartner(req, res) {
  const key = req.query.key;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({
      error: 'Missing query parameter: key',
      code: 'CUSTOMER_LOOKUP_KEY_REQUIRED',
    });
  }

  const cacheKey = key.trim().toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(cached.status).json(cached.body);
  }

  let result;
  try {
    result = await lookupCandidates(key);
  } catch (err) {
    // Don't cache errors. Bubble up.
    return res.status(500).json({
      error: 'Lookup failed',
      code: 'CUSTOMER_LOOKUP_ERROR',
      detail: err.message,
    });
  }

  if (result.rows.length === 0) {
    const body = {
      error: 'No patient matches the provided key',
      code: 'CUSTOMER_NOT_FOUND',
      key,
    };
    cacheSet(cacheKey, { status: 404, body });
    return res.status(404).json(body);
  }

  if (result.rows.length > 1) {
    const body = {
      error: 'Multiple patients match the provided key',
      code: 'CUSTOMER_LOOKUP_AMBIGUOUS',
      matchedBy: result.matchedBy,
      candidates: result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.displayname || r.name,
        phone: r.phone,
        lastUpdated: r.lastupdated,
      })),
    };
    // Don't cache 409 — picker behavior depends on user choice, not a stable answer.
    return res.status(409).json(body);
  }

  const row = result.rows[0];
  const body = {
    matchedBy: result.matchedBy,
    partner: {
      id: row.id,
      code: row.code,
      name: row.displayname || row.name,
      phone: row.phone,
    },
  };
  cacheSet(cacheKey, { status: 200, body });
  return res.status(200).json(body);
}

module.exports = { resolvePartner };
