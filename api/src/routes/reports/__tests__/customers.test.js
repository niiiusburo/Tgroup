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

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const customersRouter = require('../customers');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: EMPLOYEE_ID };
    next();
  });
  app.use('/api/Reports', customersRouter);
  return app;
}

describe('reports customers summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  it('requires valid date and UUID parameters', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });

    let res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: 'invalid-date', dateTo: '2026-05-31', companyId: LOC_A });
    expect(res.status).toBe(400);

    res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: 'invalid-uuid' });
    expect(res.status).toBe(400);
  });

  it('allows Super Admin to retrieve all customer data without location filtering', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{ cnt: '100' }])  // total
      .mockResolvedValueOnce([{ cnt: '20' }])   // newCust
      .mockResolvedValueOnce([])                 // gender
      .mockResolvedValueOnce([])                 // cities
      .mockResolvedValueOnce([])                 // ltv
      .mockResolvedValueOnce([])                 // outstanding
      .mockResolvedValueOnce([]);                // growth

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify all 7 queries were made
    expect(query).toHaveBeenCalledTimes(7);

    // Check first query (total) - should have NO company filtering
    const [sql1, params1] = query.mock.calls[0];
    expect(sql1).toContain('SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false');
    expect(sql1).not.toContain('ANY(');
    expect(params1).toEqual([]);

    // Check second query (newCust) - should have NO company filtering
    const [sql2, params2] = query.mock.calls[1];
    expect(sql2).toContain('SELECT COUNT(*) as cnt FROM dbo.partners WHERE customer=true AND isdeleted=false');
    expect(params2).toEqual(['2026-05-01', '2026-05-31']);
    expect(sql2).not.toContain('ANY(');
  });

  it('applies location scope to all 7 sub-queries when employee is location-scoped', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ cnt: '50' }])  // total
      .mockResolvedValueOnce([{ cnt: '10' }])  // newCust
      .mockResolvedValueOnce([{ gender: 'M', cnt: '30' }])  // gender
      .mockResolvedValueOnce([{ cityname: 'Hanoi', cnt: '25' }])  // cities
      .mockResolvedValueOnce([{ id: '1', name: 'John', total_paid: '5000000', order_count: '10' }])  // ltv
      .mockResolvedValueOnce([{ id: '2', name: 'Jane', outstanding: '1000000' }])  // outstanding
      .mockResolvedValueOnce([{ month: '2026-05-01', cnt: '5' }]);  // growth

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(query).toHaveBeenCalledTimes(7);

    // Query 1: total - should have company filter
    const [sql1, params1] = query.mock.calls[0];
    expect(sql1).toContain('companyid = ANY($1::uuid[])');
    expect(params1).toEqual([[LOC_A]]);

    // Query 2: newCust - should have company filter via dateCompanyFilter
    const [sql2, params2] = query.mock.calls[1];
    expect(sql2).toContain('AND datecreated::date >= $1');
    expect(sql2).toContain('AND datecreated::date <= $2');
    expect(sql2).toContain('companyid = ANY($3::uuid[])');
    expect(params2).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);

    // Query 3: gender - should have company filter
    const [sql3, params3] = query.mock.calls[2];
    expect(sql3).toContain('companyid = ANY($1::uuid[])');
    expect(params3).toEqual([[LOC_A]]);

    // Query 4: cities - should have company filter
    const [sql4, params4] = query.mock.calls[3];
    expect(sql4).toContain('companyid = ANY($1::uuid[])');
    expect(params4).toEqual([[LOC_A]]);

    // Query 5: ltv - should have company filter using p.companyid
    const [sql5, params5] = query.mock.calls[4];
    expect(sql5).toContain('p.companyid = ANY($1::uuid[])');
    expect(params5).toEqual([[LOC_A]]);

    // Query 6: outstanding - should have company filter using p.companyid
    const [sql6, params6] = query.mock.calls[5];
    expect(sql6).toContain('p.companyid = ANY($1::uuid[])');
    expect(params6).toEqual([[LOC_A]]);

    // Query 7: growth - should have company filter
    const [sql7, params7] = query.mock.calls[6];
    expect(sql7).toContain('AND datecreated::date >= $1');
    expect(sql7).toContain('AND datecreated::date <= $2');
    expect(sql7).toContain('companyid = ANY($3::uuid[])');
    expect(params7).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
  });

  it('rejects requested location outside employee scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows location-scoped employee to request their allowed location explicitly', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ cnt: '50' }])
      .mockResolvedValueOnce([{ cnt: '10' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // All queries should still use location scope
    const [sql1, params1] = query.mock.calls[0];
    expect(sql1).toContain('companyid = ANY($1::uuid[])');
    expect(params1).toEqual([[LOC_A]]);
  });

  it('handles investor scope with customer allowlist for all 7 queries', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
    });
    query.mockResolvedValueOnce([{ cnt: '30' }])  // total
      .mockResolvedValueOnce([{ cnt: '5' }])   // newCust
      .mockResolvedValueOnce([])                // gender
      .mockResolvedValueOnce([])                // cities
      .mockResolvedValueOnce([])                // ltv
      .mockResolvedValueOnce([])                // outstanding
      .mockResolvedValueOnce([]);               // growth

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);

    // Query 1: total with investor customer filter (no location filter)
    const [sql1, params1] = query.mock.calls[0];
    expect(sql1).toContain('id = ANY($1::uuid[])');
    expect(sql1).not.toContain('companyid = ANY(');
    expect(params1).toEqual([['44444444-4444-4444-8444-444444444444']]);

    // Query 2: newCust with investor filter (dateFrom=$1, dateTo=$2, investor=$3)
    const [sql2, params2] = query.mock.calls[1];
    expect(sql2).toContain('id = ANY($3::uuid[])');
    expect(params2).toEqual(['2026-05-01', '2026-05-31', ['44444444-4444-4444-8444-444444444444']]);
  });

  it('combines location scope and investor scope for all 7 queries', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
    });
    query.mockResolvedValueOnce([{ cnt: '30' }])
      .mockResolvedValueOnce([{ cnt: '5' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);

    // Query 1: total with both location AND customer filters
    const [sql1, params1] = query.mock.calls[0];
    expect(sql1).toContain('companyid = ANY($1::uuid[])');
    expect(sql1).toContain('id = ANY($2::uuid[])');
    expect(params1).toEqual([[LOC_A], ['44444444-4444-4444-8444-444444444444']]);

    // Query 2: newCust with both filters
    const [sql2, params2] = query.mock.calls[1];
    expect(sql2).toContain('companyid = ANY($3::uuid[])');
    expect(sql2).toContain('id = ANY($4::uuid[])');
    expect(params2).toEqual(['2026-05-01', '2026-05-31', [LOC_A], ['44444444-4444-4444-8444-444444444444']]);
  });

  it('returns properly formatted customer summary response', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{ cnt: '100' }])
      .mockResolvedValueOnce([{ cnt: '20' }])
      .mockResolvedValueOnce([
        { gender: 'M', cnt: '60' },
        { gender: 'F', cnt: '40' },
      ])
      .mockResolvedValueOnce([
        { cityname: 'Hanoi', cnt: '50' },
        { cityname: 'Ho Chi Minh', cnt: '30' },
      ])
      .mockResolvedValueOnce([
        { id: 'cust-1', name: 'John Doe', total_paid: '5000000', order_count: '10' },
        { id: 'cust-2', name: 'Jane Smith', total_paid: '3000000', order_count: '5' },
      ])
      .mockResolvedValueOnce([
        { id: 'cust-3', name: 'Bob Wilson', outstanding: '2000000' },
      ])
      .mockResolvedValueOnce([
        { month: '2026-05-01T00:00:00Z', cnt: '5' },
        { month: '2026-06-01T00:00:00Z', cnt: '8' },
      ]);

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      total: 100,
      newInPeriod: 20,
      gender: expect.arrayContaining([
        { gender: 'M', count: 60 },
        { gender: 'F', count: 40 },
      ]),
      cities: expect.arrayContaining([
        { city: 'Hanoi', count: 50 },
        { city: 'Ho Chi Minh', count: 30 },
      ]),
      topSpenders: expect.arrayContaining([
        { id: 'cust-1', name: 'John Doe', totalPaid: 5000000, orderCount: 10 },
        { id: 'cust-2', name: 'Jane Smith', totalPaid: 3000000, orderCount: 5 },
      ]),
      outstanding: expect.arrayContaining([
        { id: 'cust-3', name: 'Bob Wilson', outstanding: 2000000 },
      ]),
      growth: expect.arrayContaining([
        expect.objectContaining({ count: 5 }),
        expect.objectContaining({ count: 8 }),
      ]),
    });
  });

  it('handles null dateFrom gracefully (no lower date bound)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([{ cnt: '100' }])
      .mockResolvedValueOnce([{ cnt: '20' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: null, dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    // newCust query should only have dateTo bound, not dateFrom
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('datecreated::date <= $');
    expect(params).toContain('2026-05-31');
  });

  it('handles database errors gracefully', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockRejectedValueOnce(new Error('Database connection failed'));

    const res = await request(makeApp())
      .post('/api/Reports/customers/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'Internal error' });
  });
});
