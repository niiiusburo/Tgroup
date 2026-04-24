const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { getVietnamToday, getVietnamYear } = require('../lib/dateUtils');

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
        COALESCE(so.sourceid, p.sourceid) AS sourceid,
        cs.name AS sourcename,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
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
 * GET /api/SaleOrders/lines
 * Returns: sale order lines (service lines) per customer, with payment info
 * Query params: partner_id (required), offset, limit, sortField, sortOrder
 */
router.get('/lines', async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '100',
      sortField = 'date',
      sortOrder = 'desc',
    } = req.query;

    if (!partner_id) {
      return res.status(400).json({ error: 'partner_id is required' });
    }

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      date: 'sol.date',
      productname: 'sol.productname',
      pricetotal: 'sol.pricetotal',
      datecreated: 'sol.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'sol.date';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const items = await query(
      `SELECT
        sol.id,
        sol.productid,
        sol.productname,
        sol.productuomqty,
        sol.priceunit,
        sol.pricetotal,
        sol.pricesubtotal,
        sol.discount,
        sol.amountpaid,
        sol.amountresidual,
        sol.date,
        sol.tooth_numbers,
        sol.toothtype,
        sol.diagnostic,
        sol.note,
        sol.sequence,
        sol.state as linestate,
        sol.iscancelled,
        sol.employeeid,
        sol.assistantid,
        so.id as orderid,
        so.name as ordername,
        so.code as ordercode,
        so.amounttotal as so_amounttotal,
        so.residual as so_residual,
        so.totalpaid as so_totalpaid,
        so.state as sostate,
        doc.name as doctorname,
        asst.name as assistantname,
        c.name as companyname,
        COALESCE(pa.total_paid, 0) as paid_amount
      FROM saleorderlines sol
      JOIN saleorders so ON so.id = sol.orderid
      LEFT JOIN employees doc ON doc.id = sol.employeeid
      LEFT JOIN employees asst ON asst.id = sol.assistantid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN (
        SELECT invoice_id, SUM(allocated_amount) as total_paid
        FROM payment_allocations
        GROUP BY invoice_id
      ) pa ON pa.invoice_id = so.id
      WHERE so.partnerid = $1 AND so.isdeleted = false AND sol.isdeleted = false
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $2 OFFSET $3`,
      [partner_id, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count
       FROM saleorderlines sol
       JOIN saleorders so ON so.id = sol.orderid
       WHERE so.partnerid = $1 AND so.isdeleted = false AND sol.isdeleted = false`,
      [partner_id]
    );
    const totalItems = parseInt(countResult[0].count, 10);

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching sale order lines:', err);
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
        COALESCE(so.sourceid, p.sourceid) AS sourceid,
        cs.name AS sourcename,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
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
      sourceid,
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
    const name = productname || `Service ${getVietnamToday()}`;

    // Generate a unique sale order code, e.g. SO-2024-0001
    const year = getVietnamYear();
    const seqResult = await query(`SELECT nextval('dbo.saleorder_code_seq') AS seq`);
    const seqNum = parseInt(seqResult[0]?.seq || '1', 10);
    const code = `SO-${year}-${String(seqNum).padStart(4, '0')}`;

    // Insert the sale order (only using columns that exist in the schema)
    const result = await query(
      `INSERT INTO saleorders (
        id, name, code, partnerid, companyid, doctorid, assistantid, dentalaideid,
        quantity, unit, amounttotal, residual, totalpaid, state,
        datestart, dateend, notes, sourceid,
        isdeleted, datecreated
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,(NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
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
        sourceid || null,
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
        COALESCE(so.sourceid, p.sourceid) AS sourceid,
        cs.name AS sourcename,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
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
         VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))`,
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
        COALESCE(so.sourceid, p.sourceid) AS sourceid,
        cs.name AS sourcename,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
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
      sourceid,
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
      { key: 'sourceid', val: sourceid },
    ];

    for (const f of fields) {
      if (f.val !== undefined) {
        sets.push(`${f.key} = $${paramIdx}`);
        values.push(f.val === '' ? null : f.val);
        paramIdx++;
      }
    }

    if (sets.length > 0) {
      values.push(id);
      const orderUpdate = await query(
        `UPDATE saleorders SET ${sets.join(', ')} WHERE id = $${paramIdx} AND isdeleted = false RETURNING *`,
        values
      );
      if (!orderUpdate || orderUpdate.length === 0) {
        return res.status(404).json({ error: 'Sale order not found' });
      }
    } else if (
      productid === undefined &&
      productname === undefined &&
      tooth_numbers === undefined &&
      tooth_comment === undefined
    ) {
      return res.status(400).json({ error: 'No fields to update' });
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
        COALESCE(so.sourceid, p.sourceid) AS sourceid,
        cs.name AS sourcename,
        (SELECT sol.productid FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productid,
        (SELECT sol.productname FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS productname,
        (SELECT sol.tooth_numbers FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_numbers,
        (SELECT sol.tooth_comment FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false LIMIT 1) AS tooth_comment,
        so.datecreated,
        so.isdeleted
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN employees doc ON doc.id = so.doctorid
      LEFT JOIN employees asst ON asst.id = so.assistantid
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN customersources cs ON cs.id = COALESCE(so.sourceid, p.sourceid)
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
