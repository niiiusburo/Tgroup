jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const employeesOverviewRouter = require('../employeesOverview');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', employeesOverviewRouter);
  return app;
}

describe('reports employees overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid companyId parameter', async () => {
    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({ companyId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
  });

  it('allows unrestricted Super Admin to view all employees across all locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ doctors: 5, assistants: 3, receptionists: 2, total: 10 }])
      .mockResolvedValueOnce([
        { location: 'Location A', cnt: 6, doctors: 3, assistants: 2 },
        { location: 'Location B', cnt: 4, doctors: 2, assistants: 1 },
      ])
      .mockResolvedValueOnce([
        { id: '1', name: 'Dr. Smith', isdoctor: true, isassistant: false, isreceptionist: false, jobtitle: 'Doctor', location: 'Location A', startworkdate: '2020-01-01', active: true },
        { id: '2', name: 'Ms. Johnson', isdoctor: false, isassistant: true, isreceptionist: false, jobtitle: 'Assistant', location: 'Location B', startworkdate: '2021-06-15', active: true },
      ]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles).toEqual({
      doctors: 5,
      assistants: 3,
      receptionists: 2,
      total: 10,
    });
    expect(res.body.data.byLocation).toHaveLength(2);
    expect(res.body.data.employees).toHaveLength(2);

    // Verify all three queries were called without location filters
    expect(query).toHaveBeenCalledTimes(3);
    const [rolesSql] = query.mock.calls[0];
    const [byLocationSql] = query.mock.calls[1];
    const [listSql] = query.mock.calls[2];

    expect(rolesSql).not.toContain('ANY(');
    expect(byLocationSql).not.toContain('WHERE');
    expect(listSql).not.toContain('ANY(');
  });

  it('allows Admin group to view all employees without location filtering', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ doctors: 2, assistants: 1, receptionists: 1, total: 4 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(3);
    const [rolesSql, rolesParams] = query.mock.calls[0];
    const [byLocationSql, byLocationParams] = query.mock.calls[1];

    // Admin: no ANY filter, no params
    expect(rolesSql).not.toContain('ANY(');
    expect(rolesParams).toEqual([]);
    expect(byLocationSql).not.toContain('WHERE');
    expect(byLocationParams).toEqual([]);
  });

  it('restricts location-scoped staff to their allowed locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    query
      .mockResolvedValueOnce([{ doctors: 3, assistants: 1, receptionists: 1, total: 5 }])
      .mockResolvedValueOnce([
        { location: 'Location A', cnt: 5, doctors: 3, assistants: 1 },
      ])
      .mockResolvedValueOnce([
        { id: '1', name: 'Dr. Smith', isdoctor: true, isassistant: false, isreceptionist: false, jobtitle: 'Doctor', location: 'Location A', startworkdate: '2020-01-01', active: true },
      ]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.byLocation).toHaveLength(1);
    expect(res.body.data.byLocation[0].location).toBe('Location A');

    // Verify location filter in all queries
    expect(query).toHaveBeenCalledTimes(3);
    const [rolesSql, rolesParams] = query.mock.calls[0];
    const [byLocationSql, byLocationParams] = query.mock.calls[1];
    const [listSql, listParams] = query.mock.calls[2];

    expect(rolesSql).toContain('companyid = ANY($1::uuid[])');
    expect(rolesParams).toEqual([[LOC_A]]);

    expect(byLocationSql).toContain('WHERE c.id = ANY($1::uuid[])');
    expect(byLocationParams).toEqual([[LOC_A]]);

    expect(listSql).toContain('companyid = ANY($1::uuid[])');
    expect(listParams).toEqual([[LOC_A]]);
  });

  it('restricts location-scoped staff to explicitly requested location within their scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [
        { id: LOC_A, name: 'Location A' },
        { id: LOC_B, name: 'Location B' },
      ],
    });

    query
      .mockResolvedValueOnce([{ doctors: 2, assistants: 1, receptionists: 0, total: 3 }])
      .mockResolvedValueOnce([
        { location: 'Location B', cnt: 3, doctors: 2, assistants: 1 },
      ])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({ companyId: LOC_B });

    expect(res.status).toBe(200);

    // Verify the requested companyId is used, not expanded to all allowed locations
    const [rolesSql, rolesParams] = query.mock.calls[0];
    expect(rolesSql).toContain('companyid = ANY($1::uuid[])');
    expect(rolesParams).toEqual([[LOC_B]]);
  });

  it('rejects location-scoped staff requesting a location outside their scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({ companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows investor group with wildcard permission to view all employees', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['*'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ doctors: 1, assistants: 0, receptionists: 0, total: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);

    // Investor with wildcard should see all data
    const [rolesSql, rolesParams] = query.mock.calls[0];
    expect(rolesSql).not.toContain('ANY(');
    expect(rolesParams).toEqual([]);
  });

  it('returns empty data when no employees exist for the scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual({
      doctors: 0,
      assistants: 0,
      receptionists: 0,
      total: 0,
    });
    expect(res.body.data.byLocation).toEqual([]);
    expect(res.body.data.employees).toEqual([]);
  });

  it('correctly parses employee booleans from database results', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ doctors: 1, assistants: 0, receptionists: 0, total: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: '1', name: 'Dr. Test', isdoctor: 1, isassistant: 0, isreceptionist: 0, jobtitle: 'Doctor', location: 'Test', startworkdate: '2020-01-01', active: 1 },
      ]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    const employee = res.body.data.employees[0];
    expect(employee.isdoctor).toBe(true);
    expect(employee.isassistant).toBe(false);
    expect(employee.isreceptionist).toBe(false);
    expect(employee.active).toBe(true);
  });
});
