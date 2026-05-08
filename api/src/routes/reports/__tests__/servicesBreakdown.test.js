jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const servicesBreakdownRouter = require('../servicesBreakdown');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Reports', servicesBreakdownRouter);
  return app;
}

describe('reports services breakdown revenue recognition', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('uses posted payment allocations for category and source revenue', async () => {
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
});
