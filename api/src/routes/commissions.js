const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/Commissions
 * Query params: offset, limit, search, type, companyId, dateFrom, dateTo
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * COM-01: Hoa hồng ngưới giới thiệu (Agent commission)
 * COM-02: Hoa hồng nhân viên (Employee commission)
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      type = '', // 'agent', 'employee'
      companyId = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['c.active = true'];
    const params = [];
    let paramIdx = 1;

    if (type) {
      conditions.push(`c.type = $${paramIdx}`);
      params.push(type);
      paramIdx++;
    }

    if (companyId) {
      conditions.push(`c.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    if (dateFrom) {
      conditions.push(`c.datecreated >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`c.datecreated <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    if (search) {
      conditions.push(`c.name ILIKE $${paramIdx}`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        c.id,
        c.name,
        c.type,
        c.active,
        c.companyid,
        co.name AS companyname,
        c.createdbyid,
        au.name AS createdbyname,
        c.writebyid,
        wu.name AS updatedbyname,
        c.datecreated,
        c.lastupdated,
        (SELECT COUNT(*) FROM commissionhistories ch WHERE ch.commissionid = c.id) AS historycount
      FROM commissions c
      LEFT JOIN companies co ON co.id = c.companyid
      LEFT JOIN aspnetusers au ON au.id = c.createdbyid
      LEFT JOIN aspnetusers wu ON wu.id = c.writebyid
      WHERE ${whereClause}
      ORDER BY c.datecreated DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM commissions c WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    const aggregates = {
      total: totalItems,
      byType: {
        agent: await query(
          `SELECT COUNT(*) AS count FROM commissions c WHERE ${whereClause} AND c.type = 'agent'`,
          params
        ).then(r => parseInt(r[0]?.count || '0', 10)),
        employee: await query(
          `SELECT COUNT(*) AS count FROM commissions c WHERE ${whereClause} AND c.type = 'employee'`,
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
    console.error('Error fetching commissions:', err);
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
 * GET /api/SaleOrderLinePartnerCommissions
 * Returns: Commission records for partners/employees
 */
router.get('/SaleOrderLinePartnerCommissions', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      partnerId = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;
    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (partnerId) {
      conditions.push(`solpc.partnerid = $${paramIdx}`);
      params.push(partnerId);
      paramIdx++;
    }

    if (dateFrom) {
      conditions.push(`solpc.datecreated >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`solpc.datecreated <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        solpc.id,
        solpc.partnerid,
        p.displayname AS partnername,
        p.ref AS partnercode,
        solpc.saleorderlineid,
        sol.name AS orderlinename,
        solpc.amount,
        solpc.percentage,
        solpc.commissiontype,
        solpc.datecreated
      FROM saleorderlinepartnercommissions solpc
      LEFT JOIN partners p ON p.id = solpc.partnerid
      LEFT JOIN saleorderlines sol ON sol.id = solpc.saleorderlineid
      WHERE ${whereClause}
      ORDER BY solpc.datecreated DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM saleorderlinepartnercommissions solpc WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Calculate totals
    const totalResult = await query(
      `SELECT COALESCE(SUM(amount), 0) AS totalcommission
       FROM saleorderlinepartnercommissions solpc
       WHERE ${whereClause}`,
      params
    );

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates: {
        totalCommission: parseFloat(totalResult[0]?.totalcommission || 0),
      },
    });
  } catch (err) {
    console.error('Error fetching partner commissions:', err);
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
 * GET /api/Commissions/:id
 * Returns: Single commission scheme with details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        c.id,
        c.name,
        c.type,
        c.active,
        c.companyid,
        co.name AS companyname,
        c.createdbyid,
        au.name AS createdbyname,
        c.writebyid,
        wu.name AS updatedbyname,
        c.datecreated,
        c.lastupdated
      FROM commissions c
      LEFT JOIN companies co ON co.id = c.companyid
      LEFT JOIN aspnetusers au ON au.id = c.createdbyid
      LEFT JOIN aspnetusers wu ON wu.id = c.writebyid
      WHERE c.id = $1 AND c.active = true`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    // Get commission rules
    const rules = await query(
      `SELECT
        cpr.id,
        cpr.productid,
        p.name AS productname,
        cpr.percentage,
        cpr.fixedamount,
        cpr.minamount,
        cpr.maxamount
      FROM commissionproductrules cpr
      LEFT JOIN products p ON p.id = cpr.productid
      WHERE cpr.commissionid = $1 AND cpr.active = true`,
      [id]
    );

    const commission = rows[0];
    commission.rules = rules;

    return res.json(commission);
  } catch (err) {
    console.error('Error fetching commission:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/Commissions/:id/Histories
 * Returns: Commission calculation histories
 */
router.get('/:id/Histories', async (req, res) => {
  try {
    const { id } = req.params;
    const { offset = '0', limit = '20' } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const items = await query(
      `SELECT
        ch.id,
        ch.name,
        ch.datefrom,
        ch.dateto,
        ch.totalamount,
        ch.state,
        ch.commissionid,
        ch.createdbyid,
        au.name AS createdbyname,
        ch.datecreated
      FROM commissionhistories ch
      LEFT JOIN aspnetusers au ON au.id = ch.createdbyid
      WHERE ch.commissionid = $1
      ORDER BY ch.datecreated DESC
      LIMIT $2 OFFSET $3`,
      [id, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM commissionhistories WHERE commissionid = $1`,
      [id]
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching commission histories:', err);
    return res.status(500).json({
      offset: 0,
      limit: 20,
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
