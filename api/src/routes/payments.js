const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/Payments - List payments
router.get('/', async (req, res) => {
  try {
    const { customerId, limit = 100, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        p.id, p.customer_id, p.service_id, p.processed_by,
        p.amount, p.method, p.deposit_used, p.cash_amount, p.bank_amount,
        p.receipt_number, p.notes, p.created_at
      FROM public.payments p
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
    
    let countSql = 'SELECT COUNT(*) FROM public.payments';
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
      INSERT INTO public.payments (customer_id, service_id, amount, method, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [customer_id, service_id, amount, method, notes]);
    
    if (method === 'cash' || method === 'bank') {
      await query(`
        UPDATE public.customers SET deposit_balance = deposit_balance + $1 WHERE id = $2
      `, [amount, customer_id]);
    } else if (method === 'deposit') {
      await query(`
        UPDATE public.customers SET deposit_balance = GREATEST(0, deposit_balance - $1) WHERE id = $2
      `, [amount, customer_id]);
    }
    
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

module.exports = router;
