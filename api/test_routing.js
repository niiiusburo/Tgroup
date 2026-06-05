const express = require('express');

// Simulate the two routers
const router1 = express.Router();
const router2 = express.Router();

// Router 1 (ctvProfileRoutes) - mounted first
router1.get('/me', (req, res) => {
  res.json({ source: 'ctvProfileRoutes', message: 'DB-backed profile' });
});

// Router 2 (ctvRoutes) - mounted second
router2.get('/me', (req, res) => {
  res.json({ source: 'ctvRoutes', message: 'inline static response' });
});

const app = express();
app.use('/api/ctv', router1);
app.use('/api/ctv', router2);

// Test the route
const request = require('supertest');
(async () => {
  const res = await request(app).get('/api/ctv/me');
  console.log('Response:', res.body);
  console.log('Status:', res.status);
  process.exit(0);
})();
