const express = require('express');
const request = require('supertest');

// Mirrors the harness in authInvestorLogin.test.js
function loadAuthApp({ queryImpl, compareImpl }) {
  jest.resetModules();
  process.env.JWT_SECRET = 'test-secret';

  const query = jest.fn(queryImpl);
  const compare = jest.fn(compareImpl);

  jest.doMock('../src/db', () => ({ query }));
  jest.doMock('../src/middleware/auth', () => ({
    requireAuth: (_req, _res, next) => next(),
  }));
  jest.doMock('../src/services/permissionService', () => ({
    resolveEffectivePermissions: jest.fn(async () => ({
      groupId: 'g',
      groupName: 'x',
      effectivePermissions: [],
      locations: [],
    })),
  }));
  jest.doMock('bcryptjs', () => ({ compare, hash: jest.fn() }));
  jest.doMock('jsonwebtoken', () => ({ sign: jest.fn(() => 'signed-test-token') }));

  const authRouter = require('../src/routes/auth');
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use('/api/Auth', authRouter);

  return { app, query, compare };
}

const isStaffQuery = (sql) =>
  sql.includes('WHERE p.email = $1') && sql.includes('p.active = true') && !sql.includes('investor_accounts');

describe('Auth shared-email staff login (iterate-and-verify)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const sharedRows = [
    { id: 'person-A', name: 'Person A', email: 'shared@clinic.vn', password_hash: 'hash-A', companyId: 'c1', companyName: 'NK' },
    { id: 'person-B', name: 'Person B', email: 'shared@clinic.vn', password_hash: 'hash-B', companyId: 'c2', companyName: 'NK2' },
  ];
  // password pw-X only matches hash-X
  const distinctCompare = async (password, hash) =>
    (password === 'pw-A' && hash === 'hash-A') || (password === 'pw-B' && hash === 'hash-B');

  it('logs the SECOND-listed user into THEIR OWN account (the core bug: old code only checked rows[0])', async () => {
    const { app } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? sharedRows : []),
      compareImpl: distinctCompare,
    });
    const res = await request(app).post('/api/Auth/login').send({ email: 'shared@clinic.vn', password: 'pw-B' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('person-B');
    expect(res.body.user.companyName).toBe('NK2');
  });

  it('logs the first-listed user in correctly too (both directions work)', async () => {
    const { app } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? sharedRows : []),
      compareImpl: distinctCompare,
    });
    const res = await request(app).post('/api/Auth/login').send({ email: 'shared@clinic.vn', password: 'pw-A' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('person-A');
  });

  it('marks last_login for the MATCHED account, not the first row', async () => {
    const { app, query } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? sharedRows : []),
      compareImpl: distinctCompare,
    });
    await request(app).post('/api/Auth/login').send({ email: 'shared@clinic.vn', password: 'pw-B' });
    const updateCall = query.mock.calls.find(([sql]) => sql.includes('UPDATE partners SET last_login'));
    expect(updateCall).toBeDefined();
    expect(updateCall[1]).toEqual(['person-B']);
  });

  it('rejects with 401 when 2+ active accounts share the same email AND the same password (ambiguous → fail closed)', async () => {
    const dupRows = [
      { id: 'A', name: 'A', email: 'dup@clinic.vn', password_hash: 'same-hash', companyId: null, companyName: null },
      { id: 'B', name: 'B', email: 'dup@clinic.vn', password_hash: 'same-hash', companyId: null, companyName: null },
    ];
    const { app } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? dupRows : []),
      compareImpl: async (_pw, hash) => hash === 'same-hash',
    });
    const res = await request(app).post('/api/Auth/login').send({ email: 'dup@clinic.vn', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('single active account still logs in normally', async () => {
    const rows = [{ id: 'solo', name: 'Solo', email: 'solo@clinic.vn', password_hash: 'h', companyId: 'c', companyName: 'NK' }];
    const { app } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? rows : []),
      compareImpl: async (_pw, h) => h === 'h',
    });
    const res = await request(app).post('/api/Auth/login').send({ email: 'solo@clinic.vn', password: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('solo');
  });

  it('wrong password against a shared email returns 401', async () => {
    const { app } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? sharedRows : []),
      compareImpl: async () => false,
    });
    const res = await request(app).post('/api/Auth/login').send({ email: 'shared@clinic.vn', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('staff match short-circuits the investor fallback (does not query investor_accounts)', async () => {
    const rows = [{ id: 'solo', name: 'Solo', email: 'solo@clinic.vn', password_hash: 'h', companyId: 'c', companyName: 'NK' }];
    const { app, query } = loadAuthApp({
      queryImpl: async (sql) => (isStaffQuery(sql) ? rows : []),
      compareImpl: async (_pw, h) => h === 'h',
    });
    await request(app).post('/api/Auth/login').send({ email: 'solo@clinic.vn', password: 'x' });
    expect(query.mock.calls.some(([sql]) => sql.includes('FROM dbo.investor_accounts'))).toBe(false);
  });
});
