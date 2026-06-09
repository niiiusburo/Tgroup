'use strict';

const {
  findLoginPartner,
  normalizeIdentifierDigits,
  normalizeLoginIdentifier,
} = require('../loginIdentifier');

describe('loginIdentifier', () => {
  it('normalizes login identifiers and phone digits', () => {
    expect(normalizeLoginIdentifier('  user@example.com  ')).toBe('user@example.com');
    expect(normalizeIdentifierDigits('  098 946-0997  ')).toBe('0989460997');
  });

  it('does not query when the identifier is blank', async () => {
    const queryFn = jest.fn();

    const rows = await findLoginPartner(queryFn, '   ');

    expect(rows).toEqual([]);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('looks up email plus ANY active CTV phone/ref code (not just legacy imports)', async () => {
    const queryFn = jest.fn().mockResolvedValue([{ id: 'ctv-1' }]);

    const rows = await findLoginPartner(queryFn, ' 098 946 0997 ');

    expect(rows).toEqual([{ id: 'ctv-1' }]);
    expect(queryFn).toHaveBeenCalledTimes(1);
    const [sql, params] = queryFn.mock.calls[0];
    expect(params).toEqual(['098 946 0997', '0989460997']);
    expect(sql).toContain('LOWER(p.email) = LOWER($1)');
    expect(sql).toContain('p.is_ctv = true');
    expect(sql).not.toContain('legacy_ctv_import');
    expect(sql).toContain("regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g')");
    expect(sql).toContain("LOWER(COALESCE(p.ref, '')) = LOWER($1)");
  });
});
