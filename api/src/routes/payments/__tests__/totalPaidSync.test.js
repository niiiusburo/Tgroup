jest.mock('../../../db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { pool } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const paymentsRouter = require('../../payments');

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Payments', paymentsRouter);
  return app;
}

// Answers each SQL statement by shape so the test does not depend on call order.
function makeClient() {
  const client = {
    release: jest.fn(),
    query: jest.fn(async (sql) => {
      if (/SELECT residual FROM saleorders/.test(sql)) return { rows: [{ residual: '10000000' }] };
      if (/INSERT INTO payments/.test(sql)) {
        return { rows: [{ id: 'pay-1', customer_id: CUSTOMER_ID, amount: '3000000', status: 'posted' }] };
      }
      if (/INSERT INTO payment_allocations/.test(sql)) {
        return { rows: [{ id: 'alloc-1', invoice_id: ORDER_ID, dotkham_id: null, allocated_amount: '3000000' }] };
      }
      if (/SELECT invoice_id, dotkham_id, allocated_amount FROM payment_allocations/.test(sql)) {
        return { rows: [{ invoice_id: ORDER_ID, dotkham_id: null, allocated_amount: '3000000' }] };
      }
      if (/DELETE FROM payments/.test(sql)) return { rows: [{ id: 'pay-1' }] };
      if (/UPDATE payments SET status = 'voided'/.test(sql)) return { rows: [{ id: 'pay-1', status: 'voided' }] };
      return { rows: [] };
    }),
  };
  pool.connect.mockResolvedValue(client);
  return client;
}

function totalPaidSyncCalls(client) {
  return client.query.mock.calls.filter(([sql]) => /UPDATE saleorders SET .*totalpaid/.test(sql));
}

describe('payments move saleorders.totalpaid with the same allocation as residual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['payment.add', 'payment.void'],
      locations: [],
    });
  });

  it('raises totalpaid by the allocated amount when a payment is allocated to a treatment order', async () => {
    const client = makeClient();

    const res = await request(makeApp()).post('/api/Payments').send({
      customer_id: CUSTOMER_ID,
      amount: 3000000,
      method: 'cash',
      allocations: [{ invoice_id: ORDER_ID, allocated_amount: 3000000 }],
    });

    expect(res.status).toBe(201);
    const calls = totalPaidSyncCalls(client);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toMatch(/totalpaid = COALESCE\(totalpaid, 0\) \+ \$1/);
    expect(calls[0][0]).toMatch(/residual = GREATEST\(0, residual - \$1\)/);
    expect(calls[0][1]).toEqual(['3000000', ORDER_ID]);
  });

  it('lowers totalpaid by the reversed amount when a payment is voided', async () => {
    const client = makeClient();

    const res = await request(makeApp()).post('/api/Payments/pay-1/void').send({ reason: 'test' });

    expect(res.status).toBe(200);
    const calls = totalPaidSyncCalls(client);
    expect(calls.map(([, params]) => params)).toEqual([['3000000', ORDER_ID]]);
    expect(calls[0][0]).toMatch(/totalpaid = GREATEST\(0, COALESCE\(totalpaid, 0\) - \$1\)/);
  });

  it('lowers totalpaid by the reversed amount when a payment is deleted', async () => {
    const client = makeClient();

    const res = await request(makeApp()).delete('/api/Payments/pay-1');

    expect(res.status).toBe(200);
    const calls = totalPaidSyncCalls(client);
    expect(calls.map(([, params]) => params)).toEqual([['3000000', ORDER_ID]]);
    expect(calls[0][0]).toMatch(/totalpaid = GREATEST\(0, COALESCE\(totalpaid, 0\) - \$1\)/);
  });

  it('copies order paid/owed onto the line of a single-line order after each change', async () => {
    const client = makeClient();

    await request(makeApp()).post('/api/Payments').send({
      customer_id: CUSTOMER_ID,
      amount: 3000000,
      method: 'cash',
      allocations: [{ invoice_id: ORDER_ID, allocated_amount: 3000000 }],
    });
    await request(makeApp()).post('/api/Payments/pay-1/void').send({ reason: 'test' });

    const lineSyncs = client.query.mock.calls.filter(([sql]) => /UPDATE saleorderlines sol/.test(sql));
    expect(lineSyncs.map(([, params]) => params)).toEqual([[ORDER_ID], [ORDER_ID]]);
    expect(lineSyncs[0][0]).toMatch(/COUNT\(\*\)[\s\S]*= 1/);
  });

  it('does not touch saleorders.totalpaid for a deposit with no allocations', async () => {
    const client = makeClient();

    const res = await request(makeApp()).post('/api/Payments').send({
      customer_id: CUSTOMER_ID,
      amount: 3000000,
      method: 'cash',
      deposit_type: 'deposit',
      receipt_number: 'TUKH/2026/00001',
    });

    expect(res.status).toBe(201);
    expect(totalPaidSyncCalls(client)).toHaveLength(0);
  });
});
