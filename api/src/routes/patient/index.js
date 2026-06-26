'use strict';
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[mounted at /api/patient by api/src/server.js]
 * @crossref:uses[patient auth, dashboard, appointments, treatments, balance, media, notifications, referrals, reviews, support, profile]
 */
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/dashboard', require('./dashboard'));
router.use('/appointments', require('./appointments'));
router.use('/treatments', require('./treatments'));
router.use('/balance', require('./balance'));
router.use('/media', require('./media'));
router.use('/notifications', require('./notifications'));
router.use('/referrals', require('./referrals'));
router.use('/reviews', require('./reviews'));
router.use('/support', require('./support'));
router.use('/chat', require('./chat'));
router.use('/profile', require('./profile'));

module.exports = router;
