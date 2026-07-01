'use strict';

/**
 * Shared test helpers for API route tests.
 *
 * Eliminates the duplicated mock DB / mock auth / mock response / route-handler
 * extraction boilerplate that was copy-pasted across 10+ route test files.
 *
 * Usage pattern (inside a test file):
 *
 *   jest.mock('../../db', () =>
 *     require('../../__tests__/helpers/routeTestHelpers').createMockDb()
 *   );
 *   jest.mock('../../middleware/auth', () =>
 *     require('../../__tests__/helpers/routeTestHelpers').createMockAuth()
 *   );
 *   const { findRouteHandler, makeRes } = require('../../__tests__/helpers/routeTestHelpers');
 *
 * The `jest.mock` factory only references `require` (always in scope), so it
 * survives babel-jest's mock hoisting without the `mock`-prefix restriction.
 *
 * @crossref:domain[testing]
 * @crossref:used-in[api/src/routes/__tests__/*.test.js, api/src/routes sub-dirs __tests__/*.test.js]
 */

/**
 * Build a mock `../../db` module (CTV-style) wired so `query` wraps
 * `mockQueryRows` (resolving `{ rows }`), and `getDb()` / `getQuery()` return
 * objects/functions backed by the same `mockQueryRows`. Each test still controls
 * what `mockQueryRows` resolves to via `mockResolvedValueOnce` / `mockImplementation`.
 *
 * `mockQueryRows` defaults to resolving `[]` so handlers that iterate rows do not
 * throw when a test forgets to seed a call.
 *
 * @returns {{ query: jest.Mock, getQuery: jest.Mock, getDb: jest.Mock, mockQueryRows: jest.Mock, mockQuery: jest.Mock }}
 */
function createMockDb() {
  const mockQueryRows = jest.fn();
  const mockQuery = jest.fn((sql, params) => mockQueryRows(sql, params).then((rows) => ({ rows })));
  const getDb = jest.fn(() => ({ queryRows: mockQueryRows, query: mockQuery }));
  const getQuery = jest.fn(() => mockQueryRows);
  mockQueryRows.mockResolvedValue([]);
  return { query: mockQuery, getQuery, getDb, mockQueryRows, mockQuery };
}

/**
 * Build a mock `../../db` module where the raw `query` fn returns rows directly
 * (no `{ rows }` wrapping). Used by appointment handler tests that assert on
 * `query` resolving to row arrays.
 *
 * @returns {{ query: jest.Mock, getQuery: jest.Mock, getDb: jest.Mock, mockQuery: jest.Mock }}
 */
function createMockQueryDb() {
  const mockQuery = jest.fn();
  const getQuery = jest.fn(() => mockQuery);
  const getDb = jest.fn(() => ({ queryRows: mockQuery }));
  return { query: mockQuery, getQuery, getDb, mockQuery };
}

/**
 * Mock `../../middleware/auth` module shape — `requireAuth` always calls next().
 * @returns {{ requireAuth: Function }}
 */
function createMockAuth() {
  return { requireAuth: (_req, _res, next) => next() };
}

/**
 * Build a mock Express response that records `statusCode` + `jsonBody` and
 * captures any cookies set via `res.cookie(name, value)` into `res.cookies`.
 * Assertions use `res.statusCode` / `res.jsonBody` / `res.cookies`.
 *
 * @returns {{ statusCode: number, jsonBody: any, cookies: Object, status: Function, json: Function, cookie: Function }}
 */
function makeRes() {
  return {
    statusCode: 200,
    jsonBody: null,
    cookies: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
    cookie(name, value) {
      this.cookies[name] = value;
      return this;
    },
  };
}

/**
 * Build a mock Express response using jest.fn() spies for `status` / `json`.
 * Assertions use `res.status.toHaveBeenCalledWith(...)` /
 * `res.json.toHaveBeenCalledWith(...)`.
 *
 * @returns {{ status: jest.Mock, json: jest.Mock }}
 */
function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

/**
 * Locate a route handler inside an Express router, recursing into mounted
 * sub-routers (`.use()` mounts) so handlers split across sub-router files
 * (e.g. routes/ctv/ directory) can still be found by path + method.
 *
 * @param {import('express').Router} router
 * @param {string} path  route path (e.g. '/bookings', '/landing/:shortCode')
 * @param {string} method lowercase HTTP method (e.g. 'get', 'post')
 * @returns {Function|undefined}
 */
function findRouteHandler(router, path, method) {
  let handler;
  router.stack.forEach((layer) => {
    if (layer.route && layer.route.path === path && layer.route.methods[method]) {
      layer.route.stack.forEach((l) => {
        if (l.handle && typeof l.handle === 'function') handler = l.handle;
      });
    } else if (!layer.route && layer.handle && Array.isArray(layer.handle.stack)) {
      const nested = findRouteHandler(layer.handle, path, method);
      if (nested) handler = nested;
    }
  });
  return handler;
}

module.exports = {
  createMockDb,
  createMockQueryDb,
  createMockAuth,
  makeRes,
  mockResponse,
  findRouteHandler,
};
