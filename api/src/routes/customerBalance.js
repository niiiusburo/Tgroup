/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[mounted at /api/CustomerBalance (+/api/cosmetic mirror) by api/src/server.js; frontend client website/src/lib/api/customerBalance.ts]
 * @crossref:uses[api/src/db.js (getQuery — payments/saleorders/dotkhams balance math), product-map/domains/customers-partners.yaml]
 */
const express = require('express');
const router = express.Router();
const { getQuery } = require('../db');

/**
 * GET /api/CustomerBalance/:id
 * Returns deposit and outstanding balance for a customer (dbo.partners)
 * Calculates from payments table if records exist, otherwise returns 0
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const q = getQuery(req);

    // Verify customer exists in dbo.partners
    const partner = await q('SELECT id, name FROM dbo.partners WHERE id = $1', [id]);
    if (!partner || partner.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate deposit balance from payments.
    // Bug fix (2026-04-14): exclude payments that have allocations so regular
    // invoice payments are not double-counted as deposits (Tạm ứng).
    const depositResult = await q(`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN p.payment_category = 'deposit'
              AND COALESCE(p.deposit_type, 'deposit') = 'deposit'
              AND p.amount > 0
            THEN p.amount
            ELSE 0
          END
        ), 0) AS total_deposited,
        COALESCE(SUM(
          CASE
            WHEN p.deposit_type = 'usage' OR p.method = 'deposit' THEN ABS(p.amount)
            ELSE COALESCE(p.deposit_used, 0)
          END
        ), 0) AS total_used,
        COALESCE(SUM(
          CASE
            WHEN p.payment_category = 'deposit'
              AND (p.deposit_type = 'refund' OR p.amount < 0)
            THEN ABS(p.amount)
            ELSE 0
          END
        ), 0) AS total_refunded
      FROM payments p
      WHERE p.customer_id = $1 AND p.status != 'voided'
    `, [id]);

    const totalDeposited = parseFloat(depositResult[0]?.total_deposited || 0);
    const totalUsed = parseFloat(depositResult[0]?.total_used || 0);
    const totalRefunded = parseFloat(depositResult[0]?.total_refunded || 0);
    const depositBalance = Math.max(0, totalDeposited - totalUsed - totalRefunded);

    // Calculate outstanding balance from uninvoiced saleorders and dotkhams
    let outstandingBalance = 0;
    try {
      const residualResult = await q(`
        SELECT COALESCE(SUM(residual), 0) AS total
        FROM saleorders
        WHERE partnerid = $1
          AND state != 'cancelled'
          AND COALESCE(isdeleted, false) = false
        UNION ALL
        SELECT COALESCE(SUM(amountresidual), 0) FROM dotkhams WHERE partnerid = $1 AND state != 'cancelled'
      `, [id]);
      outstandingBalance = residualResult.reduce((sum, row) => sum + parseFloat(row.total || 0), 0);
    } catch {
      // Fallback to 0 if tables/columns missing
    }

    res.json({
      id: partner[0].id,
      name: partner[0].name,
      deposit_balance: depositBalance,
      outstanding_balance: Math.max(0, outstandingBalance),
      total_deposited: totalDeposited,
      total_used: totalUsed,
      total_refunded: totalRefunded,
    });
  } catch (error) {
    console.error('Error fetching customer balance:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
});

module.exports = router;
