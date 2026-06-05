'use strict';

/**
 * Regression: POST /api/ctv create must ALWAYS persist a dental partner row.
 *
 * User-reported bug (NK3): "creating a CTV lets me select dental + cosmetic, but
 * clicking save only saves cosmetic — there's no dental line."
 *
 * Root cause class: a CTV authenticates against the dental (default) partners
 * table, so dental MUST always be in lob_scope and the dental row MUST always be
 * written. Cosmetic is an additive mirror. These tests lock that invariant so a
 * future refactor can never drop the dental write again.
 *
 * Invariants touched: INV (CTV auth row always in dental DB). See
 * product-map/domains/ctv.yaml writes: "writes partners in dental and optionally cosmetic".
 */

jest.mock('../../db', () => {
  const mockQueryRows = jest.fn();
  const mockQuery = jest.fn((sql, params) => mockQueryRows(sql, params).then((rows) => ({ rows })));
  return {
    query: mockQuery,
    getQuery: jest.fn(() => mockQueryRows),
    getDb: jest.fn(() => ({ queryRows: mockQueryRows, query: mockQuery })),
  };
});

jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => next(),
}));

// Caller is treated as an admin so the create path is reached.
jest.mock('../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(() =>
    Promise.resolve({ effectivePermissions: ['*'], groupId: null, groupName: 'admin' })
  ),
  isAdminPermissionState: jest.fn(() => true),
}));

// uuid (v9+) and bcryptjs are require()'d lazily inside the handler. uuid ships
// ESM that Jest's default CJS transform can choke on; bcrypt hashing is slow and
// irrelevant to the scope invariant. Mock both so the handler runs deterministically.
jest.mock('uuid', () => ({ v4: () => 'new-ctv' }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(() => Promise.resolve('hashed-pw')) }));

const ctvRouter = require('../ctv');
const { getDb } = require('../../db');

function findRouteHandler(router, path, method) {
  let handler;
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      layer.route.stack.forEach((l) => {
        if (l.handle && typeof l.handle === 'function') handler = l.handle;
      });
    }
  });
  return handler;
}

function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.jsonBody = body; return this; },
  };
}

/**
 * Wire the two pools so we can assert exactly which DB received the INSERT.
 * The handler issues, per DB: phone-check, email-check, then INSERT.
 * Phone/email checks return [] (no duplicate); INSERT returns the created row.
 */
function wirePools() {
  const dentalDb = { queryRows: jest.fn(), query: jest.fn() };
  const cosmeticDb = { queryRows: jest.fn(), query: jest.fn() };
  getDb.mockImplementation((lob) => (lob === 'cosmetic' ? cosmeticDb : dentalDb));

  // Duplicate guards run first (dental phone, cosmetic phone, dental email, cosmetic email)
  // via Promise.all in the handler. Each resolves empty. Then INSERTs run.
  dentalDb.queryRows.mockImplementation((sql) => {
    if (/INSERT INTO dbo\.partners/i.test(sql)) {
      return Promise.resolve([{ id: 'new-ctv', name: 'New CTV', lob_scope: null }]);
    }
    return Promise.resolve([]); // phone/email checks
  });
  cosmeticDb.queryRows.mockImplementation((sql) => {
    if (/INSERT INTO dbo\.partners/i.test(sql)) {
      return Promise.resolve([{ id: 'new-ctv', name: 'New CTV', lob_scope: null }]);
    }
    return Promise.resolve([]);
  });
  return { dentalDb, cosmeticDb };
}

function insertCallParams(db) {
  const call = db.queryRows.mock.calls.find(([sql]) => /INSERT INTO dbo\.partners/i.test(sql));
  return call ? call[1] : null;
}

// lob_scope is param $6 in the INSERT (id,$1 name,$2 phone,$3 email,$4 hash,$5 lob_scope,$6 ...)
const LOB_SCOPE_PARAM_INDEX = 5;

describe('POST /api/ctv — lob_scope persistence invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseBody = { name: 'New CTV', phone: '0912000000', email: 'newctv@x.vn', password: 'secret123' };

  test('selecting BOTH dental + cosmetic writes a dental row AND mirrors to cosmetic, scope {dental,cosmetic}', async () => {
    const { dentalDb, cosmeticDb } = wirePools();
    const handler = findRouteHandler(ctvRouter, '/', 'post');
    const req = {
      body: { ...baseBody, lob_scope: ['dental', 'cosmetic'] },
      user: { employeeId: 'admin-1', authLob: 'dental', is_ctv: false },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    const dentalScope = insertCallParams(dentalDb)?.[LOB_SCOPE_PARAM_INDEX];
    const cosmeticScope = insertCallParams(cosmeticDb)?.[LOB_SCOPE_PARAM_INDEX];
    expect(dentalScope).toEqual(['dental', 'cosmetic']);
    expect(cosmeticScope).toEqual(['dental', 'cosmetic']); // mirror carries identical scope
  });

  test('selecting ONLY cosmetic still writes a dental auth row (dental is forced into scope)', async () => {
    const { dentalDb, cosmeticDb } = wirePools();
    const handler = findRouteHandler(ctvRouter, '/', 'post');
    const req = {
      body: { ...baseBody, lob_scope: ['cosmetic'] },
      user: { employeeId: 'admin-1', authLob: 'dental', is_ctv: false },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    // The dental DB MUST receive an INSERT — this is the exact bug the user reported.
    const dentalInsert = insertCallParams(dentalDb);
    expect(dentalInsert).not.toBeNull();
    expect(dentalInsert[LOB_SCOPE_PARAM_INDEX]).toEqual(['dental', 'cosmetic']);
    // Cosmetic mirror also written because cosmetic was requested.
    expect(insertCallParams(cosmeticDb)).not.toBeNull();
  });

  test('selecting NOTHING (empty scope) writes dental only, never cosmetic', async () => {
    const { dentalDb, cosmeticDb } = wirePools();
    const handler = findRouteHandler(ctvRouter, '/', 'post');
    const req = {
      body: { ...baseBody, lob_scope: [] },
      user: { employeeId: 'admin-1', authLob: 'dental', is_ctv: false },
    };
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(insertCallParams(dentalDb)?.[LOB_SCOPE_PARAM_INDEX]).toEqual(['dental']);
    // No cosmetic mirror when cosmetic was not requested.
    expect(insertCallParams(cosmeticDb)).toBeNull();
  });
});
