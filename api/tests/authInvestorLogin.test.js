const express = require('express');
const request = require('supertest');

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
      groupId: 'investor-group-id',
      groupName: 'investor',
      effectivePermissions: ['customers.view'],
      locations: [],
    })),
  }));
  jest.doMock('bcryptjs', () => ({
    compare,
    hash: jest.fn(),
  }));
  jest.doMock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'signed-test-token'),
  }));

  const authRouter = require('../src/routes/auth');
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use('/api/Auth', authRouter);

  return { app, query, compare };
}

describe('Auth investor login', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('falls back to active investor_accounts credentials when no active staff password exists', async () => {
    const { app, query, compare } = loadAuthApp({
      queryImpl: async (sql) => {
        if (sql.includes('WHERE p.email = $1') && sql.includes('p.active = true')) {
          return [];
        }
        if (sql.includes('FROM dbo.investor_accounts')) {
          return [{
            id: 'investor-partner-id',
            name: 'Investor Demo',
            email: 'investor.nk2@2checkin.test',
            password_hash: 'investor-hash',
            companyId: 'company-id',
            companyName: 'NK2',
            investorAccountId: 'investor-account-id',
          }];
        }
        return [];
      },
      compareImpl: async (_password, hash) => hash === 'investor-hash',
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: ' Investor.NK2@2Checkin.Test ', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('signed-test-token');
    expect(res.body.user).toMatchObject({
      id: 'investor-partner-id',
      email: 'investor.nk2@2checkin.test',
    });
    expect(compare).toHaveBeenCalledWith('secret', 'investor-hash');
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE dbo.investor_accounts'))).toBe(true);
  });

  it('does not authenticate inactive investor_accounts rows', async () => {
    const { app, query } = loadAuthApp({
      queryImpl: async (sql) => {
        if (sql.includes('WHERE p.email = $1') && sql.includes('p.active = true')) {
          return [];
        }
        if (sql.includes('FROM dbo.investor_accounts')) {
          expect(sql).toContain('ia.active = true');
          return [];
        }
        return [];
      },
      compareImpl: async () => true,
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'investor.nk2@2checkin.test', password: 'secret' });

    expect(res.status).toBe(401);
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE dbo.investor_accounts'))).toBe(false);
  });
});
