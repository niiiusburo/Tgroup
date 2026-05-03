const express = require('express');
const { query } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', requirePermission('locations.view'), async (req, res) => {
  let items = [];
  try {
    items = await query('SELECT * FROM dbo.companies');
  } catch (err) {
    items = [];
  }

  return res.json({
    offset: 0,
    limit: 20,
    totalItems: items.length,
    items,
    aggregates: null,
  });
});

module.exports = router;
