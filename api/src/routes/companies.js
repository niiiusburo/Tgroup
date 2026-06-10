/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[mounted at /api/Companies (+/api/cosmetic mirror) by api/src/server.js; frontend client website/src/lib/api/companies.ts]
 * @crossref:uses[api/src/db.js (getQuery, dbo.companies), api/src/middleware/auth.js (requirePermission 'locations.view'), product-map/domains/settings-system.yaml]
 */
const express = require('express');
const { getQuery } = require('../db');
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
