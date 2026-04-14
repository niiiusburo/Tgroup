const express = require('express');
const router = express.Router();
const { query } = require('../db');

/**
 * GET /api/CustomerBalance/:id
 * Returns deposit and outstanding balance for a customer (dbo.partners)
 * Calculates from payments table if records exist, otherwise returns 0
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify customer exists in dbo.partners
    const partner = await query('SELECT id, name FROM dbo.partners WHERE id = $1', [id]);
    if (!partner || partner.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate deposit balance from payments.
    // Bug fix (2026-04-14): exclude payments that have allocations so regular
    // invoice payments are not double-counted as deposits (Tạm ứng).
    const depositResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN deposit_type = 'deposit' OR (
          deposit_type IS NULL AND method IN ('cash', 'bank_transfer')
          AND service_id IS NULL AND (deposit_used IS NULL OR deposit_used = 0) AND amount > 0
          AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = payments.id)
        ) THEN amount ELSE 0 END), 0) AS total_deposited,
        COALESCE(SUM(CASE WHEN deposit_type = 'usage' OR method = 'deposit' OR (deposit_used > 0) THEN
          COALESCE(deposit_used, 0) + CASE WHEN method = 'deposit' THEN amount ELSE 0 END
        ELSE 0 END), 0) AS total_used,
        COALESCE(SUM(CASE WHEN deposit_type = 'refund' OR amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_refunded
      FROM payments
      WHERE customer_id = $1 AND status != 'voided'
    `, [id]);

    const totalDeposited = parseFloat(depositResult[0]?.total_deposited || 0);
    const totalUsed = parseFloat(depositResult[0]?.total_used || 0);
    const totalRefunded = parseFloat(depositResult[0]?.total_refunded || 0);
    const depositBalance = Math.max(0, totalDeposited - totalUsed - totalRefunded);

    // Calculate outstanding balance from uninvoiced saleorders and dotkhams
    let outstandingBalance = 0;
    try {
      const residualResult = await query(`
        SELECT COALESCE(SUM(residual), 0) AS total FROM saleorders WHERE partnerid = $1 AND state != 'cancelled'
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
