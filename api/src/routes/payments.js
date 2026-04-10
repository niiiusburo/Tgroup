const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/Payments - List payments
router.get('/', async (req, res) => {
  try {
    const { customerId, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT
        p.id, p.customer_id, p.service_id,
        p.amount, p.method, p.notes, p.created_at
      FROM payments p
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      params.push(customerId);
      sql += ` AND p.customer_id = $` + params.length;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $` + (params.length + 1) + ` OFFSET $` + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    let countSql = 'SELECT COUNT(*) FROM payments';
    if (customerId) {
      countSql += ' WHERE customer_id = $1';
    }
    const countResult = await query(countSql, customerId ? [customerId] : []);

    res.json({
      items: result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        serviceId: row.service_id,
        amount: parseFloat(row.amount),
        method: row.method,
        depositUsed: parseFloat(row.deposit_used || 0),
        cashAmount: parseFloat(row.cash_amount || 0),
        bankAmount: parseFloat(row.bank_amount || 0),
        notes: row.notes,
        createdAt: row.created_at,
      })),
      totalItems: parseInt(countResult[0]?.count || 0),
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/Payments - Create a new payment
router.post('/', async (req, res) => {
  try {
    const { customer_id, service_id, amount, method, notes } = req.body;

    if (!customer_id || !amount || !method) {
      return res.status(400).json({ error: 'customer_id, amount, and method are required' });
    }

    const result = await query(`
      INSERT INTO payments (customer_id, service_id, amount, method, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [customer_id, service_id || null, amount, method, notes || null]);

    const row = result[0];
    res.status(201).json({
      id: row.id,
      customerId: row.customer_id,
      serviceId: row.service_id,
      amount: parseFloat(row.amount),
      method: row.method,
      notes: row.notes,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// POST /api/Payments/:id/proof - Upload payment proof image
router.post('/:id/proof', async (req, res) => {
  try {
    const { id } = req.params;
    const { proofImageBase64, qrDescription } = req.body;

    if (!proofImageBase64 || typeof proofImageBase64 !== 'string' || !proofImageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'proofImageBase64 must be a non-empty string starting with data:image/' });
    }

    const result = await query(
      'INSERT INTO payment_proofs (payment_id, proof_image, qr_description) VALUES ($1, $2, $3) RETURNING *',
      [parseInt(id, 10), proofImageBase64, qrDescription || null]
    );

    const row = result[0];
    res.json({ success: true, proofId: row.id });
  } catch (error) {
    console.error('Error saving payment proof:', error);
    res.status(500).json({ error: 'Failed to save payment proof' });
  }
});

module.exports = router;
