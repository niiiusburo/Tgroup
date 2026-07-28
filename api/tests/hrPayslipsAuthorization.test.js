'use strict';

const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const request = require('supertest');

const mockResolveEffectivePermissions = jest.fn();
const mockQuery = jest.fn();

jest.mock('../src/services/permissionService', () => ({
  resolveEffectivePermissions: (...args) => mockResolveEffectivePermissions(...args),
}));

jest.mock('../src/db', () => ({
  query: (...args) => mockQuery(...args),
}));

const { requireAuth } = require('../src/middleware/auth');
const hrPayslipsRouter = require('../src/routes/hrPayslips');

const JWT_SECRET = 'hr-payslips-authorization-test-secret';
const INVESTOR_ID = '11111111-1111-4111-8111-111111111111';
const STAFF_ID = '22222222-2222-4222-8222-222222222222';
const originalJwtSecret = process.env.JWT_SECRET;

function makeApp() {
  const app = express();
  app.use('/api/HrPayslips', requireAuth, hrPayslipsRouter);
  return app;
}

function bearerToken(employeeId) {
  return jwt.sign({ employeeId }, JWT_SECRET);
}

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterAll(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

beforeEach(() => {
  mockResolveEffectivePermissions.mockReset();
  mockQuery.mockReset();
});

describe('HrPayslips authorization behavior (AUD-012)', () => {
  const investorRequests = [
    '/api/HrPayslips',
    '/api/HrPayslips/Runs',
    '/api/HrPayslips/Structures',
    '/api/HrPayslips/payslip-1',
  ];

  it.each(investorRequests)(
    'returns 403 before SQL for an investor requesting GET %s',
    async (path) => {
      mockResolveEffectivePermissions.mockResolvedValue({
        groupId: 'investor-group',
        groupName: 'investor',
        effectivePermissions: ['customers.view'],
        locations: [],
      });

      const response = await request(makeApp())
        .get(path)
        .set('Authorization', `Bearer ${bearerToken(INVESTOR_ID)}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Permission denied: employees.view' });
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );

  it('keeps employees.view out of the investor permission seed', () => {
    const migration = fs.readFileSync(
      path.resolve(__dirname, '../migrations/048_investor_customer_scope.sql'),
      'utf8'
    );
    const seedArray = migration.match(/inv_perms TEXT\[\] := ARRAY\[([\s\S]*?)\];/);
    expect(seedArray).not.toBeNull();

    const seededPermissions = [...seedArray[1].matchAll(/'([^']+)'/g)]
      .map((match) => match[1]);
    expect(seededPermissions).not.toContain('employees.view');
  });

  it('preserves authorized staff access to the payslip list', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({
      groupId: 'hr-group',
      groupName: 'hr',
      effectivePermissions: ['employees.view'],
      locations: [],
    });
    mockQuery
      .mockResolvedValueOnce([{ id: 'payslip-1', netSalary: 12000000 }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{
        totalsalary: 15000000,
        totalnetsalary: 12000000,
        totaltax: 1000000,
        totalinsurance: 1000000,
        totaladvance: 1000000,
        draftcount: 0,
        donecount: 1,
        paidcount: 0,
      }]);

    const response = await request(makeApp())
      .get('/api/HrPayslips')
      .set('Authorization', `Bearer ${bearerToken(STAFF_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalItems: 1,
      items: [{ id: 'payslip-1', netSalary: 12000000 }],
      aggregates: {
        totalNetSalary: 12000000,
        totalTax: 1000000,
        totalInsurance: 1000000,
        totalAdvance: 1000000,
      },
    });
  });

  it('preserves authorized staff access to payslip runs', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['employees.view'],
    });
    mockQuery
      .mockResolvedValueOnce([{ id: 'run-1', name: 'July 2026' }])
      .mockResolvedValueOnce([{ count: '1' }]);

    const response = await request(makeApp())
      .get('/api/HrPayslips/Runs')
      .set('Authorization', `Bearer ${bearerToken(STAFF_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalItems: 1,
      items: [{ id: 'run-1', name: 'July 2026' }],
    });
  });

  it('preserves authorized staff access to payroll structures', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['employees.view'],
    });
    mockQuery.mockResolvedValueOnce([{ id: 'structure-1', name: 'Standard' }]);

    const response = await request(makeApp())
      .get('/api/HrPayslips/Structures')
      .set('Authorization', `Bearer ${bearerToken(STAFF_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalItems: 1,
      items: [{ id: 'structure-1', name: 'Standard' }],
    });
  });

  it('preserves authorized staff access to payslip detail', async () => {
    mockResolveEffectivePermissions.mockResolvedValue({
      effectivePermissions: ['employees.view'],
    });
    mockQuery.mockResolvedValueOnce([{
      id: 'payslip-1',
      employeeEmail: 'employee@example.test',
      netSalary: 12000000,
    }]);

    const response = await request(makeApp())
      .get('/api/HrPayslips/payslip-1')
      .set('Authorization', `Bearer ${bearerToken(STAFF_ID)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'payslip-1',
      employeeEmail: 'employee@example.test',
      netSalary: 12000000,
    });
  });
});
