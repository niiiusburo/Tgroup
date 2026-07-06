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
  getCanonicalRevenue: jest.fn(),
  getCanonicalRevenueByMonth: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const { getCanonicalRevenue, getCanonicalRevenueByMonth } = require('../../../services/reports/canonicalRevenue');
const dashboardRouter = require('../dashboard');

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
  app.use('/api/Reports', dashboardRouter);
  return app;
}

describe('reports dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
    getCanonicalRevenue.mockResolvedValue(5000000);
    getCanonicalRevenueByMonth.mockResolvedValue([]);
    query.mockResolvedValue([
      { invoiced: 1000000, outstanding: 500000 },
    ]);
  });

  it('rejects invalid date parameters', async () => {
    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: 'invalid', dateTo: '2026-05-31' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid UUID', async () => {
    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid params' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows Super Admin to query dashboard without location restrictions', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{ invoiced: 1000000, outstanding: 500000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 100, done: 90, cancelled: 5 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 10 }]); // new customers
    query.mockResolvedValueOnce([{ total: 95 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 800000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(4500000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(4000000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 4500000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      revenue: expect.any(Object),
      appointments: expect.any(Object),
      customers: expect.any(Object),
      trend: expect.any(Array),
    });

    // Verify saleorders query has no location filter
    const [soSql, soParams] = query.mock.calls[0];
    expect(soSql).toContain('FROM dbo.saleorders WHERE isdeleted=false');
    expect(soSql).not.toContain('ANY(');
  });

  it('restricts dashboard query to employee location scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ invoiced: 500000, outstanding: 250000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 50, done: 45, cancelled: 2 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 5 }]); // new customers
    query.mockResolvedValueOnce([{ total: 48 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 400000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(2500000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(2400000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 2500000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify saleorders query includes location filter
    const [soSql, soParams] = query.mock.calls[0];
    expect(soSql).toContain('companyid = ANY($3::uuid[])');
    expect(soParams).toContainEqual([LOC_A]);

    // Verify getCanonicalRevenue was called with location scope
    expect(getCanonicalRevenue).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: [LOC_A] })
    );
  });

  it('rejects dashboard query for location outside employee scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
    expect(getCanonicalRevenue).not.toHaveBeenCalled();
  });

  it('allows location-scoped staff to query their own location explicitly', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ invoiced: 500000, outstanding: 250000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 50, done: 45, cancelled: 2 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 5 }]); // new customers
    query.mockResolvedValueOnce([{ total: 48 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 400000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(2500000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(2400000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 2500000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify saleorders query restricts to the single location
    const [soSql, soParams] = query.mock.calls[0];
    expect(soSql).toContain('companyid = ANY($3::uuid[])');
    expect(soParams[2]).toEqual([LOC_A]);
  });

  it('applies investor scope filter on top of location scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
    });
    query.mockResolvedValueOnce([{ invoiced: 300000, outstanding: 150000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 30, done: 28, cancelled: 1 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 3 }]); // new customers
    query.mockResolvedValueOnce([{ total: 29 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 250000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(1500000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(1450000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 1500000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify getCanonicalRevenue includes investor scope
    expect(getCanonicalRevenue).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: null,
        allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
      })
    );

    // Verify saleorders query includes investor partner filter
    const [soSql, soParams] = query.mock.calls[0];
    expect(soSql).toContain('partnerid = ANY($');
    expect(soParams).toContainEqual(['44444444-4444-4444-8444-444444444444']);
  });

  it('computes revenue change percentage correctly', async () => {
    query.mockResolvedValueOnce([{ invoiced: 1000000, outstanding: 500000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 100, done: 90, cancelled: 5 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 10 }]); // new customers
    query.mockResolvedValueOnce([{ total: 95 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 800000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(5000000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(4000000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 5000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const revChange = (5000000 - 4000000) / 4000000 * 100;
    expect(res.body.data.revenue.change).toBe(parseFloat(revChange.toFixed(1)));
  });

  it('handles multiple appointments in the saleorders and appointments queries', async () => {
    query.mockResolvedValueOnce([{ invoiced: 2000000, outstanding: 1000000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 200, done: 180, cancelled: 10 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 20 }]); // new customers
    query.mockResolvedValueOnce([{ total: 190 }]); // prev appointments
    query.mockResolvedValueOnce([
      { month: new Date('2026-04-01'), invoiced: 1500000 },
      { month: new Date('2026-05-01'), invoiced: 1800000 },
    ]); // invoiced by month (DB returns Date objects)
    getCanonicalRevenue.mockResolvedValueOnce(9000000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(8500000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-04-01'), revenue: 8500000 },
      { month: new Date('2026-05-01'), revenue: 9000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.appointments.total).toBe(200);
    expect(res.body.data.appointments.done).toBe(180);
    expect(res.body.data.appointments.cancelled).toBe(10);
    expect(res.body.data.trend).toHaveLength(2);
  });

  it('allows Admin group to query dashboard unrestricted', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{ invoiced: 1000000, outstanding: 500000 }]); // saleorders
    query.mockResolvedValueOnce([{ total: 100, done: 90, cancelled: 5 }]); // appointments
    query.mockResolvedValueOnce([{ new_customers: 10 }]); // new customers
    query.mockResolvedValueOnce([{ total: 95 }]); // prev appointments
    query.mockResolvedValueOnce([{ month: '2026-05-01', invoiced: 800000 }]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(5000000); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(4000000); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([
      { month: new Date('2026-05-01'), revenue: 5000000 },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);

    // Verify no location filters are applied
    const [soSql, soParams] = query.mock.calls[0];
    expect(soSql).not.toContain('ANY(');
    expect(soParams).toEqual(['2026-05-01', '2026-05-31']);

    // Verify getCanonicalRevenue has no location filter
    expect(getCanonicalRevenue).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: null })
    );
  });

  it('returns zero values when no data is found', async () => {
    query.mockResolvedValueOnce([]); // saleorders
    query.mockResolvedValueOnce([]); // appointments
    query.mockResolvedValueOnce([]); // new customers
    query.mockResolvedValueOnce([]); // prev appointments
    query.mockResolvedValueOnce([]); // invoiced by month
    getCanonicalRevenue.mockResolvedValueOnce(0); // current paid
    getCanonicalRevenue.mockResolvedValueOnce(0); // previous paid
    getCanonicalRevenueByMonth.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.revenue.invoiced).toBe(0);
    expect(res.body.data.revenue.paid).toBe(0);
    expect(res.body.data.revenue.outstanding).toBe(0);
    expect(res.body.data.appointments.total).toBe(0);
    expect(res.body.data.customers.newCustomers).toBe(0);
  });
});
