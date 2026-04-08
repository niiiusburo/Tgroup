const express = require('express');
const router = express.Router();
const { query } = require('../db');

console.log('[customerBalance_debug] loaded, query:', typeof query);

router.get('/:id', async (req, res) => {
  try {
    console.log('[customerBalance_debug] GET /:id called with id:', req.params.id);
    console.log('[customerBalance_debug] query function:', typeof query);
    
    const result = await query('SELECT * FROM public.customers WHERE id = $1 LIMIT 1', [req.params.id]);
    console.log('[customerBalance_debug] result:', typeof result, Array.isArray(result) ? 'is array' : 'not array', result?.length);
    
    if (!result || result.length === 0) {
      console.log('[customerBalance_debug] Customer not found');
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const row = result[0];
    console.log('[customerBalance_debug] row:', row);
    
    res.json({
      id: row.id,
      name: row.name,
      deposit_balance: parseFloat(row.deposit_balance || 0),
      outstanding_balance: parseFloat(row.outstanding_balance || 0),
    });
  } catch (error) {
    console.error('[customerBalance_debug] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer balance' });
  }
});

module.exports = router;
