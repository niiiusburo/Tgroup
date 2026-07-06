jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  // doctors.js scopes results via resolveInvestorScope; default to non-investor
  // so the existing (staff) assertions hold. clearAllMocks keeps this impl.
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

jest.mock('../../../services/reports/canonicalRevenue', () => ({
  getCanonicalRevenueByDoctor: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const { getCanonicalRevenueByDoctor } = require('../../../services/reports/canonicalRevenue');
const doctorsRouter = require('../doctors');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const DOC_X = '33333333-3333-4333-8333-333333333333';
const DOC_Y = '44444444-4444-4444-8444-444444444444';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '55555555-5555-4555-8555-555555555555' };
    next();
  });
  app.use('/api/Reports', doctorsRouter);
  return app;
}

describe('reports doctors performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    getCanonicalRevenueByDoctor.mockResolvedValue([]);
  });

  it('validates required date fields', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: 'invalid', dateTo: '2026-05-31' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
  });

  it('validates UUID format for companyId', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
  });

  it('allows the Super Admin group to run all-location doctor reports without location restriction', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. A',
        total_appointments: '10',
        done: '8',
        cancelled: '1',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 5000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    // Admin gets unfiltered SQL (no ANY clause for companyid)
    expect(sql).not.toContain('a.companyid = ANY(');
    expect(sql).not.toContain('p.companyid = ANY(');
    // Params should only have dates
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
    // getCanonicalRevenueByDoctor should be called with null companyId (unrestricted)
    expect(getCanonicalRevenueByDoctor).toHaveBeenCalledWith({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      companyId: null,
    });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: DOC_X,
      name: 'Dr. A',
      totalAppointments: 10,
      done: 8,
      cancelled: 1,
      revenue: 5000000,
    });
  });

  it('allows the Admin group to run all-location doctor reports', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. B',
        total_appointments: '15',
        done: '14',
        cancelled: '0',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 8000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    // Admin gets unfiltered SQL
    expect(sql).not.toContain('a.companyid = ANY(');
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
    expect(res.body.data[0].revenue).toBe(8000000);
  });

  it('restricts location-scoped staff to their allowed locations when no companyId is requested', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. C',
        total_appointments: '5',
        done: '4',
        cancelled: '0',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 2000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    // Location-scoped staff should have appointment date filter AND location filter
    expect(sql).toContain('a.date');
    expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
    // getCanonicalRevenueByDoctor should receive their allowed location
    expect(getCanonicalRevenueByDoctor).toHaveBeenCalledWith({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      companyId: [LOC_A],
    });
  });

  it('allows location-scoped staff to request reports for their own location', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_Y,
        name: 'Dr. D',
        total_appointments: '20',
        done: '19',
        cancelled: '1',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_Y, revenue: 10000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
    expect(getCanonicalRevenueByDoctor).toHaveBeenCalledWith({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      companyId: [LOC_A],
    });
    expect(res.body.data[0]).toMatchObject({
      totalAppointments: 20,
      done: 19,
      revenue: 10000000,
    });
  });

  it('rejects location-scoped staff requesting a location outside their scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    // Should not call the database query
    expect(query).not.toHaveBeenCalled();
    expect(getCanonicalRevenueByDoctor).not.toHaveBeenCalled();
  });

  it('includes unassigned revenue from doctors without explicit assignment', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. E',
        total_appointments: '10',
        done: '10',
        cancelled: '0',
      },
      {
        id: DOC_Y,
        name: 'Dr. F',
        total_appointments: '8',
        done: '8',
        cancelled: '0',
      },
    ]);
    // Total revenue includes unassigned (null doctorid)
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 5000000 },
      { doctorId: DOC_Y, revenue: 3000000 },
      { doctorId: null, revenue: 2000000 }, // Unassigned revenue
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const doctors = res.body.data;
    // Should have 3 rows: 2 doctors + 1 unassigned
    expect(doctors).toHaveLength(3);
    // Last row is unassigned revenue
    const unassignedRow = doctors[2];
    expect(unassignedRow).toMatchObject({
      id: null,
      name: 'Chưa gán bác sĩ',
      revenue: 2000000,
      unassigned: true,
    });
  });

  it('handles doctors with zero revenue', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. G',
        total_appointments: '2',
        done: '1',
        cancelled: '1',
      },
    ]);
    // Doctor with no revenue
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 0 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      totalAppointments: 2,
      done: 1,
      cancelled: 1,
      revenue: 0,
    });
  });

  it('allows investor branch filters with location scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['66666666-6666-4666-8666-666666666666'],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. H',
        total_appointments: '12',
        done: '11',
        cancelled: '0',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 6000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    // Investor gets both location scope AND customer allowlist filter in the appointment query
    expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_B], ['66666666-6666-4666-8666-666666666666']]);
    // getCanonicalRevenueByDoctor should receive investor-filtered params
    expect(getCanonicalRevenueByDoctor).toHaveBeenCalledWith({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      companyId: [LOC_B],
      allowedCustomerIds: ['66666666-6666-4666-8666-666666666666'],
    });
  });

  it('handles empty result set gracefully', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns appointment counts with correct data type conversion', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. I',
        total_appointments: '100',
        done: '95',
        cancelled: '3',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 50000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const doc = res.body.data[0];
    expect(typeof doc.totalAppointments).toBe('number');
    expect(typeof doc.done).toBe('number');
    expect(typeof doc.cancelled).toBe('number');
    expect(doc.totalAppointments).toBe(100);
    expect(doc.done).toBe(95);
    expect(doc.cancelled).toBe(3);
  });

  it('maintains compatibility with investor scope when requesting specific location', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['77777777-7777-4777-8777-777777777777'],
    });
    query.mockResolvedValueOnce([
      {
        id: DOC_X,
        name: 'Dr. J',
        total_appointments: '25',
        done: '25',
        cancelled: '0',
      },
    ]);
    getCanonicalRevenueByDoctor.mockResolvedValueOnce([
      { doctorId: DOC_X, revenue: 12000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/doctors/performance')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    // Verify that investor's allowed customers are still applied via getCanonicalRevenueByDoctor
    expect(getCanonicalRevenueByDoctor).toHaveBeenCalledWith({
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      companyId: [LOC_A],
      allowedCustomerIds: ['77777777-7777-4777-8777-777777777777'],
    });
    expect(res.body.data[0].revenue).toBe(12000000);
  });
});
