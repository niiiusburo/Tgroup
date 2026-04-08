const express = require('express');
const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * GET /api/ProductCategories
 * Returns all product categories
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', active = '' } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (active === 'true') {
      conditions.push('pc.active = true');
    } else if (active === 'false') {
      conditions.push('pc.active = false');
    }

    if (search) {
      conditions.push(`(pc.name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const rows = await query(
      `SELECT
        pc.id,
        pc.name,
        pc.completename,
        pc.parentid,
        pc.active,
        pc.datecreated,
        pc.lastupdated,
        COUNT(p.id)::int AS product_count
      FROM dbo.productcategories pc
      LEFT JOIN dbo.products p ON p.categid = pc.id AND p.active = true
      WHERE ${whereClause}
      GROUP BY pc.id, pc.name, pc.completename, pc.parentid, pc.active, pc.datecreated, pc.lastupdated
      ORDER BY pc.name ASC`,
      params
    );

    return res.json({
      totalItems: rows.length,
      items: rows,
    });
  } catch (err) {
    console.error('Error fetching product categories:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * POST /api/ProductCategories
 * Create a new category
 */
router.post('/', async (req, res) => {
  try {
    const { name, parentid } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO dbo.productcategories (id, name, completename, parentid, active, datecreated, lastupdated)
       VALUES ($1, $2, $3, $4, true, $5, $5)`,
      [id, name.trim(), name.trim(), parentid || null, now]
    );

    const rows = await query(
      `SELECT pc.*, COUNT(p.id)::int AS product_count
       FROM dbo.productcategories pc
       LEFT JOIN dbo.products p ON p.categid = pc.id AND p.active = true
       WHERE pc.id = $1
       GROUP BY pc.id`,
      [id]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating product category:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * PUT /api/ProductCategories/:id
 * Update a category
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx}`, `completename = $${paramIdx}`);
      params.push(name.trim());
      paramIdx++;
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIdx}`);
      params.push(active);
      paramIdx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`lastupdated = $${paramIdx}`);
    params.push(new Date().toISOString());
    paramIdx++;

    params.push(id);

    await query(
      `UPDATE dbo.productcategories SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      params
    );

    // Fix: the id param index
    const rows = await query(
      `SELECT pc.*, COUNT(p.id)::int AS product_count
       FROM dbo.productcategories pc
       LEFT JOIN dbo.products p ON p.categid = pc.id AND p.active = true
       WHERE pc.id = $1
       GROUP BY pc.id`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating product category:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/ProductCategories/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const countResult = await query(
      `SELECT COUNT(*) AS count FROM dbo.products WHERE categid = $1`,
      [id]
    );
    if (parseInt(countResult[0]?.count || '0', 10) > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing products. Remove or reassign products first.' });
    }

    await query(`DELETE FROM dbo.productcategories WHERE id = $1`, [id]);
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting product category:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

module.exports = router;
