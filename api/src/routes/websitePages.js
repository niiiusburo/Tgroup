/**
 * Website Pages API Routes
 * CMS page management with SEO support
 */
const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { accentInsensitiveSearchCondition, normalizeVietnamese } = require('../utils/search');

const router = express.Router();

// GET /api/WebsitePages - List all pages
router.get('/', requirePermission('website.view'), async (req, res) => {
  try {
    const { company_id, status, search } = req.query;

    let sql = 'SELECT * FROM dbo.websitepages WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (company_id) {
      paramCount++;
      sql += ` AND company_id = $${paramCount}`;
      params.push(company_id);
    }
    if (status && status !== 'all') {
      paramCount++;
      sql += ` AND status = $${paramCount}`;
      params.push(status);
    }
    if (search) {
      paramCount++;
      sql += ` AND ${accentInsensitiveSearchCondition(['title', 'slug'], paramCount, paramCount + 1)}`;
      params.push(`%${String(search).trim()}%`, `%${normalizeVietnamese(search)}%`);
      paramCount += 2;
    }

    sql += ' ORDER BY updated_at DESC';

    const pages = await query(sql, params);

    // Stats
    const stats = {
      total: pages.length,
      published: pages.filter(p => p.status === 'published').length,
      draft: pages.filter(p => p.status === 'draft').length,
      scheduled: pages.filter(p => p.status === 'scheduled').length,
    };

    res.json({
      offset: 0,
      limit: 100,
      totalItems: pages.length,
      items: pages,
      aggregates: stats
    });
  } catch (err) {
    console.error('WebsitePages GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/WebsitePages/:id
router.get('/:id', requirePermission('website.view'), async (req, res) => {
  try {
    const pages = await query(
      'SELECT * FROM dbo.websitepages WHERE id = $1',
      [req.params.id]
    );

    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    res.json(pages[0]);
  } catch (err) {
    console.error('WebsitePages GET/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/WebsitePages - Create page
router.post('/', requirePermission('website.edit'), async (req, res) => {
  try {
    const {
      company_id, title, slug, status, content, template, author, seo
    } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: 'Title and slug are required' });
    }

    // Check slug uniqueness
    const existing = await query(
      'SELECT id FROM dbo.websitepages WHERE slug = $1',
      [slug]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    const seoJson = seo || { title: '', description: '', keywords: [], ogImage: '', canonicalUrl: '' };

    const result = await query(
      `INSERT INTO dbo.websitepages 
       (company_id, title, slug, status, content, template, author, seo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [company_id, title, slug, status || 'draft', content, template || 'default', author, JSON.stringify(seoJson)]
    );

    res.status(201).json(result[0]);
  } catch (err) {
    console.error('WebsitePages POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/WebsitePages/:id - Update page
router.put('/:id', requirePermission('website.edit'), async (req, res) => {
  try {
    const { title, slug, status, content, template, author, seo, views } = req.body;

    // If updating slug, check uniqueness
    if (slug) {
      const existing = await query(
        'SELECT id FROM dbo.websitepages WHERE slug = $1 AND id != $2',
        [slug, req.params.id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = { title, slug, status, content, template, author, views };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    let result = [];
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.params.id);
      result = await query(
        `UPDATE dbo.websitepages SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values
      );
      if (result.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
    }

    // Handle seo separately due to JSON type
    if (seo !== undefined) {
      await query(
        'UPDATE dbo.websitepages SET seo = $1 WHERE id = $2',
        [JSON.stringify(seo), req.params.id]
      );
    }

    if (updates.length === 0 && seo === undefined) {
      const existing = await query('SELECT * FROM dbo.websitepages WHERE id = $1', [req.params.id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Update SEO if provided
    if (seo) {
      await query(
        'UPDATE dbo.websitepages SET seo = $1 WHERE id = $2',
        [JSON.stringify(seo), req.params.id]
      );
    }

    // Return updated page
    const updated = await query(
      'SELECT * FROM dbo.websitepages WHERE id = $1',
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error('WebsitePages PUT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/WebsitePages/:id
router.delete('/:id', requirePermission('website.edit'), async (req, res) => {
  try {
    await query('DELETE FROM dbo.websitepages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('WebsitePages DELETE error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
