const express = require('express');
const { query } = require('../db');
const { addAccentInsensitiveSearchCondition } = require('../utils/search');

const router = express.Router();

/**
 * GET /api/CustomerReceipts
 * Query params: offset, limit, search, sortField, sortOrder, partnerId, dateFrom, dateTo, state
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * CB-02: Phiếu thu (Receipts) - Customer payment receipts
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'datecreated',
      sortOrder = 'desc',
      partnerId = '',
      dateFrom = '',
      dateTo = '',
      state = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      datewaiting: 'cr.datewaiting',
      dateexamination: 'cr.dateexamination',
      datecreated: 'cr.datecreated',
      lastupdated: 'cr.lastupdated',
    };

    const orderByCol = allowedSortFields[sortField] || 'cr.datecreated';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    // Partner filter
    if (partnerId) {
      conditions.push(`cr.partnerid = $${paramIdx}`);
      params.push(partnerId);
      paramIdx++;
    }

    // State filter
    if (state) {
      conditions.push(`cr.state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`cr.datewaiting >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`cr.datewaiting <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    // Search
    if (search) {
      paramIdx = addAccentInsensitiveSearchCondition({
        conditions,
        params,
        columns: ['cr.note', 'cr.reason', 'p.displayname', 'p.ref', 'p.phone'],
        search,
        paramIdx,
      });
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        cr.id,
        cr.datewaiting,
        cr.dateexamination,
        cr.datedone,
        cr.timeexpected,
        cr.note,
        cr.state,
        cr.reason,
        cr.isrepeatcustomer,
        cr.isnotreatment,
        cr.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        p.phone AS partnerphone,
        cr.companyid,
        c.name AS companyname,
        cr.doctorid,
        e.name AS doctorname,
        cr.userid,
        au.name AS username,
        cr.createdbyid,
        cb.name AS createdbyname,
        cr.writebyid,
        wb.name AS updatedbyname,
        cr.datecreated,
        cr.lastupdated,
        0 AS dotkhamcount,
        0 AS appointmentcount
      FROM customerreceipts cr
      LEFT JOIN partners p ON p.id = cr.partnerid
      LEFT JOIN companies c ON c.id = cr.companyid
      LEFT JOIN employees e ON e.id = cr.doctorid
      LEFT JOIN aspnetusers au ON au.id = cr.userid
      LEFT JOIN aspnetusers cb ON cb.id = cr.createdbyid
      LEFT JOIN aspnetusers wb ON wb.id = cr.writebyid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count
       FROM customerreceipts cr
       LEFT JOIN partners p ON p.id = cr.partnerid
       WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Aggregates
    const aggregates = {
      total: totalItems,
      byState: {
        draft: await query(
          `SELECT COUNT(*) AS count FROM customerreceipts cr LEFT JOIN partners p ON p.id = cr.partnerid WHERE ${whereClause} AND cr.state = 'draft'`,
          params
        ).then(r => parseInt(r[0]?.count || '0', 10)),
        confirmed: await query(
          `SELECT COUNT(*) AS count FROM customerreceipts cr LEFT JOIN partners p ON p.id = cr.partnerid WHERE ${whereClause} AND cr.state = 'confirmed'`,
          params
        ).then(r => parseInt(r[0]?.count || '0', 10)),
        done: await query(
          `SELECT COUNT(*) AS count FROM customerreceipts cr LEFT JOIN partners p ON p.id = cr.partnerid WHERE ${whereClause} AND cr.state = 'done'`,
          params
        ).then(r => parseInt(r[0]?.count || '0', 10)),
        cancelled: await query(
          `SELECT COUNT(*) AS count FROM customerreceipts cr LEFT JOIN partners p ON p.id = cr.partnerid WHERE ${whereClause} AND cr.state = 'cancelled'`,
          params
        ).then(r => parseInt(r[0]?.count || '0', 10)),
      },
    };

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching customer receipts:', err);
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
 * GET /api/CustomerReceipts/:id
 * Returns: Single customer receipt with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        cr.id,
        cr.datewaiting,
        cr.dateexamination,
        cr.datedone,
        cr.timeexpected,
        cr.note,
        cr.state,
        cr.reason,
        cr.isrepeatcustomer,
        cr.isnotreatment,
        cr.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        p.phone AS partnerphone,
        p.email AS partneremail,
        p.street AS partneraddress,
        cr.companyid,
        c.name AS companyname,
        cr.doctorid,
        e.name AS doctorname,
        e.phone AS doctorphone,
        cr.userid,
        au.name AS username,
        cr.createdbyid,
        cb.name AS createdbyname,
        cr.writebyid,
        wb.name AS updatedbyname,
        cr.datecreated,
        cr.lastupdated
      FROM customerreceipts cr
      LEFT JOIN partners p ON p.id = cr.partnerid
      LEFT JOIN companies c ON c.id = cr.companyid
      LEFT JOIN employees e ON e.id = cr.doctorid
      LEFT JOIN aspnetusers au ON au.id = cr.userid
      LEFT JOIN aspnetusers cb ON cb.id = cr.createdbyid
      LEFT JOIN aspnetusers wb ON wb.id = cr.writebyid
      WHERE cr.id = $1 `,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = rows[0];
    receipt.dotkhams = [];
    receipt.appointments = [];

    return res.json(receipt);
  } catch (err) {
    console.error('Error fetching receipt:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/CustomerReceipts/:id/GetPayments
 * Returns: Payments linked to this receipt
 */
router.get('/:id/GetPayments', async (req, res) => {
  try {
    const { id } = req.params;

    const payments = await query(
      `SELECT
        ap.id,
        ap.name,
        ap.paymentdate,
        ap.amount,
        ap.communication,
        ap.state,
        ap.paymenttype,
        ap.journalid,
        aj.name AS journalname,
        ap.createdbyid,
        au.name AS createdbyname,
        ap.datecreated
      FROM accountpayments ap
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      LEFT JOIN aspnetusers au ON au.id = ap.createdbyid
      WHERE ap.paymentrequestid = $1 
      ORDER BY ap.paymentdate DESC`,
      [id]
    );

    return res.json({
      receiptId: id,
      count: payments.length,
      items: payments,
    });
  } catch (err) {
    console.error('Error fetching receipt payments:', err);
    return res.status(500).json({
      receiptId: id,
      count: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
