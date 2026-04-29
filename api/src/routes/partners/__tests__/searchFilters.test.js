const { applyPartnerSearchFilter } = require('../searchFilters');

describe('applyPartnerSearchFilter', () => {
  it('matches customers by related service order numbers', () => {
    const conditions = [];
    const params = [];

    const nextParam = applyPartnerSearchFilter({
      search: 'SO00005 - service',
      conditions,
      params,
      paramIdx: 1,
    });

    expect(nextParam).toBe(3);
    expect(params).toEqual(['%SO00005 - service%', 'SO00005%']);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('FROM saleorders so');
    expect(conditions[0]).toContain('so.code LIKE $2');
    expect(conditions[0]).toContain('so.name LIKE $2');
    expect(conditions[0]).not.toContain('FROM appointments a');
  });

  it('matches customers by related appointment numbers', () => {
    const conditions = [];
    const params = [];

    const nextParam = applyPartnerSearchFilter({
      search: 'AP00025',
      conditions,
      params,
      paramIdx: 1,
    });

    expect(nextParam).toBe(3);
    expect(params).toEqual(['%AP00025%', 'AP00025%']);
    expect(conditions[0]).toContain('FROM appointments a');
    expect(conditions[0]).toContain('a.name LIKE $2');
    expect(conditions[0]).not.toContain('FROM saleorders so');
  });

  it('does not scan related records for regular customer text searches', () => {
    const conditions = [];
    const params = [];

    const nextParam = applyPartnerSearchFilter({
      search: 'Nguyen',
      conditions,
      params,
      paramIdx: 1,
    });

    expect(nextParam).toBe(2);
    expect(params).toEqual(['%Nguyen%']);
    expect(conditions[0]).not.toContain('FROM appointments a');
    expect(conditions[0]).not.toContain('FROM saleorders so');
  });
});
