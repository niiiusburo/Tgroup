'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const reportsRouter = require('../../reports');

const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';
const CLIENT_A = '44444444-4444-4444-8444-444444444444';

const DATE_FILTERS = { dateFrom: '2026-05-01', dateTo: '2026-05-31' };

const COMPANY_FILTER_ENDPOINTS = [
  '/api/Reports/dashboard',
  '/api/Reports/revenue/summary',
  '/api/Reports/revenue/trend',
  '/api/Reports/revenue/by-location',
  '/api/Reports/revenue/by-doctor',
  '/api/Reports/revenue/by-category',
  '/api/Reports/revenue/by-source',
  '/api/Reports/revenue/payment-plans',
  '/api/Reports/cash-flow/summary',
  '/api/Reports/appointments/summary',
  '/api/Reports/appointments/trend',
  '/api/Reports/doctors/performance',
  '/api/Reports/customers/summary',
  '/api/Reports/employees/overview',
  '/api/Reports/services/breakdown',
  '/api/Reports/locations/comparison',
];

const CUSTOMER_LINKED_ENDPOINTS = [
  '/api/Reports/dashboard',
  '/api/Reports/revenue/summary',
  '/api/Reports/revenue/trend',
  '/api/Reports/revenue/by-location',
  '/api/Reports/revenue/by-doctor',
  '/api/Reports/revenue/by-category',
  '/api/Reports/revenue/by-source',
  '/api/Reports/revenue/payment-plans',
  '/api/Reports/cash-flow/summary',
  '/api/Reports/appointments/summary',
  '/api/Reports/appointments/trend',
  '/api/Reports/doctors/performance',
  '/api/Reports/customers/summary',
  '/api/Reports/services/breakdown',
  '/api/Reports/locations/comparison',
];

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: EMPLOYEE_ID, name: 'Scoped Manager' };
    next();
  });
  app.use('/api/Reports', reportsRouter);
  return app;
}

function setScopedManager(locations = [{ id: LOC_A, name: 'Location A' }]) {
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'Manager',
    effectivePermissions: ['reports.view'],
    locations,
  });
  resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
}

function setInvestor() {
  resolveEffectivePermissions.mockResolvedValue({
    groupName: 'investor',
    effectivePermissions: ['reports.view'],
    locations: [],
  });
  resolveInvestorScope.mockResolvedValue({
    isInvestor: true,
    allowedCustomerIds: [CLIENT_A],
  });
}

function mockEmptyRows() {
  query.mockResolvedValue([]);
}

function hasArrayParam(params, expectedId) {
  return params.some((param) => Array.isArray(param) && param.includes(expectedId));
}

function scopedSqlCalls(expectedId) {
  return query.mock.calls.filter(([sql, params = []]) =>
    String(sql).includes('ANY(') && hasArrayParam(params, expectedId)
  );
}

describe('Reports route location and investor scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyRows();
    setScopedManager();
  });

  it.each(COMPANY_FILTER_ENDPOINTS)('rejects out-of-scope companyId on %s', async (endpoint) => {
    const res = await request(makeApp())
      .post(endpoint)
      .send({ ...DATE_FILTERS, companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it.each(COMPANY_FILTER_ENDPOINTS)('narrows all-location staff report %s to allowed locations', async (endpoint) => {
    const res = await request(makeApp())
      .post(endpoint)
      .send(DATE_FILTERS);

    expect(res.status).toBe(200);
    expect(scopedSqlCalls(LOC_A).length).toBeGreaterThan(0);
  });

  it.each(CUSTOMER_LINKED_ENDPOINTS)('narrows investor report %s to checked clients', async (endpoint) => {
    setInvestor();

    const res = await request(makeApp())
      .post(endpoint)
      .send(DATE_FILTERS);

    expect(res.status).toBe(200);
    expect(scopedSqlCalls(CLIENT_A).length).toBeGreaterThan(0);
  });

  it('fails closed for employee-only report when no location scope exists', async () => {
    setScopedManager([]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send(DATE_FILTERS);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location scope required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed for investor employee-only report because customer scope is not location scope', async () => {
    setInvestor();

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send(DATE_FILTERS);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location scope required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('does not expose location employee counts to investor reports', async () => {
    setInvestor();

    const res = await request(makeApp())
      .post('/api/Reports/locations/comparison')
      .send(DATE_FILTERS);

    expect(res.status).toBe(200);
    const [locationsSql] = query.mock.calls[0];
    expect(String(locationsSql)).toContain('FROM dbo.partners WHERE false GROUP BY companyid');
  });
});
