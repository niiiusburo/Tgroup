const express = require('express');
const { query } = require('../db');
const { v4: uuidv4 } = require('uuid');
const { requirePermission } = require('../middleware/auth');
const { getVietnamNow } = require('../lib/dateUtils');

const router = express.Router();

function normalizeVietnamese(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoryGroupKey(alias) {
  return `CONCAT_WS('|', COALESCE(${alias}.parentid::text, ''), LOWER(COALESCE(NULLIF(TRIM(${alias}.completename), ''), NULLIF(TRIM(${alias}.name), ''), ${alias}.id::text)))`;
}

function representativeCategoryIdSql(categoryAlias = 'pc') {
  return `(
    SELECT pc_rep.id
    FROM dbo.productcategories pc_rep
    WHERE ${categoryGroupKey('pc_rep')} = ${categoryGroupKey(categoryAlias)}
    ORDER BY (
      SELECT COUNT(*)
      FROM dbo.products p_rep_count
      WHERE p_rep_count.categid = pc_rep.id
        AND p_rep_count.active = true
    ) DESC, pc_rep.datecreated ASC NULLS LAST, pc_rep.id ASC
    LIMIT 1
  )`;
}

function groupedCategoryCondition(paramIdx) {
  return `(
    p.categid = $${paramIdx}
    OR EXISTS (
      SELECT 1
      FROM dbo.productcategories selected_pc
      JOIN dbo.productcategories product_pc
        ON ${categoryGroupKey('product_pc')} = ${categoryGroupKey('selected_pc')}
      WHERE selected_pc.id = $${paramIdx}
        AND product_pc.id = p.categid
    )
  )`;
}

/**
 * GET /api/Products
 * Query params: offset, limit, search, type, categId, active, companyId
 * Returns: {offset, limit, totalItems, items[]}
 *
 * Used for: Services, materials, medicine catalog
 */
router.get('/', requirePermission('services.view'), async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '50',
      search = '',
      type = '', // 'service', 'product', 'consu'
      categId = '',
      active = 'true',
      companyId = '',
      saleOK = '', // 'true' for items that can be sold
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    // Active filter
    if (active === 'true') {
      conditions.push(`p.active = true`);
    } else if (active === 'false') {
      conditions.push(`p.active = false`);
    }

    // Type filter
    if (type) {
      conditions.push(`p.type = $${paramIdx}`);
      params.push(type);
      paramIdx++;
    }

    // Category filter
    if (categId) {
      conditions.push(groupedCategoryCondition(paramIdx));
      params.push(categId);
      paramIdx++;
    }

    // Company filter
    if (companyId) {
      conditions.push(`p.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    // SaleOK filter (column not present in demo schema, skip)
    // if (saleOK === 'true') { conditions.push(`p.saleok = true`); }

    // Search by name, defaultcode, or namenosign (accent-insensitive)
    if (search) {
      const normalizedSearch = normalizeVietnamese(search);
      conditions.push(
        `(p.name ILIKE $${paramIdx} OR p.defaultcode ILIKE $${paramIdx} OR p.namenosign ILIKE $${paramIdx + 1})`
      );
      params.push(`%${search}%`);
      params.push(`%${normalizedSearch}%`);
      paramIdx += 2;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        p.id,
        p.name,
        p.namenosign,
        p.defaultcode,
        p.type,
        p.type2,
        p.listprice,
        p.saleprice,
        p.purchaseprice,
        p.laboprice,
        COALESCE(${representativeCategoryIdSql('pc')}, p.categid) AS categid,
        pc.name AS categname,
        pc.completename AS categcompletename,
        p.uomid,
        p.uomname,
        p.companyid,
        c.name AS companyname,
        p.canorderlab,
        p.active,
        p.datecreated,
        p.lastupdated
      FROM dbo.products p
      LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
      LEFT JOIN dbo.companies c ON c.id = p.companyid
      WHERE ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM dbo.products p WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Products/:id
 * Returns: Single product details
 */
router.get('/:id', requirePermission('services.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        p.id,
        p.name,
        p.namenosign,
        p.defaultcode,
        p.type,
        p.type2,
        p.listprice,
        p.saleprice,
        p.purchaseprice,
        p.laboprice,
        p.categid,
        pc.name AS categname,
        pc.completename AS categcompletename,
        p.uomid,
        p.uomname,
        p.companyid,
        c.name AS companyname,
        p.canorderlab,
        p.active,
        p.datecreated,
        p.lastupdated
      FROM dbo.products p
      LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
      LEFT JOIN dbo.companies c ON c.id = p.companyid
      WHERE p.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/Products
 * Create a new product/service
 */
router.post('/', requirePermission('services.edit'), async (req, res) => {
  try {
    const { name, defaultcode, type, listprice, categid, uomname, companyid, canorderlab } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const now = getVietnamNow();

    const trimmedName = name.trim();
    const nameNoSign = normalizeVietnamese(trimmedName);
    await query(
      `INSERT INTO dbo.products (id, name, namenosign, defaultcode, type, type2, listprice, categid, uomname, companyid, canorderlab, active, datecreated, lastupdated)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, true, $11, $11)`,
      [id, trimmedName, nameNoSign, defaultcode || null, type || 'service', listprice || 0, categid || null, uomname || 'Lần', companyid || null, canorderlab || false, now]
    );

    const rows = await query(
      `SELECT p.*, pc.name AS categname, pc.completename AS categcompletename, c.name AS companyname
       FROM dbo.products p
       LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
       LEFT JOIN dbo.companies c ON c.id = p.companyid
       WHERE p.id = $1`,
      [id]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * PUT /api/Products/:id
 * Update a product/service
 */
router.put('/:id', requirePermission('services.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, defaultcode, listprice, categid, uomname, companyid, canorderlab, active } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) {
      const trimmedName = name.trim();
      updates.push(`name = $${idx}`);
      params.push(trimmedName);
      idx++;
      updates.push(`namenosign = $${idx}`);
      params.push(normalizeVietnamese(trimmedName));
      idx++;
    }
    if (defaultcode !== undefined) { updates.push(`defaultcode = $${idx}`); params.push(defaultcode); idx++; }
    if (listprice !== undefined) { updates.push(`listprice = $${idx}`); params.push(listprice); idx++; }
    if (categid !== undefined) { updates.push(`categid = $${idx}`); params.push(categid); idx++; }
    if (uomname !== undefined) { updates.push(`uomname = $${idx}`); params.push(uomname); idx++; }
    if (companyid !== undefined) { updates.push(`companyid = $${idx}`); params.push(companyid); idx++; }
    if (canorderlab !== undefined) { updates.push(`canorderlab = $${idx}`); params.push(canorderlab); idx++; }
    if (active !== undefined) { updates.push(`active = $${idx}`); params.push(active); idx++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`lastupdated = $${idx}`);
    params.push(getVietnamNow());
    idx++;

    params.push(id);

    await query(
      `UPDATE dbo.products SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );

    const rows = await query(
      `SELECT p.*, pc.name AS categname, pc.completename AS categcompletename, c.name AS companyname
       FROM dbo.products p
       LEFT JOIN dbo.productcategories pc ON pc.id = p.categid
       LEFT JOIN dbo.companies c ON c.id = p.companyid
       WHERE p.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/Products/:id
 */
router.delete('/:id', requirePermission('services.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const [solResult, dksResult] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM dbo.saleorderlines WHERE productid = $1 AND isdeleted = false', [id]),
      query('SELECT COUNT(*) AS count FROM dbo.dotkhamsteps WHERE productid = $1', [id]),
    ]);

    const saleOrderLines = parseInt(solResult[0]?.count || '0', 10);
    const dotkhamSteps = parseInt(dksResult[0]?.count || '0', 10);

    if (saleOrderLines > 0 || dotkhamSteps > 0) {
      return res.status(409).json({
        error: 'Product has linked records',
        linked: { saleOrderLines, dotkhamSteps },
      });
    }

    await query(`DELETE FROM dbo.products WHERE id = $1`, [id]);
    return res.status(204).end();
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

module.exports = router;
