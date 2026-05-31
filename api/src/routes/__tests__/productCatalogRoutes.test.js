jest.mock('../../db', () => ({
  getQuery: jest.fn(),
}));

jest.mock('../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000123',
}));

const express = require('express');
const request = require('supertest');
const { getQuery } = require('../../db');
const productsRouter = require('../products');
const productCategoriesRouter = require('../productCategories');

function makeApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

describe('product catalog routes', () => {
  let q;

  beforeEach(() => {
    q = jest.fn();
    getQuery.mockReset();
    getQuery.mockReturnValue(q);
  });

  it('keeps global products visible when a branch company filter is selected', async () => {
    q
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }]);

    const res = await request(makeApp('/api/Products', productsRouter))
      .get('/api/Products')
      .query({
        companyId: '45a24396-6bbf-44ee-9e9c-a8d0b6467637',
        active: 'true',
      });

    expect(res.status).toBe(200);
    expect(q).toHaveBeenCalledTimes(2);
    expect(q.mock.calls[0][0]).toContain('(p.companyid = $1 OR p.companyid IS NULL)');
    expect(q.mock.calls[1][0]).toContain('(p.companyid = $1 OR p.companyid IS NULL)');
  });

  it('uses the request-scoped query executor for cosmetic product category creation', async () => {
    q
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-0000-0000-000000000123',
          name: 'Laser',
          product_count: 0,
        },
      ]);

    const res = await request(makeApp('/api/ProductCategories', productCategoriesRouter))
      .post('/api/ProductCategories')
      .send({ name: 'Laser' });

    expect(res.status).toBe(201);
    expect(getQuery).toHaveBeenCalledTimes(1);
    expect(q.mock.calls[0][0]).toContain('INSERT INTO dbo.productcategories');
    expect(q.mock.calls[1][0]).toContain('WHERE pc.id = $1');
  });
});
