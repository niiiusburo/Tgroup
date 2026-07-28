'use strict';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
  withTransaction: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const app = require('../src/server');
const { query, pool } = require('../src/db');

const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    throw new Error(`Unexpected global query: ${sql}`);
  });
}

function makeClient(status = 'posted') {
  const allocations = [
    {
      invoice_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      dotkham_id: null,
      allocated_amount: '2',
    },
    {
      invoice_id: null,
      dotkham_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      allocated_amount: '3',
    },
    {
      invoice_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      dotkham_id: null,
      allocated_amount: '4',
    },
  ];
  const client = {
    query: jest.fn(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM payments') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: PAYMENT_ID, status }] };
      }
      if (sql.includes('FROM payment_allocations')) return { rows: allocations };
      if (sql.includes('FOR UPDATE')) return { rows: [{ id: 'target' }] };
      if (sql.startsWith('UPDATE saleorders') || sql.startsWith('UPDATE dotkhams')) {
        return { rows: [] };
      }
      if (sql.startsWith('DELETE FROM payment_allocations')) return { rows: [] };
      if (sql.startsWith('DELETE FROM payments')) return { rows: [{ id: PAYMENT_ID }] };
      if (sql.startsWith('UPDATE payments SET status')) {
        return { rows: [{ id: PAYMENT_ID, status: 'voided' }] };
      }
      throw new Error(`Unexpected client query: ${sql}`);
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('payment reversal transaction guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIpAccess();
  });

  it.each([
    ['void', () => request(app).post(`/api/Payments/${PAYMENT_ID}/void`).send({ reason: 'duplicate' })],
    ['delete', () => request(app).delete(`/api/Payments/${PAYMENT_ID}`)],
  ])('locks payment and targets before %s reversal writes', async (_label, sendRequest) => {
    const client = makeClient();
    const res = await sendRequest();

    expect(res.status).toBe(200);
    const sqls = client.query.mock.calls.map(([sql]) => sql);
    const paymentLockIndex = sqls.findIndex((sql) =>
      sql.includes('FROM payments') && sql.includes('FOR UPDATE'));
    const allocationReadIndex = sqls.findIndex((sql) =>
      sql.includes('FROM payment_allocations'));
    const targetLockIndexes = sqls
      .map((sql, index) => ({ sql, index }))
      .filter(({ sql }) => !sql.includes('FROM payments') && sql.includes('FOR UPDATE'))
      .map(({ index }) => index);
    const firstResidualUpdateIndex = sqls.findIndex((sql) =>
      sql.startsWith('UPDATE saleorders') || sql.startsWith('UPDATE dotkhams'));

    expect(paymentLockIndex).toBeGreaterThanOrEqual(0);
    expect(paymentLockIndex).toBeLessThan(allocationReadIndex);
    expect(targetLockIndexes).toHaveLength(3);
    expect(Math.max(...targetLockIndexes)).toBeLessThan(firstResidualUpdateIndex);
    expect(sqls).toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rejects a second void before reading or deleting allocations', async () => {
    const client = makeClient('voided');
    const res = await request(app)
      .post(`/api/Payments/${PAYMENT_ID}/void`)
      .send({ reason: 'duplicate' });

    expect(res.status).toBe(409);
    const sqls = client.query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((sql) => sql.includes('FROM payment_allocations'))).toBe(false);
    expect(sqls.some((sql) => sql.startsWith('DELETE'))).toBe(false);
    expect(sqls).toContain('ROLLBACK');
  });
});
