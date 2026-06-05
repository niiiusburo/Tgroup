'use strict';

const { resolveCtvBookingCompanyId } = require('../ctvBookingCompany');

describe('resolveCtvBookingCompanyId', () => {
  test('uses a requested company when it exists in the selected LOB', async () => {
    const queryRows = jest.fn().mockResolvedValueOnce([{ id: 'company-body' }]);

    await expect(resolveCtvBookingCompanyId({
      queryRows,
      requestedCompanyId: 'company-body',
      tokenCompanyId: 'company-token',
    })).resolves.toBe('company-body');

    expect(queryRows).toHaveBeenCalledTimes(1);
    expect(queryRows.mock.calls[0][1]).toEqual(['company-body']);
  });

  test('falls back to an active non-QA clinic company before generic company fallback', async () => {
    const queryRows = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'clinic-company' }]);

    await expect(resolveCtvBookingCompanyId({
      queryRows,
      requestedCompanyId: null,
      tokenCompanyId: null,
    })).resolves.toBe('clinic-company');

    const activeFallbackSql = queryRows.mock.calls[0][0];
    expect(activeFallbackSql).toContain('COALESCE(active, true) = true');
    expect(activeFallbackSql).toContain("LIKE 'qa%'");
    expect(activeFallbackSql).toContain("LIKE '%test%'");
    expect(activeFallbackSql).toContain("LIKE '%verify%'");
  });

  test('uses any company as a last resort when no active company is found', async () => {
    const queryRows = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'last-resort-company' }]);

    await expect(resolveCtvBookingCompanyId({
      queryRows,
      requestedCompanyId: null,
      tokenCompanyId: null,
    })).resolves.toBe('last-resort-company');

    expect(queryRows).toHaveBeenCalledTimes(2);
    expect(queryRows.mock.calls[1][0]).toContain('ORDER BY id ASC');
  });
});
