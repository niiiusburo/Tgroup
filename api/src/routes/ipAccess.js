/**
 * IP Access Control API Routes
 */
const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { getClientIp, checkIpAccess, invalidateIpAccessCache } = require('../middleware/ipAccess');

const router = express.Router();

// IPv4 validation regex
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

function isValidIpv4(ip) {
  return typeof ip === 'string' && IPV4_REGEX.test(ip.trim());
}

const VALID_MODES = new Set(['allow_all', 'block_all', 'whitelist_only', 'blacklist_block']);
const VALID_TYPES = new Set(['whitelist', 'blacklist']);

// GET /api/IpAccess/settings - Get current settings
router.get('/settings', requirePermission('settings.view'), async (_req, res) => {
  try {
    const rows = await query('SELECT id, mode, last_updated AS "lastUpdated" FROM dbo.ip_access_settings LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('IpAccess GET settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/IpAccess/settings - Update mode
router.put('/settings', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { mode } = req.body;
    if (!mode || !VALID_MODES.has(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be one of: allow_all, block_all, whitelist_only, blacklist_block' });
    }

    const rows = await query(
      'UPDATE dbo.ip_access_settings SET mode = $1, last_updated = NOW() RETURNING id, mode, last_updated AS "lastUpdated"',
      [mode]
    );

    if (rows.length === 0) {
      // Seed row if missing
      const inserted = await query(
        'INSERT INTO dbo.ip_access_settings (mode, last_updated) VALUES ($1, NOW()) RETURNING id, mode, last_updated AS "lastUpdated"',
        [mode]
      );
      invalidateIpAccessCache();
      return res.json(inserted[0]);
    }

    invalidateIpAccessCache();
    res.json(rows[0]);
  } catch (err) {
    console.error('IpAccess PUT settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/IpAccess/entries - List all entries
router.get('/entries', requirePermission('settings.view'), async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id,
              ip_address::text AS "ipAddress",
              type,
              description,
              is_active AS "isActive",
              created_at AS "createdAt",
              created_by AS "createdBy"
       FROM dbo.ip_access_entries
       ORDER BY created_at DESC`
    );
    res.json({ entries: rows });
  } catch (err) {
    console.error('IpAccess GET entries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/IpAccess/entries - Create entry
router.post('/entries', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { ipAddress, type, description = '' } = req.body;

    if (!ipAddress || !isValidIpv4(ipAddress)) {
      return res.status(400).json({ error: 'Invalid IPv4 address' });
    }
    if (!type || !VALID_TYPES.has(type)) {
      return res.status(400).json({ error: 'Type must be whitelist or blacklist' });
    }

    const trimmedIp = ipAddress.trim();
    const trimmedDesc = String(description).trim().slice(0, 500);
    const createdBy = req.user?.id || null;

    // Check for duplicate (same IP + type)
    const existing = await query(
      'SELECT id FROM dbo.ip_access_entries WHERE ip_address = $1 AND type = $2 LIMIT 1',
      [trimmedIp, type]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Entry already exists for this IP and type' });
    }

    const rows = await query(
      `INSERT INTO dbo.ip_access_entries (ip_address, type, description, is_active, created_by)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id,
                 ip_address::text AS "ipAddress",
                 type,
                 description,
                 is_active AS "isActive",
                 created_at AS "createdAt",
                 created_by AS "createdBy"`,
      [trimmedIp, type, trimmedDesc, createdBy]
    );

    invalidateIpAccessCache();
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('IpAccess POST entries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/IpAccess/entries/:id - Update entry
router.put('/entries/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, type, isActive } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (description !== undefined) {
      updates.push(`description = $${idx}`);
      values.push(String(description).trim().slice(0, 500));
      idx++;
    }
    if (type !== undefined) {
      if (!VALID_TYPES.has(type)) {
        return res.status(400).json({ error: 'Type must be whitelist or blacklist' });
      }
      updates.push(`type = $${idx}`);
      values.push(type);
      idx++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx}`);
      values.push(Boolean(isActive));
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const rows = await query(
      `UPDATE dbo.ip_access_entries SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id,
                 ip_address::text AS "ipAddress",
                 type,
                 description,
                 is_active AS "isActive",
                 created_at AS "createdAt",
                 created_by AS "createdBy"`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    invalidateIpAccessCache();
    res.json(rows[0]);
  } catch (err) {
    console.error('IpAccess PUT entries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/IpAccess/entries/:id - Delete entry
router.delete('/entries/:id', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM dbo.ip_access_entries WHERE id = $1 RETURNING id', [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    invalidateIpAccessCache();
    res.json({ success: true });
  } catch (err) {
    console.error('IpAccess DELETE entries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/IpAccess/check - Public endpoint to check caller IP
router.get('/check', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    if (!clientIp) {
      return res.status(400).json({ error: 'Unable to determine client IP' });
    }

    const settingsRows = await query('SELECT mode FROM dbo.ip_access_settings LIMIT 1');
    const mode = settingsRows[0]?.mode || 'allow_all';

    const entriesRows = await query(
      `SELECT id, ip_address::text AS ip_address, type, description, is_active, created_at, created_by
       FROM dbo.ip_access_entries WHERE is_active = true`
    );

    const result = checkIpAccess(clientIp, mode, entriesRows);
    res.json({ allowed: result.allowed, reason: result.reason, clientIp });
  } catch (err) {
    console.error('IpAccess GET check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
