jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions } = require('../../../services/permissionService');
const cashFlowRouter = require('../cashFlow');
const reportsRouter = require('../../reports');

const {
  classifyCashFlowRow,
  summarizeCashFlow,
  REVENUE_RULES,
} = cashFlowRouter._test;

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', cashFlowRouter);
  return app;
}

function makeParentReportsApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', reportsRouter);
  return app;
}

describe('reports cash-flow aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps deposit rules separate from revenue recognition', () => {
    expect(REVENUE_RULES).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'servicePayments', treatment: 'revenue' }),
      expect.objectContaining({ key: 'customerDeposits', treatment: 'cashFlowOnly' }),
      expect.objectContaining({ key: 'depositUsage', treatment: 'internalMovement' }),
      expect.objectContaining({ key: 'refunds', treatment: 'cashOutflow' }),
      expect.objectContaining({ key: 'voidedPayments', treatment: 'excluded' }),
    ]));
  });

  it('classifies service, deposit, refund, deposit usage, and voided rows', () => {
    expect(classifyCashFlowRow({
      amount: 5000000,
      method: 'mixed',
      cash_amount: 3000000,
      bank_amount: 1000000,
      deposit_used: 1000000,
      status: 'posted',
      report_date: '2026-05-06T00:00:00Z',
    })).toMatchObject({
      key: 'service_collections',
      direction: 'in',
      amount: 4000000,
      signedAmount: 4000000,
      date: '2026-05-06',
    });

    expect(classifyCashFlowRow({ amount: 2000000, deposit_type: 'deposit', status: 'posted' }))
      .toMatchObject({ key: 'customer_deposits', direction: 'in', signedAmount: 2000000 });
    expect(classifyCashFlowRow({ amount: -500000, deposit_type: 'refund', status: 'posted' }))
      .toMatchObject({ key: 'refunds', direction: 'out', signedAmount: -500000 });
    expect(classifyCashFlowRow({ amount: 1000000, method: 'deposit', deposit_used: 1000000, status: 'posted' }))
      .toMatchObject({ key: 'deposit_usage', direction: 'internal', amount: 1000000, signedAmount: 0 });
    expect(classifyCashFlowRow({ amount: 3000000, status: 'voided' }))
      .toMatchObject({ key: 'voided_adjustments', direction: 'adjustment', amount: 3000000, signedAmount: 0 });
  });

  it('summarizes external money movement without double-counting deposit usage or voids', () => {
    const summary = summarizeCashFlow([
      { amount: 5000000, method: 'mixed', cash_amount: 3000000, bank_amount: 1000000, deposit_used: 1000000, status: 'posted', report_date: '2026-05-06', proof_confirmed_at: '2026-05-06T10:00:00Z' },
      { amount: 2000000, deposit_type: 'deposit', status: 'posted', report_date: '2026-05-06', proof_confirmed_at: null },
      { amount: -500000, deposit_type: 'refund', status: 'posted', report_date: '2026-05-06' },
      { amount: 1000000, method: 'deposit', deposit_used: 1000000, status: 'posted', report_date: '2026-05-07' },
      { amount: 3000000, status: 'voided', report_date: '2026-05-07' },
    ]);

    expect(summary.moneyIn).toBe(6000000);
    expect(summary.moneyInConfirmed).toBe(4000000);
    expect(summary.moneyInUnconfirmed).toBe(2000000);
    expect(summary.moneyOut).toBe(500000);
    expect(summary.netCashFlow).toBe(5500000);
    expect(summary.internalDepositUsed).toBe(1000000);
    expect(summary.adjustments).toBe(3000000);
    expect(summary.categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'service_collections', count: 1, amount: 4000000, signedAmount: 4000000 }),
      expect.objectContaining({ key: 'customer_deposits', count: 1, amount: 2000000, signedAmount: 2000000 }),
      expect.objectContaining({ key: 'refunds', count: 1, amount: 500000, signedAmount: -500000 }),
      expect.objectContaining({ key: 'deposit_usage', count: 1, amount: 1000000, signedAmount: 0 }),
      expect.objectContaining({ key: 'voided_adjustments', count: 1, amount: 3000000, signedAmount: 0 }),
    ]));
    expect(summary.trend).toEqual([
      { date: '2026-05-06', moneyIn: 6000000, moneyOut: 500000, netCashFlow: 5500000 },
      { date: '2026-05-07', moneyIn: 0, moneyOut: 0, netCashFlow: 0 },
    ]);
  });

  it('filters the route through customer and allocation location scope without payments.companyid', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });
    query.mockResolvedValueOnce([
      { amount: 1000000, method: 'cash', status: 'posted', report_date: '2026-05-06' },
    ]);

    const res = await request(makeApp())
      .post('/api/Reports/cash-flow/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('p.companyid');
    expect(sql).toContain('report_customer.companyid = ANY($3::uuid[])');
    expect(sql).toContain('dbo.payment_allocations');
    expect(sql).toContain('COALESCE(report_so.companyid, report_dk.companyid) = ANY($3::uuid[])');
    expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
  });

  it('mounts cash-flow summary through the parent reports router', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);

    const res = await request(makeParentReportsApp())
      .post('/api/Reports/cash-flow/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      moneyIn: 0,
      moneyOut: 0,
      netCashFlow: 0,
    });
  });

  it('allows the Admin group to run all-location cash-flow reports without wildcard or location rows', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Admin',
      effectivePermissions: ['reports.view', 'permissions.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/cash-flow/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('ANY(');
    expect(sql).not.toContain('p.companyid');
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('allows the Super Admin group label to run all-location cash-flow reports', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Super Admin',
      effectivePermissions: ['reports.view', 'permissions.view'],
      locations: [],
    });
    query.mockResolvedValueOnce([]);

    const res = await request(makeApp())
      .post('/api/Reports/cash-flow/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain('ANY(');
    expect(params).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('rejects a requested cash-flow location outside the employee scope', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'Location A' }],
    });

    const res = await request(makeApp())
      .post('/api/Reports/cash-flow/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });
});
