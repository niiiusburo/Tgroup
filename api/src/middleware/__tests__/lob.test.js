'use strict';

jest.mock('../../db', () => ({
  getDb: jest.fn((lob) => ({ lob })),
  runWithLob: jest.fn((_lob, next) => next()),
}));

const { getDb, runWithLob } = require('../../db');
const { attachLobDb, attachCosmeticDb } = require('../lob');

function makeReq({ query = {}, headers = {}, params = {} } = {}) {
  return {
    query,
    params,
    header(name) {
      return headers[name.toLowerCase()] || headers[name] || undefined;
    },
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

describe('LOB middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('attachLobDb keeps explicit override behavior for generic future LOB routes', () => {
    const req = makeReq({ query: { lob: 'dental' } });
    const res = makeRes();
    const next = jest.fn();

    attachLobDb('cosmetic')(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(req.lob).toBe('dental');
    expect(req.db).toEqual({ lob: 'dental' });
    expect(getDb).toHaveBeenCalledWith('dental');
    expect(runWithLob).toHaveBeenCalledWith('dental', next);
    expect(next).toHaveBeenCalled();
  });

  test('attachCosmeticDb ignores query/header overrides and always uses cosmetic', () => {
    const req = makeReq({ query: { lob: 'all' }, headers: { 'x-lob': 'dental' } });
    const res = makeRes();
    const next = jest.fn();

    attachCosmeticDb(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(req.lob).toBe('cosmetic');
    expect(req.db).toEqual({ lob: 'cosmetic' });
    expect(getDb).toHaveBeenCalledWith('cosmetic');
    expect(runWithLob).toHaveBeenCalledWith('cosmetic', next);
    expect(next).toHaveBeenCalled();
  });
});
