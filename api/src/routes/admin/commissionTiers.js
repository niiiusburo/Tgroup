/**
 * admin/commissionTiers.js — Per-LOB commission tier management
 * GET/PUT /api/admin/commission-tiers?lob=dental|cosmetic
 * Writes go to the requested LOB's DB only.
 */
const express = require('express');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { getDb } = require('../../db');

const router = express.Router();

const VALID_LOBS = new Set(['dental', 'cosmetic']);

function getLobDb(req) {
  const lob = req.query.lob || 'dental';
  if (!VALID_LOBS.has(lob)) {
    return { error: { code: 'S_INVALID_LOB', message: 'lob must be dental or cosmetic' } };
  }
  return { lob, db: getDb(lob) };
}

/**
 * GET /api/admin/commission-tiers?lob=dental|cosmetic
 * Returns all L0–L4 rows for the requested LOB.
 */
router.get('/', requireAuth, requirePermission('settings.view'), async (req, res) => {
  const lobResult = getLobDb(req);
  if (lobResult.error) return res.status(400).json(lobResult.error);

  const { lob, db } = lobResult;
  try {
    const rows = await db.queryRows(
      `SELECT lob, level, rate, label, is_active, updated_at
       FROM dbo.commission_tiers
       WHERE lob = $1
       ORDER BY level ASC`,
      [lob]
    );

    const tiers = rows.map((r) => ({
      lob: r.lob,
      level: r.level,
      rate: parseFloat(r.rate),
      label: r.label,
      isActive: r.is_active,
      updatedAt: r.updated_at,
    }));

    return res.json({ lob, tiers });
  } catch (err) {
    console.error('[commission-tiers] GET error:', err);
    return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to load tiers' } });
  }
});

/**
 * PUT /api/admin/commission-tiers?lob=dental|cosmetic
 * Body: { tiers: [{ level, rate, label, isActive }, ...] }
 * Upserts L0–L4 for the requested LOB. Other LOB untouched.
 */
router.put('/', requireAuth, requirePermission('settings.view'), async (req, res) => {
  const lobResult = getLobDb(req);
  if (lobResult.error) return res.status(400).json(lobResult.error);

  const { lob, db } = lobResult;
  const { tiers } = req.body || {};

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'tiers array required' } });
  }

  // Validate each tier
  for (const t of tiers) {
    const lvl = Number(t.level);
    if (!Number.isInteger(lvl) || lvl < 0 || lvl > 4) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid level: ${t.level}` } });
    }
    const rate = parseFloat(t.rate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid rate for level ${lvl}: ${t.rate}` } });
    }
    if (typeof t.label !== 'string' || t.label.length > 80) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid label for level ${lvl}` } });
    }
  }

  try {
    // Upsert each tier row
    for (const t of tiers) {
      await db.query(
        `INSERT INTO dbo.commission_tiers (lob, level, rate, label, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (lob, level) DO UPDATE SET
           rate = EXCLUDED.rate,
           label = EXCLUDED.label,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
        [lob, t.level, t.rate, t.label, !!t.isActive]
      );
    }

    // Return refreshed rows
    const rows = await db.queryRows(
      `SELECT lob, level, rate, label, is_active, updated_at
       FROM dbo.commission_tiers
       WHERE lob = $1
       ORDER BY level ASC`,
      [lob]
    );

    return res.json({
      lob,
      tiers: rows.map((r) => ({
        lob: r.lob,
        level: r.level,
        rate: parseFloat(r.rate),
        label: r.label,
        isActive: r.is_active,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('[commission-tiers] PUT error:', err);
    return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to save tiers' } });
  }
});

module.exports = router;
