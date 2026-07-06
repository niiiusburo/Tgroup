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
const revenueRouter = require('../revenue');
const revenueBreakdownsRouter = require('../revenueBreakdowns');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', revenueRouter);
  app.use('/api/Reports', revenueBreakdownsRouter);
  return app;
}

describe('reports revenue recognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to super admin for backward compatibility with existing tests
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  it('uses posted service payment allocations for revenue summary and excludes deposits', async () => {
    query
      .mockResolvedValueOnce([{ state: 'sale', cnt: '2', total: '1000', outstanding: '200' }])
      .mockResolvedValueOnce([{ state: 'sale', paid: '700' }, { state: 'done', paid: '300' }])
      .mockResolvedValueOnce([{ method: 'cash', status: 'posted', cnt: '2', total: '1000' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([
      { state: 'sale', cnt: 2, total: 1000, paid: 700, outstanding: 200 },
      { state: 'done', cnt: 0, total: 0, paid: 300, outstanding: 0 },
    ]);
    expect(res.body.data.payments).toEqual([
      { method: 'cash', status: 'posted', cnt: 2, total: 1000 },
    ]);

    const revenueSql = query.mock.calls[1][0];
    const methodsSql = query.mock.calls[2][0];
    expect(revenueSql).toContain('dbo.payment_allocations pa');
    expect(revenueSql).toContain('allocation_totals AS');
    expect(revenueSql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(revenueSql).toContain("p.status = 'posted'");
    expect(revenueSql).toContain("COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')");
    expect(revenueSql).toContain("COALESCE(p.payment_category, 'payment') = 'payment'");
    expect(methodsSql).toContain('dbo.payment_allocations pa');
    expect(methodsSql).toContain('allocation_totals AS');
    expect(methodsSql).toContain("COALESCE(p.deposit_type, '') NOT IN ('deposit', 'refund', 'usage')");
  });

  it('uses payment dates for paid revenue in the trend', async () => {
    query
      .mockResolvedValueOnce([{ month: '2026-05-01', order_count: '2', invoiced: '1000', outstanding: '200' }])
      .mockResolvedValueOnce([{ month: '2026-05-01', paid: '650' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/trend')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { month: '2026-05-01', orderCount: 2, invoiced: 1000, paid: 650, outstanding: 200 },
    ]);

    const paidTrendSql = query.mock.calls[1][0];
    expect(paidTrendSql).toContain('dbo.payment_allocations pa');
    expect(paidTrendSql).toContain('allocation_totals AS');
    expect(paidTrendSql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(paidTrendSql).toContain('COALESCE(p.payment_date, p.created_at)');
    expect(paidTrendSql).not.toContain('SUM(totalpaid)');
  });

  it('uses posted payment allocations for doctor revenue', async () => {
    query.mockResolvedValueOnce([{ id: 'doctor-1', name: 'Dr A', order_count: '3', invoiced: '1200', paid: '900' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-doctor')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: 'doctor-1', name: 'Dr A', order_count: '3', orderCount: 3, invoiced: 1200, paid: 900 },
    ]);

    const sql = query.mock.calls[0][0];
    expect(sql).toContain('dbo.payment_allocations pa');
    expect(sql).toContain('allocation_totals AS');
    expect(sql).toContain('pa.allocated_amount * p.amount / at.total_allocated_for_payment');
    expect(sql).toContain("p.status = 'posted'");
    expect(sql).toContain("COALESCE(p.payment_category, 'payment') = 'payment'");
  });

  it('allocates paid revenue across service categories instead of summing listed service prices', async () => {
    query.mockResolvedValueOnce([{ id: 'cat-1', category: 'Implant', line_count: '2', revenue: '800' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-category')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { id: 'cat-1', category: 'Implant', line_count: '2', lineCount: 2, revenue: 800 },
    ]);

    const sql = query.mock.calls[0][0];
    expect(sql).toContain('line_totals AS');
    expect(sql).toContain('dbo.payment_allocations pa');
    expect(sql).toContain('ABS(COALESCE(sol.pricetotal, 0)) / lt.line_total');
    expect(sql).not.toContain('SUM(sol.pricetotal),0) as revenue');
  });

  it('allows super admin to run unrestricted revenue reports without location filters', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query
      .mockResolvedValueOnce([{ state: 'sale', cnt: '1', total: '1000', outstanding: '0' }])
      .mockResolvedValueOnce([{ state: 'sale', paid: '1000' }])
      .mockResolvedValueOnce([{ method: 'cash', status: 'posted', cnt: '1', total: '1000' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const orderSql = query.mock.calls[0][0];
    expect(orderSql).not.toContain('ANY(');
  });

  it('allows location-scoped staff to run reports on their allowed locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ state: 'sale', cnt: '1', total: '500', outstanding: '0' }])
      .mockResolvedValueOnce([{ state: 'sale', paid: '500' }])
      .mockResolvedValueOnce([{ method: 'cash', status: 'posted', cnt: '1', total: '500' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const orderSql = query.mock.calls[0][0];
    expect(orderSql).toContain('ANY(');
    const params = query.mock.calls[0][1];
    expect(params[2]).toEqual([LOC_A]);
  });

  it('rejects location-scoped staff requesting a location outside their scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/revenue/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('applies location scope filter to breakdown reports (by-doctor)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ id: 'doc-1', name: 'Dr X', order_count: '2', invoiced: '600', paid: '600' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-doctor')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('ANY(');
    const params = query.mock.calls[0][1];
    expect(params[2]).toEqual([LOC_A]);
  });

  it('rejects by-doctor reports requesting scope outside employee locations', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-doctor')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('applies location scope filter to by-location report and rejects out-of-scope requests', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ id: LOC_A, name: 'Location A', order_count: '2', invoiced: '600', paid: '600', outstanding: '0' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-location')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('ANY(');
    const params = query.mock.calls[0][1];
    expect(params[2]).toEqual([LOC_A]);

    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    const rejected = await request(makeApp())
      .post('/api/Reports/revenue/by-location')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(rejected.status).toBe(403);
    expect(rejected.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('super admin still gets an unrestricted by-location report (no ANY(), no extra params)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-location')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const sql = query.mock.calls[0][0];
    const params = query.mock.calls[0][1];
    expect(sql).not.toContain('ANY(');
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('applies location scope filter to by-source report and rejects out-of-scope requests', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([{ id: 'src-1', name: 'Facebook', order_count: '1', paid: '500' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-source')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const sql = query.mock.calls[0][0];
    const params = query.mock.calls[0][1];
    // by-source combines two independently-built filters (buildPairedRevenueFilters +
    // buildPaymentRevenueFilter) into ONE query but only passes the first builder's
    // params — this only works because both builders are fed the exact same
    // {dateFrom, dateTo, companyId: scope.companyIds} and so produce identical
    // param arrays. Lock that invariant here so a future divergence fails loudly.
    expect(sql).toContain('ANY(');
    expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);

    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    const rejected = await request(makeApp())
      .post('/api/Reports/revenue/by-source')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(rejected.status).toBe(403);
    expect(rejected.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('super admin still gets an unrestricted by-source report (no ANY(), no extra params)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/by-source')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const sql = query.mock.calls[0][0];
    const params = query.mock.calls[0][1];
    expect(sql).not.toContain('ANY(');
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('applies location scope filter to payment-plans report (both plans and installments queries) and rejects out-of-scope requests', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query
      .mockResolvedValueOnce([{ status: 'active', cnt: '1', total: '1000', down_payment: '200' }])
      .mockResolvedValueOnce([{ status: 'paid', cnt: '1', total: '500', paid: '500' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/payment-plans')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

    expect(res.status).toBe(200);
    const plansSql = query.mock.calls[0][0];
    const plansParams = query.mock.calls[0][1];
    expect(plansSql).toContain('ANY(');
    expect(plansParams[2]).toEqual([LOC_A]);

    const installmentsSql = query.mock.calls[1][0];
    const installmentsParams = query.mock.calls[1][1];
    expect(installmentsSql).toContain('mp.company_id = ANY(');
    expect(installmentsParams).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);

    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    const rejected = await request(makeApp())
      .post('/api/Reports/revenue/payment-plans')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(rejected.status).toBe(403);
    expect(rejected.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('super admin still gets unrestricted payment-plans reports (no ANY(), no extra params)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/payment-plans')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const plansSql = query.mock.calls[0][0];
    const installmentsSql = query.mock.calls[1][0];
    const installmentsParams = query.mock.calls[1][1];
    expect(plansSql).not.toContain('ANY(');
    expect(installmentsSql).not.toContain('mp.company_id');
    expect(installmentsParams).toEqual(['2026-05-01', '2026-05-31']);
  });
});
