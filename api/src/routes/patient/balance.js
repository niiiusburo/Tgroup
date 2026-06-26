'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[/api/patient/balance, /api/patient/payments]
 * @crossref:uses[dbo.payments, dbo.payment_allocations, dbo.saleorders, dbo.company_bank_settings]
 */
const express = require('express');
const { getQuery } = require('../../db');
const { requirePatientAuth } = require('../../middleware/patientAuth');

const router = express.Router();

/**
 * GET /api/patient/balance
 * Returns outstanding balance, total paid, deposit balance, and bank settings for VietQR
 */
router.get('/', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    // Outstanding from saleorders
    const outstanding = await db(
      `SELECT COALESCE(SUM(residual), 0)::float as amount
       FROM dbo.saleorders
       WHERE partnerid = $1 AND COALESCE(isdeleted, false) = false`,
      [partnerId]
    );

    // Total paid
    const totalPaid = await db(
      `SELECT COALESCE(SUM(amount), 0)::float as amount
       FROM dbo.payments
       WHERE customer_id = $1 AND payment_category = 'payment' AND status = 'posted'`,
      [partnerId]
    );

    // Deposit balance
    const deposit = await db(
      `SELECT COALESCE(SUM(amount), 0)::float as amount
       FROM dbo.payments
       WHERE customer_id = $1 AND payment_category = 'deposit' AND status = 'posted'`,
      [partnerId]
    );

    // Bank settings for VietQR
    const bank = await db(
      `SELECT bank_bin, bank_number, bank_account_name FROM dbo.company_bank_settings ORDER BY id LIMIT 1`
    );

    return res.json({
      success: true,
      balance: {
        outstanding: outstanding[0]?.amount || 0,
        totalPaid: totalPaid[0]?.amount || 0,
        depositBalance: deposit[0]?.amount || 0,
      },
      bankSettings: bank[0] || null,
    });
  } catch (err) {
    console.error('[patientBalance] error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/patient/payments
 * Returns payment history
 */
router.get('/payments', requirePatientAuth, async (req, res) => {
  try {
    const db = getQuery('dental');
    const partnerId = req.patient.partnerId;

    const rows = await db(
      `SELECT p.id, p.amount, p.method, p.payment_date, p.reference_code, p.receipt_number,
              p.payment_category, p.status, p.created_at
       FROM dbo.payments p
       WHERE p.customer_id = $1
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [partnerId]
    );

    return res.json({ success: true, payments: rows });
  } catch (err) {
    console.error('[patientBalance] payments error:', err);
    return res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
});

module.exports = router;
