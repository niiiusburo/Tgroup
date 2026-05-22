const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/commission-config
 * Returns commission level configuration and default referral percent
 */
router.get('/', async (req, res) => {
  try {
    const levelRows = await query(
      'SELECT level, display_name, enabled, share_percent FROM dbo.commission_level_config ORDER BY level'
    );

    const settingsRows = await query(
      'SELECT default_referral_percent FROM dbo.commission_settings LIMIT 1'
    );

    const defaultReferralPercent = settingsRows && settingsRows.length > 0
      ? parseFloat(settingsRows[0].default_referral_percent)
      : 20.0;

    const levels = levelRows && Array.isArray(levelRows)
      ? levelRows.map(row => ({
          level: row.level,
          displayName: row.display_name,
          enabled: row.enabled,
          sharePercent: parseFloat(row.share_percent),
        }))
      : [];

    return res.json({
      levels,
      defaultReferralPercent,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Error fetching commission configuration',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/commission-config
 * Updates commission level configuration and/or default referral percent
 * Validates: sum of enabled share_percents <= 100
 */
router.put('/', async (req, res) => {
  try {
    const { levels, defaultReferralPercent } = req.body;

    if (!levels || !Array.isArray(levels)) {
      return res.status(400).json({
        message: 'levels must be an array',
      });
    }

    if (defaultReferralPercent !== undefined && typeof defaultReferralPercent !== 'number') {
      return res.status(400).json({
        message: 'defaultReferralPercent must be a number',
      });
    }

    const enabledLevels = levels.filter(l => l.enabled === true);
    const sumSharePercent = enabledLevels.reduce((sum, l) => sum + (parseFloat(l.sharePercent) || 0), 0);

    if (sumSharePercent > 100) {
      return res.status(400).json({
        message: `Sum of enabled share percentages (${sumSharePercent}%) exceeds 100%`,
      });
    }

    // Update commission level configuration
    for (const level of levels) {
      if (typeof level.level !== 'number' || typeof level.sharePercent !== 'number') {
        return res.status(400).json({
          message: 'Each level must have numeric level and sharePercent',
        });
      }

      await query(
        `UPDATE dbo.commission_level_config
         SET share_percent = $1, enabled = $2
         WHERE level = $3`,
        [level.sharePercent, level.enabled === true, level.level]
      );
    }

    // Update commission settings if provided
    if (defaultReferralPercent !== undefined) {
      const existingSettings = await query(
        'SELECT id FROM dbo.commission_settings LIMIT 1'
      );

      if (existingSettings && existingSettings.length > 0) {
        await query(
          'UPDATE dbo.commission_settings SET default_referral_percent = $1',
          [defaultReferralPercent]
        );
      } else {
        await query(
          'INSERT INTO dbo.commission_settings (default_referral_percent) VALUES ($1)',
          [defaultReferralPercent]
        );
      }
    }

    return res.json({
      success: true,
      levels,
      defaultReferralPercent: defaultReferralPercent !== undefined
        ? defaultReferralPercent
        : (await query('SELECT default_referral_percent FROM dbo.commission_settings LIMIT 1'))[0]?.default_referral_percent || 20.0,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Error updating commission configuration',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
