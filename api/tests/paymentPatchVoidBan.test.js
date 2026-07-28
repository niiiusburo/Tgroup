'use strict';

/**
 * AUD-009 — PATCH /api/Payments/:id must not mark status=voided without reverse logic.
 * Voiding requires POST /api/Payments/:id/void (or DELETE) which restores residuals.
 */

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
const { query, pool, withTransaction } = require('../src/db');

const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    throw new Error(`Unexpected global query: ${sql}`);
  });
}

function postedPaymentRow(overrides = {}) {
  return {
    id: PAYMENT_ID,
    customer_id: CUSTOMER_ID,
    service_id: null,
    amount: '500000',
    method: 'cash',
    notes: null,
    payment_date: '2026-07-28',
    reference_code: null,
    status: 'posted',
    receipt_number: null,
    deposit_type: null,
    created_at: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

describe('PATCH /api/Payments/:id void ban (AUD-009)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIpAccess();
  });

  const voidLikeBodies = [
    { name: 'status voided only', body: { status: 'voided' } },
    { name: 'status voided with notes', body: { status: 'voided', notes: 'oops' } },
    { name: 'status voided with amount', body: { status: 'voided', amount: 1 } },
  ];

  it.each(voidLikeBodies)('rejects $name without touching the payment row', async ({ body }) => {
    withTransaction.mockImplementation(async () => {
      throw new Error('withTransaction must not run when void is banned at the route gate');
    });
    pool.connect.mockImplementation(async () => {
      throw new Error('pool.connect must not run when void is banned at the route gate');
    });

    const res = await request(app)
      .patch(`/api/Payments/${PAYMENT_ID}`)
      .send(body);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/POST \/api\/Payments\/:id\/void/i);
    expect(withTransaction).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
    // No direct UPDATE either
    expect(query.mock.calls.some(([sql]) => /UPDATE\s+payments/i.test(sql))).toBe(false);
  });

  it('still allows non-void metadata PATCH (notes)', async () => {
    withTransaction.mockImplementation(async (work) => {
      const tx = jest.fn(async (sql) => {
        if (sql.includes('SELECT amount FROM payments') && sql.includes('FOR UPDATE')) {
          return [postedPaymentRow()];
        }
        if (sql.includes('UPDATE payments SET')) {
          return [postedPaymentRow({ notes: 'updated note' })];
        }
        throw new Error(`Unexpected tx sql: ${sql}`);
      });
      return work(tx);
    });

    const res = await request(app)
      .patch(`/api/Payments/${PAYMENT_ID}`)
      .send({ notes: 'updated note' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      id: PAYMENT_ID,
      notes: 'updated note',
      status: 'posted',
    }));
    expect(withTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects lowering amount below already-allocated total', async () => {
    withTransaction.mockImplementation(async (work) => {
      const tx = jest.fn(async (sql) => {
        if (sql.includes('SELECT amount FROM payments') && sql.includes('FOR UPDATE')) {
          return [postedPaymentRow({ amount: '500000' })];
        }
        if (sql.includes('SUM(allocated_amount)')) {
          return [{ allocated: '400000' }];
        }
        throw new Error(`Unexpected tx sql: ${sql}`);
      });
      return work(tx);
    });

    const res = await request(app)
      .patch(`/api/Payments/${PAYMENT_ID}`)
      .send({ amount: 100000 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already allocated/i);
  });
});
