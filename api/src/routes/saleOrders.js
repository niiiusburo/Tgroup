const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

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

    if (date_from) {
      conditions.push(`so.datecreated >= $${paramIdx}`);
      params.push(date_from);
      paramIdx++;
    }

    if (date_to) {
      conditions.push(`so.datecreated <= $${paramIdx}`);
      params.push(date_to);
      paramIdx++;
    }

    if (company_id) {
      conditions.push(`so.companyid = $${paramIdx}`);
      params.push(company_id);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        so.id,
        so.name,
        so.code,
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
        so.assistantid,
        asst.name AS assistantname,
        so.dentalaideid,
        da.name AS dentalaidename,
        so.quantity,
        so.unit,
        so.datestart,
        so.dateend,
        so.notes,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      LEFT JOIN partners asst ON asst.id = so.assistantid
      LEFT JOIN partners da ON da.id = so.dentalaideid
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
        so.code,
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
        so.assistantid,
        asst.name AS assistantname,
        so.dentalaideid,
        da.name AS dentalaidename,
        so.quantity,
        so.unit,
        so.datestart,
        so.dateend,
        so.notes,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      LEFT JOIN partners asst ON asst.id = so.assistantid
      LEFT JOIN partners da ON da.id = so.dentalaideid
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
router.post('/', requirePermission('customers.edit'), async (req, res) => {
  try {
    const {
      partnerid,
      companyid,
      productid,
      productname,
      doctorid,
      doctorname,
      assistantid,
      dentalaideid,
      quantity,
      unit,
      amounttotal,
      datestart,
      dateend,
      notes,
      tooth_numbers,
      tooth_comment,
    } = req.body;

    if (!partnerid) {
      return res.status(400).json({ error: 'partnerid is required' });
    }

    // Invariant: service.totalCost.non-negative (HIGH)
    if (parseFloat(amounttotal || 0) < 0) {
      return res.status(400).json({ error: 'amounttotal must be >= 0' });
    }
    if (quantity != null && !isNaN(parseFloat(quantity)) && parseFloat(quantity) < 0) {
      return res.status(400).json({ error: 'quantity must be >= 0' });
    }

    // Generate a new UUID for the sale order
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // Generate sale order name (service description)
    const name = productname || `Service ${new Date().toISOString().slice(0, 10)}`;

    // Generate a unique sale order code, e.g. SO-2024-0001
    const year = new Date().getFullYear();
    const seqResult = await query(`SELECT nextval('dbo.saleorder_code_seq') AS seq`);
    const seqNum = parseInt(seqResult[0]?.seq || '1', 10);
    const code = `SO-${year}-${String(seqNum).padStart(4, '0')}`;

    // Insert the sale order (only using columns that exist in the schema)
    const result = await query(
      `INSERT INTO saleorders (
        id, name, code, partnerid, companyid, doctorid, assistantid, dentalaideid,
        quantity, unit, amounttotal, residual, totalpaid, state,
        datestart, dateend, notes,
        isdeleted, datecreated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
      RETURNING *`,
      [
        id,
        name,
        code,
        partnerid,
        companyid || null,
        doctorid || null,
        assistantid || null,
        dentalaideid || null,
        quantity || null,
        unit || null,
        amounttotal || 0,
        amounttotal || 0, // residual = total for new orders
        0, // totalpaid = 0 for new orders
        'sale', // state = sale (Đang điều trị) by default
        datestart || null,
        dateend || null,
        notes || null,
        false, // isdeleted
      ]
    );

    // If productid is provided, add a sale order line
    if (productid) {
      const lineId = uuidv4();
      await query(
        `INSERT INTO saleorderlines (
          id, orderid, productid, productname,
          pricetotal, tooth_numbers, tooth_comment, isdeleted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          lineId,
          id,
          productid,
          productname || null,
          amounttotal || 0,
          tooth_numbers || null,
          tooth_comment || null,
          false,
        ]
      );
    }

    // Fetch the created sale order with joins
    const rows = await query(
      `SELECT
        so.id,
        so.name,
        so.code,
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
        so.assistantid,
        asst.name AS assistantname,
        so.dentalaideid,
        da.name AS dentalaidename,
        so.quantity,
        so.unit,
        so.datestart,
        so.dateend,
        so.notes,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      LEFT JOIN partners asst ON asst.id = so.assistantid
      LEFT JOIN partners da ON da.id = so.dentalaideid
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

/**
 * PATCH /api/SaleOrders/:id/state
 * Update the state of a sale order (treatment status)
 * Body: { state: 'sale' | 'done' | 'cancel' | 'draft' }
 */
router.patch('/:id/state', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;
    const changedBy = req.user?.employeeId || req.user?.id || null;
    console.log('[PATCH /SaleOrders/:id/state] id=', id, 'state=', state, 'changedBy=', changedBy);

    const validStates = ['sale', 'done', 'cancel', 'draft'];
    if (!state || !validStates.includes(state)) {
      console.log('[PATCH /SaleOrders/:id/state] invalid state:', state);
      return res.status(400).json({ error: `Invalid state. Must be one of: ${validStates.join(', ')}` });
    }

    // Capture old state for audit logging
    const oldRows = await query(
      `SELECT state FROM saleorders WHERE id = $1 AND isdeleted = false`,
      [id]
    );
    console.log('[PATCH /SaleOrders/:id/state] oldRows=', oldRows);
    if (!oldRows || oldRows.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }
    const oldState = oldRows[0].state;

    const updateResult = await query(
      `UPDATE saleorders SET state = $1 WHERE id = $2 AND isdeleted = false RETURNING id, state`,
      [state, id]
    );
    console.log('[PATCH /SaleOrders/:id/state] updateResult=', updateResult);

    // Audit log (best-effort: don't fail the request if logging fails)
    try {
      const { v4: uuidv4 } = require('uuid');
      await query(
        `INSERT INTO saleorder_state_logs (id, saleorder_id, old_state, new_state, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), id, oldState, state, changedBy]
      );
    } catch (logErr) {
      console.error('Failed to write saleorder_state_logs:', logErr);
    }

    // Fetch the full updated record with joins
    const rows = await query(
      `SELECT
        so.id,
        so.name,
        so.code,
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
        so.assistantid,
        asst.name AS assistantname,
        so.dentalaideid,
        da.name AS dentalaidename,
        so.quantity,
        so.unit,
        so.datestart,
        so.dateend,
        so.notes,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      LEFT JOIN partners asst ON asst.id = so.assistantid
      LEFT JOIN partners da ON da.id = so.dentalaideid
      WHERE so.id = $1`,
      [id]
    );
    console.log('[PATCH /SaleOrders/:id/state] final rows count=', rows ? rows.length : 0);

    return res.json(rows[0]);
  } catch (err) {
    console.error('[PATCH /SaleOrders/:id/state] Unhandled error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/SaleOrders/:id
 * Update sale order details (doctor, assistant, dental aide, cost, dates, notes, etc.)
 */
router.patch('/:id', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      partnerid,
      companyid,
      productid,
      productname,
      doctorid,
      assistantid,
      dentalaideid,
      quantity,
      unit,
      amounttotal,
      datestart,
      dateend,
      notes,
      tooth_numbers,
      tooth_comment,
    } = req.body;

    if (amounttotal != null && parseFloat(amounttotal) < 0) {
      return res.status(400).json({ error: 'amounttotal must be >= 0' });
    }
    if (quantity != null && !isNaN(parseFloat(quantity)) && parseFloat(quantity) < 0) {
      return res.status(400).json({ error: 'quantity must be >= 0' });
    }

    // Build dynamic SET clause
    const sets = [];
    const values = [];
    let paramIdx = 1;

    const fields = [
      { key: 'partnerid', val: partnerid },
      { key: 'companyid', val: companyid },
      { key: 'doctorid', val: doctorid },
      { key: 'assistantid', val: assistantid },
      { key: 'dentalaideid', val: dentalaideid },
      { key: 'quantity', val: quantity },
      { key: 'unit', val: unit },
      { key: 'amounttotal', val: amounttotal },
      { key: 'datestart', val: datestart },
      { key: 'dateend', val: dateend },
      { key: 'notes', val: notes },
    ];

    for (const f of fields) {
      if (f.val !== undefined) {
        sets.push(`${f.key} = $${paramIdx}`);
        values.push(f.val === '' ? null : f.val);
        paramIdx++;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const orderUpdate = await query(
      `UPDATE saleorders SET ${sets.join(', ')} WHERE id = $${paramIdx} AND isdeleted = false RETURNING *`,
      values
    );

    if (!orderUpdate || orderUpdate.length === 0) {
      return res.status(404).json({ error: 'Sale order not found' });
    }

    // Update sale order line fields if provided
    if (productid !== undefined || productname !== undefined || tooth_numbers !== undefined || tooth_comment !== undefined) {
      const existingLine = await query(
        `SELECT id, productid FROM saleorderlines WHERE orderid = $1 AND isdeleted = false LIMIT 1`,
        [id]
      );

      if (existingLine && existingLine.length > 0) {
        const lineSets = [];
        const lineValues = [];
        let lineIdx = 1;

        if (productid !== undefined) {
          lineSets.push(`productid = $${lineIdx}`);
          lineValues.push(productid || null);
          lineIdx++;
        }
        if (productname !== undefined) {
          lineSets.push(`productname = $${lineIdx}`);
          lineValues.push(productname || null);
          lineIdx++;
        }
        if (amounttotal !== undefined) {
          lineSets.push(`pricetotal = $${lineIdx}`);
          lineValues.push(amounttotal || 0);
          lineIdx++;
        }
        if (tooth_numbers !== undefined) {
          lineSets.push(`tooth_numbers = $${lineIdx}`);
          lineValues.push(tooth_numbers || null);
          lineIdx++;
        }
        if (tooth_comment !== undefined) {
          lineSets.push(`tooth_comment = $${lineIdx}`);
          lineValues.push(tooth_comment || null);
          lineIdx++;
        }

        if (lineSets.length > 0) {
          lineValues.push(existingLine[0].id);
          await query(
            `UPDATE saleorderlines SET ${lineSets.join(', ')} WHERE id = $${lineIdx}`,
            lineValues
          );
        }
      } else if (productid) {
        const { v4: uuidv4 } = require('uuid');
        const lineId = uuidv4();
        await query(
          `INSERT INTO saleorderlines (
            id, orderid, productid, productname, pricetotal, tooth_numbers, tooth_comment, isdeleted
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [lineId, id, productid, productname || null, amounttotal || 0, tooth_numbers || null, tooth_comment || null, false]
        );
      }
    }

    // Fetch updated record with joins
    const rows = await query(
      `SELECT
        so.id,
        so.name,
        so.code,
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
        so.assistantid,
        asst.name AS assistantname,
        so.dentalaideid,
        da.name AS dentalaidename,
        so.quantity,
        so.unit,
        so.datestart,
        so.dateend,
        so.notes,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      LEFT JOIN partners asst ON asst.id = so.assistantid
      LEFT JOIN partners da ON da.id = so.dentalaideid
      WHERE so.id = $1`,
      [id]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating sale order:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
