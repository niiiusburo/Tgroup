'use strict';

jest.mock('../../middleware/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
}));

jest.mock('../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(() => Promise.resolve({ effectivePermissions: ['commissions.view.team'] })),
  isAdminPermissionState: jest.fn(() => false),
}));

jest.mock('../../services/newClientsQuery', () => ({
  listNewClients: jest.fn(() => Promise.resolve({ items: [], totalItems: 0, limit: 5, offset: 0 })),
}));

const newClientsRouter = require('../newClients');
const { listNewClients } = require('../../services/newClientsQuery');

function getGetHandler() {
  const layer = newClientsRouter.stack.find((item) => item.route?.path === '/' && item.route?.methods?.get);
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

describe('newClients route LOB scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('top-level route honors the requested lob query', async () => {
    const res = makeRes();
    await getGetHandler()(makeReq({ query: { lob: 'dental', limit: '5' } }), res);

    expect(res.statusCode).toBe(200);
    expect(listNewClients).toHaveBeenCalledWith(expect.objectContaining({ lob: 'dental', limit: '5' }));
  });

  test('cosmetic mirror route forces cosmetic even if query asks for all', async () => {
    const res = makeRes();
    await getGetHandler()(makeReq({ lob: 'cosmetic', query: { lob: 'all', limit: '5' } }), res);

    expect(res.statusCode).toBe(200);
    expect(listNewClients).toHaveBeenCalledWith(expect.objectContaining({ lob: 'cosmetic', limit: '5' }));
  });
});
