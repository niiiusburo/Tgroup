'use strict';

/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[mounted at /api/Feedback by api/src/server.js; frontend client website/src/lib/api/feedback.ts]
 * @crossref:uses[api/src/routes/feedback/userRoutes.js, api/src/routes/feedback/adminRoutes.js, product-map/domains/feedback-cms.yaml]
 */
const express = require('express');

const router = express.Router();

router.use('/', require('./feedback/userRoutes'));
router.use('/', require('./feedback/adminRoutes'));

module.exports = router;
