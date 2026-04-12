const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/SaleOrders
 * Query params: partner_id (filter by customer), offset, limit, search, sortField, sortOrder
 * Returns: customer's treatment/sale orders history
 */
router.get('/', async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'datecreated',
      sortOrder = 'desc',
      date_from = '',
      date_to = '',
      company_id = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'so.name',
      datecreated: 'so.datecreated',
      amounttotal: 'so.amounttotal',
      state: 'so.state',
    };

    const orderByCol = allowedSortFields[sortField] || 'so.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['so.isdeleted = false'];
    const params = [];
    let paramIdx = 1;

    if (partner_id) {
      conditions.push(`so.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(so.name ILIKE $${paramIdx} OR p.name ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        so.id,
        so.name,
        so.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        so.amounttotal,
        so.residual,
        so.totalpaid,
        so.state,
        so.companyid,
        c.name AS companyname,
        so.doctorid,
        doc.name AS doctorname,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM saleorders so LEFT JOIN partners p ON p.id = so.partnerid WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      totalAmount: items.reduce((sum, item) => sum + parseFloat(item.amounttotal || 0), 0),
      totalPaid: items.reduce((sum, item) => sum + parseFloat(item.totalpaid || 0), 0),
      totalResidual: items.reduce((sum, item) => sum + parseFloat(item.residual || 0), 0),
    };

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching sale orders:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      aggregates: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/SaleOrders/:id
 * Returns: single sale order with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        so.id,
        so.name,
        so.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        so.amounttotal,
        so.residual,
        so.totalpaid,
        so.state,
        so.companyid,
        c.name AS companyname,
        so.doctorid,
        doc.name AS doctorname,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      WHERE so.id = $1 AND so.isdeleted = false`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    const lines = await query(
      `SELECT
        sol.id,
        sol.orderid,
        sol.pricetotal,
        sol.isdeleted
      FROM saleorderlines sol
      WHERE sol.orderid = $1 AND sol.isdeleted = false`,
      [id]
    );

    return res.json({
      ...rows[0],
      lines,
    });
  } catch (err) {
    console.error('Error fetching sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/SaleOrders
 * Creates a new sale order (service record)
 * Body: { partnerid, companyid, productid, productname, doctorid, doctorname, amounttotal, datestart, dateend, notes }
 */
router.post('/', async (req, res) => {
  try {
    const {
      partnerid,
      companyid,
      productid,
      productname,
      doctorid,
      doctorname,
      assistantid,
      quantity,
      unit,
      amounttotal,
      datestart,
      dateend,
      notes,
    } = req.body;

    if (!partnerid) {
      return res.status(400).json({ error: 'partnerid is required' });
    }

    // Generate a new UUID for the sale order
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // Generate sale order name (SO + timestamp)
    const name = productname || `Service ${new Date().toISOString().slice(0, 10)}`;

    // Insert the sale order (only using columns that exist in the schema)
    const result = await query(
      `INSERT INTO saleorders (
        id, name, partnerid, companyid, doctorid, assistantid,
        quantity, unit, amounttotal, residual, totalpaid, state,
        isdeleted, datecreated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        id,
        name,
        partnerid,
        companyid || null,
        doctorid || null,
        assistantid || null,
        quantity || null,
        unit || null,
        amounttotal || 0,
        amounttotal || 0, // residual = total for new orders
        0, // totalpaid = 0 for new orders
        'draft', // state = draft (not confirmed yet)
        false, // isdeleted
      ]
    );

    // If productid is provided, add a sale order line
    if (productid) {
      const lineId = uuidv4();
      await query(
        `INSERT INTO saleorderlines (
          id, orderid, productid, productname,
          pricetotal, isdeleted
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          lineId,
          id,
          productid,
          productname || null,
          amounttotal || 0,
          false,
        ]
      );
    }

    // Fetch the created sale order with joins
    const rows = await query(
      `SELECT
        so.id,
        so.name,
        so.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        so.amounttotal,
        so.residual,
        so.totalpaid,
        so.state,
        so.companyid,
        c.name AS companyname,
        so.doctorid,
        doc.name AS doctorname,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      WHERE so.id = $1`,
      [id]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
