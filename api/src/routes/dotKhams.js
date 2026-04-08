const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/DotKhams
 * Query params: partner_id, offset, limit, search, sortField, sortOrder
 * Returns: customer's examination rounds
 */
router.get('/', async (req, res) => {
  try {
    const {
      partner_id,
      offset = '0',
      limit = '20',
      search = '',
      sortField = 'date',
      sortOrder = 'desc',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const allowedSortFields = {
      name: 'dk.name',
      date: 'dk.date',
      state: 'dk.state',
      activitystatus: 'dk.activitystatus',
      invoicestate: 'dk.invoicestate',
      paymentstate: 'dk.paymentstate',
      createdat: 'dk.datecreated',
    };

    const orderByCol = allowedSortFields[sortField] || 'dk.date';
    const orderDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['dk.isdeleted = false'];
    const params = [];
    let paramIdx = 1;

    if (partner_id) {
      conditions.push(`dk.partnerid = $${paramIdx}`);
      params.push(partner_id);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(dk.name ILIKE $${paramIdx} OR dk.reason ILIKE $${paramIdx} OR dk.note ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        dk.id,
        dk.sequence,
        dk.name,
        dk.date,
        dk.reason,
        dk.state,
        dk.activitystatus,
        dk.invoicestate,
        dk.paymentstate,
        dk.totalamount,
        dk.amountresidual,
        dk.note,
        dk.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        dk.companyid,
        c.name AS companyname,
        dk.doctorid,
        doc.name AS doctorname,
        dk.assistantid,
        ast.name AS assistantname,
        dk.assistantsecondaryid,
        ast2.name AS assistantsecondaryname,
        dk.appointmentid,
        a.name AS appointmentname,
        a.date AS appointmentdate,
        dk.saleorderid,
        so.name AS saleordername,
        dk.accountinvoiceid,
        ai.name AS invoicename,
        dk.datecreated,
        dk.lastupdated,
        dk.createdbyid,
        dk.writebyid,
        (SELECT COUNT(*) FROM dotkhamsteps dks WHERE dks.saleorderid = dk.saleorderid) AS stepcount,
        (SELECT COUNT(*) FROM dotkhamsteps dks WHERE dks.saleorderid = dk.saleorderid AND dks.isdone = true) AS completedsteps
      FROM dotkhams dk
      LEFT JOIN partners p ON p.id = dk.partnerid
      LEFT JOIN companies c ON c.id = dk.companyid
      LEFT JOIN partners doc ON doc.id = dk.doctorid
      LEFT JOIN partners ast ON ast.id = dk.assistantid
      LEFT JOIN partners ast2 ON ast2.id = dk.assistantsecondaryid
      LEFT JOIN appointments a ON a.id = dk.appointmentid
      LEFT JOIN saleorders so ON so.id = dk.saleorderid
      LEFT JOIN accountinvoices ai ON ai.id = dk.accountinvoiceid
      WHERE ${whereClause}
      ORDER BY ${orderByCol} ${orderDir} NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM dotkhams dk WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      totalAmount: items.reduce((sum, item) => sum + parseFloat(item.totalamount || 0), 0),
      totalResidual: items.reduce((sum, item) => sum + parseFloat(item.amountresidual || 0), 0),
      byState: {},
    };

    const stateCounts = await query(
      `SELECT dk.state, COUNT(*) AS count
       FROM dotkhams dk
       WHERE ${whereClause}
       GROUP BY dk.state`,
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
    console.error('Error fetching dot khams:', err);
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
 * GET /api/DotKhams/:id
 * Returns: single dot kham with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        dk.id,
        dk.sequence,
        dk.name,
        dk.date,
        dk.reason,
        dk.state,
        dk.activitystatus,
        dk.invoicestate,
        dk.paymentstate,
        dk.totalamount,
        dk.amountresidual,
        dk.note,
        dk.partnerid,
        p.name AS partnername,
        p.displayname AS partnerdisplayname,
        dk.companyid,
        c.name AS companyname,
        dk.doctorid,
        doc.name AS doctorname,
        dk.assistantid,
        ast.name AS assistantname,
        dk.assistantsecondaryid,
        ast2.name AS assistantsecondaryname,
        dk.appointmentid,
        a.name AS appointmentname,
        a.date AS appointmentdate,
        dk.saleorderid,
        so.name AS saleordername,
        dk.accountinvoiceid,
        ai.name AS invoicename,
        dk.datecreated,
        dk.lastupdated,
        dk.createdbyid,
        dk.writebyid
      FROM dotkhams dk
      LEFT JOIN partners p ON p.id = dk.partnerid
      LEFT JOIN companies c ON c.id = dk.companyid
      LEFT JOIN partners doc ON doc.id = dk.doctorid
      LEFT JOIN partners ast ON ast.id = dk.assistantid
      LEFT JOIN partners ast2 ON ast2.id = dk.assistantsecondaryid
      LEFT JOIN appointments a ON a.id = dk.appointmentid
      LEFT JOIN saleorders so ON so.id = dk.saleorderid
      LEFT JOIN accountinvoices ai ON ai.id = dk.accountinvoiceid
      WHERE dk.id = $1 AND dk.isdeleted = false`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Dot kham not found' });
    }

    const steps = await query(
      `SELECT
        dks.id,
        dks.name,
        dks.productid,
        p.name AS productname,
        dks.salelineid,
        dks.saleorderid,
        dks.isdone,
        dks.order,
        dks.numberoftimes,
        dks.datecreated,
        dks.lastupdated
      FROM dotkhamsteps dks
      LEFT JOIN products p ON p.id = dks.productid
      WHERE dks.saleorderid = $1
      ORDER BY dks.order, dks.datecreated`,
      [rows[0].saleorderid]
    );

    return res.json({
      ...rows[0],
      steps,
    });
  } catch (err) {
    console.error('Error fetching dot kham:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
