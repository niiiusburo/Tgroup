const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID } = require('./helpers');
const {
  SERVICE_REVENUE_PAYMENT_CONDITION,
  ALLOCATION_TOTALS_CTE,
  CAPPED_ALLOCATED_AMOUNT_SQL,
  buildPairedRevenueFilters,
  toNumber,
  toInt,
} = require('./revenueRecognition');

const router = express.Router();

// ── Revenue Summary ──────────────────────────────────────────────────

function mergePaidByKey(baseRows, paidRows, key) {
  const paidMap = new Map(paidRows.map(row => [row[key], toNumber(row.paid)]));
  return baseRows.map(row => ({
    ...row,
    paid: paidMap.get(row[key]) || 0,
  }));
}

router.post('/revenue/summary', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = buildPairedRevenueFilters({
      dateFrom,
      dateTo,
      companyId,
      orderDateCol: 'datecreated',
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      orderCompanyCol: 'companyid',
      paymentCompanyCol: 'so.companyid',
    });
    const orders = await query(
      `SELECT state, COUNT(*) as cnt, COALESCE(SUM(amounttotal),0) as total,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false ${f.orderWhere}
       GROUP BY state`, f.params);

    const paidByState = await query(
      `WITH ${ALLOCATION_TOTALS_CTE}
       SELECT so.state, COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as paid
       FROM dbo.payment_allocations pa
       JOIN dbo.payments p ON p.id = pa.payment_id
       LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
       JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false
       WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.paymentWhere}
       GROUP BY so.state`, f.params);

    const methods = await query(
      `WITH ${ALLOCATION_TOTALS_CTE}
       SELECT p.method, p.status, COUNT(DISTINCT p.id) as cnt, COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as total
       FROM dbo.payment_allocations pa
       JOIN dbo.payments p ON p.id = pa.payment_id
       LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
       JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false
       WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.paymentWhere}
       GROUP BY p.method, p.status`, f.params);

    const ordersWithPaid = mergePaidByKey(orders, paidByState, 'state');
    return res.json({ success: true, data: { orders: ordersWithPaid.map(o => ({ ...o, cnt: toInt(o.cnt), total: toNumber(o.total), paid: toNumber(o.paid), outstanding: toNumber(o.outstanding) })), payments: methods.map(m => ({ ...m, cnt: toInt(m.cnt), total: toNumber(m.total) })) } });
  } catch (e) { console.error('reports/revenue/summary:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue Trend ────────────────────────────────────────────────────

router.post('/revenue/trend', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = buildPairedRevenueFilters({
      dateFrom,
      dateTo,
      companyId,
      orderDateCol: 'datecreated',
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      orderCompanyCol: 'companyid',
      paymentCompanyCol: 'so.companyid',
    });
    const trend = await query(
      `SELECT DATE_TRUNC('month', datecreated) as month,
              COUNT(*) as order_count,
              COALESCE(SUM(amounttotal),0) as invoiced,
              COALESCE(SUM(residual),0) as outstanding
       FROM dbo.saleorders WHERE isdeleted=false ${f.orderWhere}
       GROUP BY month ORDER BY month`, f.params);

    const paidTrend = await query(
      `WITH ${ALLOCATION_TOTALS_CTE}
       SELECT DATE_TRUNC('month', COALESCE(p.payment_date, p.created_at)) as month,
              COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as paid
       FROM dbo.payment_allocations pa
       JOIN dbo.payments p ON p.id = pa.payment_id
       LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
       JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false
       WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.paymentWhere}
       GROUP BY month ORDER BY month`, f.params);

    const paidMap = new Map(paidTrend.map(row => [String(row.month), toNumber(row.paid)]));
    const trendMap = new Map();
    trend.forEach(row => {
      const key = String(row.month);
      trendMap.set(key, {
        month: row.month,
        orderCount: toInt(row.order_count),
        invoiced: toNumber(row.invoiced),
        paid: paidMap.get(key) || 0,
        outstanding: toNumber(row.outstanding),
      });
    });
    paidTrend.forEach(row => {
      const key = String(row.month);
      if (!trendMap.has(key)) {
        trendMap.set(key, { month: row.month, orderCount: 0, invoiced: 0, paid: toNumber(row.paid), outstanding: 0 });
      }
    });

    return res.json({ success: true, data: Array.from(trendMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month))) });
  } catch (e) { console.error('reports/revenue/trend:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Location ──────────────────────────────────────────────

router.post('/revenue/by-location', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo)) return err(res, 400, 'Invalid params');

    const f = buildPairedRevenueFilters({
      dateFrom,
      dateTo,
      companyId: null,
      orderDateCol: 'so.datecreated',
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      orderCompanyCol: 'so.companyid',
      paymentCompanyCol: 'so.companyid',
    });
    const rows = await query(
      `WITH order_totals AS (
         SELECT so.companyid, COUNT(so.id) as order_count,
                COALESCE(SUM(so.amounttotal),0) as invoiced,
                COALESCE(SUM(so.residual),0) as outstanding
         FROM dbo.saleorders so
         WHERE so.isdeleted=false ${f.orderWhere}
         GROUP BY so.companyid
       ),
       ${ALLOCATION_TOTALS_CTE},
       paid_totals AS (
         SELECT so.companyid, COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as paid
         FROM dbo.payment_allocations pa
         JOIN dbo.payments p ON p.id = pa.payment_id
         LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
         JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false
         WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.paymentWhere}
         GROUP BY so.companyid
       )
       SELECT c.id, c.name, COALESCE(ot.order_count,0) as order_count,
              COALESCE(ot.invoiced,0) as invoiced,
              COALESCE(pt.paid,0) as paid,
              COALESCE(ot.outstanding,0) as outstanding
       FROM dbo.companies c
       LEFT JOIN order_totals ot ON ot.companyid=c.id
       LEFT JOIN paid_totals pt ON pt.companyid=c.id
       ORDER BY paid DESC`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: toInt(r.order_count), invoiced: toNumber(r.invoiced), paid: toNumber(r.paid), outstanding: toNumber(r.outstanding) })) });
  } catch (e) { console.error('reports/revenue/by-location:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
