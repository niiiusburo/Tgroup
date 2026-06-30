'use strict';

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
const reportsRouter = require('../../reports');

const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: EMPLOYEE_ID };
    next();
  });
  app.use('/api/Reports', reportsRouter);
  return app;
}

function scopedEmployee() {
  return {
    groupName: 'Employee',
    effectivePermissions: ['reports.view'],
    locations: [{ id: LOC_A, name: 'Location A' }],
  };
}

describe('reports employee location scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInvestorScope.mockResolvedValue({ isInvestor: false, allowedCustomerIds: [] });
  });

  it('scopes appointment reports to allowed company IDs when companyId is empty', async () => {
    resolveEffectivePermissions.mockResolvedValue(scopedEmployee());
    query
      .mockResolvedValueOnce([{ state: 'completed', cnt: '1' }])
      .mockResolvedValueOnce([{ total: '1', converted: '0' }])
      .mockResolvedValueOnce([{ repeat_cust: '0', new_cust: '1' }]);

    const res = await request(makeApp())
      .post('/api/Reports/appointments/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(3);
    for (const [sql, params] of query.mock.calls) {
      expect(sql).toContain('companyid = ANY($3::uuid[])');
      expect(params).toEqual(['2026-05-01', '2026-05-31', [LOC_A]]);
    }
  });

  it('rejects appointment report requests for an explicit unauthorized companyId', async () => {
    resolveEffectivePermissions.mockResolvedValue(scopedEmployee());
    query
      .mockResolvedValueOnce([{ state: 'completed', cnt: '1' }])
      .mockResolvedValueOnce([{ total: '1', converted: '0' }])
      .mockResolvedValueOnce([{ repeat_cust: '0', new_cust: '1' }]);

    const res = await request(makeApp())
      .post('/api/Reports/appointments/summary')
      .send({ dateFrom: '2026-05-01', dateTo: '2026-05-31', companyId: LOC_B });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Location not allowed' });
    expect(query).not.toHaveBeenCalled();
  });

  it('scopes employees overview to allowed company IDs when companyId is empty', async () => {
    resolveEffectivePermissions.mockResolvedValue(scopedEmployee());
    query
      .mockResolvedValueOnce([{ doctors: '1', assistants: '0', receptionists: '0', total: '1' }])
      .mockResolvedValueOnce([{ location: 'Location A', cnt: '1', doctors: '1', assistants: '0' }])
      .mockResolvedValueOnce([{ id: 'emp-1', name: 'Dr A', isdoctor: true, isassistant: false, isreceptionist: false, active: true }]);

    const res = await request(makeApp())
      .post('/api/Reports/employees/overview')
      .send({});

    expect(res.status).toBe(200);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0][0]).toContain('companyid = ANY($1::uuid[])');
    expect(query.mock.calls[1][0]).toContain('c.id = ANY($1::uuid[])');
    expect(query.mock.calls[2][0]).toContain('p.companyid = ANY($1::uuid[])');
    expect(query.mock.calls.map(([, params]) => params)).toEqual([[[LOC_A]], [[LOC_A]], [[LOC_A]]]);
  });
});
