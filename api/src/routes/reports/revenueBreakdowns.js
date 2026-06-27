const express = require('express');
const { query } = require('../../db');
const { requirePermission } = require('../../middleware/auth');
const { err, validDate, validUUID, dateCompanyFilter } = require('./helpers');
const { resolveInvestorScope } = require('../../services/permissionService');
const {
  SERVICE_REVENUE_PAYMENT_CONDITION,
  UNALLOCATED_SERVICE_PAYMENT_CONDITION,
  ALLOCATION_TOTALS_CTE,
  CAPPED_ALLOCATED_AMOUNT_SQL,
  DIRECT_SERVICE_PAYMENT_AMOUNT_SQL,
  buildPairedRevenueFilters,
  buildPaymentRevenueFilter,
  toNumber,
  toInt,
} = require('./revenueRecognition');

const router = express.Router();

// ── Revenue by Doctor ────────────────────────────────────────────────

router.post('/revenue/by-doctor', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const f = buildPairedRevenueFilters({
      dateFrom,
      dateTo,
      companyId,
      orderDateCol: 'so.datecreated',
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      orderCompanyCol: 'so.companyid',
      paymentCompanyCol: 'so.companyid',
    });
    let orderWhere = f.orderWhere;
    let paymentWhere = f.paymentWhere;
    let params = [...f.params];
    if (investorScope.isInvestor) {
      params.push(investorScope.allowedCustomerIds);
      const paramIdx = f.params.length + 1;
      orderWhere += ` AND so.partnerid = ANY($${paramIdx}::uuid[])`;
      paymentWhere += ` AND so.partnerid = ANY($${paramIdx}::uuid[])`;
    }
    const rows = await query(
      `WITH order_totals AS (
         SELECT so.doctorid, COUNT(DISTINCT so.id) as order_count,
                COALESCE(SUM(so.amounttotal),0) as invoiced
         FROM dbo.saleorders so
         WHERE so.isdeleted=false AND so.state='sale' AND so.doctorid IS NOT NULL ${orderWhere}
         GROUP BY so.doctorid
       ),
       ${ALLOCATION_TOTALS_CTE},
       paid_totals AS (
         SELECT so.doctorid, COALESCE(SUM(${CAPPED_ALLOCATED_AMOUNT_SQL}),0) as paid
         FROM dbo.payment_allocations pa
         JOIN dbo.payments p ON p.id = pa.payment_id
         LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
         JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false AND so.state='sale'
         WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} AND so.doctorid IS NOT NULL ${paymentWhere}
         GROUP BY so.doctorid
       )
       SELECT p.id, p.name, COALESCE(ot.order_count,0) as order_count,
              COALESCE(ot.invoiced,0) as invoiced,
              COALESCE(pt.paid,0) as paid
       FROM dbo.partners p
       LEFT JOIN order_totals ot ON ot.doctorid=p.id
       LEFT JOIN paid_totals pt ON pt.doctorid=p.id
       WHERE p.isdoctor=true AND p.isdeleted=false
       ORDER BY paid DESC LIMIT 100`, params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: toInt(r.order_count), invoiced: toNumber(r.invoiced), paid: toNumber(r.paid) })) });
  } catch (e) { console.error('reports/revenue/by-doctor:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Category ──────────────────────────────────────────────

router.post('/revenue/by-category', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const f = buildPaymentRevenueFilter({ dateFrom, dateTo, companyId });
    let fWhere = f.where;
    let params = [...f.params];
    if (investorScope.isInvestor) {
      params.push(investorScope.allowedCustomerIds);
      fWhere += ` AND so.partnerid = ANY($${f.params.length + 1}::uuid[])`;
    }
    const rows = await query(
      `WITH line_totals AS (
         SELECT orderid, NULLIF(SUM(ABS(COALESCE(pricetotal, 0))), 0) AS line_total
         FROM dbo.saleorderlines
         WHERE COALESCE(isdeleted, false) = false
         GROUP BY orderid
       ),
       allocation_totals AS (
         SELECT payment_id, SUM(allocated_amount) AS total_allocated_for_payment
         FROM dbo.payment_allocations
         GROUP BY payment_id
       ),
       paid_lines AS (
         SELECT pc.id AS category_id,
                sol.id AS line_id,
                CASE
                  WHEN lt.line_total IS NULL THEN
                    CASE
                      WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
                      THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
                      ELSE pa.allocated_amount
                    END
                  ELSE (
                    CASE
                      WHEN at.total_allocated_for_payment > p.amount AND at.total_allocated_for_payment > 0
                      THEN pa.allocated_amount * p.amount / at.total_allocated_for_payment
                      ELSE pa.allocated_amount
                    END
                  ) * ABS(COALESCE(sol.pricetotal, 0)) / lt.line_total
                END AS revenue
         FROM dbo.payment_allocations pa
         JOIN dbo.payments p ON p.id = pa.payment_id
         LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
         JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false AND so.state='sale'
         JOIN dbo.saleorderlines sol
           ON sol.orderid = so.id
          AND COALESCE(sol.isdeleted, false) = false
          AND COALESCE(sol.isactive, true) = true
         LEFT JOIN line_totals lt ON lt.orderid = so.id
         JOIN dbo.products pr ON pr.id=sol.productid AND pr.active=true
         JOIN dbo.productcategories pc ON pc.id=pr.categid AND pc.active=true
         WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${fWhere}
       )
       SELECT pc.id, pc.name as category, COUNT(DISTINCT paid_lines.line_id) as line_count,
              COALESCE(SUM(paid_lines.revenue),0) as revenue
       FROM dbo.productcategories pc
       LEFT JOIN paid_lines ON paid_lines.category_id=pc.id
       WHERE pc.active=true
       GROUP BY pc.id, pc.name ORDER BY revenue DESC LIMIT 100`, params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, lineCount: toInt(r.line_count), revenue: toNumber(r.revenue) })) });
  } catch (e) { console.error('reports/revenue/by-category:', e); return err(res, 500, 'Internal error'); }
});

