jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../src/db');
const { resolveEffectivePermissions } = require('../src/services/permissionService');
const dashboardReportsRouter = require('../src/routes/dashboardReports');

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
  app.use('/api/DashboardReports', dashboardReportsRouter);
  return app;
}

describe('dashboard reports authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when companyId does not exist', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    // First query is the foreignKeyExists check
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31', companyId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('COMPANY_NOT_FOUND');
  });

  it('returns 400 when companyId is not a valid UUID', async () => {
    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31', companyId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_COMPANY_ID');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 400 when dateFrom is invalid', async () => {
    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: 'invalid-date', dateTo: '2026-01-31' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_DATE_FROM');
  });

  it('returns 400 when dateTo is invalid', async () => {
    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: 'invalid-date' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_DATE_TO');
  });

  it('returns 400 when dateFrom is after dateTo', async () => {
    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-31', dateTo: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_DATE_RANGE');
  });

  it('allows a location-scoped employee to request their own location with company filter applied', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ id: LOC_A }]) // foreignKeyExists
      .mockResolvedValueOnce([{ totalinbound: 1000000, totaloutbound: 500000, totalcash: 600000, totalbank: 300000, totalother: 100000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 400000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 300000,
      totalCash: 600000,
      totalOther: 100000,
      totalAmountYesterday: 400000,
      totalAmount: 500000,
    });

    // Verify the query used ANY() filter for location
    const todayCall = query.mock.calls[1];
    const [sql, params] = todayCall;
    expect(sql).toContain('ap.companyid = ANY($');
    expect(sql).toContain('::uuid[]');
    expect(params).toContainEqual([LOC_A]);
  });

  it('rejects a location-scoped employee requesting a location outside their scope with 403', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ id: LOC_B }]); // foreignKeyExists

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    // Query mock should only be called once (foreignKeyExists), not the data queries
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('allows a location-scoped employee without companyId to get results for all their locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [
        { id: LOC_A, name: 'Location A' },
        { id: LOC_B, name: 'Location B' },
      ],
    });
    query
      .mockResolvedValueOnce([{ totalinbound: 1500000, totaloutbound: 700000, totalcash: 800000, totalbank: 500000, totalother: 200000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 500000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 500000,
      totalCash: 800000,
      totalOther: 200000,
      totalAmountYesterday: 500000,
      totalAmount: 800000,
    });

    // Verify the query used ANY() filter with both locations
    const todayCall = query.mock.calls[0];
    const [sql, params] = todayCall;
    expect(sql).toContain('ap.companyid = ANY($');
    expect(params).toContainEqual([LOC_A, LOC_B]);
  });

  it('allows Admin group to run unrestricted reports without location filter when no companyId requested', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ totalinbound: 2000000, totaloutbound: 1000000, totalcash: 1000000, totalbank: 800000, totalother: 200000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 600000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 800000,
      totalCash: 1000000,
      totalOther: 200000,
      totalAmountYesterday: 600000,
      totalAmount: 1000000,
    });

    // Verify unrestricted admin gets NO location filter
    const todayCall = query.mock.calls[0];
    const [sql, params] = todayCall;
    expect(sql).not.toContain('ap.companyid = ANY(');
    expect(params).toEqual(['2026-01-01', '2026-01-31']);
  });

  it('allows Super Admin group to run unrestricted reports', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ totalinbound: 2500000, totaloutbound: 1200000, totalcash: 1200000, totalbank: 900000, totalother: 400000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 700000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 900000,
      totalCash: 1200000,
      totalOther: 400000,
      totalAmountYesterday: 700000,
      totalAmount: 1300000,
    });

    // Verify unrestricted super admin gets NO location filter
    const todayCall = query.mock.calls[0];
    const [sql, params] = todayCall;
    expect(sql).not.toContain('ap.companyid = ANY(');
    expect(params).toEqual(['2026-01-01', '2026-01-31']);
  });

  it('allows Admin to request a specific location and get filtered results for that location only', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ id: LOC_A }]) // foreignKeyExists
      .mockResolvedValueOnce([{ totalinbound: 1200000, totaloutbound: 600000, totalcash: 700000, totalbank: 400000, totalother: 100000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 450000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 400000,
      totalCash: 700000,
      totalOther: 100000,
      totalAmountYesterday: 450000,
      totalAmount: 600000,
    });

    // Verify admin requesting specific location still gets ANY() filter with just that location
    const todayCall = query.mock.calls[1];
    const [sql, params] = todayCall;
    expect(sql).toContain('ap.companyid = ANY($');
    expect(params).toContainEqual([LOC_A]);
  });

  it('applies location scope to yesterday query as well', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ totalinbound: 1000000, totaloutbound: 500000, totalcash: 600000, totalbank: 300000, totalother: 100000 }]) // today
      .mockResolvedValueOnce([{ totalamount: 400000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-15', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);

    // Verify both today and yesterday queries have the location filter
    const todayCall = query.mock.calls[0];
    const [todaySql, todayParams] = todayCall;
    expect(todaySql).toContain('ap.companyid = ANY($');
    expect(todayParams).toContainEqual([LOC_A]);

    const yesterdayCall = query.mock.calls[1];
    const [yesterdaySql, yesterdayParams] = yesterdayCall;
    expect(yesterdaySql).toContain('ap.companyid = ANY($');
    expect(yesterdayParams).toContainEqual([LOC_A]);
  });

  it('skips location filter when scope.companyIds is empty array', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [], // No locations, empty scope
    });
    query
      .mockResolvedValueOnce([{ totalinbound: 0, totaloutbound: 0, totalcash: 0, totalbank: 0, totalother: 0 }]) // today
      .mockResolvedValueOnce([{ totalamount: 0 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);

    // With empty locations array, no location filter should be applied
    const todayCall = query.mock.calls[0];
    const [sql, params] = todayCall;
    expect(sql).not.toContain('ap.companyid = ANY(');
    expect(params).toEqual(['2026-01-01', '2026-01-31']);
  });

  it('returns correct calculated totals for today and yesterday', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{
        totalinbound: 5000000,
        totaloutbound: 2000000,
        totalcash: 2000000,
        totalbank: 2500000,
        totalother: 500000,
      }]) // today
      .mockResolvedValueOnce([{ totalamount: 1500000 }]); // yesterday

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 2500000,
      totalCash: 2000000,
      totalOther: 500000,
      totalAmountYesterday: 1500000,
      totalAmount: 3000000, // 5000000 - 2000000
    });
  });

  it('handles missing row results gracefully', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([]) // today empty result
      .mockResolvedValueOnce([]); // yesterday empty result

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBank: 0,
      totalCash: 0,
      totalOther: 0,
      totalAmountYesterday: 0,
      totalAmount: 0,
    });
  });

  it('skips yesterday calculation when dateFrom is not provided', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{
      totalinbound: 1000000,
      totaloutbound: 500000,
      totalcash: 600000,
      totalbank: 300000,
      totalother: 100000,
    }]); // today only

    const res = await request(makeApp())
      .post('/api/DashboardReports/GetSumary')
      .send({ dateTo: '2026-01-31' });

    expect(res.status).toBe(200);
    expect(res.body.totalAmountYesterday).toBe(0);
    expect(query).toHaveBeenCalledTimes(1); // Only today query, no yesterday
  });
});
