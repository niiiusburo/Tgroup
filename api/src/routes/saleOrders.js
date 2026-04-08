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
      sortField = 'dateorder',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'so.name',
      dateorder: 'so.dateorder',
      datedone: 'so.datedone',
      amounttotal: 'so.amounttotal',
      state: 'so.state',
      paymentstate: 'so.paymentstate',
      invoicestatus: 'so.invoicestatus',
    };

    const orderByCol = allowedSortFields[sortField] || 'so.dateorder';
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
        `(so.name ILIKE $${paramIdx} OR so.note ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        so.id,
        so.name,
        so.dateorder,
        so.datedone,
        so.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        so.amountuntaxed,
        so.amounttax,
        so.amounttotal,
        so.residual,
        so.totalpaid,
        so.note,
        so.state,
        so.paymentstate,
        so.invoicestatus,
        so.companyid,
        c.name AS companyname,
        so.userid,
        au.name AS username,
        so.doctorid,
        doc.name AS doctorname,
        so.isquotation,
        so.quoteid,
        so.orderid,
        so.type,
        so.discountfixed,
        so.discountpercent,
        so.discounttype,
        so.appointmentid,
        so.datecreated,
        so.lastupdated,
        so.createdbyid,
        so.writebyid,
        so.isfast,
        so.leadid,
        so.sequencenumber,
        so.sequenceprefix,
        (SELECT COUNT(*) FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false) AS linecount,
        (SELECT COALESCE(SUM(sol.pricetotal), 0) FROM saleorderlines sol WHERE sol.orderid = so.id AND sol.isdeleted = false) AS totallineamount
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN aspnetusers au ON au.id = so.userid
      LEFT JOIN partners doc ON doc.id = so.doctorid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM saleorders so WHERE ${whereClause}`,
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
        so.dateorder,
        so.datedone,
        so.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        so.amountuntaxed,
        so.amounttax,
        so.amounttotal,
        so.residual,
        so.totalpaid,
        so.note,
        so.state,
        so.paymentstate,
        so.invoicestatus,
        so.companyid,
        c.name AS companyname,
        so.userid,
        au.name AS username,
        so.doctorid,
        doc.name AS doctorname,
        so.isquotation,
        so.quoteid,
        so.orderid,
        so.type,
        so.discountfixed,
        so.discountpercent,
        so.discounttype,
        so.appointmentid,
        so.datecreated,
        so.lastupdated,
        so.createdbyid,
        so.writebyid,
        so.isfast,
        so.leadid,
        so.sequencenumber,
        so.sequenceprefix
      FROM saleorders so
      LEFT JOIN partners p ON p.id = so.partnerid
      LEFT JOIN companies c ON c.id = so.companyid
      LEFT JOIN aspnetusers au ON au.id = so.userid
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
        sol.name,
        sol.productid,
        p.name AS productname,
        p.defaultcode AS productcode,
        sol.productuomid,
        u.name AS uomname,
        sol.productuomqty AS quantity,
        sol.priceunit,
        sol.pricetotal,
        sol.discount,
        sol.discounttype,
        sol.taxid,
        at.name AS taxname,
        sol.state,
        sol.employeeid,
        emp.name AS employeename,
        sol.assistantid,
        ast.name AS assistantname,
        sol.note,
        sol.datecreated,
        sol.lastupdated
      FROM saleorderlines sol
      LEFT JOIN products p ON p.id = sol.productid
      LEFT JOIN uoms u ON u.id = sol.productuomid
      LEFT JOIN accounttaxes at ON at.id = sol.taxid
      LEFT JOIN partners emp ON emp.id = sol.employeeid
      LEFT JOIN partners ast ON ast.id = sol.assistantid
      WHERE sol.orderid = $1 AND sol.isdeleted = false
      ORDER BY sol.datecreated`,
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

module.exports = router;
