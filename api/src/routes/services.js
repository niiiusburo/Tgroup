const express = require('express');
const router = express.Router();
const { query } = require('../db');

// GET /api/Services - List services (optionally filtered by customerId)
router.get('/', async (req, res) => {
  try {
    const { customerId, limit = 100, offset = 0 } = req.query;
    
    let sql = `
      SELECT 
        s.id, s.customer_id, s.doctor_id, s.assistant_id, s.location_id,
        s.appointment_id, s.service_type, s.service_code, s.practitioner,
        s.prescription, s.notes, s.unit_price, s.quantity, s.discount,
        s.total_amount, s.status, s.sessions, s.created_at, s.updated_at
      FROM public.services s
      WHERE 1=1
    `;
    const params = [];
    
    if (customerId) {
      params.push(customerId);
      sql += ` AND s.customer_id = $${params.length}`;
    }
    
    sql += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);

    let countSql = 'SELECT COUNT(*) FROM public.services WHERE 1=1';
    const countParams = [];
    if (customerId) {
      countParams.push(customerId);
      countSql += ` AND customer_id = $1`;
    }
    const countResult = await query(countSql, countParams);

    res.json({
      items: result.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        doctorId: row.doctor_id,
        assistantId: row.assistant_id,
        locationId: row.location_id,
        appointmentId: row.appointment_id,
        serviceType: row.service_type,
        serviceCode: row.service_code,
        practitioner: row.practitioner,
        prescription: row.prescription,
        notes: row.notes,
        unitPrice: parseFloat(row.unit_price || 0),
        quantity: row.quantity || 1,
        discount: parseFloat(row.discount || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        status: row.status,
        sessions: row.sessions,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      totalItems: parseInt(countResult[0].count),
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/Services - Create a new service
router.post('/', async (req, res) => {
  try {
    const { customer_id, service_type, unit_price, quantity, discount, doctor_id, notes, status } = req.body;
    
    if (!customer_id || !service_type) {
      return res.status(400).json({ error: 'customer_id and service_type are required' });
    }
    
    const total = (unit_price || 0) * (quantity || 1) - (discount || 0);
    
    const result = await query(`
      INSERT INTO public.services (customer_id, service_type, unit_price, quantity, discount, doctor_id, notes, status, total_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      customer_id, 
      service_type, 
      unit_price || 0, 
      quantity || 1, 
      discount || 0,
      doctor_id,
      notes,
      status || 'in_progress',
      total
    ]);
    
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      customerId: row.customer_id,
      serviceType: row.service_type,
      unitPrice: parseFloat(row.unit_price),
      totalAmount: parseFloat(row.total_amount),
      status: row.status,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

module.exports = router;
