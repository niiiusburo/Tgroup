'use strict';

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

async function isAdminCaller(employeeId) {
  try {
    const permState = await resolveEffectivePermissions(employeeId);
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
    const settingsRows = await query('SELECT default_referral_percent FROM dbo.commission_settings LIMIT 1');
    const defaultReferralPercent = settingsRows && settingsRows.length > 0
      ? parseFloat(settingsRows[0].default_referral_percent)
      : 20.0;

    const levels = (Array.isArray(levelRows) ? levelRows : []).map((row) => ({
      level: row.level,
      label: row.label,
      enabled: row.enabled,
      share_percent: parseFloat(row.share_percent),
    }));

    return res.json({ levels, defaultReferralPercent });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching commission configuration', error: err.message });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { employeeId } = req.user || {};
  if (!employeeId) return res.status(401).json({ error: 'No token' });
  if (!(await isAdminCaller(employeeId))) {
    return res.status(403).json({ error: { code: 'S_FORBIDDEN', message: 'Admin only' } });
  }

  try {
    const { levels, defaultReferralPercent } = req.body || {};
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

    if (typeof defaultReferralPercent === 'number') {
      await query('UPDATE dbo.commission_settings SET default_referral_percent = $1 WHERE id = 1', [defaultReferralPercent]);
    }

    const levelRows = await query('SELECT level, label, enabled, share_percent FROM dbo.commission_level_config ORDER BY level');
    const settingsRows = await query('SELECT default_referral_percent FROM dbo.commission_settings LIMIT 1');
    return res.json({
      levels: levelRows.map((r) => ({ level: r.level, label: r.label, enabled: r.enabled, share_percent: parseFloat(r.share_percent) })),
      defaultReferralPercent: settingsRows[0] ? parseFloat(settingsRows[0].default_referral_percent) : 20.0,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating commission configuration', error: err.message });
  }
});

module.exports = router;
