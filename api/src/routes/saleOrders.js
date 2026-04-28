const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { createSaleOrder } = require('./saleOrders/createSaleOrder');
const { getSaleOrderById } = require('./saleOrders/getSaleOrderById');
const { updateSaleOrder } = require('./saleOrders/updateSaleOrder');
const { updateSaleOrderState } = require('./saleOrders/updateSaleOrderState');

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
      date: 'COALESCE(sol.date, so.datestart::timestamp)',
      productname: "COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), so.name)",
      pricetotal: 'COALESCE(sol.pricetotal, so.amounttotal)',
      datecreated: 'sol.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'sol.date';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const items = await query(
      `SELECT
        sol.id,
        sol.productid,
        COALESCE(NULLIF(sol.productname, ''), pr.name, NULLIF(sol.name, ''), so.name) as productname,
        COALESCE(sol.productuomqty, so.quantity) as productuomqty,
        sol.priceunit,
        COALESCE(sol.pricetotal, so.amounttotal) as pricetotal,
        sol.pricesubtotal,
        sol.discount,
        COALESCE(sol.amountpaid, so.totalpaid) as amountpaid,
        COALESCE(sol.amountresidual, so.residual) as amountresidual,
        COALESCE(sol.date, so.datestart::timestamp) as date,
        so.datestart,
        so.dateend,
        sol.tooth_numbers,
        sol.tooth_comment,
        sol.toothtype,
        sol.diagnostic,
        COALESCE(NULLIF(sol.note, ''), so.notes) as note,
        sol.sequence,
        sol.state as linestate,
        sol.iscancelled,
        COALESCE(sol.employeeid, so.doctorid) as employeeid,
        COALESCE(sol.assistantid, so.assistantid) as assistantid,
        so.dentalaideid,
        so.companyid,
        so.sourceid,
        COALESCE(NULLIF(NULLIF(so.unit, ''), 'services.form.unitPlaceholder'), pr.uomname) as unit,
        so.id as orderid,
        so.name as ordername,
        so.code as ordercode,
        so.amounttotal as so_amounttotal,
        so.residual as so_residual,
        so.totalpaid as so_totalpaid,
        so.state as sostate,
        doc.name as doctorname,
        asst.name as assistantname,
        da.name as dentalaidename,
        c.name as companyname,
        COALESCE(pa.total_paid, 0) + COALESCE(dp.total_paid, 0) as paid_amount,
        COALESCE(lc.order_line_count, 1) as order_line_count
      FROM saleorderlines sol
      JOIN saleorders so ON so.id = sol.orderid
      LEFT JOIN products pr ON pr.id = sol.productid
      LEFT JOIN employees doc ON doc.id = COALESCE(sol.employeeid, so.doctorid)
      LEFT JOIN employees asst ON asst.id = COALESCE(sol.assistantid, so.assistantid)
      LEFT JOIN employees da ON da.id = so.dentalaideid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN (
        SELECT orderid, COUNT(*) as order_line_count
        FROM saleorderlines
        WHERE isdeleted = false
        GROUP BY orderid
      ) lc ON lc.orderid = so.id
      LEFT JOIN (
        SELECT invoice_id, SUM(allocated_amount) as total_paid
        FROM payment_allocations
        GROUP BY invoice_id
      ) pa ON pa.invoice_id = so.id
      LEFT JOIN LATERAL (
        SELECT SUM(p.amount) as total_paid
        FROM payments p
        WHERE p.service_id = so.id
          AND p.status = 'posted'
          AND COALESCE(p.payment_category, 'payment') = 'payment'
          AND NOT EXISTS (
            SELECT 1
            FROM payment_allocations existing_pa
            WHERE existing_pa.payment_id = p.id
          )
      ) dp ON true
      WHERE so.partnerid = $1 AND so.isdeleted = false AND sol.isdeleted = false
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST, so.code ASC NULLS LAST, sol.sequence ASC NULLS LAST, sol.id ASC
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
router.get('/:id', getSaleOrderById);

/**
 * POST /api/SaleOrders
 * Creates a new sale order (service record)
 * Body: { partnerid, companyid, productid, productname, doctorid, doctorname, amounttotal, datestart, dateend, notes }
 */
router.post('/', requirePermission('customers.edit'), createSaleOrder);

/**
 * PATCH /api/SaleOrders/:id/state
 * Update the state of a sale order (treatment status)
 * Body: { state: 'sale' | 'done' | 'cancel' | 'draft' }
 */
router.patch('/:id/state', requirePermission('customers.edit'), updateSaleOrderState);

router.patch('/:id', requirePermission('customers.edit'), updateSaleOrder);

module.exports = router;
