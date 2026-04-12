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

    // Calculate deposit balance from payments
    // Deposits (cash/bank_transfer) add to balance; 'deposit' method and deposit_used withdraw
    const depositResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN method IN ('cash', 'bank_transfer') THEN amount ELSE 0 END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN method = 'deposit' THEN amount ELSE 0 END), 0) AS total_withdrawals,
        COALESCE(SUM(deposit_used), 0) AS total_deposit_used
      FROM payments
      WHERE customer_id = $1
    `, [id]);

    const totalDeposits = parseFloat(depositResult[0]?.total_deposits || 0);
    const totalWithdrawals = parseFloat(depositResult[0]?.total_withdrawals || 0);
    const totalDepositUsed = parseFloat(depositResult[0]?.total_deposit_used || 0);
    const depositBalance = totalDeposits - totalWithdrawals - totalDepositUsed;

    // Calculate outstanding balance from uninvoiced saleorders and dotkhams
    let outstandingBalance = 0;
    try {
      const residualResult = await query(`
        SELECT COALESCE(SUM(residual), 0) AS total FROM saleorders WHERE partner_id = $1 AND state != 'cancelled'
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
      deposit_balance: Math.max(0, depositBalance),
      outstanding_balance: Math.max(0, outstandingBalance),
    });
  } catch (error) {
    console.error('Error fetching customer balance:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
});

module.exports = router;
