/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 Express API route: api/src/routes/companies]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const express = require('express');
const { query: legacyQuery, getQuery } = require('../db');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/', requirePermission('locations.view'), async (req, res) => {
  let items = [];
  try {
    const q = getQuery(req);
    items = await q('SELECT * FROM dbo.companies');
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
