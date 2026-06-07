'use strict';

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

jest.mock('../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(() => Promise.resolve({ effectivePermissions: ['commissions.view.team'] })),
  isAdminPermissionState: jest.fn(() => false),
}));

jest.mock('../../db', () => ({
  getDb: jest.fn(() => ({
    queryRows: jest.fn(() => Promise.resolve([])),
    query: jest.fn(() => Promise.resolve({ rows: [] })),
  })),
}));

const earningsRouter = require('../earnings');
const { getDb } = require('../../db');

function getGetHandler() {
  const layer = earningsRouter.stack.find((item) => item.route?.path === '/' && item.route?.methods?.get);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function makeReq({ query, lob }) {
  return {
    query,
    lob,
    user: { employeeId: 'admin-1', authLob: 'dental', lob_scope: ['dental', 'cosmetic'] },
  };
}

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

describe('earnings route LOB scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('top-level route can query all LOBs when lob query is omitted', async () => {
    const res = makeRes();
    await getGetHandler()(makeReq({ query: { limit: '5' } }), res);

    expect(res.statusCode).toBe(200);
    expect(getDb).toHaveBeenCalledWith('dental');
    expect(getDb).toHaveBeenCalledWith('cosmetic');
  });

  test('cosmetic mirror route forces cosmetic even if query asks for all', async () => {
    const res = makeRes();
    await getGetHandler()(makeReq({ lob: 'cosmetic', query: { lob: 'all', limit: '5' } }), res);

    expect(res.statusCode).toBe(200);
    expect(getDb).toHaveBeenCalledWith('cosmetic');
    expect(getDb).not.toHaveBeenCalledWith('dental');
  });
});