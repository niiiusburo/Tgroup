/**
 * @crossref:domain[settings-system]
 * @crossref:used-in[deprecated legacy login stub (410); mounted disabled in api/src/server.js (`/api/Account` commented out)]
 * @crossref:uses[express only — no db/services; superseded by api/src/routes/auth.js; product-map/domains/settings-system.yaml]
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
