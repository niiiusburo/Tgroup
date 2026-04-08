const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/Products
 * Query params: offset, limit, search, type, categId, active, companyId
 * Returns: {offset, limit, totalItems, items[]}
 *
 * Used for: Services, materials, medicine catalog
 */
router.get('/', async (req, res) => {
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
      conditions.push(`p.categid = $${paramIdx}`);
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

    // Search by name, defaultcode, or description
    if (search) {
      conditions.push(
        `(p.name ILIKE $${paramIdx} OR p.defaultcode ILIKE $${paramIdx} OR p.namenosign ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
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
router.get('/:id', async (req, res) => {
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

module.exports = router;
