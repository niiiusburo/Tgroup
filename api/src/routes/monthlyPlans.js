/**
 * Monthly Plans API Routes
 * Handles monthly payment plan CRUD and installment management
 */
const express = require('express');
const { query, pool } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// GET /api/MonthlyPlans - List all plans with installments and linked invoices
router.get('/', requirePermission('payment.view'), async (req, res) => {
  try {
    const { company_id, status, customer_id, search } = req.query;
    
    let sql = `
      SELECT 
        mp.id, mp.customer_id, mp.company_id, mp.treatment_description,
        mp.total_amount, mp.down_payment, mp.installment_amount, 
        mp.number_of_installments, mp.start_date, mp.status, mp.notes,
        mp.created_at, mp.updated_at,
        p.name as customer_name
      FROM dbo.monthlyplans mp
      LEFT JOIN dbo.partners p ON mp.customer_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (company_id) {
      paramCount++;
      sql += ` AND mp.company_id = $${paramCount}`;
      params.push(company_id);
    }
    if (status && status !== 'all') {
      paramCount++;
      sql += ` AND mp.status = $${paramCount}`;
      params.push(status);
    }
    if (customer_id) {
      paramCount++;
      sql += ` AND mp.customer_id = $${paramCount}`;
      params.push(customer_id);
    }
    if (search) {
      paramCount++;
      sql += ` AND (p.name ILIKE $${paramCount} OR mp.treatment_description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY mp.created_at DESC';

    const plans = await query(sql, params);

    // Fetch installments for all plans
    const planIds = plans.map(p => p.id);
    let installments = [];
    if (planIds.length > 0) {
      const instResult = await query(
        `SELECT * FROM dbo.planinstallments WHERE plan_id = ANY($1) ORDER BY installment_number`,
        [planIds]
      );
      installments = instResult;
    }

    // Fetch linked invoices for all plans
    let planItems = [];
    if (planIds.length > 0) {
      const itemsResult = await query(
        `SELECT mpi.*, so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual
         FROM dbo.monthlyplan_items mpi
         JOIN saleorders so ON so.id = mpi.invoice_id
         WHERE mpi.plan_id = ANY($1)
         ORDER BY mpi.priority, so.name`,
        [planIds]
      );
      planItems = itemsResult;
    }

    // Combine plans with their installments and items
    const plansWithDetails = plans.map(plan => ({
      ...plan,
      installments: installments.filter(i => i.plan_id === plan.id),
      items: planItems.filter(i => i.plan_id === plan.id).map(i => ({
        id: i.id,
        planId: i.plan_id,
        invoiceId: i.invoice_id,
        invoiceName: i.invoice_name,
        invoiceTotal: parseFloat(i.invoice_total || 0),
        invoiceResidual: parseFloat(i.invoice_residual || 0),
        priority: i.priority,
      })),
    }));

    // Calculate summary stats
    const summary = {
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.status === 'active').length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      totalOutstanding: plansWithDetails.reduce((sum, p) => {
        if (p.status !== 'active') return sum;
        const paidTotal = p.installments
          .filter(i => i.status === 'paid')
          .reduce((s, i) => s + parseFloat(i.paid_amount || i.amount), 0);
        return sum + (parseFloat(p.total_amount) - parseFloat(p.down_payment) - paidTotal);
      }, 0),
      overdueCount: installments.filter(i => i.status === 'overdue').length
    };

    res.json({
      offset: 0,
      limit: 100,
      totalItems: plans.length,
      items: plansWithDetails,
      aggregates: summary
    });
  } catch (err) {
    console.error('MonthlyPlans GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/MonthlyPlans/:id - Get single plan with installments and linked invoices
router.get('/:id', requirePermission('payment.view'), async (req, res) => {
  try {
    const plans = await query(
      `SELECT mp.*, p.name as customer_name 
       FROM dbo.monthlyplans mp 
       LEFT JOIN dbo.partners p ON mp.customer_id = p.id 
       WHERE mp.id = $1`,
      [req.params.id]
    );

    if (plans.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const installments = await query(
      'SELECT * FROM dbo.planinstallments WHERE plan_id = $1 ORDER BY installment_number',
      [req.params.id]
    );

    const planItems = await query(
      `SELECT mpi.*, so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual
       FROM dbo.monthlyplan_items mpi
       JOIN saleorders so ON so.id = mpi.invoice_id
       WHERE mpi.plan_id = $1
       ORDER BY mpi.priority, so.name`,
      [req.params.id]
    );

    res.json({
      ...plans[0],
      installments,
      items: planItems.map(i => ({
        id: i.id,
        planId: i.plan_id,
        invoiceId: i.invoice_id,
        invoiceName: i.invoice_name,
        invoiceTotal: parseFloat(i.invoice_total || 0),
        invoiceResidual: parseFloat(i.invoice_residual || 0),
        priority: i.priority,
      })),
    });
  } catch (err) {
    console.error('MonthlyPlans GET/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/MonthlyPlans - Create new plan with installments and optional linked invoices
router.post('/', requirePermission('payment.edit'), async (req, res) => {
  try {
    const {
      customer_id, company_id, treatment_description,
      total_amount, down_payment, number_of_installments, start_date,
      notes, invoice_ids
    } = req.body;

    if (!customer_id || !total_amount || !number_of_installments || !start_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Invariants: downPayment-less-than-total + installmentSum.equals-remaining (CRITICAL)
    const _ta = parseFloat(total_amount || 0);
    const _dp = parseFloat(down_payment || 0);
    const _n = parseInt(number_of_installments || 0, 10);
    if (_dp < 0) return res.status(400).json({ error: 'down_payment must be >= 0' });
    if (_dp >= _ta) return res.status(400).json({ error: 'down_payment must be less than total_amount' });
    if (_n < 1) return res.status(400).json({ error: 'number_of_installments must be >= 1' });
    const installment_amount = Math.round((_ta - _dp) / _n);
    const installment_sum = installment_amount * _n;
    if (Math.abs(installment_sum - (_ta - _dp)) > 0.5 * _n) {
      return res.status(400).json({ error: 'installment sum does not equal total_amount - down_payment' });
    }

    const result = await query(
      `INSERT INTO dbo.monthlyplans 
       (customer_id, company_id, treatment_description, total_amount, down_payment, 
        installment_amount, number_of_installments, start_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
       RETURNING *`,
      [customer_id, company_id, treatment_description, total_amount, down_payment || 0,
       installment_amount, number_of_installments, start_date, notes]
    );

    const plan = result[0];

    // Create installments
    const installments = [];
    const start = new Date(start_date);
    for (let i = 0; i < number_of_installments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      
      const instResult = await query(
        `INSERT INTO dbo.planinstallments 
         (plan_id, installment_number, due_date, amount, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [plan.id, i + 1, dueDate.toISOString().split('T')[0], installment_amount, 
         i === 0 ? 'upcoming' : 'pending']
      );
      installments.push(instResult[0]);
    }

    // Link invoices if provided
    let items = [];
    if (Array.isArray(invoice_ids) && invoice_ids.length > 0) {
      const values = invoice_ids.map((_, idx) => `($1, $${idx + 2}, ${idx})`).join(', ');
      await query(
        `INSERT INTO dbo.monthlyplan_items (plan_id, invoice_id, priority) VALUES ${values}`,
        [plan.id, ...invoice_ids]
      );
      const itemsResult = await query(
        `SELECT mpi.*, so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual
         FROM dbo.monthlyplan_items mpi
         JOIN saleorders so ON so.id = mpi.invoice_id
         WHERE mpi.plan_id = $1`,
        [plan.id]
      );
      items = itemsResult.map(i => ({
        id: i.id,
        planId: i.plan_id,
        invoiceId: i.invoice_id,
        invoiceName: i.invoice_name,
        invoiceTotal: parseFloat(i.invoice_total || 0),
        invoiceResidual: parseFloat(i.invoice_residual || 0),
        priority: i.priority,
      }));
    }

    // Get customer name
    const customers = await query('SELECT name FROM dbo.partners WHERE id = $1', [customer_id]);
    
    res.status(201).json({
      ...plan,
      customer_name: customers[0]?.name || '',
      installments,
      items,
    });
  } catch (err) {
    console.error('MonthlyPlans POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/MonthlyPlans/:id - Update plan
router.put('/:id', requirePermission('payment.edit'), async (req, res) => {
  try {
    const { treatment_description, total_amount, down_payment, status, notes, invoice_ids } = req.body;

    // Invariant: downPayment-less-than-total (CRITICAL) on PUT
    if (total_amount !== undefined || down_payment !== undefined) {
      const cur = await query('SELECT total_amount, down_payment FROM dbo.monthlyplans WHERE id = $1', [req.params.id]);
      if (cur.length === 0) return res.status(404).json({ error: 'Plan not found' });
      const newT = parseFloat(total_amount !== undefined ? total_amount : cur[0].total_amount);
      const newD = parseFloat(down_payment !== undefined ? down_payment : cur[0].down_payment);
      if (newD < 0) return res.status(400).json({ error: 'down_payment must be >= 0' });
      if (newD >= newT) return res.status(400).json({ error: 'down_payment must be less than total_amount' });
    }

    const updates = [];
    const values = [];
    let paramIdx = 1;

    const fields = {
      treatment_description, total_amount, down_payment, status, notes,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }
    }

    if (updates.length === 0 && !Array.isArray(invoice_ids)) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    let result = [];
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.params.id);

      result = await query(
        `UPDATE dbo.monthlyplans SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
    } else {
      const planResult = await query('SELECT * FROM dbo.monthlyplans WHERE id = $1', [req.params.id]);
      if (planResult.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      result = planResult;
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Update linked invoices if provided
    if (Array.isArray(invoice_ids)) {
      await query('DELETE FROM dbo.monthlyplan_items WHERE plan_id = $1', [req.params.id]);
      if (invoice_ids.length > 0) {
        const values = invoice_ids.map((_, idx) => `($1, $${idx + 2}, ${idx})`).join(', ');
        await query(
          `INSERT INTO dbo.monthlyplan_items (plan_id, invoice_id, priority) VALUES ${values}`,
          [req.params.id, ...invoice_ids]
        );
      }
    }

    const itemsResult = await query(
      `SELECT mpi.*, so.name as invoice_name, so.amounttotal as invoice_total, so.residual as invoice_residual
       FROM dbo.monthlyplan_items mpi
       JOIN saleorders so ON so.id = mpi.invoice_id
       WHERE mpi.plan_id = $1`,
      [req.params.id]
    );

    res.json({
      ...result[0],
      items: itemsResult.map(i => ({
        id: i.id,
        planId: i.plan_id,
        invoiceId: i.invoice_id,
        invoiceName: i.invoice_name,
        invoiceTotal: parseFloat(i.invoice_total || 0),
        invoiceResidual: parseFloat(i.invoice_residual || 0),
        priority: i.priority,
      })),
    });
  } catch (err) {
    console.error('MonthlyPlans PUT error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function planHasPaidInstallments(client, id) {
  const r = await client.query(
    `SELECT COUNT(*)::int AS count FROM dbo.planinstallments WHERE plan_id = $1 AND status = 'paid'`,
    [id]
  );
  return (r.rows[0]?.count || 0) > 0;
}

async function doDeletePlanTxn(client, req, res) {
  await client.query('BEGIN');
  // Invariant: monthlyPlan.noDelete-if-paid-installments (CRITICAL)
  if (await planHasPaidInstallments(client, req.params.id)) {
    await client.query('ROLLBACK');
    return res.status(409).json({
      error: 'Cannot delete plan with paid installments',
      invariant: 'monthlyPlan.noDelete-if-paid-installments'
    });
  }
  const del = await client.query('DELETE FROM dbo.monthlyplans WHERE id = $1 RETURNING id', [req.params.id]);
  if (del.rowCount === 0) {
    await client.query('ROLLBACK');
    return res.status(404).json({ error: 'Plan not found' });
  }
  await client.query('COMMIT');
  return res.json({ success: true });
}

async function doDeletePlan(req, res) {
  const client = await pool.connect();
  try {
    return await doDeletePlanTxn(client, req, res);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

// DELETE /api/MonthlyPlans/:id - Delete plan (transactional)
router.delete('/:id', requirePermission('payment.edit'), async (req, res) => {
  try {
    // DELETE_BODY — transactional per invariant monthlyPlan.noDelete-if-paid-installments
    return await doDeletePlan(req, res);
  } catch (err) {
    console.error('MonthlyPlans DELETE error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/MonthlyPlans/:id/installments/:installmentId/pay - Mark installment paid
router.put('/:id/installments/:installmentId/pay', requirePermission('payment.edit'), async (req, res) => {
  try {
    const { paid_amount, paid_date } = req.body;

    // Update installment
    const instResult = await query(
      `UPDATE dbo.planinstallments 
       SET status = 'paid', 
           paid_date = COALESCE($1, CURRENT_DATE), 
           paid_amount = COALESCE($2, amount)
       WHERE id = $3 AND plan_id = $4 RETURNING *`,
      [paid_date, paid_amount, req.params.installmentId, req.params.id]
    );

    if (instResult.length === 0) {
      return res.status(404).json({ error: 'Installment not found' });
    }

    // Check if all installments are paid, update plan status
    const remaining = await query(
      `SELECT COUNT(*) as count FROM dbo.planinstallments 
       WHERE plan_id = $1 AND status != 'paid'`,
      [req.params.id]
    );

    if (parseInt(remaining[0].count) === 0) {
      await query(
        `UPDATE dbo.monthlyplans SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [req.params.id]
      );
    }

    // Advance next pending installment to 'upcoming'
    await query(
      `UPDATE dbo.planinstallments 
       SET status = 'upcoming' 
       WHERE plan_id = $1 AND status = 'pending' 
       AND installment_number = (
         SELECT MIN(installment_number) FROM dbo.planinstallments 
         WHERE plan_id = $1 AND status = 'pending'
       )`,
      [req.params.id]
    );

    res.json(instResult[0]);
  } catch (err) {
    console.error('Mark installment paid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
