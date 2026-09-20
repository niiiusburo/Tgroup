jest.mock('../../../db', () => ({
  query: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn().mockResolvedValue({
    groupName: 'admin',
    effectivePermissions: ['*'],
    locations: [],
  }),
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

jest.mock('../../../services/reports/canonicalRevenue', () => ({
  getCanonicalRevenue: jest.fn().mockResolvedValue({ total: 0 }),
  getCanonicalRevenueByMonth: jest.fn().mockResolvedValue([]),
  getCanonicalRevenueByLocation: jest.fn().mockResolvedValue([]),
}));

const express = require('express');
const request = require('supertest');
const { getVietnamToday, getEarliestLookbackDate } = require('../../../lib/dateUtils');
const dashboardRouter = require('../dashboard');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '44444444-4444-4444-8444-444444444444' };
    next();
  });
  app.use('/api/Reports', dashboardRouter);
  return app;
}

describe('report lookback enforcement', () => {
  it('rejects a from-date older than 3 months', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/Reports')
      .send({ dateFrom: '2020-01-01', dateTo: getVietnamToday() });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('LOOKBACK_EXCEEDED');
  });

  it('accepts the earliest allowed date', async () => {
    const app = makeApp();
    const today = getVietnamToday();
    const res = await request(app)
      .post('/api/Reports')
      .send({ dateFrom: getEarliestLookbackDate(today), dateTo: today });

    expect(res.status).not.toBe(400);
  });

  it('rejects omitted dates instead of returning unbounded history', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/Reports')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid params');
  });

  it('caps the dashboard trend at the 3-month lookback floor', async () => {
    const { getCanonicalRevenueByMonth } = require('../../../services/reports/canonicalRevenue');
    const app = makeApp();
    const today = getVietnamToday();
    const earliest = getEarliestLookbackDate(today);
    await request(app)
      .post('/api/Reports')
      .send({ dateFrom: earliest, dateTo: today });

    expect(getCanonicalRevenueByMonth).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: earliest, dateTo: today })
    );
  });
});
