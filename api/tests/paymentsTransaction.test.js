process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: jest.fn(() => (_req, _res, next) => next()),
  requireAnyPermission: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

const request = require('supertest');
const app = require('../src/server');
const { query, pool } = require('../src/db');

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const INVOICE_ID = '22222222-2222-4222-8222-222222222222';
const PAYMENT_ID = '33333333-3333-4333-8333-333333333333';
const ALLOCATION_ID = '44444444-4444-4444-8444-444444444444';

function mockIpAccess() {
  query.mockImplementation(async (sql) => {
    if (sql.includes('ip_access_settings')) return [{ mode: 'disabled' }];
    if (sql.includes('ip_access_entries')) return [];
    throw new Error(`Unexpected global query: ${sql}`);
  });
}

function makeClient(implementation) {
  const client = {
    query: jest.fn(implementation),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

describe('POST /api/Payments transaction integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIpAccess();
  });

  it('commits payment insert, allocation insert, and residual update on the same client', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT residual FROM saleorders')) return { rows: [{ residual: '1200000' }] };
      if (sql.includes('INSERT INTO payments')) {
        return {
          rows: [{
            id: PAYMENT_ID,
            customer_id: CUSTOMER_ID,
            service_id: null,
            amount: '1200000',
            method: 'cash',
            notes: 'partial',
            payment_date: '2026-05-02',
            reference_code: 'CUST.IN/2026/1',
            status: 'posted',
            deposit_used: '0',
            cash_amount: '1200000',
            bank_amount: '0',
            receipt_number: null,
            deposit_type: null,
            created_at: '2026-05-02T00:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO payment_allocations')) {
        return {
          rows: [{
            id: ALLOCATION_ID,
            payment_id: PAYMENT_ID,
            invoice_id: INVOICE_ID,
            dotkham_id: null,
            allocated_amount: '1200000',
          }],
        };
      }
      if (sql.includes('UPDATE saleorders SET residual')) return { rows: [] };
      throw new Error(`Unexpected client query: ${sql}`);
    });

    const res = await request(app)
      .post('/api/Payments')
      .send({
        customer_id: CUSTOMER_ID,
        amount: 1200000,
        method: 'cash',
        notes: 'partial',
        payment_date: '2026-05-02',
        reference_code: 'CUST.IN/2026/1',
        cash_amount: 1200000,
        allocations: [{ invoice_id: INVOICE_ID, allocated_amount: 1200000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      id: PAYMENT_ID,
      customerId: CUSTOMER_ID,
      amount: 1200000,
      method: 'cash',
      allocations: [
        expect.objectContaining({
          id: ALLOCATION_ID,
          invoiceId: INVOICE_ID,
          allocatedAmount: 1200000,
        }),
      ],
    }));
    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      'BEGIN',
      expect.stringContaining('INSERT INTO payments'),
      expect.stringContaining('INSERT INTO payment_allocations'),
      expect.stringContaining('UPDATE saleorders SET residual'),
      'COMMIT',
    ]));
    expect(client.query.mock.calls.map(([sql]) => sql)).not.toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO payments'))).toBe(false);
  });

  it('keeps explicit deposit receipts in the deposit category', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('INSERT INTO payments')) {
        return {
          rows: [{
            id: PAYMENT_ID,
            customer_id: CUSTOMER_ID,
            service_id: null,
            amount: '500000',
            method: 'cash',
            notes: 'deposit top-up',
            payment_date: '2026-05-09',
            reference_code: null,
            status: 'posted',
            deposit_used: '0',
            cash_amount: '500000',
            bank_amount: '0',
            receipt_number: 'TUKH/2026/00001',
            deposit_type: 'deposit',
            payment_category: 'deposit',
            created_at: '2026-05-09T00:00:00.000Z',
          }],
        };
      }
      throw new Error(`Unexpected client query: ${sql}`);
    });

    const res = await request(app)
      .post('/api/Payments')
      .send({
        customer_id: CUSTOMER_ID,
        amount: 500000,
        method: 'cash',
        notes: 'deposit top-up',
        payment_date: '2026-05-09',
        cash_amount: 500000,
        deposit_type: 'deposit',
        receipt_number: 'TUKH/2026/00001',
      });

    expect(res.status).toBe(201);
    const insertCall = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO payments'));
    expect(insertCall).toBeTruthy();
    expect(insertCall[1][11]).toBe('deposit');
    expect(insertCall[1][13]).toBe('deposit');
    expect(client.query.mock.calls.map(([sql]) => sql)).toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back the payment insert when allocation insert fails', async () => {
    const client = makeClient(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('SELECT residual FROM saleorders')) return { rows: [{ residual: '1200000' }] };
      if (sql.includes('INSERT INTO payments')) {
        return {
          rows: [{
            id: PAYMENT_ID,
            customer_id: CUSTOMER_ID,
            service_id: null,
            amount: '1200000',
            method: 'cash',
            notes: null,
            payment_date: '2026-05-02',
            reference_code: null,
            status: 'posted',
            deposit_used: '0',
            cash_amount: '1200000',
            bank_amount: '0',
            receipt_number: null,
            deposit_type: null,
            created_at: '2026-05-02T00:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO payment_allocations')) {
        throw new Error('allocation insert failed');
      }
      throw new Error(`Unexpected client query: ${sql}`);
    });

    const res = await request(app)
      .post('/api/Payments')
      .send({
        customer_id: CUSTOMER_ID,
        amount: 1200000,
        method: 'cash',
        payment_date: '2026-05-02',
        cash_amount: 1200000,
        allocations: [{ invoice_id: INVOICE_ID, allocated_amount: 1200000 }],
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create payment' });
    expect(client.query.mock.calls.map(([sql]) => sql)).toContain('ROLLBACK');
    expect(client.query.mock.calls.map(([sql]) => sql)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
