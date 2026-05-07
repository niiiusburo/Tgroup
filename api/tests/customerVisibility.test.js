process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
  requireAnyPermission: () => (req, _res, next) => {
    // Simulate resolved permissions attached by middleware
    req.userPermissions = req.headers['x-mock-permissions']
      ? JSON.parse(req.headers['x-mock-permissions'])
      : { effectivePermissions: [], locations: [] };
    next();
  },
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

function mockPermissions(effectivePermissions, locations = []) {
  return JSON.stringify({ effectivePermissions, locations });
}

function setupListQueries({ items = [], total = 0, active = 0, inactive = 0 } = {}) {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) {
      return [{ mode: 'disabled' }];
    }
    if (sql.includes('ip_access_entries')) {
      return [];
    }
    if (sql.includes('COUNT(*)::int AS total')) {
      return [{ total, active, inactive }];
    }
    if (sql.includes('FROM partners p LEFT JOIN')) {
      return items;
    }
    throw new Error(`Unexpected query: ${sql}`);
  });
}

function setupDetailQueries(partner = null) {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) {
      return [{ mode: 'disabled' }];
    }
    if (sql.includes('ip_access_entries')) {
      return [];
    }
    if (sql.includes('FROM partners p') && sql.includes('WHERE p.id =')) {
      return partner ? [partner] : [];
    }
    throw new Error(`Unexpected query: ${sql}`);
  });
}

describe('GET /api/Partners (customer visibility)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows full list for customers.view_all within allowed locations', async () => {
    setupListQueries({
      items: [{ id: 'c1', name: 'Alice', companyid: 'loc-a' }],
      total: 1,
      active: 1,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalItems).toBe(1);

    // Should scope to allowed locations automatically
    const listQuery = query.mock.calls.find(([sql]) => sql.includes('FROM partners p LEFT JOIN'));
    expect(listQuery[0]).toContain("p.companyid = ANY($1)");
    expect(listQuery[1]).toEqual(expect.arrayContaining([['loc-a'], 20, 0]));
  });

  it('allows full list for customers.view (backward compat)', async () => {
    setupListQueries({
      items: [{ id: 'c1', name: 'Alice', companyid: 'loc-a' }],
      total: 1,
      active: 1,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .set('x-mock-permissions', mockPermissions(['customers.view'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('allows full list for wildcard admin without location restrictions', async () => {
    setupListQueries({
      items: [
        { id: 'c1', name: 'Alice', companyid: 'loc-a' },
        { id: 'c2', name: 'Bob', companyid: 'loc-b' },
      ],
      total: 2,
      active: 2,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .set('x-mock-permissions', mockPermissions(['*'], []));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);

    // Admin should NOT have location filter
    const listQuery = query.mock.calls.find(([sql]) => sql.includes('FROM partners p LEFT JOIN'));
    expect(listQuery[0]).not.toContain('p.companyid = ANY');
  });

  it('returns 403 for search-only user without search param', async () => {
    const res = await request(app)
      .get('/api/Partners')
      .set('x-mock-permissions', mockPermissions(['customers.search'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Search required: enter at least 2 characters to find customers');
    expect(res.body.totalItems).toBe(0);
  });

  it('returns 403 for search-only user with search param too short', async () => {
    const res = await request(app)
      .get('/api/Partners')
      .query({ search: 'A' })
      .set('x-mock-permissions', mockPermissions(['customers.search'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Search required: enter at least 2 characters to find customers');
  });

  it('allows search for search-only user with valid search param', async () => {
    setupListQueries({
      items: [{ id: 'c1', name: 'Alice', companyid: 'loc-a' }],
      total: 1,
      active: 1,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .query({ search: 'Ali' })
      .set('x-mock-permissions', mockPermissions(['customers.search'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totalItems).toBe(1);

    // Should apply search filter AND location scope
    const listQuery = query.mock.calls.find(([sql]) => sql.includes('FROM partners p LEFT JOIN'));
    expect(listQuery[0]).toContain('p.name ILIKE');
    expect(listQuery[0]).toContain('p.companyid = ANY');
  });

  it('returns 403 when requesting a companyId outside allowed locations', async () => {
    const res = await request(app)
      .get('/api/Partners')
      .query({ companyId: 'loc-b' })
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Location not allowed');
  });

  it('allows querying a specific allowed companyId', async () => {
    setupListQueries({
      items: [{ id: 'c1', name: 'Alice', companyid: 'loc-a' }],
      total: 1,
      active: 1,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .query({ companyId: 'loc-a' })
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    // applyPartnerListFilters adds exact company filter (paramIdx starts at 1 since no location scope added)
    const listQuery = query.mock.calls.find(([sql]) => sql.includes('FROM partners p LEFT JOIN'));
    expect(listQuery[0]).toContain('p.companyid = $1');
  });

  it('returns empty list for user with no assigned locations', async () => {
    setupListQueries({ items: [], total: 0, active: 0, inactive: 0 });

    const res = await request(app)
      .get('/api/Partners')
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], []));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);

    // Should have FALSE condition for no locations
    const listQuery = query.mock.calls.find(([sql]) => sql.includes('FROM partners p LEFT JOIN'));
    expect(listQuery[0]).toContain('FALSE');
  });

  it('respects search parameter when user has both view_all and search', async () => {
    setupListQueries({
      items: [{ id: 'c1', name: 'Alice', companyid: 'loc-a' }],
      total: 1,
      active: 1,
      inactive: 0,
    });

    const res = await request(app)
      .get('/api/Partners')
      .query({ search: 'Ali' })
      .set('x-mock-permissions', mockPermissions(['customers.view_all', 'customers.search'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    // view_all takes precedence: no minimum search length enforced
  });
});

describe('GET /api/Partners/:id (customer visibility)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows viewing a customer in an allowed location', async () => {
    setupDetailQueries({
      id: 'c1',
      name: 'Alice',
      companyid: 'loc-a',
    });

    const res = await request(app)
      .get('/api/Partners/c1')
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice');
  });

  it('returns 403 for customer outside allowed locations', async () => {
    setupDetailQueries({
      id: 'c1',
      name: 'Alice',
      companyid: 'loc-b',
    });

    const res = await request(app)
      .get('/api/Partners/c1')
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Partner not accessible from your location');
  });

  it('allows admin to view any customer regardless of location', async () => {
    setupDetailQueries({
      id: 'c1',
      name: 'Alice',
      companyid: 'loc-b',
    });

    const res = await request(app)
      .get('/api/Partners/c1')
      .set('x-mock-permissions', mockPermissions(['*'], []));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice');
  });

  it('returns 404 for non-existent customer', async () => {
    setupDetailQueries(null);

    const res = await request(app)
      .get('/api/Partners/missing')
      .set('x-mock-permissions', mockPermissions(['customers.view_all'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Partner not found');
  });

  it('allows search-permission user to view customer in their location', async () => {
    setupDetailQueries({
      id: 'c1',
      name: 'Alice',
      companyid: 'loc-a',
    });

    const res = await request(app)
      .get('/api/Partners/c1')
      .set('x-mock-permissions', mockPermissions(['customers.search'], [{ id: 'loc-a', name: 'Clinic A' }]));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice');
  });
});
