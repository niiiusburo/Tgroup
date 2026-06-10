'use strict';

/**
 * Regression lock — fetchCodeRow must pass the db handle to safeQueryRows.
 *
 * Bug (2026-06): fetchCodeRow called safeQueryRows(sql, params) without the
 * db first argument. safeQueryRows swallowed the resulting TypeError and
 * returned [], so EVERY staff lookup/verify reported "Mã không tồn tại"
 * even for freshly generated codes. This test uses the REAL safeQueryRows
 * (no mock) so it fails again if the db argument is ever dropped.
 *
 * Run: cd api && npx jest src/services/__tests__/ctvDiscountCodes.fetchCodeRow.test.js
 */

jest.mock('../../db', () => ({
  getDb: jest.fn(),
}));

const { getDb } = require('../../db');
const { fetchCodeRow } = require('../ctvDiscountCodes');

describe('ctvDiscountCodes.fetchCodeRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('queries the dental db and returns the matching row', async () => {
    const row = {
      id: 'code-row-1',
      code: 'LINH-A3X9K2',
      status: 'claimed',
      ctv_name: 'Linh',
    };
    const db = { queryRows: jest.fn().mockResolvedValue([row]) };
    getDb.mockReturnValue(db);

    const result = await fetchCodeRow('LINH-A3X9K2');

    expect(getDb).toHaveBeenCalledWith('dental');
    // The db handle MUST actually be used — with the missing-db bug the
    // query silently failed and this spy was never called.
    expect(db.queryRows).toHaveBeenCalledTimes(1);
    const [sql, params] = db.queryRows.mock.calls[0];
    expect(sql).toContain('FROM dbo.ctv_discount_codes');
    expect(params).toEqual(['LINH-A3X9K2']);
    expect(result).toEqual(row);
  });

  test('returns null when no row matches', async () => {
    const db = { queryRows: jest.fn().mockResolvedValue([]) };
    getDb.mockReturnValue(db);

    await expect(fetchCodeRow('NOPE-000000')).resolves.toBeNull();
    expect(db.queryRows).toHaveBeenCalledTimes(1);
  });
});
