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
const servicesBreakdownRouter = require('../servicesBreakdown');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', servicesBreakdownRouter);
  return app;
}

describe('reports services breakdown revenue recognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  it('uses posted payment allocations for category and source revenue with unrestricted admin access', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ category: 'Implant', product_count: '2', avg_price: '100' }])
      .mockResolvedValueOnce([{ category: 'Implant', order_count: '2', revenue: '800' }])
      .mockResolvedValueOnce([{ source: 'Facebook', order_count: '1', revenue: '500' }])
      .mockResolvedValueOnce([{ name: 'Implant A', category: 'Implant', listprice: '100', order_count: '3' }]);

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.revenueByCategory).toEqual([
      { category: 'Implant', orderCount: 2, revenue: 800 },
    ]);
    expect(res.body.data.revenueBySource).toEqual([
      { source: 'Facebook', orderCount: 1, revenue: 500 },
    ]);

    const categorySql = query.mock.calls[1][0];
    const sourceSql = query.mock.calls[2][0];
    expect(categorySql).toContain('dbo.payment_allocations pa');
    expect(categorySql).toContain("p.status = 'posted'");
    expect(categorySql).not.toContain('SUM(sol.pricetotal),0) as revenue');
    expect(sourceSql).toContain('dbo.payment_allocations pa');
    expect(sourceSql).toContain('allocation_totals AS');
    expect(sourceSql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(sourceSql).toContain("COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')");
    expect(sourceSql).not.toContain('SUM(so.amounttotal),0) as revenue');
  });

  it('applies location scope filter for staff with single allowed location', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ category: 'Implant', product_count: '2', avg_price: '100' }])
      .mockResolvedValueOnce([{ category: 'Implant', order_count: '2', revenue: '800' }])
      .mockResolvedValueOnce([{ source: 'Facebook', order_count: '1', revenue: '500' }])
      .mockResolvedValueOnce([{ name: 'Implant A', category: 'Implant', listprice: '100', order_count: '3' }]);

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(4);

    // Revenue by category should have location filter
    const categorySql = query.mock.calls[1][0];
    const categoryParams = query.mock.calls[1][1];
    expect(categorySql).toContain('so.companyid = ANY($3::uuid[])');
    expect(categoryParams).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);

    // Revenue by source should have location filter
    const sourceSql = query.mock.calls[2][0];
    const sourceParams = query.mock.calls[2][1];
    expect(sourceSql).toContain('so.companyid = ANY($3::uuid[])');
    expect(sourceParams).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
  });

  it('allows staff to request report for their allowed location', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ category: 'Implant', product_count: '2', avg_price: '100' }])
      .mockResolvedValueOnce([{ category: 'Implant', order_count: '2', revenue: '800' }])
      .mockResolvedValueOnce([{ source: 'Facebook', order_count: '1', revenue: '500' }])
      .mockResolvedValueOnce([{ name: 'Implant A', category: 'Implant', listprice: '100', order_count: '3' }]);

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(4);

    // Revenue by category should scope to requested location
    const categoryParams = query.mock.calls[1][1];
    expect(categoryParams).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
  });

  it('rejects request for location outside staff scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows Super Admin group to run all-location reports without filters', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ category: 'Implant', product_count: '2', avg_price: '100' }])
      .mockResolvedValueOnce([{ category: 'Implant', order_count: '2', revenue: '800' }])
      .mockResolvedValueOnce([{ source: 'Facebook', order_count: '1', revenue: '500' }])
      .mockResolvedValueOnce([{ name: 'Implant A', category: 'Implant', listprice: '100', order_count: '3' }]);

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);

    // Revenue by category should NOT have location filter
    const categorySql = query.mock.calls[1][0];
    const categoryParams = query.mock.calls[1][1];
    expect(categorySql).not.toContain('ANY(');
    expect(categoryParams).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('allows investor to request all-location report with customer filter applied', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'investor',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({
      isInvestor: true,
      allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
    });
    query
      .mockResolvedValueOnce([{ category: 'Implant', product_count: '2', avg_price: '100' }])
      .mockResolvedValueOnce([{ category: 'Implant', order_count: '2', revenue: '800' }])
      .mockResolvedValueOnce([{ source: 'Facebook', order_count: '1', revenue: '500' }])
      .mockResolvedValueOnce([{ name: 'Implant A', category: 'Implant', listprice: '100', order_count: '3' }]);

    const res = await request(makeApp())
      .post('/api/Reports/services/breakdown')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);

    // Revenue by category should have investor customer filter
    const categorySql = query.mock.calls[1][0];
    const categoryParams = query.mock.calls[1][1];
    expect(categorySql).toContain('so.partnerid = ANY($3::uuid[])');
    expect(categoryParams).toEqual(['2026-05-01', '2026-05-31', ['44444444-4444-4444-8444-444444444444']]);
  });
});
