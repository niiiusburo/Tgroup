'use strict';

/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 Express API route: api/src/routes/publicBangGia]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
/**
 * @crossref:domain[ctv]
 * @crossref:route[publicBangGia]
 * @crossref:endpoint[GET /api/public/bang-gia/status]
 * @crossref:used-in[api/src/server.js]
 */

const express = require('express');
const { getPricingSyncStatus } = require('../services/pricingSyncWorker');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json(getPricingSyncStatus());
});

module.exports = router;