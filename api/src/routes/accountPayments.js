const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');
const { addAccentInsensitiveSearchCondition } = require('../utils/search');

const router = express.Router();

/**
 * GET /api/AccountPayments
 * Query params: partner_id, offset, limit, search, sortField, sortOrder
 * Returns: customer's payments
 */
router.get('/', requirePermission('payment.view'), async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'paymentdate',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'ap.name',
      paymentdate: 'ap.paymentdate',
      amount: 'ap.amount',
      state: 'ap.state',
      paymenttype: 'ap.paymenttype',
      createdat: 'ap.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'ap.paymentdate';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (partner_id) {
      conditions.push(`ap.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    if (search) {
      paramIdx = addAccentInsensitiveSearchCondition({
        conditions,
        params,
        columns: ['ap.name', 'ap.communication', 'p.name', 'p.displayname'],
        search,
        paramIdx,
      });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await query(
      `SELECT
        ap.id,
        ap.name,
        ap.paymentdate,
        ap.amount,
        ap.state,
        ap.paymenttype,
        ap.communication,
        ap.isinternaltransfer,
        ap.isintercompany,
        ap.isprepayment,
        ap.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        ap.companyid,
        c.name AS companyname,
        ap.journalid,
        aj.name AS journalname,
        ap.destinationjournalid,
        dj.name AS destinationjournalname,
        ap.destinationcompanyid,
        dc.name AS destinationcompanyname,
        ap.insuranceid,
        i.name AS insurancename,
        ap.currencyid,
        cur.name AS currencyname,
        ap.paymentdifferencehandling,
        ap.writeoffaccountid,
        ap.destinationaccountid,
        ap.partnerbankid,
        ap.householdbusinessid,
        ap.moveid,
        ap.paymentrequestid,
        ap.requester,
        ap.sequencenumber,
        ap.sequenceprefix,
        ap.datecreated,
        ap.lastupdated,
        ap.createdbyid,
        au1.name AS createdbyname,
        ap.writebyid,
        au2.name AS updatedbyname
      FROM accountpayments ap
      LEFT JOIN partners p ON p.id = ap.partnerid
      LEFT JOIN companies c ON c.id = ap.companyid
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      LEFT JOIN accountjournals dj ON dj.id = ap.destinationjournalid
      LEFT JOIN companies dc ON dc.id = ap.destinationcompanyid
      LEFT JOIN partners i ON i.id = ap.insuranceid
      LEFT JOIN currencies cur ON cur.id = ap.currencyid
      LEFT JOIN aspnetusers au1 ON au1.id = ap.createdbyid
      LEFT JOIN aspnetusers au2 ON au2.id = ap.writebyid
      ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count
       FROM accountpayments ap
       LEFT JOIN partners p ON p.id = ap.partnerid
       ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      totalAmount: items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
      byType: {},
      byState: {},
    };

    const typeCounts = await query(
      `SELECT ap.paymenttype, COUNT(*) AS count, SUM(ap.amount) AS total
       FROM accountpayments ap
       LEFT JOIN partners p ON p.id = ap.partnerid
       ${whereClause}
       GROUP BY ap.paymenttype`,
      params
    );
    typeCounts.forEach((row) => {
      aggregates.byType[row.paymenttype || 'unknown'] = {
        count: parseInt(row.count, 10),
        total: parseFloat(row.total || 0),
      };
    });

    const stateCounts = await query(
      `SELECT ap.state, COUNT(*) AS count
       FROM accountpayments ap
       LEFT JOIN partners p ON p.id = ap.partnerid
       ${whereClause}
       GROUP BY ap.state`,
      params
    );
    stateCounts.forEach((row) => {
      aggregates.byState[row.state || 'unknown'] = parseInt(row.count, 10);
    });

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates,
    });
  } catch (err) {
    console.error('Error fetching account payments:', err);
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
 * GET /api/AccountPayments/:id
 * Returns: single account payment with details
 */
router.get('/:id', requirePermission('payment.view'), async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        ap.id,
        ap.name,
        ap.paymentdate,
        ap.amount,
        ap.state,
        ap.paymenttype,
        ap.communication,
        ap.isinternaltransfer,
        ap.isintercompany,
        ap.isprepayment,
        ap.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        ap.companyid,
        c.name AS companyname,
        ap.journalid,
        aj.name AS journalname,
        ap.destinationjournalid,
        dj.name AS destinationjournalname,
        ap.destinationcompanyid,
        dc.name AS destinationcompanyname,
        ap.insuranceid,
        i.name AS insurancename,
        ap.currencyid,
        cur.name AS currencyname,
        ap.paymentdifferencehandling,
        ap.writeoffaccountid,
        wa.name AS writeoffaccountname,
        ap.destinationaccountid,
        da.name AS destinationaccountname,
        ap.partnerbankid,
        ap.householdbusinessid,
        ap.moveid,
        ap.paymentrequestid,
        ap.requester,
        ap.sequencenumber,
        ap.sequenceprefix,
        ap.pairedinternaltransferpaymentid,
        ap.pairedintercompanypaymentid,
        ap.datecreated,
        ap.lastupdated,
        ap.createdbyid,
        au1.name AS createdbyname,
        ap.writebyid,
        au2.name AS updatedbyname
      FROM accountpayments ap
      LEFT JOIN partners p ON p.id = ap.partnerid
      LEFT JOIN companies c ON c.id = ap.companyid
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      LEFT JOIN accountjournals dj ON dj.id = ap.destinationjournalid
      LEFT JOIN companies dc ON dc.id = ap.destinationcompanyid
      LEFT JOIN partners i ON i.id = ap.insuranceid
      LEFT JOIN currencies cur ON cur.id = ap.currencyid
      LEFT JOIN accountaccounts wa ON wa.id = ap.writeoffaccountid
      LEFT JOIN accountaccounts da ON da.id = ap.destinationaccountid
      LEFT JOIN aspnetusers au1 ON au1.id = ap.createdbyid
      LEFT JOIN aspnetusers au2 ON au2.id = ap.writebyid
      WHERE ap.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Account payment not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching account payment:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
