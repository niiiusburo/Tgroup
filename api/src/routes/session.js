/**
 * @crossref:domain[auth]
 * @crossref:used-in[LEGACY: /Web/Session mount is commented out in api/src/server.js (parity stub serving truth-session.json); no frontend callers]
 * @crossref:uses[api/src/truth-session.json fixture, product-map/domains/auth.yaml]
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load the exact session response from the live site
const truthPath = path.join(__dirname, '../truth-session.json');
let truthSession = null;
try {
  truthSession = JSON.parse(fs.readFileSync(truthPath, 'utf-8'));
} catch (e) {
  console.error('Could not load truth session:', e.message);
}

router.get('/GetSessionInfo', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ') || !truthSession) {
    return res.json(null);
  }

  // Return the exact live site response — byte-for-byte identical
  return res.json(truthSession);
});

module.exports = router;
