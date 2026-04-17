const express = require('express');
const router = express.Router();
const { query } = require('../db');

const RATE_LIMIT = new Map(); // ip -> Array<timestamp>

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 10;
  const entries = RATE_LIMIT.get(ip) || [];
  const recent = entries.filter(t => now - t < windowMs);
  RATE_LIMIT.set(ip, recent);
  return recent.length >= max;
}

router.post('/version', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Rate limited' });
  }

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
    // Fire-and-forget: return success so client never blocks reload
    res.json({ ok: true });
  }
});

module.exports = router;
