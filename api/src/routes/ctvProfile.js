'use strict';

/**
 * @crossref:domain[ctv]
 * @crossref:used-in[NK3 Express API route: api/src/routes/ctvProfile]
 * @crossref:uses[product-map/domains/ctv.yaml, docs/TEST-MATRIX.md, testbright.md]
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { isCtvUser } = require('./ctvHelpers');
const {
  CtvProfileError,
  getCtvSelfProfile,
  updateCtvSelfProfile,
  changeCtvSelfPassword,
} = require('../services/ctvSelfProfile');

const router = express.Router();

function requireCtvSelf(req, res, next) {
  if (!req.user?.employeeId) {
    return res.status(401).json({ error: 'No token' });
  }
  if (!isCtvUser(req.user)) {
    return res.status(403).json({
      error: { code: 'S_CTV_ONLY', message: 'CTV access required' },
    });
  }
  next();
}

function sendProfileError(res, err) {
  if (err instanceof CtvProfileError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }
  console.error('[ctv profile] error:', err.message);
  return res.status(500).json({ error: 'Internal server error' });
}

router.get('/me', requireAuth, requireCtvSelf, async (req, res) => {
  try {
    const profile = await getCtvSelfProfile(req.user.employeeId);
    return res.json(profile);
  } catch (err) {
    return sendProfileError(res, err);
  }
});

router.patch('/me', requireAuth, requireCtvSelf, async (req, res) => {
  try {
    const profile = await updateCtvSelfProfile(req.user.employeeId, req.body || {});
    return res.json(profile);
  } catch (err) {
    return sendProfileError(res, err);
  }
});

router.post('/me/password', requireAuth, requireCtvSelf, async (req, res) => {
  try {
    const result = await changeCtvSelfPassword(req.user.employeeId, req.body || {});
    return res.json(result);
  } catch (err) {
    return sendProfileError(res, err);
  }
});

module.exports = router;
