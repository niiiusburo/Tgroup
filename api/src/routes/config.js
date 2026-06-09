/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 Express API route: api/src/routes/config]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
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
