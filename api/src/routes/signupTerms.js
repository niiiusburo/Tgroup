/**
 * signupTerms.js — Public endpoint for active signup terms
 * GET /api/signup-terms/active?language=vi|en
 */
const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/active', async (req, res) => {
  const language = req.query.language || 'vi';
  if (language !== 'vi' && language !== 'en') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'language must be vi or en' } });
  }

  try {
    // Try dental DB first (both should have identical terms, but dental is canonical)
    const db = getDb('dental');
    const rows = await db.queryRows(
      `SELECT id, language, version, title, content_html, is_active, updated_at
       FROM dbo.signup_terms
       WHERE language = $1 AND is_active = true
       ORDER BY version DESC
       LIMIT 1`,
      [language]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No active terms found' } });
    }

    const t = rows[0];
    return res.json({
      id: t.id,
      language: t.language,
      version: t.version,
      title: t.title,
      contentHtml: t.content_html,
      isActive: t.is_active,
      updatedAt: t.updated_at,
    });
  } catch (err) {
    console.error('[signup-terms] error:', err);
    return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Failed to load terms' } });
  }
});

module.exports = router;
