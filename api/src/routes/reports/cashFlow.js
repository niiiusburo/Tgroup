const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, resolveReportCompanyScope, datePaymentScopeFilter } = require('./helpers');

const router = express.Router();

const REVENUE_RULES = [
  { key: 'servicePayments', treatment: 'revenue' },
  { key: 'customerDeposits', treatment: 'cashFlowOnly' },
  { key: 'depositUsage', treatment: 'internalMovement' },
  { key: 'refunds', treatment: 'cashOutflow' },
  { key: 'voidedPayments', treatment: 'excluded' },
];

const CATEGORY_ORDER = [
  'service_collections',
  'customer_deposits',
  'refunds',
  'deposit_usage',
  'voided_adjustments',
];

function amountNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function classifyCashFlowRow(row) {
  const amount = amountNumber(row.amount);
  const depositUsed = amountNumber(row.deposit_used);
  const cashAmount = amountNumber(row.cash_amount);
  const bankAmount = amountNumber(row.bank_amount);
  const externalAmount = cashAmount + bankAmount > 0
    ? cashAmount + bankAmount
    : Math.max(0, Math.abs(amount) - depositUsed);
  const status = row.status || 'posted';
  const depositType = row.deposit_type || null;
  const method = row.method || null;

  if (status === 'voided') {
    return {
      key: 'voided_adjustments',
      direction: 'adjustment',
      amount: Math.abs(amount),
      signedAmount: 0,
      date: dateKey(row.report_date),
    };
  }

  if (depositType === 'refund' || amount < 0) {
    return {
      key: 'refunds',
      direction: 'out',
      amount: Math.abs(amount),
      signedAmount: -Math.abs(amount),
      date: dateKey(row.report_date),
    };
  }

  if (depositType === 'deposit') {
    return {
      key: 'customer_deposits',
      direction: 'in',
      amount: Math.abs(amount),
      signedAmount: Math.abs(amount),
      date: dateKey(row.report_date),
    };
  }

  if (depositType === 'usage' || method === 'deposit') {
    const internalAmount = depositUsed > 0 ? depositUsed : Math.abs(amount);
    return {
      key: 'deposit_usage',
      direction: 'internal',
      amount: internalAmount,
      signedAmount: 0,
      date: dateKey(row.report_date),
    };
  }

  return {
    key: 'service_collections',
    direction: 'in',
    amount: externalAmount,
    signedAmount: externalAmount,
    date: dateKey(row.report_date),
  };
}

function summarizeCashFlow(rows) {
  const categoryMap = new Map();
  const trendMap = new Map();

  for (const row of rows) {
    const item = classifyCashFlowRow(row);
    const category = categoryMap.get(item.key) || {
      key: item.key,
      direction: item.direction,
      count: 0,
      amount: 0,
      signedAmount: 0,
    };
    category.count += 1;
    category.amount += item.amount;
    category.signedAmount += item.signedAmount;
    categoryMap.set(item.key, category);

    if (item.date) {
      const trend = trendMap.get(item.date) || {
        date: item.date,
        moneyIn: 0,
        moneyOut: 0,
        netCashFlow: 0,
      };
      if (item.signedAmount > 0) trend.moneyIn += item.signedAmount;
      if (item.signedAmount < 0) trend.moneyOut += Math.abs(item.signedAmount);
      trend.netCashFlow += item.signedAmount;
      trendMap.set(item.date, trend);
    }
  }

  const categories = CATEGORY_ORDER
    .map(key => categoryMap.get(key) || {
      key,
      direction: key === 'refunds' ? 'out' : key === 'deposit_usage' ? 'internal' : key === 'voided_adjustments' ? 'adjustment' : 'in',
      count: 0,
      amount: 0,
      signedAmount: 0,
    });

  const moneyIn = categories
    .filter(c => c.signedAmount > 0)
    .reduce((sum, c) => sum + c.signedAmount, 0);
  const moneyOut = Math.abs(categories
    .filter(c => c.signedAmount < 0)
    .reduce((sum, c) => sum + c.signedAmount, 0));

  return {
    moneyIn,
    moneyOut,
    netCashFlow: moneyIn - moneyOut,
    internalDepositUsed: categoryMap.get('deposit_usage')?.amount || 0,
    adjustments: categoryMap.get('voided_adjustments')?.amount || 0,
    categories,
    trend: Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

router.post('/revenue/rules', requirePermission('reports.view'), async (_req, res) => {
  return res.json({ success: true, data: { rules: REVENUE_RULES } });
});

router.post('/cash-flow/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = datePaymentScopeFilter(dateFrom, dateTo, scope, 'COALESCE(p.payment_date, p.created_at)', 'p');
    const rows = await query(
      `SELECT
         p.id,
         p.amount,
         p.method,
         p.status,
         p.deposit_type,
         p.deposit_used,
         p.cash_amount,
         p.bank_amount,
         COALESCE(p.payment_date, p.created_at) AS report_date
       FROM dbo.payments p
       WHERE p.status IN ('posted', 'voided') ${f.where}
       ORDER BY report_date ASC`,
      f.params
    );

    return res.json({ success: true, data: summarizeCashFlow(rows) });
  } catch (e) {
    console.error('reports/cash-flow/summary:', e);
    return err(res, 500, 'Internal error');
  }
});

