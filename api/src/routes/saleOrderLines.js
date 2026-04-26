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
      dateFrom = '',
      dateTo = '',
      state = '',
      partnerId = '',
    } = req.query;

    const offsetNum = parseInt(offset, 10);
    const limitNum = Math.min(parseInt(limit, 10), 500);

    const conditions = ['sol.isdeleted = false'];
    const params = [];
    let paramIdx = 1;

    // Company filter
    if (companyId) {
      conditions.push(`sol.companyid = $${paramIdx}`);
      params.push(companyId);
      paramIdx++;
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`sol.date >= $${paramIdx}`);
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`sol.date <= $${paramIdx}`);
      params.push(dateTo);
      paramIdx++;
    }

    // State filter (comma-separated)
    if (state) {
      const states = state.split(',').filter(s => s.trim());
      if (states.length > 0) {
        const placeholders = states.map((_, i) => `$${paramIdx + i}`).join(',');
        conditions.push(`sol.state IN (${placeholders})`);
        params.push(...states);
        paramIdx += states.length;
      }
    }

    // Partner filter
    if (partnerId) {
      conditions.push(`sol.orderpartnerid = $${paramIdx}`);
      params.push(partnerId);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    const rows = await query(
      `SELECT
        sol.id,
        sol.date,
        sol.name,
        sol.state,
        sol.orderpartnerid,
        p.displayname AS partner_displayname,
        p.phone AS partner_phone,
        p.street AS partner_street,
        sol.orderid,
        so.name AS order_name,
        sol.productid,
        pr.name AS product_name,
        sol.diagnostic,
        sol.employeeid,
        e.name AS employee_name,
        sol.assistantid,
        a.name AS assistant_name,
        sol.counselorid,
        c.name AS counselor_name,
        pr.defaultcode AS product_defaultcode,
        sol.productuomqty,
        sol.priceunit,
        sol.pricesubtotal,
        sol.pricetotal,
        sol.toothtype,
        sol.toothrange,
        sol.discounttype,
        sol.discount,
        sol.discountfixed,
        sol.toothtypefilter,
        sol.amountinvoiced,
        sol.amountresidual,
        sol.isactive,
        sol.datecreated,
        sol.lastupdated,
        sol.taxid,
        sol.isrewardline,
        sol.isglobaldiscount
      FROM saleorderlines sol
      LEFT JOIN partners p ON p.id = sol.orderpartnerid
      LEFT JOIN saleorders so ON so.id = sol.orderid
      LEFT JOIN products pr ON pr.id = sol.productid
      LEFT JOIN employees e ON e.id = sol.employeeid
      LEFT JOIN employees a ON a.id = sol.assistantid
      LEFT JOIN employees c ON c.id = sol.counselorid
      WHERE ${whereClause}
      ORDER BY sol.date DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offsetNum]
    );

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM saleorderlines sol WHERE ${whereClause}`,
      params
    );
    const totalItems = parseInt(countResult[0]?.count || '0', 10);

    // Calculate aggregates
    const aggregatesResult = await query(
      `SELECT
        COALESCE(SUM(sol.pricesubtotal), 0) AS totalrevenue,
        COUNT(DISTINCT sol.orderid) AS ordercount,
        COUNT(*) AS linecount
      FROM saleorderlines sol
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
