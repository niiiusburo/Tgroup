jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const request = require('supertest');
const app = require('../src/server');
const { query } = require('../src/db');

describe('DELETE /api/SaleOrderLines/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('soft-deletes the service line and keeps the parent order when active lines remain', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.startsWith('UPDATE saleorderlines')) return [{ id: 'line-id', orderid: 'order-id' }];
      if (sql.includes('COUNT(*) AS count')) return [{ count: '1' }];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      id: 'line-id',
      orderId: 'order-id',
      deletedOrder: false,
    });
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE saleorders'))).toBe(false);
  });

  it('soft-deletes the parent order when the last active line is deleted', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
      if (sql.includes('ip_access_entries')) return [];
      if (sql.startsWith('UPDATE saleorderlines')) return [{ id: 'line-id', orderid: 'order-id' }];
      if (sql.includes('COUNT(*) AS count')) return [{ count: '0' }];
      if (sql.startsWith('UPDATE saleorders')) return [{ id: 'order-id' }];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const res = await request(app).delete('/api/SaleOrderLines/line-id');

    expect(res.status).toBe(200);
    expect(res.body.deletedOrder).toBe(true);
    const orderUpdate = query.mock.calls.find(([sql]) => sql.startsWith('UPDATE saleorders'));
    expect(orderUpdate?.[1]).toEqual(['order-id']);
  });
});
