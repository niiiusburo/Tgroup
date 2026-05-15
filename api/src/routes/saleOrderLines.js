const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/SaleOrderLines
 * Query params: offset, limit, companyId, dateFrom, dateTo, state, partnerId
 * Returns: {offset, limit, totalItems, items[], aggregates}
 *
 * Dashboard widget: Service statistics
 *
 * PARITY NOTES:
 * - Field names use camelCase to match live TG Clinic API
 * - Fields not in DB schema return null (steps, tax, stateDisplay, etc.)
 * - See docs/parity-mvp.md for full parity matrix
 */
router.get('/', async (req, res) => {
  try {
    const {
      offset = '0',
      limit = '20',
      companyId = '',
      company_id = '',
      dateFrom = '',
      date_from = '',
      dateTo = '',
      date_to = '',
      state = '',
      partnerId = '',
      partner_id = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);
    const effectiveCompanyId = companyId || company_id;
    const effectiveDateFrom = dateFrom || date_from;
    const effectiveDateTo = dateTo || date_to;
    const effectivePartnerId = partnerId || partner_id;
    const effectiveDateSql = 'COALESCE(sol.date, so.datestart::timestamp, so.datecreated)';
    const effectiveStateSql = "COALESCE(NULLIF(so.state, ''), sol.state)";
    const effectiveLineTotalSql = 'COALESCE(NULLIF(sol.pricesubtotal, 0), sol.pricetotal, so.amounttotal, 0)';

    const conditions = ['sol.isdeleted = false'];
    const params = [];
    let paramIdx = 1;

    // Company filter
    if (effectiveCompanyId) {
      conditions.push(`COALESCE(sol.companyid, so.companyid) = $${paramIdx}`);
      params.push(effectiveCompanyId);
      paramIdx++;
    }

    // Date range filter
    if (effectiveDateFrom) {
      conditions.push(`${effectiveDateSql} >= $${paramIdx}`);
      params.push(effectiveDateFrom);
      paramIdx++;
    }
    if (effectiveDateTo) {
      conditions.push(`${effectiveDateSql} <= $${paramIdx}`);
      params.push(effectiveDateTo);
      paramIdx++;
    }

    // State filter (comma-separated)
    if (state) {
      const states = state.split(',').filter(s => s.trim());
      if (states.length > 0) {
        const placeholders = states.map((_, i) => `$${paramIdx + i}`).join(',');
        conditions.push(`${effectiveStateSql} IN (${placeholders})`);
        params.push(...states);
        paramIdx += states.length;
      }
    }

    // Partner filter
    if (effectivePartnerId) {
      conditions.push(`COALESCE(sol.orderpartnerid, so.partnerid) = $${paramIdx}`);
      params.push(effectivePartnerId);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const rows = await query(
      `SELECT
        sol.id,
        ${effectiveDateSql} AS date,
        sol.name,
        ${effectiveStateSql} AS state,
        COALESCE(sol.orderpartnerid, so.partnerid) AS orderpartnerid,
        p.displayname AS partner_displayname,
        p.ref AS partner_ref,
        p.phone AS partner_phone,
        p.street AS partner_street,
        sol.orderid,
        so.name AS order_name,
        sol.productid,
        pr.name AS product_name,
        sol.diagnostic,
        COALESCE(sol.employeeid, so.doctorid) AS employeeid,
        e.name AS employee_name,
        COALESCE(sol.assistantid, so.assistantid) AS assistantid,
        a.name AS assistant_name,
        sol.counselorid,
        c.name AS counselor_name,
        COALESCE(sol.companyid, so.companyid) AS companyid,
        co.name AS company_name,
        pr.defaultcode AS product_defaultcode,
        COALESCE(sol.productuomqty, so.quantity) AS productuomqty,
        sol.priceunit,
        ${effectiveLineTotalSql} AS pricesubtotal,
        COALESCE(sol.pricetotal, so.amounttotal) AS pricetotal,
        sol.toothtype,
        sol.toothrange,
        sol.discounttype,
        sol.discount,
        sol.discountfixed,
        sol.toothtypefilter,
        COALESCE(NULLIF(sol.amountinvoiced, 0), so.amounttotal) AS amountinvoiced,
        COALESCE(NULLIF(sol.amountresidual, 0), so.residual) AS amountresidual,
        sol.isactive,
        sol.datecreated,
        sol.lastupdated,
        sol.taxid,
        sol.isrewardline,
        sol.isglobaldiscount
      FROM saleorderlines sol
      LEFT JOIN saleorders so ON so.id = sol.orderid
      LEFT JOIN partners p ON p.id = COALESCE(sol.orderpartnerid, so.partnerid)
      LEFT JOIN products pr ON pr.id = sol.productid
      LEFT JOIN employees e ON e.id = COALESCE(sol.employeeid, so.doctorid)
      LEFT JOIN employees a ON a.id = COALESCE(sol.assistantid, so.assistantid)
      LEFT JOIN employees c ON c.id = sol.counselorid
      LEFT JOIN companies co ON co.id = COALESCE(sol.companyid, so.companyid)
      WHERE ${whereClause}
      ORDER BY ${effectiveDateSql} DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count
       FROM saleorderlines sol
       LEFT JOIN saleorders so ON so.id = sol.orderid
       WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Calculate aggregates
    const aggregatesResult = await query(
      `SELECT
        COALESCE(SUM(${effectiveLineTotalSql}), 0) AS totalrevenue,
        COUNT(DISTINCT sol.orderid) AS ordercount,
        COUNT(*) AS linecount
      FROM saleorderlines sol
      LEFT JOIN saleorders so ON so.id = sol.orderid
      WHERE ${whereClause}`,
      params
    );

    const agg = aggregatesResult[0] || {};

    // Transform to camelCase to match truth API
    const items = rows.map(row => ({
      id: row.id,
      date: row.date,
      name: row.name,
      state: row.state,
      orderPartnerId: row.orderpartnerid,
      orderPartnerName: row.partner_displayname,
      orderPartnerDisplayName: row.partner_displayname,
      orderPartnerPhone: row.partner_phone,
      orderPartnerCode: row.partner_ref,
      orderPartnerAddress: row.partner_street,
      orderId: row.orderid,
      orderName: row.order_name,
      productId: row.productid,
      productName: row.product_name,
      productCode: row.product_defaultcode,
      diagnostic: row.diagnostic,
      employeeId: row.employeeid,
      employee: row.employee_name,
      employeeName: row.employee_name,
      assistantId: row.assistantid,
      assistant: row.assistant_name,
      counselorId: row.counselorid,
      counselor: row.counselor_name,
      companyId: row.companyid,
      companyName: row.company_name,
      productUOMQty: row.productuomqty,
      priceUnit: row.priceunit,
      priceSubTotal: row.pricesubtotal,
      priceTotal: row.pricetotal,
      toothType: row.toothtype,
      toothRange: row.toothrange,
      discountType: row.discounttype,
      discount: row.discount,
      discountFixedAmount: row.discountfixed,
      toothTypeFilter: row.toothtypefilter,
      amountInvoiced: row.amountinvoiced,
      amountEInvoiced: row.amountinvoiced,
      amountResidual: row.amountresidual,
      isActive: row.isactive,
      isRewardLine: row.isrewardline,
      isGlobalDiscount: row.isglobaldiscount,
      taxId: row.taxid,
      // PLACEHOLDER fields (not in DB schema)
      steps: null,
      tax: null,
      stateDisplay: null,
      teethDisplay: null,
      lastServiceUseDate: null,
      totalRecognizedRevenue: null,
      totalRemainingRevenue: null,
    }));

    return res.json({
      offset: offsetNum,
      limit: limitNum,
      totalItems,
      items,
      aggregates: {
        totalRevenue: parseFloat(agg.totalrevenue || 0),
        orderCount: parseInt(agg.ordercount || 0, 10),
        lineCount: parseInt(agg.linecount || 0, 10),
      },
    });
  } catch (err) {
    console.error('Error fetching sale order lines:', err);
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
 * DELETE /api/SaleOrderLines/:id
 * Soft-deletes a service line. If this was the last active line on the
 * order, the parent sale order is also soft-deleted.
 */
router.delete('/:id', requirePermission('customers.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `UPDATE saleorderlines
       SET isdeleted = true,
           lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
       WHERE id = $1 AND isdeleted = false
       RETURNING id, orderid`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Sale order line not found' });
    }

    const orderId = rows[0].orderid;
    let deletedOrder = false;

    if (orderId) {
      const countResult = await query(
        'SELECT COUNT(*) AS count FROM saleorderlines WHERE orderid = $1 AND isdeleted = false',
        [orderId]
      );
      const activeLineCount = parseInt(countResult[0]?.count || '0', 10);

      if (activeLineCount === 0) {
        await query(
          `UPDATE saleorders
           SET isdeleted = true,
               lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
           WHERE id = $1 AND isdeleted = false`,
          [orderId]
        );
        deletedOrder = true;
      }
    }

    return res.json({ success: true, id: rows[0].id, orderId, deletedOrder });
  } catch (err) {
    console.error('Error deleting sale order line:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

module.exports = router;
