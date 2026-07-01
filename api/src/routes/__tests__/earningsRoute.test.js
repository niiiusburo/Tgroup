'use strict';

jest.mock('../../middleware/auth', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockAuth()
);

jest.mock('../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(() => Promise.resolve({ effectivePermissions: ['commissions.view.team'] })),
  isAdminPermissionState: jest.fn(() => false),
}));

jest.mock('../../db', () =>
  require('../../__tests__/helpers/routeTestHelpers').createMockDb()
);

const earningsRouter = require('../earnings');
const { getDb } = require('../../db');
const { findRouteHandler, makeRes } = require('../../__tests__/helpers/routeTestHelpers');

function getGetHandler() {
  return findRouteHandler(earningsRouter, '/', 'get');
}

function makeReq({ query, lob }) {
  return {
    query,
    lob,
    user: { employeeId: 'admin-1', authLob: 'dental', lob_scope: ['dental', 'cosmetic'] },
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