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
const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const paymentsRouter = require('../../payments');

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

describe('payment proof confirmation endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms the latest proof when permitted', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['payment.confirm'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted' }]) // payment status
      .mockResolvedValueOnce([{ id: 'proof-1', confirmed_at: null, confirmed_by: null }]) // latest proof
      .mockResolvedValueOnce([{ id: 'proof-1', confirmed_at: '2026-05-08T10:00:00', confirmed_by: '33333333-3333-4333-8333-333333333333' }]); // update

    const res = await request(makeApp()).post('/api/Payments/pay-1/proof/confirm').send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      proofId: 'proof-1',
      alreadyConfirmed: false,
    });
  });

  it('returns alreadyConfirmed when proof was already confirmed', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['payment.confirm'],
      locations: [],
    });

    query
      .mockResolvedValueOnce([{ id: 'pay-1', status: 'posted' }])
      .mockResolvedValueOnce([{ id: 'proof-1', confirmed_at: '2026-05-08T10:00:00', confirmed_by: 'emp-1' }]);

    const res = await request(makeApp()).post('/api/Payments/pay-1/proof/confirm').send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      proofId: 'proof-1',
      alreadyConfirmed: true,
    });
  });

  it('rejects when forbidden (missing payment.confirm)', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['payment.view'],
      locations: [],
    });

    const res = await request(makeApp()).post('/api/Payments/pay-1/proof/confirm').send({});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Permission denied: payment.confirm' });
    expect(query).not.toHaveBeenCalled();
  });
});

