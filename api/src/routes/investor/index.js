'use strict';
/**
 * @crossref:domain[investor-portal]
 * @crossref:used-in[mounted at /api/investor by api/src/server.js]
 * @crossref:uses[investor auth, clients routes]
 */
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/clients', require('./clients'));

module.exports = router;