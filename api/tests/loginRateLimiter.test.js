const request = require('supertest');

function loadApp({ passwordMatches }) {
  jest.resetModules();
  process.env.JWT_SECRET = 'test-secret';

  jest.doMock('../src/middleware/ipAccess', () => ({
    enforceIpAccess: (_req, _res, next) => next(),
  }));

  jest.doMock('../src/middleware/auth', () => ({
    requireAuth: (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
    requireAnyPermission: () => (_req, _res, next) => next(),
  }));

  jest.doMock('../src/services/permissionService', () => ({
    resolveEffectivePermissions: jest.fn(async () => ['dashboard.view']),
  }));

  jest.doMock('bcryptjs', () => ({
    compare: jest.fn(async () => passwordMatches),
    hash: jest.fn(async () => 'new-password-hash'),
  }));

  jest.doMock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
  }));

  jest.doMock('../src/db', () => ({
    query: jest.fn(async (sql) => {
      if (sql.includes('SELECT p.id, p.name, p.email, p.password_hash')) {
        return [{
          id: 'employee-id',
          name: 'Test Employee',
          email: 'test-success@example.com',
          password_hash: 'stored-password-hash',
          companyId: 'company-id',
          companyName: 'Test Clinic',
        }];
      }
      return [];
    }),
    pool: {
      connect: jest.fn(),
      end: jest.fn(),
    },
  }));

  return require('../src/server');
}

describe('login rate limiter', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not count successful logins against the failed-login limit', async () => {
    const app = loadApp({ passwordMatches: true });

    for (let i = 0; i < 12; i += 1) {
      const res = await request(app)
        .post('/api/Auth/login')
        .send({ email: 'test-success@example.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    }
  });

  it('limits repeated failures for one email without blocking another email on the same IP', async () => {
    const app = loadApp({ passwordMatches: false });

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post('/api/Auth/login')
        .send({ email: 'blocked@clinic.vn', password: 'wrong-password' });

      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'blocked@clinic.vn', password: 'wrong-password' });
    expect(blocked.status).toBe(429);

    const otherUser = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'other@clinic.vn', password: 'wrong-password' });
    expect(otherUser.status).toBe(401);
  });
});
