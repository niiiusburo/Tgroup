'use strict';

/**
 * dentalLobGate.test.js
 * Verifies the symmetric LOB hard gate on the legacy dental routes closes the cross-LOB
 * PHI hole (cosmetic-only / CTV token reading dental data via un-prefixed routes) without
 * blocking admins or dental staff, and leaves cross-cutting routes ungated.
 * Run: cd api && JWT_SECRET=test npx jest src/middleware/__tests__/dentalLobGate.test.js
 */

const express = require('express');
const request = require('supertest');
const { dentalLobGate } = require('../dentalLobGate');

// Build a tiny app: inject a fake req.user (simulating requireAuth), mount the gate on /api,
// then a catch-all that echoes 200 so a "pass" is observable.
function buildApp(user) {
  const app = express();
  app.use('/api', (req, _res, next) => { req.user = user; next(); });
  app.use('/api', dentalLobGate);
  app.use('/api', (req, res) => res.status(200).json({ ok: true, path: req.path }));
  return app;
}

const ADMIN = { employeeId: 'a', lobScope: ['dental', 'cosmetic'], is_ctv: false };
const DENTAL_STAFF = { employeeId: 'd', lobScope: ['dental'], is_ctv: false };
const COSMETIC_ONLY = { employeeId: 'c', lobScope: ['cosmetic'], is_ctv: false };
const CTV = { employeeId: 'v', lobScope: ['dental', 'cosmetic'], is_ctv: true };

describe('dentalLobGate', () => {
  test('admin (both scopes) can read dental /api/Partners', async () => {
    const res = await request(buildApp(ADMIN)).get('/api/Partners?limit=1');
    expect(res.status).toBe(200);
  });

  test('dental staff can read dental /api/Partners', async () => {
    const res = await request(buildApp(DENTAL_STAFF)).get('/api/Partners');
    expect(res.status).toBe(200);
  });

  test('cosmetic-only staff is BLOCKED from dental /api/Partners (the PHI hole)', async () => {
    const res = await request(buildApp(COSMETIC_ONLY)).get('/api/Partners?limit=1');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('S_LOB_FORBIDDEN');
  });

  test('cosmetic-only staff is BLOCKED from dental /api/Appointments and /api/Payments', async () => {
    for (const p of ['/api/Appointments', '/api/Payments', '/api/SaleOrders', '/api/CustomerReceipts']) {
      const res = await request(buildApp(COSMETIC_ONLY)).get(p);
      expect(res.status).toBe(403);
    }
  });

  test('CTV is blocked from dental data routes', async () => {
    const res = await request(buildApp(CTV)).get('/api/Partners');
    expect(res.status).toBe(403);
  });

  test('cosmetic mirror (/api/cosmetic/*) is NOT double-gated here (passes through)', async () => {
    const res = await request(buildApp(COSMETIC_ONLY)).get('/api/cosmetic/Partners');
    expect(res.status).toBe(200);
  });

  test('cross-cutting routes are NOT gated (cosmetic-only staff passes through)', async () => {
    for (const p of ['/api/Feedback', '/api/Auth/me', '/api/SystemPreferences', '/api/face/x', '/api/Places']) {
      const res = await request(buildApp(COSMETIC_ONLY)).get(p);
      expect(res.status).toBe(200);
    }
  });
});
