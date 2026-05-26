const request = require('supertest');
const jwt = require('jsonwebtoken');

const ADMIN_GROUP_ID = '11111111-0000-0000-0000-000000000001';

const adminPermissions = {
  groupId: ADMIN_GROUP_ID,
  groupName: 'Admin',
  effectivePermissions: ['cosmetic.access', 'dental.access', 'lob.crossview'],
  locations: [],
};

const staffPermissions = {
  groupId: 'staff-group',
  groupName: 'Doctor',
  effectivePermissions: ['dental.access'],
  locations: [],
};

function isAdminPermissionState(permissionState) {
  const groupId = String(permissionState?.groupId || '').trim().toLowerCase();
  const groupName = String(permissionState?.groupName || '').trim().toLowerCase();
  return groupId === ADMIN_GROUP_ID || groupName === 'admin' || groupName === 'super admin' || groupName === 'system administrator';
}

function loadApp({
  passwordMatches,
  permissions = adminPermissions,
  lobScope = ['dental', 'cosmetic'],
  authRowsByLob = null,
}) {
  jest.resetModules();
  process.env.JWT_SECRET = 'test-secret';

  jest.doMock('../src/middleware/ipAccess', () => ({
    enforceIpAccess: (_req, _res, next) => next(),
  }));

  jest.doMock('../src/middleware/auth', () => ({
    requireAuth: (req, _res, next) => {
      req.user = { employeeId: 'employee-id', lob_scope: lobScope, is_ctv: false };
      next();
    },
    requirePermission: () => (_req, _res, next) => next(),
    requireLobScope: () => (_req, _res, next) => next(),
  }));

  jest.doMock('../src/services/permissionService', () => ({
    resolveEffectivePermissions: jest.fn(async () => permissions),
    isAdminPermissionState: jest.fn(isAdminPermissionState),
  }));

  jest.doMock('bcryptjs', () => ({
    compare: jest.fn(async () => passwordMatches),
    hash: jest.fn(async () => 'new-password-hash'),
  }));

  jest.doMock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
  }));

  const defaultEmployeeRow = {
    id: 'employee-id',
    name: 'Test Employee',
    email: 't@clinic.vn',
    password_hash: 'stored-password-hash',
    companyId: 'company-id',
    companyName: 'Test Clinic',
    lobScope,
    isCtv: false,
  };

  const queryByLob = jest.fn(async (lob, sql) => {
      if (sql.includes('SELECT p.id, p.name, p.email, p.password_hash')) {
        return authRowsByLob ? (authRowsByLob[lob] || []) : [defaultEmployeeRow];
      }
      if (sql.includes('UPDATE partners SET last_login')) {
        return [];
      }
      if (sql.includes('SELECT password_hash FROM partners')) {
        return [{ password_hash: 'stored-password-hash' }];
      }
      if (sql.includes('lob_scope') || sql.includes('lobScope')) {
        // support /me/lob-scope and me refresh
        const row = authRowsByLob?.[lob]?.[0] || defaultEmployeeRow;
        return [{ lobScope: row.lobScope, isCtv: row.isCtv }];
      }
      return [];
  });

  const dbQuery = jest.fn((sql, params) => queryByLob('dental', sql, params));
  const getQuery = jest.fn((lob = 'dental') => (sql, params) => queryByLob(lob, sql, params));

  jest.doMock('../src/db', () => ({
    query: dbQuery,
    getQuery,
    runWithLob: jest.fn((_lob, fn) => fn()),
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
        .send({ email: 't@clinic.vn', password: '123123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      // v2 LOB/CTV fields returned (TDD coverage for auth layer)
      expect(res.body.user.lob_scope).toEqual(['dental', 'cosmetic']);
      expect(res.body.user.is_ctv).toBe(false);
      expect(res.body.redirectTo).toBeNull();
    }
  });

  it('returns lob_scope and is_ctv on /api/me and /api/me/lob-scope (v2 auth support)', async () => {
    const app = loadApp({ passwordMatches: true });

    // first login to get token (mocked)
    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123' });
    const token = loginRes.body.token;
    expect(token).toBeTruthy();

    // /api/Auth/me should now carry lob fields
    const meRes = await request(app)
      .get('/api/Auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.lob_scope).toEqual(['dental', 'cosmetic']);
    expect(meRes.body.user.is_ctv).toBe(false);

    // dedicated /api/me/lob-scope endpoint
    const lobRes = await request(app)
      .get('/api/me/lob-scope')
      .set('Authorization', `Bearer ${token}`);
    expect(lobRes.status).toBe(200);
    expect(lobRes.body.lob_scope).toEqual(['dental', 'cosmetic']);
    expect(lobRes.body.is_ctv).toBe(false);
    expect(lobRes.body.available).toContain('cosmetic');
  });

  it('does not expose multi-LOB selection scope to non-admin staff', async () => {
    const app = loadApp({ passwordMatches: true, permissions: staffPermissions });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.lob_scope).toEqual(['dental']);

    const token = loginRes.body.token;
    const lobRes = await request(app)
      .get('/api/me/lob-scope')
      .set('Authorization', `Bearer ${token}`);
    expect(lobRes.status).toBe(200);
    expect(lobRes.body.lob_scope).toEqual(['dental']);
    expect(lobRes.body.available).toEqual(['dental']);
  });

  it('authenticates a cosmetic-only employee from the cosmetic auth source', async () => {
    const app = loadApp({
      passwordMatches: true,
      permissions: {
        groupId: 'cosmetic-staff',
        groupName: 'Cosmetic Staff',
        effectivePermissions: ['cosmetic.access'],
        locations: [],
      },
      authRowsByLob: {
        dental: [],
        cosmetic: [{
          id: 'cosmetic-employee-id',
          name: 'Cosmetic Employee',
          email: 'cosmetic@clinic.vn',
          password_hash: 'stored-password-hash',
          companyId: 'cosmetic-company-id',
          companyName: 'Cosmetic Branch',
          lobScope: null,
          isCtv: false,
        }],
      },
    });

    const res = await request(app)
      .post('/api/Auth/login')
      .send({ email: 'cosmetic@clinic.vn', password: '123123' });

    expect(res.status).toBe(200);
    expect(res.body.user.lob_scope).toEqual(['cosmetic']);
    expect(res.body.user.auth_lob).toBe('cosmetic');
    expect(res.body.user.lob_context).toBe('cosmetic');

    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded.auth_lob).toBe('cosmetic');
    expect(decoded.lob_scope).toEqual(['cosmetic']);
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