router._test = {
  classifyCashFlowRow,
  summarizeCashFlow,
  REVENUE_RULES,
};

// ── Cash Flow: Deposits Report ───────────────────────────────────────

router.post('/cash-flow/deposits', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = datePaymentScopeFilter(dateFrom, dateTo, scope, 'COALESCE(p.payment_date, p.created_at)', 'p');
    const rows = await query(
      `SELECT
         p.id,
         p.amount,
         p.method,
         p.status,
         p.deposit_type,
         p.deposit_used,
         COALESCE(p.payment_date, p.created_at) AS report_date,
         cust.name AS customer_name,
         c.name AS branch
       FROM dbo.payments p
       JOIN dbo.partners cust ON cust.id = p.customer_id
       JOIN dbo.companies c ON c.id = cust.companyid
       WHERE p.deposit_type IN ('deposit', 'usage', 'refund') ${f.where}
       ORDER BY report_date DESC`,
      f.params
    );

    return res.json({ success: true, data: rows.map(r => ({ ...r, amount: parseFloat(r.amount) })) });
  } catch (e) {
    console.error('reports/cash-flow/deposits:', e);
    return err(res, 500, 'Internal error');
  }
});

// ── Cash Flow: Confirmation Timeline ─────────────────────────────────

router.post('/cash-flow/confirmation-timeline', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = datePaymentScopeFilter(dateFrom, dateTo, scope, 'COALESCE(p.payment_date, p.created_at)', 'p');
    const rows = await query(
      `SELECT
         DATE_TRUNC('day', COALESCE(p.payment_date, p.created_at))::date AS day,
         p.method,
         p.confirmed_by IS NOT NULL AS is_confirmed,
         COUNT(*) AS cnt,
         COALESCE(SUM(p.amount),0) AS total
       FROM dbo.payments p
       WHERE p.status = 'posted' ${f.where}
       GROUP BY day, p.method, is_confirmed
       ORDER BY day DESC, p.method`,
      f.params
    );

    return res.json({ success: true, data: rows.map(r => ({ ...r, cnt: parseInt(r.cnt), total: parseFloat(r.total), isConfirmed: r.is_confirmed })) });
  } catch (e) {
    console.error('reports/cash-flow/confirmation-timeline:', e);
    return err(res, 500, 'Internal error');
  }
});

// ── Cash Flow: By Method ─────────────────────────────────────────────

router.post('/cash-flow/by-method', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const scope = await resolveReportCompanyScope(req, res, companyId);
    if (!scope) return;

    const f = datePaymentScopeFilter(dateFrom, dateTo, scope, 'COALESCE(p.payment_date, p.created_at)', 'p');
    const rows = await query(
      `SELECT
         p.method,
         COUNT(*) AS cnt,
         COALESCE(SUM(CASE WHEN p.amount > 0 THEN p.amount ELSE 0 END),0) AS money_in,
         COALESCE(SUM(CASE WHEN p.amount < 0 THEN ABS(p.amount) ELSE 0 END),0) AS money_out,
         COALESCE(SUM(p.amount),0) AS net
       FROM dbo.payments p
       WHERE p.status = 'posted' ${f.where}
       GROUP BY p.method
       ORDER BY net DESC`,
      f.params
    );

    return res.json({ success: true, data: rows.map(r => ({ method: r.method, cnt: parseInt(r.cnt), moneyIn: parseFloat(r.money_in), moneyOut: parseFloat(r.money_out), net: parseFloat(r.net) })) });
  } catch (e) {
    console.error('reports/cash-flow/by-method:', e);
    return err(res, 500, 'Internal error');
  }
});

module.exports = router;
