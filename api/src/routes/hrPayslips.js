const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/HrPayslips
 * Query params: offset, limit, search, employeeId, state, payslipRunId, dateFrom, dateTo
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * HR-01: Bảng lương (Payslip) - Payroll management
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      search = '',
      employeeId = '',
      state = '',
      payslipRunId = '',
      dateFrom = '',
      dateTo = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['1=1'];
    const params = [];
    let paramIdx = 1;

    if (employeeId) {
      conditions.push(`hp.employeeid = $${paramIdx}`);
      params.push(employeeId);
      paramIdx++;
    }

    if (state) {
      conditions.push(`hp.state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }

    if (payslipRunId) {
      conditions.push(`hp.paysliprunid = $${paramIdx}`);
      params.push(payslipRunId);
      paramIdx++;
    }

    if (dateFrom) {
      conditions.push(`hp.datefrom >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`hp.dateto <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    if (search) {
      conditions.push(
        `(hp.name ILIKE $${paramIdx} OR hp.number ILIKE $${paramIdx} OR e.name ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const items = await query(
      `SELECT
        hp.id,
        hp.name,
        hp.number,
        hp.employeeid,
        e.name AS employeename,
        e.ref AS employeecode,
        e.phone AS employeephone,
        hp.datefrom,
        hp.dateto,
        hp.state,
        hp.companyid,
        c.name AS companyname,
        hp.paysliprunid,
        hpr.name AS paysliprunname,
        hp.structid,
        hps.name AS structurename,
        hp.structuretypeid,
        hp.daysalary,
        hp.workedday,
        hp.totalbasicsalary,
        hp.overtimehour,
        hp.overtimehoursalary,
        hp.overtimeday,
        hp.overtimedaysalary,
        hp.allowance,
        hp.otherallowance,
        hp.rewardsalary,
        hp.holidayallowance,
        hp.totalsalary,
        hp.commissionsalary,
        hp.tax,
        hp.socialinsurance,
        hp.advancepayment,
        hp.amercementmoney,
        hp.netsalary,
        hp.actualleavepermonth,
        hp.leavepermonthunpaid,
        hp.totalamount,
        hp.createdbyid,
        au.name AS createdbyname,
        hp.writebyid,
        wu.name AS updatedbyname,
        hp.datecreated,
        hp.lastupdated
      FROM hrpayslips hp
      LEFT JOIN employees e ON e.id = hp.employeeid
      LEFT JOIN companies c ON c.id = hp.companyid
      LEFT JOIN hrpayslipruns hpr ON hpr.id = hp.paysliprunid
      LEFT JOIN hrpayrollstructures hps ON hps.id = hp.structid
      LEFT JOIN aspnetusers au ON au.id = hp.createdbyid
      LEFT JOIN aspnetusers wu ON wu.id = hp.writebyid
      WHERE ${whereClause}
      ORDER BY hp.datefrom DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM hrpayslips hp WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Calculate aggregates
    const aggResult = await query(
      `SELECT
        COALESCE(SUM(hp.totalsalary), 0) AS totalsalary,
        COALESCE(SUM(hp.netsalary), 0) AS totalnetsalary,
        COALESCE(SUM(hp.tax), 0) AS totaltax,
        COALESCE(SUM(hp.socialinsurance), 0) AS totalinsurance,
        COALESCE(SUM(hp.advancepayment), 0) AS totaladvance,
        COUNT(CASE WHEN hp.state = 'draft' THEN 1 END) AS draftcount,
        COUNT(CASE WHEN hp.state = 'done' THEN 1 END) AS donecount,
        COUNT(CASE WHEN hp.state = 'paid' THEN 1 END) AS paidcount
      FROM hrpayslips hp
      WHERE ${whereClause}`,
      params
    );

    const agg = aggResult[0] || {};

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates: {
        totalSalary: parseFloat(agg.totalsalary || 0),
        totalNetSalary: parseFloat(agg.totalnetsalary || 0),
        totalTax: parseFloat(agg.totaltax || 0),
        totalInsurance: parseFloat(agg.totalinsurance || 0),
        totalAdvance: parseFloat(agg.totaladvance || 0),
        byState: {
          draft: parseInt(agg.draftcount || 0, 10),
          done: parseInt(agg.donecount || 0, 10),
          paid: parseInt(agg.paidcount || 0, 10),
        },
      },
    });
  } catch (err) {
    console.error('Error fetching payslips:', err);
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
 * GET /api/HrPayslips/:id
 * Returns: Single payslip with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT
        hp.id,
        hp.name,
        hp.number,
        hp.employeeid,
        e.name AS employeename,
        e.ref AS employeecode,
        e.phone AS employeephone,
        e.email AS employeeemail,
        hp.datefrom,
        hp.dateto,
        hp.state,
        hp.companyid,
        c.name AS companyname,
        hp.paysliprunid,
        hpr.name AS paysliprunname,
        hp.structid,
        hps.name AS structurename,
        hp.structuretypeid,
        hp.daysalary,
        hp.workedday,
        hp.totalbasicsalary,
        hp.overtimehour,
        hp.overtimehoursalary,
        hp.overtimeday,
        hp.overtimedaysalary,
        hp.allowance,
        hp.otherallowance,
        hp.rewardsalary,
        hp.holidayallowance,
        hp.totalsalary,
        hp.commissionsalary,
        hp.tax,
        hp.socialinsurance,
        hp.advancepayment,
        hp.amercementmoney,
        hp.netsalary,
        hp.actualleavepermonth,
        hp.leavepermonthunpaid,
        hp.totalamount,
        hp.salarypaymentid,
        sp.name AS salarypaymentname,
        hp.createdbyid,
        au.name AS createdbyname,
        hp.writebyid,
        wu.name AS updatedbyname,
        hp.datecreated,
        hp.lastupdated
      FROM hrpayslips hp
      LEFT JOIN employees e ON e.id = hp.employeeid
      LEFT JOIN companies c ON c.id = hp.companyid
      LEFT JOIN hrpayslipruns hpr ON hpr.id = hp.paysliprunid
      LEFT JOIN hrpayrollstructures hps ON hps.id = hp.structid
      LEFT JOIN salarypayments sp ON sp.id = hp.salarypaymentid
      LEFT JOIN aspnetusers au ON au.id = hp.createdbyid
      LEFT JOIN aspnetusers wu ON wu.id = hp.writebyid
      WHERE hp.id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching payslip:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/HrPayslipRuns
 * Returns: Payslip run periods for dropdown
 */
router.get('/Runs', async (req, res) => {
  try {
    const { offset = '0', limit = '50' } = req.query;
    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const items = await query(
      `SELECT
        hpr.id,
        hpr.name,
        hpr.datefrom,
        hpr.dateto,
        hpr.state,
        hpr.companyid,
        c.name AS companyname,
        hpr.datecreated
      FROM hrpayslipruns hpr
      LEFT JOIN companies c ON c.id = hpr.companyid
      ORDER BY hpr.datefrom DESC
      LIMIT $1 OFFSET $2`,
      [limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM hrpayslipruns`
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
    });
  } catch (err) {
    console.error('Error fetching payslip runs:', err);
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
 * GET /api/HrPayrollStructures
 * Returns: Payroll structures for dropdown
 */
router.get('/Structures', async (req, res) => {
  try {
    const items = await query(
      `SELECT
        hps.id,
        hps.name,
        hps.code,
        hps.active,
        hps.companyid,
        c.name AS companyname,
        hps.datecreated
      FROM hrpayrollstructures hps
      LEFT JOIN companies c ON c.id = hps.companyid
      WHERE hps.active = true
      ORDER BY hps.name`
    );

    return res.json({
      totalItems: items.length,
      items,
    });
  } catch (err) {
    console.error('Error fetching payroll structures:', err);
    return res.status(500).json({
      totalItems: 0,
      items: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
