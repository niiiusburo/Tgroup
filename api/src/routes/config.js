/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[mounted at /api/IrConfigParameters by api/src/server.js (legacy Odoo config stub, always returns null)]
 * @crossref:uses[express only — no db/services; product-map/domains/settings-system.yaml]
 */
const express = require('express');

const router = express.Router();

router.get('/GetParam', (req, res) => {
  return res.json({ value: null });
});

router.post('/GetParam', (req, res) => {
  return res.json({ value: null });
});

module.exports = router;
