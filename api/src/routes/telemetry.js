/**
 * Telemetry route — version events + error collection for AutoDebugger
 * @crossref:used-in[api/src/server.js]
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ── Rate limiting ──────────────────────────────────────────────────
const RATE_LIMIT = new Map(); // ip -> Array<timestamp>

function isRateLimited(ip, max = 30) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entries = RATE_LIMIT.get(ip) || [];
  const recent = entries.filter(t => now - t < windowMs);
  RATE_LIMIT.set(ip, recent);
  return recent.length >= max;
}

function recordHit(ip) {
  const entries = RATE_LIMIT.get(ip) || [];
  entries.push(Date.now());
  RATE_LIMIT.set(ip, entries);
}

// ── Error fingerprinting ───────────────────────────────────────────
function makeFingerprint(err) {
  // Normalize message: strip dynamic data (UUIDs, dates, numbers)
  const normalizedMessage = (err.message || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>')
    .replace(/\d+/g, '<N>')
    .slice(0, 200); // Truncate for consistency

  // Extract top stack frame (first non-node_modules, non-chunk line)
  const topFrame = (err.stack || '')
    .split('\n')
    .slice(1)
    .find(line => !line.includes('node_modules') && !line.includes('chunk-'))
    ?.trim()
    ?.slice(0, 200) || '';

  const raw = `${err.error_type || 'error'}|${normalizedMessage}|${topFrame}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

// ── POST /api/telemetry/errors ─────────────────────────────────────
router.post('/errors', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  recordHit(ip);
  if (isRateLimited(ip, 60)) {
    return res.status(429).json({ error: 'Rate limited' });
  }

  const {
    error_type = 'Unknown',
    message = 'No message',
    stack = '',
    component_stack = '',
    route = '',
    source_file = '',
    source_line = null,
    api_endpoint = '',
    api_method = '',
    api_status = null,
    api_body = null,
    user_agent = '',
    user_id = null,
    location_id = null,
    metadata = {},
  } = req.body;

  const fingerprint = makeFingerprint({ error_type, message, stack });

  try {
    // Upsert: increment count and update last_seen if fingerprint exists
    const existing = await query(
      `SELECT id, status, occurrence_count FROM dbo.error_events WHERE fingerprint = $1`,
      [fingerprint]
    );

    if (existing.length > 0) {
      // Only bump count if not already fixed/deployed (if it's back, it's new again)
      const row = existing[0];
      const isResolved = ['fixed', 'deployed', 'won_t_fix'].includes(row.status);

      await query(
        `UPDATE dbo.error_events
         SET last_seen_at = NOW(),
             occurrence_count = occurrence_count + 1,
             ${isResolved ? "status = 'new'," : ''}
             stack = COALESCE(NULLIF($1, ''), stack),
             component_stack = COALESCE(NULLIF($2, ''), component_stack),
             route = COALESCE(NULLIF($3, ''), route),
             source_file = COALESCE(NULLIF($4, ''), source_file),
             source_line = COALESCE($5, source_line),
             api_endpoint = COALESCE(NULLIF($6, ''), api_endpoint),
             api_method = COALESCE(NULLIF($7, ''), api_method),
             api_status = COALESCE($8, api_status),
             api_body = COALESCE($9::jsonb, api_body),
             metadata = metadata || $10::jsonb
         WHERE fingerprint = $11`,
        [
          stack, component_stack, route, source_file, source_line,
          api_endpoint, api_method, api_status,
          api_body ? JSON.stringify(api_body) : null,
          JSON.stringify(metadata),
          fingerprint,
        ]
      );

      return res.json({ ok: true, id: row.id, fingerprint, is_duplicate: true });
    }

    // New error — insert
    const result = await query(
      `INSERT INTO dbo.error_events
         (fingerprint, error_type, message, stack, component_stack, route,
          source_file, source_line, api_endpoint, api_method, api_status, api_body,
          user_agent, ip_address, user_id, location_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        fingerprint, error_type, message, stack || '', component_stack || '', route || '',
        source_file || '', source_line,
        api_endpoint || '', api_method || '', api_status,
        api_body ? JSON.stringify(api_body) : null,
        user_agent || '', ip,
        user_id || null, location_id || null,
        JSON.stringify(metadata),
      ]
    );

    console.log(`[Telemetry] New error captured: ${error_type} - ${message.slice(0, 100)} (fingerprint: ${fingerprint.slice(0, 12)})`);
    return res.json({ ok: true, id: result[0].id, fingerprint, is_duplicate: false });
  } catch (err) {
    console.error('Telemetry errors insert failed:', err);
    return res.json({ ok: true, error: 'db_write_failed' });
  }
});

// ── GET /api/telemetry/errors — for auto-fixer & dashboard ─────────
router.get('/errors', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, type } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (status) {
      where += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    if (type) {
      where += ` AND error_type = $${paramIdx++}`;
      params.push(type);
    }

    const rows = await query(
      `SELECT id, fingerprint, error_type, message, stack, component_stack,
              route, source_file, source_line, api_endpoint, api_method, api_status,
              occurrence_count, first_seen_at, last_seen_at, status, fix_summary, fix_commit
       FROM dbo.error_events
       ${where}
       ORDER BY last_seen_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, Math.min(parseInt(limit) || 50, 200), parseInt(offset) || 0]
    );

    return res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('Telemetry errors fetch failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/telemetry/errors/:id — update error status ────────────
router.put('/errors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, fix_summary, fix_commit } = req.body;

    const validStatuses = ['new', 'investigating', 'fix_in_progress', 'fix_verified', 'deployed', 'duplicate', 'won_t_fix', 'manual_review'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (status) { updates.push(`status = $${paramIdx++}`); params.push(status); }
    if (fix_summary !== undefined) { updates.push(`fix_summary = $${paramIdx++}`); params.push(fix_summary); }
    if (fix_commit !== undefined) { updates.push(`fix_commit = $${paramIdx++}`); params.push(fix_commit); }
    if (status === 'fixed' || status === 'deployed') {
      updates.push(`fixed_at = NOW()`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE dbo.error_events SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id`,
      params
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Error event not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Telemetry error update failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/telemetry/errors/:id/fix-attempts ────────────────────
router.post('/errors/:id/fix-attempts', async (req, res) => {
  try {
    const { id } = req.params;
    const { attempt_number, action, status, details, files_changed, test_output, agent_session } = req.body;

    const result = await query(
      `INSERT INTO dbo.error_fix_attempts
         (error_id, attempt_number, action, status, details, files_changed, test_output, agent_session, started_at, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
       RETURNING id`,
      [id, attempt_number || 1, action, status, details || '', files_changed || [], test_output || '', agent_session || '']
    );

    return res.json({ ok: true, attempt_id: result[0].id });
  } catch (err) {
    console.error('Fix attempt insert failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/telemetry/stats — aggregated error stats ──────────────
router.get('/stats', async (req, res) => {
  try {
    const [byType, byStatus, recent] = await Promise.all([
      query(`SELECT error_type, COUNT(*) as count FROM dbo.error_events GROUP BY error_type ORDER BY count DESC`),
      query(`SELECT status, COUNT(*) as count FROM dbo.error_events GROUP BY status ORDER BY count DESC`),
      query(`SELECT COUNT(*) as count FROM dbo.error_events WHERE last_seen_at > NOW() - INTERVAL '24 hours'`),
    ]);

    return res.json({
      by_type: byType,
      by_status: byStatus,
      total: byType.reduce((sum, r) => sum + parseInt(r.count), 0),
      last_24h: parseInt(recent[0]?.count || '0'),
    });
  } catch (err) {
    console.error('Telemetry stats failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/telemetry/version (existing) ─────────────────────────
router.post('/version', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress;
  if (isRateLimited(ip, 10)) {
    return res.status(429).json({ error: 'Rate limited' });
  }
  recordHit(ip);

  const { event, from, to, trigger, timestamp, userAgent } = req.body;
  const validEvents = [
    'version_update_initiated',
    'version_update_succeeded',
    'version_update_failed',
    'version_update_dismissed',
  ];
  if (!validEvents.includes(event)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  try {
    await query(
      `INSERT INTO version_events (event, from_version, to_version, trigger, timestamp, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event, from || '', to || '', trigger || '', timestamp || Date.now(), userAgent || '', ip]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Telemetry insert failed:', err);
    res.json({ ok: true });
  }
});

module.exports = router;
