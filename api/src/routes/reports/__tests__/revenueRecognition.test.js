jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const revenueRouter = require('../revenue');
const revenueBreakdownsRouter = require('../revenueBreakdowns');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Reports', revenueRouter);
  app.use('/api/Reports', revenueBreakdownsRouter);
  return app;
}

describe('reports revenue recognition', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('uses posted service payment allocations for revenue summary and excludes deposits', async () => {
    query
      .mockResolvedValueOnce([{ state: 'sale', cnt: '2', total: '1000', outstanding: '200' }])
      .mockResolvedValueOnce([{ state: 'sale', paid: '700' }])
      .mockResolvedValueOnce([{ method: 'cash', status: 'posted', cnt: '1', total: '700' }]);

    const res = await request(makeApp())
      .post('/api/Reports/revenue/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([
      { state: 'sale', cnt: 2, total: 1000, paid: 700, outstanding: 200 },
    ]);
    expect(res.body.data.payments).toEqual([
      { method: 'cash', status: 'posted', cnt: 1, total: 700 },
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
});
