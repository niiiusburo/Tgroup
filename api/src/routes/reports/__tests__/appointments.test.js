jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

jest.mock('../../../middleware/auth', () => ({
  requirePermission: () => (_req, _res, next) => next(),
}));

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
  resolveInvestorScope: jest.fn().mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] }),
}));

const express = require('express');
const request = require('supertest');
const { query } = require('../../../db');
const { resolveEffectivePermissions, resolveInvestorScope } = require('../../../services/permissionService');
const appointmentsRouter = require('../appointments');

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage -- isolated Jest route harness, not a production Express app.
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: '33333333-3333-4333-8333-333333333333' };
    next();
  });
  app.use('/api/Reports', appointmentsRouter);
  return app;
}

describe('reports appointments summary and trend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['reports.view'],
      locations: [],
    });
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  describe('POST /appointments/summary', () => {
    it('allows Super Admin to view all appointments without location filter', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        groupName: 'Super Admin',
        effectivePermissions: ['reports.view'],
        locations: [],
      });
      query.mockResolvedValueOnce([
        { state: 'done', cnt: '10' },
        { state: 'cancel', cnt: '2' },
      ]);
      query.mockResolvedValueOnce([{ total: '12', converted: '8' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '5', new_cust: '7' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledTimes(3);
      const [sql, params] = query.mock.calls[0];
      // Super Admin: no location filter, just date range
      expect(sql).not.toContain('companyid = ANY(');
      expect(params).toEqual(['2026-05-01', '2026-05-31']);
    });

    it('allows Admin group to view all appointments without location filter', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        groupName: 'Admin',
        effectivePermissions: ['reports.view'],
        locations: [],
      });
      query.mockResolvedValueOnce([{ state: 'done', cnt: '5' }]);
      query.mockResolvedValueOnce([{ total: '10', converted: '3' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '2', new_cust: '8' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      expect(sql).not.toContain('companyid = ANY(');
      expect(params).toEqual(['2026-05-01', '2026-05-31']);
    });

    it('filters location-scoped staff to their allowed locations when no companyId requested', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [
          { id: LOC_A, name: 'Location A' },
          { id: LOC_B, name: 'Location B' },
        ],
      });
      query.mockResolvedValueOnce([{ state: 'done', cnt: '3' }]);
      query.mockResolvedValueOnce([{ total: '5', converted: '2' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '1', new_cust: '4' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      // Location-scoped staff: should have companyid = ANY($3::uuid[]) with [LOC_A, LOC_B]
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A, LOC_B]]);
    });

    it('filters location-scoped staff to their requested location when within scope', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });
      query.mockResolvedValueOnce([{ state: 'done', cnt: '2' }]);
      query.mockResolvedValueOnce([{ total: '4', converted: '1' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '0', new_cust: '4' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
    });

    it('rejects location-scoped staff requesting a location outside their scope with 403', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
      expect(query).not.toHaveBeenCalled();
    });

    it('allows investor to request specific location while retaining customer filter', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        groupName: 'investor',
        effectivePermissions: ['reports.view'],
        locations: [],
      });
      resolveInvestorScope.mockResolvedValue({
        isInvestor: true,
        allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
      });
      query.mockResolvedValueOnce([{ state: 'done', cnt: '1' }]);
      query.mockResolvedValueOnce([{ total: '2', converted: '0' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '0', new_cust: '2' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      // Investor scope: location filter + customer filter
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(sql).toContain('partnerid = ANY($4::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A], ['44444444-4444-4444-8444-444444444444']]);
    });
  });

  describe('POST /appointments/trend', () => {
    it('allows Super Admin to view appointment trend for all locations', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        groupName: 'Super Admin',
        effectivePermissions: ['reports.view'],
        locations: [],
      });
      query.mockResolvedValueOnce([
        { week: '2026-05-01', total: '20', done: '18', cancelled: '1' },
      ]);
      query.mockResolvedValueOnce([
        { hour: '9', cnt: '5' },
        { hour: '15', cnt: '7' },
      ]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/trend')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      expect(sql).not.toContain('companyid = ANY(');
      expect(params).toEqual(['2026-05-01', '2026-05-31']);
    });

    it('filters location-scoped staff to their allowed locations in trend data', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });
      query.mockResolvedValueOnce([
        { week: '2026-05-01', total: '10', done: '9', cancelled: '0' },
      ]);
      query.mockResolvedValueOnce([
        { hour: '14', cnt: '3' },
      ]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/trend')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
    });

    it('rejects location-scoped staff requesting trend for disallowed location with 403', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });

      const res = await request(makeApp())
        .post('/api/Reports/appointments/trend')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
      expect(query).not.toHaveBeenCalled();
    });

    it('applies both location and customer filters for investor trend requests', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        groupName: 'investor',
        effectivePermissions: ['reports.view'],
        locations: [],
      });
      resolveInvestorScope.mockResolvedValue({
        isInvestor: true,
        allowedCustomerIds: ['44444444-4444-4444-8444-444444444444'],
      });
      query.mockResolvedValueOnce([
        { week: '2026-05-01', total: '5', done: '5', cancelled: '0' },
      ]);
      query.mockResolvedValueOnce([
        { hour: '10', cnt: '2' },
      ]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/trend')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_A });

      expect(res.status).toBe(200);
      const [sql, params] = query.mock.calls[0];
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(sql).toContain('partnerid = ANY($4::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A], ['44444444-4444-4444-8444-444444444444']]);
    });

    it('correctly reuses fWhere and fParams for both trend and hours queries', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });
      query.mockResolvedValueOnce([{ week: '2026-05-01', total: '8', done: '7', cancelled: '0' }]);
      query.mockResolvedValueOnce([{ hour: '11', cnt: '4' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/trend')
        .send({ dateFrom: '2026-05-15', dateTo: '2026-05-20', companyId: LOC_A });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalledTimes(2);

      // Both queries should use the same filter params
      const [sql1, params1] = query.mock.calls[0];
      const [sql2, params2] = query.mock.calls[1];
      expect(params1).toEqual(['2026-05-15', '2026-05-20', [LOC_A]]);
      expect(params2).toEqual(['2026-05-15', '2026-05-20', [LOC_A]]);
      expect(sql1).toContain('DATE_TRUNC');
      expect(sql2).toContain('EXTRACT(HOUR');
    });
  });

  describe('parameter validation', () => {
    it('rejects invalid date format', async () => {
      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: 'not-a-date', dateTo: '2026-05-31', companyId: LOC_A });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, error: 'Invalid params' });
      expect(query).not.toHaveBeenCalled();
    });

    it('rejects invalid UUID format', async () => {
      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: 'not-a-uuid' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ success: false, error: 'Invalid params' });
      expect(query).not.toHaveBeenCalled();
    });

    it('allows null companyId (all locations for user scope)', async () => {
      resolveEffectivePermissions.mockResolvedValue({
        effectivePermissions: ['reports.view'],
        locations: [{ id: LOC_A, name: 'Location A' }],
      });
      query.mockResolvedValueOnce([{ state: 'done', cnt: '3' }]);
      query.mockResolvedValueOnce([{ total: '5', converted: '2' }]);
      query.mockResolvedValueOnce([{ repeat_cust: '1', new_cust: '4' }]);

      const res = await request(makeApp())
        .post('/api/Reports/appointments/summary')
        .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: null });

      expect(res.status).toBe(200);
      expect(query).toHaveBeenCalled();
    });
  });
});