// ── Revenue by Source ────────────────────────────────────────────────

router.post('/revenue/by-source', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const f = buildPairedRevenueFilters({
      dateFrom,
      dateTo,
      companyId,
      orderDateCol: 'so.datecreated',
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      orderCompanyCol: 'so.companyid',
      paymentCompanyCol: 'so.companyid',
    });
    const directF = buildPaymentRevenueFilter({
      dateFrom,
      dateTo,
      companyId,
      paymentDateCol: 'COALESCE(p.payment_date, p.created_at)',
      companyCol: 'COALESCE(so.companyid, customer.companyid)',
    });
    const rows = await query(
      `WITH ${ALLOCATION_TOTALS_CTE},
       allocated_service_payments AS (
         SELECT COALESCE(so.sourceid, customer.sourceid) AS sourceid,
                so.id AS order_id,
                ${CAPPED_ALLOCATED_AMOUNT_SQL} AS paid
         FROM dbo.payment_allocations pa
         JOIN dbo.payments p ON p.id = pa.payment_id
         LEFT JOIN allocation_totals at ON at.payment_id = pa.payment_id
         JOIN dbo.saleorders so ON so.id = pa.invoice_id AND so.isdeleted=false
         LEFT JOIN dbo.partners customer ON customer.id = COALESCE(p.customer_id, so.partnerid)
         WHERE ${SERVICE_REVENUE_PAYMENT_CONDITION} ${f.paymentWhere}
       ),
       direct_service_payments AS (
         SELECT COALESCE(so.sourceid, customer.sourceid) AS sourceid,
                so.id AS order_id,
                ${DIRECT_SERVICE_PAYMENT_AMOUNT_SQL} AS paid
         FROM dbo.payments p
         LEFT JOIN dbo.saleorders so ON so.id = p.service_id AND so.isdeleted=false
         LEFT JOIN dbo.partners customer ON customer.id = COALESCE(p.customer_id, so.partnerid)
         WHERE ${UNALLOCATED_SERVICE_PAYMENT_CONDITION} ${directF.where}
       ),
       recognized_service_payments AS (
         SELECT sourceid, order_id, paid FROM allocated_service_payments
         UNION ALL
         SELECT sourceid, order_id, paid FROM direct_service_payments
       ),
       paid_totals AS (
         SELECT sourceid,
                COUNT(DISTINCT order_id) AS order_count,
                COALESCE(SUM(paid),0) AS paid
         FROM recognized_service_payments
         GROUP BY sourceid
       ),
       source_keys AS (
         SELECT id AS sourceid FROM dbo.customersources
         UNION
         SELECT sourceid FROM paid_totals
       )
       SELECT COALESCE(sk.sourceid::text, 'unassigned') as id,
              COALESCE(cs.name, 'Chưa gán nguồn') as name,
              COALESCE(pt.order_count,0) as order_count,
              COALESCE(pt.paid,0) as paid
       FROM source_keys sk
       LEFT JOIN dbo.customersources cs ON cs.id=sk.sourceid
       LEFT JOIN paid_totals pt ON (
         pt.sourceid=sk.sourceid OR (pt.sourceid IS NULL AND sk.sourceid IS NULL)
       )
       ORDER BY paid DESC, name ASC LIMIT 100`, f.params);

    return res.json({ success: true, data: rows.map(r => ({ ...r, orderCount: toInt(r.order_count), paid: toNumber(r.paid) })) });
  } catch (e) { console.error('reports/revenue/by-source:', e); return err(res, 500, 'Internal error'); }
});


