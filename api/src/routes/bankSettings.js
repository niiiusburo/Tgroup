const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * GET /api/settings/bank
 * Returns the configured bank account or 404 if none
 */
router.get('/bank', async (_req, res) => {
  try {
    const result = await query(
      'SELECT bank_bin, bank_number, bank_account_name FROM company_bank_settings ORDER BY id LIMIT 1'
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Bank settings not found' });
    }

    const row = result[0];
    return res.json({
      bankBin: row.bank_bin,
      bankNumber: row.bank_number,
      bankAccountName: row.bank_account_name,
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Error fetching bank settings',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/settings/bank
 * Creates or updates the bank account configuration
 */
router.put('/bank', async (req, res) => {
  try {
    const { bankBin, bankNumber, bankAccountName } = req.body;

    if (
      typeof bankBin !== 'string' || bankBin.trim() === '' ||
      typeof bankNumber !== 'string' || bankNumber.trim() === '' ||
      typeof bankAccountName !== 'string' || bankAccountName.trim() === ''
    ) {
      return res.status(400).json({
        message: 'bankBin, bankNumber, and bankAccountName are required and must be non-empty strings',
      });
    }

    const existing = await query(
      'SELECT id FROM company_bank_settings ORDER BY id LIMIT 1'
    );

    if (existing && existing.length > 0) {
      await query(
        'UPDATE company_bank_settings SET bank_bin = $1, bank_number = $2, bank_account_name = $3, updated_at = NOW() WHERE id = $4',
        [bankBin.trim(), bankNumber.trim(), bankAccountName.trim(), existing[0].id]
      );
    } else {
      await query(
        'INSERT INTO company_bank_settings (bank_bin, bank_number, bank_account_name) VALUES ($1, $2, $3)',
        [bankBin.trim(), bankNumber.trim(), bankAccountName.trim()]
      );
    }

    return res.json({
      success: true,
      bankBin: bankBin.trim(),
      bankNumber: bankNumber.trim(),
      bankAccountName: bankAccountName.trim(),
    });
  } catch (err) {
    return res.status(500).json({
      message: 'Error saving bank settings',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

module.exports = router;
