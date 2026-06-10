'use strict';

/**
 * @crossref:domain[earnings-commissions]
 * @crossref:used-in[mounted at /api/CommissionConfig (+/api/cosmetic mirror) by api/src/server.js; frontend client website/src/lib/api/commission.ts (fetch/saveCommissionConfig)]
 * @crossref:uses[api/src/db.js (query — dbo.commission_level_config), api/src/services/permissionService.js, api/src/middleware/auth.js (requireAuth), product-map/domains/earnings-commissions.yaml]
 */
/**
 * commissionConfig.js — MLM commission level config (admin).
 * GET  /api/CommissionConfig  (any authed user) → { levels[], defaultReferralPercent }
 * PUT  /api/CommissionConfig  (admin only)      → upsert levels + default; enabled sum must be <= 100
 *
 * Column contract (migration 049): commission_level_config(level, label, enabled, share_percent),
 * commission_settings(default_referral_percent). Field names stay snake_case to match the frontend lib.
 */

const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { resolveEffectivePermissions, isAdminPermissionState } = require('../services/permissionService');

const router = express.Router();

async function isAdminCaller(employeeId, authLob) {
  try {
    // Resolve admin status from the caller's home DB (authLob), not the cosmetic
    // mirror DB — otherwise a real admin is denied on /api/cosmetic/CommissionConfig.
    const permState = await resolveEffectivePermissions(employeeId, authLob);
    const list = (permState && permState.effectivePermissions) || [];
    return isAdminPermissionState(permState) || list.includes('*') || list.includes('commission.config.manage');
  } catch (e) {
    return false;
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const levelRows = await query(
      'SELECT level, label, enabled, share_percent FROM dbo.commission_level_config ORDER BY level'
    );

    const levels = (Array.isArray(levelRows) ? levelRows : []).map((row) => ({
      level: row.level,
      label: row.label,
      enabled: row.enabled,
      share_percent: parseFloat(row.share_percent),
    }));

    // Commission is levels-only (v3): the global default_referral_percent was removed.
    return res.json({ levels });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching commission configuration', error: err.message });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId, req.user?.authLob || 'dental'))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  try {
    const { levels } = req.body || {};
    if (!Array.isArray(levels)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'levels must be an array' } });
    }
    for (const l of levels) {
      if (typeof l.level !== 'number' || typeof l.share_percent !== 'number') {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Each level needs numeric level and share_percent' } });
      }
    }

    const enabledSum = levels.filter((l) => l.enabled === true).reduce((s, l) => s + (parseFloat(l.share_percent) || 0), 0);
    if (enabledSum > 100) {
      return res.status(400).json({
        error: { code: 'B_LEVEL_SUM_EXCEEDS_100', message: `Enabled levels sum to ${enabledSum}%, which exceeds 100%` },
      });
    }

    for (const level of levels) {
      await query(
        `INSERT INTO dbo.commission_level_config (level, label, enabled, share_percent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (level) DO UPDATE SET label = EXCLUDED.label, enabled = EXCLUDED.enabled, share_percent = EXCLUDED.share_percent`,
        [level.level, level.label || `L${level.level}`, level.enabled === true, level.share_percent]
      );
    }

    const levelRows = await query('SELECT level, label, enabled, share_percent FROM dbo.commission_level_config ORDER BY level');
    return res.json({
      levels: levelRows.map((r) => ({ level: r.level, label: r.label, enabled: r.enabled, share_percent: parseFloat(r.share_percent) })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating commission configuration', error: err.message });
  }
});

module.exports = router;
