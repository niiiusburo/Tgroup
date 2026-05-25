'use strict';

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const { requireLobScope } = require('../middleware/auth');

/**
 * Phase-1 gap D regression lock — the /api/cosmetic/* mount in
 * `api/src/server.js` enforces two gates:
 *
 *   1. When COSMETIC_LOB_ENABLED !== 'true', the entire family must return
 *      503 with `{error:{code:'COSMETIC_LOB_DISABLED'}}` so clients get a
 *      clear signal instead of mysterious 404s.
 *
 *   2. When the flag IS on, every request must pass `requireLobScope('cosmetic')`
 *      so users without 'cosmetic' in `partners.lob_scope` get
 *      `403 {error:{code:'S_LOB_FORBIDDEN'}}`. CTV users get the same 403.
 *
 * This test exercises the real `requireLobScope` middleware (no mock) inside a
 * minimal Express app that mirrors the gate composition used in server.js
 * (~lines 367-425). It also asserts the gate code in server.js source has not
 * been deleted — a structural regression lock.
 *
 * It intentionally does NOT load the full `api/src/server.js` because the
 * jest haste map collides across the sibling worktrees that all share the
 * `@tgroup/contracts` package name. That's a tooling limitation, not a code
 * one: the same gate logic is reproduced here verbatim.
 */

function buildAppMirror({ flag, userOverride }) {
  const app = express();
  app.use(express.json());

  // Stub global auth middleware — sets req.user from the test override.
  app.use((req, _res, next) => {
    req.user = userOverride;
    next();
  });

  const COSMETIC_FLAG = flag === true;
  if (COSMETIC_FLAG) {
    const cosmeticRouter = express.Router();
    // Same first-line gate as server.js line 379.
    cosmeticRouter.use(requireLobScope('cosmetic'));
    // If we get past the gate, return a 200 sentinel so we can tell the
    // difference between "gate let it through" and "anything else".
    cosmeticRouter.use((_req, res) => res.status(200).json({ ok: true, passed_gate: true }));
    app.use('/api/cosmetic', cosmeticRouter);
  } else {
    // Same 503 handler as server.js lines 418-425.
    app.use('/api/cosmetic', (_req, res) => {
      res.status(503).json({
        error: {
          code: 'COSMETIC_LOB_DISABLED',
          message: 'Cosmetic LOB is disabled (COSMETIC_LOB_ENABLED=false)',
        },
      });
    });
  }

  return app;
}

const cosmeticEndpoints = [
  '/api/cosmetic/Partners',
  '/api/cosmetic/Appointments',
  '/api/cosmetic/Payments',
  '/api/cosmetic/CustomerBalance/00000000-0000-0000-0000-000000000000',
  '/api/cosmetic/CommissionConfig',
  '/api/cosmetic/Ctvs',
];

describe('Cosmetic LOB mount guards (Phase-1 gap D)', () => {
  describe('when COSMETIC_LOB_ENABLED=false', () => {
    test.each(cosmeticEndpoints)(
      '%s returns 503 COSMETIC_LOB_DISABLED',
      async (endpoint) => {
        const app = buildAppMirror({
          flag: false,
          userOverride: { employeeId: 'u1', lob_scope: ['dental'], is_ctv: false },
        });
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(503);
        expect(res.body).toMatchObject({
          error: { code: 'COSMETIC_LOB_DISABLED' },
        });
      }
    );
  });

  describe('when COSMETIC_LOB_ENABLED=true but user lacks "cosmetic" lob_scope', () => {
    test.each(cosmeticEndpoints)(
      '%s returns 403 S_LOB_FORBIDDEN for dental-only user',
      async (endpoint) => {
        const app = buildAppMirror({
          flag: true,
          userOverride: { employeeId: 'u1', lob_scope: ['dental'], is_ctv: false },
        });
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({
          error: { code: 'S_LOB_FORBIDDEN', required: 'cosmetic' },
        });
        expect(res.body.error.has).toEqual(['dental']);
      }
    );

    test('returns 403 S_LOB_FORBIDDEN for a CTV-flagged user (regardless of scope)', async () => {
      const app = buildAppMirror({
        flag: true,
        userOverride: {
          employeeId: 'ctv-user',
          lob_scope: ['dental', 'cosmetic'],
          is_ctv: true,
        },
      });
      const res = await request(app).get('/api/cosmetic/Partners');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('S_LOB_FORBIDDEN');
      expect(res.body.error.is_ctv).toBe(true);
    });
  });

  describe('when COSMETIC_LOB_ENABLED=true and user has "cosmetic" lob_scope', () => {
    test('a dental+cosmetic admin clears the gate', async () => {
      const app = buildAppMirror({
        flag: true,
        userOverride: {
          employeeId: 'admin-1',
          lob_scope: ['dental', 'cosmetic'],
          is_ctv: false,
        },
      });
      const res = await request(app).get('/api/cosmetic/Partners');
      expect(res.status).toBe(200);
      expect(res.body.passed_gate).toBe(true);
    });
  });

  describe('server.js structural regression lock', () => {
    test('api/src/server.js still composes the COSMETIC_LOB_DISABLED 503 + requireLobScope("cosmetic") + cosmetic router', () => {
      const serverSrc = fs.readFileSync(
        path.resolve(__dirname, '..', 'server.js'),
        'utf8'
      );
      // Flag check
      expect(serverSrc).toMatch(/COSMETIC_LOB_ENABLED\s*===\s*'true'/);
      // 503 branch
      expect(serverSrc).toMatch(/COSMETIC_LOB_DISABLED/);
      // 403 gate
      expect(serverSrc).toMatch(/requireLobScope\(['"]cosmetic['"]\)/);
      // Cosmetic mount
      expect(serverSrc).toMatch(/app\.use\(['"]\/api\/cosmetic['"]/);
      // Commission admin routes must be reachable after LOB rewrite.
      expect(serverSrc).toMatch(/cosmeticRouter\.use\(['"]\/CommissionConfig['"]/);
      expect(serverSrc).toMatch(/cosmeticRouter\.use\(['"]\/Ctvs['"]/);
      expect(serverSrc).toMatch(/cosmeticRouter\.use\(['"]\/CustomerBalance['"]/);
    });
  });
});
