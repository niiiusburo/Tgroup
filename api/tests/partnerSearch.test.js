const { applyPartnerSearchFilter } = require('../src/routes/partners/searchFilters');

describe('partner customer search filters', () => {
  it('treats T-prefixed customer codes as code/name search only', () => {
    const conditions = [];
    const params = [];

    const nextParamIdx = applyPartnerSearchFilter({
      search: 'T8250',
      conditions,
      params,
      paramIdx: 1,
    });

    expect(nextParamIdx).toBe(2);
    expect(params).toEqual(['%T8250%']);
    expect(conditions[0]).toContain('p.ref ILIKE $1');
    expect(conditions[0]).not.toContain('regexp_replace');
  });

  it('keeps digit-only searches matched against normalized phone numbers', () => {
    const conditions = [];
    const params = [];

    const nextParamIdx = applyPartnerSearchFilter({
      search: '8250',
      conditions,
      params,
      paramIdx: 1,
    });

    expect(nextParamIdx).toBe(3);
    expect(params).toEqual(['%8250%', '%8250%']);
    expect(conditions[0]).toContain('p.ref ILIKE $1');
    expect(conditions[0]).toContain("regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g') LIKE $2");
  });
});
