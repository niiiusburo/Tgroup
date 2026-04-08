const express = require('express');

const router = express.Router();

router.get('/GetParam', (req, res) => {
  return res.json({ value: null });
});

router.post('/GetParam', (req, res) => {
  return res.json({ value: null });
});

module.exports = router;
