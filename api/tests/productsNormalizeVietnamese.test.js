jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'product-uuid-1'),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../src/db');
const searchUtils = require('../src/utils/search');
const productsRouter = require('../src/routes/products');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/Products', productsRouter);
  return app;
}

describe('Products normalizeVietnamese (AUD-010)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports normalizeVietnamese from utils/search (import contract)', () => {
    expect(typeof searchUtils.normalizeVietnamese).toBe('function');
    expect(searchUtils.normalizeVietnamese('Tẩy trắng răng')).toBe('tay trang rang');
    // Guard against accidental rename/export drift used by products.js
    expect(searchUtils).toHaveProperty('normalizeVietnamese');
    expect(searchUtils).not.toHaveProperty('normalizeVietnames');
  });

  it('POST /api/Products accepts Vietnamese diacritics and stores namenosign', async () => {
    const created = {
      id: 'product-uuid-1',
      name: 'Tẩy trắng răng',
      namenosign: 'tay trang rang',
      defaultcode: null,
      type: 'service',
      listprice: 1500000,
    };

    query.mockImplementation(async (sql) => {
      if (sql.startsWith('INSERT INTO dbo.products')) {
        return [];
      }
      if (sql.includes('FROM dbo.products p') && sql.includes('WHERE p.id = $1')) {
        return [created];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(makeApp())
      .post('/api/Products')
      .send({ name: 'Tẩy trắng răng', type: 'service', listprice: 1500000 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Tẩy trắng răng');
    expect(res.body.namenosign).toBe('tay trang rang');

    const insertCall = query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO dbo.products'));
    expect(insertCall).toBeTruthy();
    // INSERT params: id, name, namenosign, ...
    expect(insertCall[1][1]).toBe('Tẩy trắng răng');
    expect(insertCall[1][2]).toBe('tay trang rang');
    // Must not surface the pre-fix ReferenceError
    expect(String(res.body.error || '')).not.toMatch(/normalizeVietnamese is not defined/);
  });

  it('PUT /api/Products/:id updates namenosign when name has Vietnamese diacritics', async () => {
    const updated = {
      id: 'product-uuid-1',
      name: 'Nhổ răng khôn',
      namenosign: 'nho rang khon',
      listprice: 2000000,
    };

    query.mockImplementation(async (sql) => {
      if (sql.startsWith('UPDATE dbo.products SET')) {
        return [];
      }
      if (sql.includes('FROM dbo.products p') && sql.includes('WHERE p.id = $1')) {
        return [updated];
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(makeApp())
      .put('/api/Products/product-uuid-1')
      .send({ name: 'Nhổ răng khôn', listprice: 2000000 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nhổ răng khôn');

    const updateCall = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE dbo.products SET'));
    expect(updateCall).toBeTruthy();
    expect(updateCall[0]).toContain('namenosign');
    // name, namenosign, listprice, lastupdated, id
    expect(updateCall[1]).toEqual(
      expect.arrayContaining(['Nhổ răng khôn', 'nho rang khon', 2000000, 'product-uuid-1']),
    );
    expect(String(res.body.error || '')).not.toMatch(/normalizeVietnamese is not defined/);
  });

  it('POST /api/Products rejects missing name without calling normalizeVietnamese', async () => {
    const res = await request(makeApp())
      .post('/api/Products')
      .send({ type: 'service' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/i);
    expect(query).not.toHaveBeenCalled();
  });
});
