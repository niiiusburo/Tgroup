'use strict';

/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[NK3 Express API route: api/src/routes/feedback]
 * @crossref:uses[product-map/domains/feedback-cms.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const express = require('express');

const router = express.Router();

router.use('/', require('./feedback/userRoutes'));
router.use('/', require('./feedback/adminRoutes'));

module.exports = router;
