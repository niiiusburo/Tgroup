const express = require('express');
const { query } = require('../db');

const router = express.Router();

// Error response helper
function errorResponse(res, status, errorCode, message) {
  return res.status(status).json({ errorCode, message });
}

// Validate UUID format
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validate date format (YYYY-MM-DD)
function isValidDate(str) {
  if (!str || typeof str !== 'string') return false;
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return false;

  const date = new Date(str);
  if (isNaN(date.getTime())) return false;

  // Validate the date parts match (e.g., no Feb 30)
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const checkDate = new Date(year, month - 1, day);
  return checkDate.getFullYear() === year &&
         checkDate.getMonth() === month - 1 &&
         checkDate.getDate() === day;
}

// Allowlist of tables that foreignKeyExists may query.
const FK_TABLES = new Set(['companies']);

async function foreignKeyExists(table, id) {
  if (!FK_TABLES.has(table)) {
    throw new Error(`foreignKeyExists: "${table}" not allowlisted`);
  }
  const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  return result.length > 0;
}

/**
 * POST /api/DashboardReports/GetSumary
 * Body: { dateFrom, dateTo, companyId }
 * Returns: { totalBank, totalCash, totalOther, totalAmountYesterday, totalAmount }
 *
 * Dashboard KPI widget
 */
router.post('/GetSumary', async (req, res) => {
  try {
    const { dateFrom = '', dateTo = '', companyId = '' } = req.body;

    // Validate companyId if provided
    if (companyId) {
      if (!isValidUUID(companyId)) {
        return errorResponse(res, 400, 'INVALID_COMPANY_ID', 'companyId must be a valid UUID');
      }
      if (!(await foreignKeyExists('companies', companyId))) {
        return errorResponse(res, 404, 'COMPANY_NOT_FOUND', 'Company with given companyId does not exist');
      }
    }

    // Validate date formats
    if (dateFrom && !isValidDate(dateFrom)) {
      return errorResponse(res, 400, 'INVALID_DATE_FROM', 'dateFrom must be in YYYY-MM-DD format');
    }

    if (dateTo && !isValidDate(dateTo)) {
      return errorResponse(res, 400, 'INVALID_DATE_TO', 'dateTo must be in YYYY-MM-DD format');
    }

    // Validate date range
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      if (fromDate > toDate) {
        return errorResponse(res, 400, 'INVALID_DATE_RANGE', 'dateFrom cannot be after dateTo');
      }

      // Warn if range is > 1 year (but still process)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (toDate.getTime() - fromDate.getTime() > oneYear) {
        // Still process but could log warning
        console.warn(`DashboardReports/GetSumary: Date range > 1 year: ${dateFrom} to ${dateTo}`);
      }
    }

    // Build conditions for accountpayments
    const paymentConditions = ['ap.state = \'posted\''];
    const paymentParams = [];
    let paymentIdx = 1;

    if (companyId) {
      paymentConditions.push(`ap.companyid = $${paymentIdx}`);
      paymentParams.push(companyId);
      paymentIdx++;
    }

    if (dateFrom) {
      paymentConditions.push(`ap.paymentdate >= $${paymentIdx}`);
      paymentParams.push(dateFrom);
      paymentIdx++;
    }

    if (dateTo) {
      paymentConditions.push(`ap.paymentdate <= $${paymentIdx}`);
      paymentParams.push(dateTo);
      paymentIdx++;
    }

    const paymentWhere = paymentConditions.join(' AND ');

    // Get today's payments by type
    const todayResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'inbound' THEN ap.amount ELSE 0 END), 0) AS totalinbound,
        COALESCE(SUM(CASE WHEN ap.paymenttype = 'outbound' THEN ap.amount ELSE 0 END), 0) AS totaloutbound,
        COALESCE(SUM(CASE WHEN aj.type = 'cash' AND ap.paymenttype = 'inbound' THEN ap.amount ELSE 0 END), 0) AS totalcash,
        COALESCE(SUM(CASE WHEN aj.type = 'bank' AND ap.paymenttype = 'inbound' THEN ap.amount ELSE 0 END), 0) AS totalbank,
        COALESCE(SUM(CASE WHEN aj.type NOT IN ('cash', 'bank') AND ap.paymenttype = 'inbound' THEN ap.amount ELSE 0 END), 0) AS totalother
      FROM accountpayments ap
      LEFT JOIN accountjournals aj ON aj.id = ap.journalid
      WHERE ${paymentWhere}`,
      paymentParams
    );

    // Calculate yesterday's date for comparison (only if dateFrom is provided)
    let yesterdayParams = [];
    let yesterdayWhere = '';
    let totalAmountYesterday = 0;

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      const yesterday = new Date(fromDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayConditions = ['ap.state = \'posted\''];
      let yesterdayIdx = 1;

      if (companyId) {
        yesterdayConditions.push(`ap.companyid = $${yesterdayIdx}`);
        yesterdayParams.push(companyId);
        yesterdayIdx++;
      }

      yesterdayConditions.push(`ap.paymentdate = $${yesterdayIdx}`);
      yesterdayParams.push(yesterdayStr);

      yesterdayWhere = yesterdayConditions.join(' AND ');

      const yesterdayResult = await query(
        `SELECT
          COALESCE(SUM(CASE WHEN ap.paymenttype = 'inbound' THEN ap.amount ELSE 0 END) -
                   SUM(CASE WHEN ap.paymenttype = 'outbound' THEN ap.amount ELSE 0 END), 0) AS totalamount
        FROM accountpayments ap
        WHERE ${yesterdayWhere}`,
        yesterdayParams
      );

      totalAmountYesterday = parseFloat(yesterdayResult[0]?.totalamount || 0);
    }

    const today = todayResult[0] || {};
    const totalAmount = parseFloat(today.totalinbound || 0) - parseFloat(today.totaloutbound || 0);

    return res.json({
      totalBank: parseFloat(today.totalbank || 0),
      totalCash: parseFloat(today.totalcash || 0),
      totalOther: parseFloat(today.totalother || 0),
      totalAmountYesterday: totalAmountYesterday,
      totalAmount: totalAmount,
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
