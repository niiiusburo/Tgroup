'use strict';

jest.mock('../src/middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requirePermission: () => (_req, _res, next) => next(),
}));

const mockResolveInvestorScope = jest.fn();
jest.mock('../src/services/permissionService', () => ({
  resolveInvestorScope: (...args) => mockResolveInvestorScope(...args),
}));

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(async () => mockClient),
  },
}));

const express = require('express');
const request = require('supertest');
const { query, pool } = require('../src/db');

function makeApp(mountPath, router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { employeeId: 'investor-1' };
    next();
  });
  app.use(mountPath, router);
  return app;
}

beforeEach(() => {
  query.mockReset();
  pool.connect.mockClear();
  mockClient.query.mockReset();
  mockClient.release.mockClear();
  mockResolveInvestorScope.mockReset();
  mockResolveInvestorScope.mockResolvedValue({ isInvestor: true, allowedCustomerIds: ['cust-1'] });
});

describe('investor admin mutation guards', () => {
  it('blocks investor permission group edits even when permissions.edit is present', async () => {
    const router = require('../src/routes/permissions');

    const res = await request(makeApp('/api/Permissions', router))
      .put('/api/Permissions/groups/group-1')
      .send({ name: 'Edited', permissions: ['*'] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E_INVESTOR_PERMISSION_MUTATION_FORBIDDEN');
    expect(query).not.toHaveBeenCalled();
  });

  it('blocks investor employee edits even when employees.edit is present', async () => {
    const router = require('../src/routes/employees/mutations');

    const res = await request(makeApp('/api/Employees', router))
      .put('/api/Employees/employee-1')
      .send({ tierId: 'admin-group' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E_INVESTOR_EMPLOYEE_MUTATION_FORBIDDEN');
    expect(mockClient.query).not.toHaveBeenCalled();
    expect(mockClient.release).toHaveBeenCalled();
  });
});
