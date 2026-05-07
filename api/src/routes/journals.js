const express = require('express');
const { query } = require('../db');
const { addAccentInsensitiveSearchCondition } = require('../utils/search');

const router = express.Router();

/**
 * GET /api/accountjournals
 * Query params: offset, limit, search, type
 * Returns: {offset, limit, totalItems, items[]}
 *
 * Used for: Cash book fund selection dropdowns
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '100',
      search = '',
      type = '', // 'cash', 'bank', 'general', etc.
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`type = $${paramIdx}`);
      params.push(type);
      paramIdx++;
    }

    if (search) {
      paramIdx = addAccentInsensitiveSearchCondition({
        conditions,
        params,
        columns: ['name', 'code'],
        search,
        paramIdx,
      });
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        id,
        name,
        code,
        type,
        defaultdebitaccountid,
        defaultcreditaccountid,
        companyid,
        bankaccountid,
        active as isactive,
        datecreated,
        lastupdated
      FROM accountjournals
      WHERE ${whereClause}
      ORDER BY type, name
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM accountjournals WHERE ${whereClause}`,
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
    console.error('Error fetching journals:', err);
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
 * GET /api/accountjournals/:id
 * Returns: Single journal with balance info
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        aj.id,
        aj.name,
        aj.code,
        aj.type,
        aj.defaultdebitaccountid,
        aj.defaultcreditaccountid,
        aj.companyid,
        c.name AS companyname,
        aj.bankaccountid,
        aj.active as isactive,
        aj.datecreated,
        aj.lastupdated
      FROM accountjournals aj
      LEFT JOIN companies c ON c.id = aj.companyid
      WHERE aj.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Journal not found' });
    }

    // Get current balance from payments
    const balanceResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN paymenttype = 'inbound' AND state = 'posted' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN paymenttype = 'outbound' AND state = 'posted' THEN amount ELSE 0 END), 0) AS balance
      FROM accountpayments
      WHERE journalid = $1`,
      [id]
    );

    const journal = rows[0];
    journal.balance = parseFloat(balanceResult[0]?.balance || 0);

    return res.json(journal);
  } catch (err) {
    console.error('Error fetching journal:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/accountjournals/:id/GetBalance
 * Returns: Current balance for this journal/fund
 */
router.get('/:id/GetBalance', async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom = '', dateTo = '' } = req.query;

    let conditions = 'journalid = $1';
    const params = [id];
    let paramIdx = 2;

    if (dateFrom) {
      conditions += ` AND paymentdate >= $${paramIdx}`;
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions += ` AND paymentdate <= $${paramIdx}`;
      params.push(dateTo);
      paramIdx++;
    }

    const result = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN paymenttype = 'inbound' AND state = 'posted' THEN amount ELSE 0 END), 0) AS totalinbound,
        COALESCE(SUM(CASE WHEN paymenttype = 'outbound' AND state = 'posted' THEN amount ELSE 0 END), 0) AS totaloutbound,
        COALESCE(SUM(CASE WHEN paymenttype = 'transfer' AND state = 'posted' THEN amount ELSE 0 END), 0) AS totaltransfer,
        COUNT(CASE WHEN paymenttype = 'inbound' THEN 1 END) AS inboundcount,
        COUNT(CASE WHEN paymenttype = 'outbound' THEN 1 END) AS outboundcount
      FROM accountpayments
      WHERE ${conditions}`,
      params
    );

    const data = result[0] || {};
    const inbound = parseFloat(data.totalinbound || 0);
    const outbound = parseFloat(data.totaloutbound || 0);

    return res.json({
      journalId: id,
      totalInbound: inbound,
      totalOutbound: outbound,
      totalTransfer: parseFloat(data.totaltransfer || 0),
      netBalance: inbound - outbound,
      transactionCounts: {
        inbound: parseInt(data.inboundcount || 0, 10),
        outbound: parseInt(data.outboundcount || 0, 10),
      },
    });
  } catch (err) {
    console.error('Error fetching journal balance:', err);
    return res.status(500).json({
      journalId: req.params.id,
      totalInbound: 0,
      totalOutbound: 0,
      netBalance: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
