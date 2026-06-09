/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[NK3 Express API route: api/src/routes/account]
 * @crossref:uses[product-map/domains/settings-system.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
// DEPRECATED: Use /api/Auth/login instead. This endpoint did not verify passwords.
const express = require('express');

const router = express.Router();

router.post('/Login', (req, res) => {
  return res.status(410).json({
    error: 'This login endpoint is deprecated. Use /api/Auth/login instead.',
  });
});

router.post('/Logout', (req, res) => {
  return res.json({ succeeded: true });
});

module.exports = router;
