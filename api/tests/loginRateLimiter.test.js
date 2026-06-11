const request = require('supertest');

// Each test re-requires the full server (jest.resetModules) — under parallel
// suite load this regularly blows the 5s default and reads as a flake.
jest.setTimeout(20000);

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

const cosmeticStaffPermissions = {
  groupId: 'cosmetic-staff-group',
  groupName: 'Dentist',
  effectivePermissions: ['cosmetic.access'],
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
  loginLob = 'dental',
  cosmeticEnabled = false,
  isCtv = false,
}) {
  jest.resetModules();
  process.env.JWT_SECRET = 'test-secret';
  process.env.COSMETIC_LOB_ENABLED = cosmeticEnabled ? 'true' : 'false';

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

  const employeeRow = {
    id: 'employee-id',
    name: 'Test Employee',
    email: 't@clinic.vn',
    password_hash: 'stored-password-hash',
    companyId: 'company-id',
    companyName: 'Test Clinic',
    lob_scope: lobScope,
    lobScope,
    is_ctv: isCtv,
    isCtv,
  };

  const makeQuery = (lob) => jest.fn(async (sql) => {
    if (sql.includes('SELECT p.id, p.name, p.email, p.password_hash')) {
      return loginLob === lob ? [employeeRow] : [];
    }
    if (sql.includes('SELECT p.id, p.name, p.email, p.companyid')) {
      return loginLob === lob ? [employeeRow] : [];
    }
    if (sql.includes('lob_scope') || sql.includes('lobScope')) {
      return [{ lob_scope: lobScope, lobScope, is_ctv: isCtv, isCtv }];
    }
    return [];
  });

  const dentalQuery = makeQuery('dental');
  const cosmeticQuery = makeQuery('cosmetic');

  jest.doMock('../src/db', () => ({
    query: dentalQuery,
    getQuery: jest.fn((lob) => (lob === 'cosmetic' ? cosmeticQuery : dentalQuery)),
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
    delete process.env.COSMETIC_LOB_ENABLED;
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

  it('returns lob_scope and is_ctv on /api/Auth/me (v2 auth support)', async () => {
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
  });

  it('does not expose multi-LOB selection scope to non-admin staff', async () => {
    const app = loadApp({
      passwordMatches: true,
      permissions: staffPermissions,
      lobScope: ['dental'],
    });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.lob_scope).toEqual(['dental']);

    const meRes = await request(app)
      .get('/api/Auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.lob_scope).toEqual(['dental']);
  });

  it('defaults empty lob_scope to authLob on login and /me for cosmetic-only staff', async () => {
    const app = loadApp({
      passwordMatches: true,
      permissions: cosmeticStaffPermissions,
      lobScope: [],
      loginLob: 'cosmetic',
      cosmeticEnabled: true,
    });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: '0362950725@gmail.com', password: '123123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.lob_scope).toEqual(['cosmetic']);

    const meRes = await request(app)
      .get('/api/Auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.lob_scope).toEqual(['cosmetic']);
  });

  it('falls back to the cosmetic auth database for cosmetic-only TMV employees', async () => {
    const app = loadApp({
      passwordMatches: true,
      permissions: cosmeticStaffPermissions,
      lobScope: ['cosmetic'],
      loginLob: 'cosmetic',
      cosmeticEnabled: true,
    });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: '0362950725@gmail.com', password: '123123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.lob_scope).toEqual(['cosmetic']);
    expect(loginRes.body.user.is_ctv).toBe(false);

    const meRes = await request(app)
      .get('/api/Auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.lob_scope).toEqual(['cosmetic']);
  });

  it('issues a 30-day token when rememberMe is true', async () => {
    const jwt = require('jsonwebtoken');
    const app = loadApp({ passwordMatches: true });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123', rememberMe: true });

    expect(loginRes.status).toBe(200);
    const decoded = jwt.decode(loginRes.body.token);
    expect(decoded.remember).toBe(true);
    expect(decoded.exp - decoded.iat).toBeGreaterThan(29 * 24 * 60 * 60);
    expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(30 * 24 * 60 * 60);
  });

  it('keeps the default 24-hour token when rememberMe is omitted', async () => {
    const jwt = require('jsonwebtoken');
    const app = loadApp({ passwordMatches: true });

    const loginRes = await request(app)
      .post('/api/Auth/login')
      .send({ email: 't@clinic.vn', password: '123123' });

    expect(loginRes.status).toBe(200);
    const decoded = jwt.decode(loginRes.body.token);
    expect(decoded.remember).toBe(false);
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
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