// ── Payment Plans ────────────────────────────────────────────────────

router.post('/revenue/payment-plans', requirePermission('reports.view'), async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.body || {};
    if (!validDate(dateFrom) || !validDate(dateTo) || !validUUID(companyId)) return err(res, 400, 'Invalid params');

    const investorScope = await resolveInvestorScope(req.user?.employeeId);

    const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'mp.created_at', 'mp.company_id');
    let fWhere = f.where;
    let params = [...f.params];
    if (investorScope.isInvestor) {
      params.push(investorScope.allowedCustomerIds);
      fWhere += ` AND mp.customer_id = ANY($${f.params.length + 1}::uuid[])`;
    }
    const plans = await query(
      `SELECT mp.status, COUNT(*) as cnt, COALESCE(SUM(mp.total_amount),0) as total,
              COALESCE(SUM(mp.down_payment),0) as down_payment
       FROM dbo.monthlyplans mp WHERE 1=1 ${fWhere}
       GROUP BY mp.status`, params);

    const instConds = ['pi.due_date::date >= $1', 'pi.due_date::date <= $2'];
    const instParams = [dateFrom, dateTo];
    let instIdx = 3;
    if (companyId) {
      instConds.push(`mp.company_id = $${instIdx}`);
      instParams.push(companyId);
      instIdx++;
    }
    if (investorScope.isInvestor) {
      instConds.push(`mp.customer_id = ANY($${instIdx}::uuid[])`);
      instParams.push(investorScope.allowedCustomerIds);
    }
    const installments = await query(
      `SELECT pi.status, COUNT(*) as cnt, COALESCE(SUM(pi.amount),0) as total,
              COALESCE(SUM(pi.paid_amount),0) as paid
       FROM dbo.planinstallments pi
       JOIN dbo.monthlyplans mp ON mp.id=pi.plan_id
       WHERE ${instConds.join(' AND ')}
       GROUP BY pi.status`,
      instParams);

    return res.json({ success: true, data: {
      plans: plans.map(p => ({ status: p.status, count: parseInt(p.cnt), total: parseFloat(p.total), downPayment: parseFloat(p.down_payment) })),
      installments: installments.map(i => ({ status: i.status, count: parseInt(i.cnt), total: parseFloat(i.total), paid: parseFloat(i.paid) })),
    }});
  } catch (e) { console.error('reports/revenue/payment-plans:', e); return err(res, 500, 'Internal error'); }
});

module.exports = router;
