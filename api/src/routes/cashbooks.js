const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/CashBooks/GetDetails
 * Query params: offset, limit, search, sortField, sortOrder, journalId, dateFrom, dateTo
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * CB-01: Sổ quỹ tiền (Fund book) - Main cash book listing
 */
router.get('/GetDetails', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'paymentdate',
      sortOrder = 'desc',
      journalId = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      paymentdate: 'ap.paymentdate',
      name: 'ap.name',
      amount: 'ap.amount',
      communication: 'ap.communication',
      state: 'ap.state',
      datecreated: 'ap.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'ap.paymentdate';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    // Journal/Fund filter
    if (journalId) {
      conditions.push(`ap.journalid = $${paramIdx}`);
      params.push(journalId);
      paramIdx++;
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`ap.paymentdate >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`ap.paymentdate <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    // Search by name, communication, or partner
    if (search) {
      conditions.push(
        `(ap.name ILIKE $${paramIdx} OR ap.communication ILIKE $${paramIdx} OR p.displayname ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        ap.id,
        ap.name,
        ap.paymentdate,
        ap.amount,
        ap.communication,
        ap.state,
        ap.paymenttype,
        ap.isinternaltransfer,
        ap.sequencenumber,
        ap.sequenceprefix,
        ap.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        ap.journalid,
        aj.name AS journalname,
        aj.code AS journalcode,
        ap.currencyid,
        c.name AS currencyname,
        ap.createdbyid,
        au.name AS createdbyname,
        ap.datecreated,
        ap.lastupdated,
        ap.writebyid
      FROM accountpayments ap
      LEFT JOIN partners p ON p.id = ap.partnerid
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      LEFT JOIN currencies c ON c.id = ap.currencyid
      LEFT JOIN aspnetusers au ON au.id = ap.createdbyid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM accountpayments ap WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Calculate aggregates
    const aggregatesResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'inbound' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totalinbound,
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'outbound' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totaloutbound,
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'transfer' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totaltransfer
      FROM accountpayments ap
      WHERE ${whereClause}`,
      params
    );

    const agg = aggregatesResult[0] || {};

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates: {
        totalInbound: parseFloat(agg.totalinbound || 0),
        totalOutbound: parseFloat(agg.totaloutbound || 0),
        totalTransfer: parseFloat(agg.totaltransfer || 0),
        netBalance: parseFloat(agg.totalinbound || 0) - parseFloat(agg.totaloutbound || 0),
      },
    });
  } catch (err) {
    console.error('Error fetching cashbook details:', err);
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
 * GET /api/CashBooks/GetSumary
 * Query params: journalId, dateFrom, dateTo
 * Returns: Summary aggregates for cash book dashboard
 */
router.get('/GetSumary', async (req, res) => {
  try {
    const { journalId = '', dateFrom = '', dateTo = '' } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (journalId) {
      conditions.push(`ap.journalid = $${paramIdx}`);
      params.push(journalId);
      paramIdx++;
    }
    if (dateFrom) {
      conditions.push(`ap.paymentdate >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`ap.paymentdate <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'inbound' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totalreceipts,
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'outbound' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totalpayments,
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'transfer' AND ap.state = 'posted' THEN ap.amount ELSE 0 END), 0) AS totaltransfers,
        COUNT(CASE WHEN ap.paymenttype = 'inbound' THEN 1 END) AS receiptcount,
        COUNT(CASE WHEN ap.paymenttype = 'outbound' THEN 1 END) AS paymentcount,
        COUNT(CASE WHEN ap.paymenttype = 'transfer' THEN 1 END) AS transfercount,
        COUNT(CASE WHEN ap.state = 'draft' THEN 1 END) AS draftcount,
        COUNT(CASE WHEN ap.state = 'posted' THEN 1 END) AS postedcount,
        COUNT(CASE WHEN ap.state = 'cancelled' THEN 1 END) AS cancelledcount
      FROM accountpayments ap
      WHERE ${whereClause}`,
      params
    );

    const data = result[0] || {};

    return res.json({
      totalReceipts: parseFloat(data.totalreceipts || 0),
      totalPayments: parseFloat(data.totalpayments || 0),
      totalTransfers: parseFloat(data.totaltransfers || 0),
      netBalance:
        parseFloat(data.totalreceipts || 0) - parseFloat(data.totalpayments || 0),
      counts: {
        receipts: parseInt(data.receiptcount || 0, 10),
        payments: parseInt(data.paymentcount || 0, 10),
        transfers: parseInt(data.transfercount || 0, 10),
        draft: parseInt(data.draftcount || 0, 10),
        posted: parseInt(data.postedcount || 0, 10),
        cancelled: parseInt(data.cancelledcount || 0, 10),
      },
    });
  } catch (err) {
    console.error('Error fetching cashbook summary:', err);
    return res.status(500).json({
      totalReceipts: 0,
      totalPayments: 0,
      totalTransfers: 0,
      netBalance: 0,
      counts: {},
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/CashBooks/:id
 * Returns: Single payment/receipt/transfer details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        ap.id,
        ap.name,
        ap.paymentdate,
        ap.amount,
        ap.communication,
        ap.state,
        ap.paymenttype,
        ap.isinternaltransfer,
        ap.isintercompany,
        ap.sequencenumber,
        ap.sequenceprefix,
        ap.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        p.phone AS partnerphone,
        ap.journalid,
        aj.name AS journalname,
        aj.code AS journalcode,
        aj.type AS journaltype,
        ap.destinationjournalid,
        dj.name AS destinationjournalname,
        ap.destinationcompanyid,
        dc.name AS destinationcompanyname,
        ap.currencyid,
        c.name AS currencyname,
        ap.pairedinternaltransferpaymentid,
        ap.pairedintercompanypaymentid,
        ap.paymentrequestid,
        ap.partnerbankid,
        pb.accountholdername AS bankaccountholder,
        pb.accountnumber AS bankaccountnumber,
        pb.bankname,
        ap.requester,
        ap.isprepayment,
        ap.createdbyid,
        au.name AS createdbyname,
        ap.writebyid,
        wu.name AS updatedbyname,
        ap.datecreated,
        ap.lastupdated
      FROM accountpayments ap
      LEFT JOIN partners p ON p.id = ap.partnerid
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      LEFT JOIN accountjournals dj ON dj.id = ap.destinationjournalid
      LEFT JOIN companies dc ON dc.id = ap.destinationcompanyid
      LEFT JOIN currencies c ON c.id = ap.currencyid
      LEFT JOIN partnerbanks pb ON pb.id = ap.partnerbankid
      LEFT JOIN aspnetusers au ON au.id = ap.createdbyid
      LEFT JOIN aspnetusers wu ON wu.id = ap.writebyid
      WHERE ap.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching payment:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
