jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

jest.mock('../../../services/reports/canonicalRevenue', () => ({
  getCanonicalRevenueByLocation: jest.fn().mockResolvedValue([]),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const { getCanonicalRevenueByLocation } = require('../../../services/reports/canonicalRevenue');
const locationsComparisonRouter = require('../locationsComparison');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const LOC_C = '33333333-3333-4333-8333-333333333333';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '44444444-4444-4444-8444-444444444444' };
    next();
  });
  app.use('/api/Reports', locationsComparisonRouter);
  return app;
}

describe('reports locations comparison', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    getCanonicalRevenueByLocation.mockResolvedValue([]);
  });

  it('rejects invalid date parameters', async () => {
    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
  });

  it('returns location data for unrestricted (Super Admin) caller without company scope filter', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
      { id: LOC_B, name: 'Location B', active: true, appointment_count: '10', done_count: '8', order_count: '5', employee_count: '6' },
    ]);
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [locationsSql, locationsParams] = query.mock.calls[0];
    // Super Admin: no ANY() filter for company scope
    expect(locationsSql).not.toContain('c.id = ANY(');
    // First query: dateFrom/dateTo for appointments ($1,$2), dateFrom/dateTo for saleorders ($3,$4) — no company scope
    expect(locationsParams).toEqual(['2026-05-01', '2026-05-31', '2026-05-01', '2026-05-31']);
    expect(res.body.data.locations).toHaveLength(2);
  });

  it('restricts location rows to employee scope when location-scoped staff member requests data', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
    ]);
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [locationsSql, locationsParams] = query.mock.calls[0];
    // Location-scoped: dates for appointments ($1,$2), dates for saleorders ($3,$4), company scope ($5)
    expect(locationsSql).toContain('WHERE c.id = ANY($5::uuid[])');
    expect(locationsParams).toEqual(['2026-05-01', '2026-05-31', '2026-05-01', '2026-05-31', [LOC_A]]);
    expect(res.body.data.locations).toHaveLength(1);
    expect(res.body.data.locations[0].id).toBe(LOC_A);
  });

  it('restricts trend query to location-scoped employee locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_B, name: 'Location B' }],
    });
    query.mockResolvedValueOnce([
      { id: LOC_B, name: 'Location B', active: true, appointment_count: '10', done_count: '8', order_count: '5', employee_count: '6' },
    ]);
    query.mockResolvedValueOnce([]); // trend results

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    // First query: locations with scope at $5
    expect(query.mock.calls[0][0]).toContain('WHERE c.id = ANY($5::uuid[])');
    // Second query: trend with scope at $3
    const [trendSql, trendParams] = query.mock.calls[1];
    expect(trendSql).toContain('AND c.id = ANY($3::uuid[])');
    expect(trendParams).toEqual(['2026-05-01', '2026-05-31', [LOC_B]]);
  });

  it('allows investor branch to see all locations and filter by their customer list', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['55555555-5555-4555-8555-555555555555'],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
      { id: LOC_B, name: 'Location B', active: true, appointment_count: '10', done_count: '8', order_count: '5', employee_count: '6' },
    ]);
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    // Investor: no location scope filter on companies, only customer filter
    const [locationsSql, locationsParams] = query.mock.calls[0];
    expect(locationsSql).not.toContain('c.id = ANY(');
    expect(locationsSql).toContain('partnerid = ANY($3::uuid[])');
    // $1,$2 = appointment dates, $3 = investor customer ids for appointments
    // $4,$5 = saleorder dates, $6 = investor customer ids for saleorders
    expect(locationsParams).toEqual(['2026-05-01', '2026-05-31', ['55555555-5555-4555-8555-555555555555'], '2026-05-01', '2026-05-31', ['55555555-5555-4555-8555-555555555555']]);
  });

  it('merges revenue data from getCanonicalRevenueByLocation into location rows', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
      { id: LOC_B, name: 'Location B', active: true, appointment_count: '10', done_count: '8', order_count: '5', employee_count: '6' },
    ]);
    query.mockResolvedValueOnce([]);
    getCanonicalRevenueByLocation.mockResolvedValue([
      { companyId: LOC_A, revenue: 50000000 },
      { companyId: LOC_B, revenue: 100000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(getCanonicalRevenueByLocation).toHaveBeenCalledWith({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });
    expect(res.body.data.locations[0]).toMatchObject({ id: LOC_B, revenue: 100000000 });
    expect(res.body.data.locations[1]).toMatchObject({ id: LOC_A, revenue: 50000000 });
  });

  it('sorts locations by revenue descending', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
      { id: LOC_B, name: 'Location B', active: true, appointment_count: '10', done_count: '8', order_count: '5', employee_count: '6' },
      { id: LOC_C, name: 'Location C', active: true, appointment_count: '15', done_count: '12', order_count: '8', employee_count: '8' },
    ]);
    query.mockResolvedValueOnce([]);
    getCanonicalRevenueByLocation.mockResolvedValue([
      { companyId: LOC_A, revenue: 30000000 },
      { companyId: LOC_B, revenue: 100000000 },
      { companyId: LOC_C, revenue: 60000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.locations).toHaveLength(3);
    expect(res.body.data.locations[0].id).toBe(LOC_B);
    expect(res.body.data.locations[1].id).toBe(LOC_C);
    expect(res.body.data.locations[2].id).toBe(LOC_A);
  });

  it('includes appointment and order trends for trend chart', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([
      { id: LOC_A, name: 'Location A', active: true, appointment_count: '5', done_count: '3', order_count: '2', employee_count: '4' },
    ]);
    query.mockResolvedValueOnce([
      { name: 'Location A', month: new Date('2026-05-01'), cnt: '10' },
      { name: 'Location A', month: new Date('2026-06-01'), cnt: '15' },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.data.trend).toHaveLength(2);
    expect(res.body.data.trend[0]).toMatchObject({ location: 'Location A', count: 10 });
    expect(res.body.data.trend[1]).toMatchObject({ location: 'Location A', count: 15 });
  });
});
