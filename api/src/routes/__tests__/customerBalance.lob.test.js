jest.mock('../../db', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    getQuery: jest.fn(() => mockQuery),
  };
});

const express = require('express');
const request = require('supertest');
const { getQuery, query } = require('../../db');
const customerBalanceRouter = require('../customerBalance');

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.lob = 'cosmetic';
    next();
  });
  app.use('/api/cosmetic/CustomerBalance', customerBalanceRouter);
  return app;
}

describe('customer balance LOB routing', () => {
  beforeEach(() => {
    query.mockReset();
    getQuery.mockClear();
  });

  it('queries the request-scoped cosmetic database for deposit summary cards', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', name: 'Cosmetic Customer' }])
      .mockResolvedValueOnce([{ total_deposited: '500000', total_used: '0', total_refunded: '0' }])
      .mockResolvedValueOnce([{ total: '0' }, { total: '0' }]);

    const res = await request(makeApp()).get('/api/cosmetic/CustomerBalance/customer-1');

    expect(res.status).toBe(200);
    expect(getQuery).toHaveBeenCalledWith(expect.objectContaining({ lob: 'cosmetic' }));
    expect(res.body).toMatchObject({
      id: 'customer-1',
      name: 'Cosmetic Customer',
      deposit_balance: 500000,
      total_deposited: 500000,
      total_used: 0,
      total_refunded: 0,
    });
  });

  it('uses deposit payment_category so unallocated service collections are not counted as advances', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', name: 'Cosmetic Customer' }])
      .mockResolvedValueOnce([{ total_deposited: '0', total_used: '0', total_refunded: '0' }])
      .mockResolvedValueOnce([{ total: '0' }, { total: '0' }]);

    const res = await request(makeApp()).get('/api/cosmetic/CustomerBalance/customer-1');

    expect(res.status).toBe(200);
    expect(res.body.deposit_balance).toBe(0);
    const depositSql = query.mock.calls[1][0];
    expect(depositSql).toContain("p.payment_category = 'deposit'");
    expect(depositSql).not.toContain("service_id IS NULL AND (deposit_used IS NULL OR deposit_used = 0)");
  });

  it('excludes soft-deleted service orders from outstanding balance', async () => {
    query
      .mockResolvedValueOnce([{ id: 'customer-1', name: 'Cosmetic Customer' }])
      .mockResolvedValueOnce([{ total_deposited: '0', total_used: '0', total_refunded: '0' }])
      .mockResolvedValueOnce([{ total: '0' }, { total: '0' }]);

    const res = await request(makeApp()).get('/api/cosmetic/CustomerBalance/customer-1');

    expect(res.status).toBe(200);
    expect(res.body.outstanding_balance).toBe(0);
    const outstandingSql = query.mock.calls[2][0];
    expect(outstandingSql).toContain('COALESCE(isdeleted, false) = false');
  });
});
