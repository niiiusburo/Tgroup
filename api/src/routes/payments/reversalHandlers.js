const { pool } = require('../../db');
const { reverseAllocations } = require('./helpers');

async function deletePayment(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingPayment = await client.query(
      'SELECT id FROM payments WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (existingPayment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }

    const allocationsToReverse = await client.query(
      'SELECT invoice_id, dotkham_id, allocated_amount FROM payment_allocations WHERE payment_id = $1',
      [id],
    );

    await reverseAllocations(allocationsToReverse.rows, client);
    await client.query('DELETE FROM payment_allocations WHERE payment_id = $1', [id]);
    const result = await client.query('DELETE FROM payments WHERE id = $1 RETURNING id', [id]);

    await client.query('COMMIT');
    return res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete payment' });
  } finally {
    client.release();
  }
}

async function voidPayment(req, res) {
  const { id } = req.params;
  const { reason } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingPayment = await client.query(
      'SELECT id, status FROM payments WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (existingPayment.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (existingPayment.rows[0].status !== 'posted') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only posted payments can be voided' });
    }

    const allocationsToReverse = await client.query(
      'SELECT invoice_id, dotkham_id, allocated_amount FROM payment_allocations WHERE payment_id = $1',
      [id],
    );

    await reverseAllocations(allocationsToReverse.rows, client);
    await client.query('DELETE FROM payment_allocations WHERE payment_id = $1', [id]);
    const result = await client.query(
      `UPDATE payments SET status = 'voided', notes = COALESCE(notes, '') || ' | VOIDED: ' || $2 WHERE id = $1 AND status = 'posted' RETURNING *`,
      [id, reason || ''],
    );

    await client.query('COMMIT');
    return res.json({ success: true, payment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Void error:', err);
    return res.status(500).json({ error: 'Failed to void payment' });
  } finally {
    client.release();
  }
}

module.exports = {
  deletePayment,
  voidPayment,
};
