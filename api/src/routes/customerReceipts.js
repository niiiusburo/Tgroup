const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/CustomerReceipts
 * Query params: partner_id, offset, limit, search, sortField, sortOrder
 * Returns: customer's payment receipts
 */
router.get('/', async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'dateexamination',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      datewaiting: 'cr.datewaiting',
      dateexamination: 'cr.dateexamination',
      datedone: 'cr.datedone',
      state: 'cr.state',
      timeexpected: 'cr.timeexpected',
      createdat: 'cr.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'cr.dateexamination';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (partner_id) {
      conditions.push(`cr.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(cr.note ILIKE $${paramIdx} OR cr.reason ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        cr.companyid,
        c.name AS companyname,
        cr.userid,
        au.name AS username,
        cr.doctorid,
        doc.name AS doctorname,
        cr.datecreated,
        cr.lastupdated,
        cr.createdbyid,
        cr.writebyid,
        (SELECT COUNT(*) FROM appointments a WHERE a.customerreceiptid = cr.id) AS appointmentcount,
        (SELECT COUNT(*) FROM dotkhams dk WHERE dk.appointmentid IN (SELECT a.id FROM appointments a WHERE a.customerreceiptid = cr.id)) AS dotkhamcount
      FROM customerreceipts cr
      LEFT JOIN partners p ON p.id = cr.partnerid
      LEFT JOIN companies c ON c.id = cr.companyid
      LEFT JOIN aspnetusers au ON au.id = cr.userid
      LEFT JOIN partners doc ON doc.id = cr.doctorid
      ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM customerreceipts cr ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      byState: {},
    };

    const stateCounts = await query(
      `SELECT cr.state, COUNT(*) AS count
       FROM customerreceipts cr
       ${whereClause}
       GROUP BY cr.state`,
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
 * Returns: single customer receipt with details
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
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        p.phone AS partnerphone,
        p.email AS partneremail,
        cr.companyid,
        c.name AS companyname,
        cr.userid,
        au.name AS username,
        cr.doctorid,
        doc.name AS doctorname,
        cr.datecreated,
        cr.lastupdated,
        cr.createdbyid,
        cr.writebyid
      FROM customerreceipts cr
      LEFT JOIN partners p ON p.id = cr.partnerid
      LEFT JOIN companies c ON c.id = cr.companyid
      LEFT JOIN aspnetusers au ON au.id = cr.userid
      LEFT JOIN partners doc ON doc.id = cr.doctorid
      WHERE cr.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Customer receipt not found' });
    }

    const appointments = await query(
      `SELECT
        a.id,
        a.name,
        a.date,
        a.time,
        a.state,
        a.reason,
        a.datetimearrived,
        a.datetimeseated,
        a.datetimedismissed,
        a.doctorid,
        doc.name AS doctorname
      FROM appointments a
      LEFT JOIN partners doc ON doc.id = a.doctorid
      WHERE a.customerreceiptid = $1
      ORDER BY a.date DESC, a.time DESC`,
      [id]
    );

    return res.json({
      ...rows[0],
      appointments,
    });
  } catch (err) {
    console.error('Error fetching customer receipt:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
