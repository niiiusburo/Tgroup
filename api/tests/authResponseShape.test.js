'use strict';

const request = require('supertest');

function loadApp({ row }) {
  jest.resetModules();
  process.env.JWT_SECRET = 'test-secret';

  jest.doMock('../src/middleware/ipAccess', () => ({
    enforceIpAccess: (_req, _res, next) => next(),
  }));

  jest.doMock('../src/middleware/auth', () => ({
    requireAuth: (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
  }));

  jest.doMock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
  }));

  jest.doMock('../src/services/permissionService', () => ({
    resolveEffectivePermissions: jest.fn(async () => ['dashboard.view']),
    isAdminPermissionState: jest.fn(() => false),
  }));

  jest.doMock('bcryptjs', () => ({
    compare: jest.fn(async () => true),
    hash: jest.fn(async () => 'new-hash'),
  }));

  jest.doMock('../src/db', () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT p.id, p.name, p.email, p.password_hash')) {
        return [row];
      }
      if (sql.includes('UPDATE partners SET last_login')) {
        return [];
      }
      return [];
    });
    return {
      query,
      // LOB-aware login path: auth.js resolves the login partner via getQuery(lob)
      // and wraps permission resolution in runWithLob. Both must be present or the
      // login handler throws "getQuery is not a function" (→ 500).
      getQuery: jest.fn(() => query),
      runWithLob: jest.fn((_lob, fn) => fn()),
      pool: { connect: jest.fn(), end: jest.fn() },
    };
  });

  return require('../src/server');
}

describe('POST /api/Auth/login response shape', () => {
  it('includes is_ctv=true and lob_scope when partner row is a CTV', async () => {
    const app = loadApp({
      row: {
        id: 'partner-ctv',
        name: 'Test CTV',
        email: 'ctv@clinic.vn',
        password_hash: 'stored',
        companyId: 'company-1',
        companyName: 'Test Clinic',
        is_ctv: true,
        lob_scope: null,
      },
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'ctv@clinic.vn', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.user.is_ctv).toBe(true);
    expect(res.body.user.lob_scope).toEqual([]);
  });

  it('returns is_ctv=false and lob_scope for regular admin partners', async () => {
    const app = loadApp({
      row: {
        id: 'partner-admin',
        name: 'Admin',
        email: 't@clinic.vn',
        password_hash: 'stored',
        companyId: 'company-1',
        companyName: 'Test Clinic',
        is_ctv: false,
        lob_scope: ['dental'],
      },
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123' });

    expect(res.status).toBe(200);
    expect(res.body.user.is_ctv).toBe(false);
    expect(res.body.user.lob_scope).toEqual(['dental']);
  });

  it('coerces null is_ctv to false in the response', async () => {
    const app = loadApp({
      row: {
        id: 'partner-legacy',
        name: 'Legacy',
        email: 'legacy@clinic.vn',
        password_hash: 'stored',
        companyId: 'company-1',
        companyName: 'Test Clinic',
        is_ctv: null,
        lob_scope: ['dental'],
      },
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'legacy@clinic.vn', password: '123123' });

    expect(res.status).toBe(200);
    expect(res.body.user.is_ctv).toBe(false);
  });
});
