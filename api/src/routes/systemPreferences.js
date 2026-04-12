/**
 * System Preferences API Routes
 * Key-value settings store for app configuration
 */
const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/SystemPreferences - List all preferences
router.get('/', async (req, res) => {
  try {
    const { category, key, is_public } = req.query;

    let sql = 'SELECT * FROM dbo.systempreferences WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(category);
    }
    if (key) {
      paramCount++;
      sql += ` AND key = $${paramCount}`;
      params.push(key);
    }
    if (is_public !== undefined) {
      paramCount++;
      sql += ` AND is_public = $${paramCount}`;
      params.push(is_public === 'true');
    }

    sql += ' ORDER BY category, key';

    const prefs = await query(sql, params);

    // Group by category
    const groups = {};
    for (const p of prefs) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }

    res.json({
      offset: 0,
      limit: 100,
      totalItems: prefs.length,
      items: prefs,
      groups,
      aggregates: {
        total: prefs.length,
        categories: Object.keys(groups).length
      }
    });
  } catch (err) {
    console.error('SystemPreferences GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/SystemPreferences/:key - Get single preference by key
router.get('/:key', async (req, res) => {
  try {
    const prefs = await query(
      'SELECT * FROM dbo.systempreferences WHERE key = $1',
      [req.params.key]
    );

    if (prefs.length === 0) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    res.json(prefs[0]);
  } catch (err) {
    console.error('SystemPreferences GET/:key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/SystemPreferences - Create or update preference (upsert)
router.post('/', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { key, value, type, category, description, is_public } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // Upsert
    const result = await query(
      `INSERT INTO dbo.systempreferences (key, value, type, category, description, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         type = EXCLUDED.type,
         category = EXCLUDED.category,
         description = EXCLUDED.description,
         is_public = EXCLUDED.is_public,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value, type || 'string', category || 'General', description, is_public !== false]
    );

    res.status(201).json(result[0]);
  } catch (err) {
    console.error('SystemPreferences POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/SystemPreferences/:key - Update preference
router.put('/:key', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { value, type, category, description, is_public } = req.body;

    const result = await query(
      `UPDATE dbo.systempreferences 
       SET value = COALESCE($1, value),
           type = COALESCE($2, type),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           is_public = COALESCE($5, is_public),
           updated_at = CURRENT_TIMESTAMP
       WHERE key = $6 RETURNING *`,
      [value, type, category, description, is_public, req.params.key]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    res.json(result[0]);
  } catch (err) {
    console.error('SystemPreferences PUT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/SystemPreferences/:key
router.delete('/:key', requirePermission('settings.edit'), async (req, res) => {
  try {
    await query('DELETE FROM dbo.systempreferences WHERE key = $1', [req.params.key]);
    res.json({ success: true });
  } catch (err) {
    console.error('SystemPreferences DELETE error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/SystemPreferences/bulk - Create multiple preferences
router.post('/bulk', requirePermission('settings.edit'), async (req, res) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'preferences array is required' });
    }

    const results = [];
    for (const pref of preferences) {
      const result = await query(
        `INSERT INTO dbo.systempreferences (key, value, type, category, description, is_public)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [pref.key, pref.value, pref.type || 'string', pref.category || 'General', pref.description, pref.is_public !== false]
      );
      results.push(result[0]);
    }

    res.status(201).json({ items: results });
  } catch (err) {
    console.error('SystemPreferences bulk POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
