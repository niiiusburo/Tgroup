'use strict';

const express = require('express');

const router = express.Router();

router.use('/', require('./feedback/userRoutes'));
router.use('/', require('./feedback/adminRoutes'));

module.exports = router;
