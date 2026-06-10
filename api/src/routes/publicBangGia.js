'use strict';

/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[public unauthenticated /api/public/bang-gia: mounted in api/src/server.js (before auth gate); consumed by public price-list page website/public/bang-gia]
 * @crossref:uses[api/src/services/pricingSyncWorker.js (getPricingSyncStatus), product-map/domains/settings-system.yaml]
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