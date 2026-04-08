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
    // Deposits (cash/bank method) add to balance, 'deposit' method withdraws
    const depositResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN method IN ('cash', 'bank') THEN amount ELSE 0 END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN method = 'deposit' THEN amount ELSE 0 END), 0) AS total_withdrawals
      FROM public.payments
      WHERE customer_id = $1
    `, [id]);

    const totalDeposits = parseFloat(depositResult[0]?.total_deposits || 0);
    const totalWithdrawals = parseFloat(depositResult[0]?.total_withdrawals || 0);
    const depositBalance = totalDeposits - totalWithdrawals;

    res.json({
      id: partner[0].id,
      name: partner[0].name,
      deposit_balance: Math.max(0, depositBalance),
      outstanding_balance: 0, // No outstanding balance tracking yet
    });
  } catch (error) {
    console.error('Error fetching customer balance:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
});

module.exports = router;
