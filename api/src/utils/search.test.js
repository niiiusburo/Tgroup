const {
  normalizeVietnamese,
  accentInsensitiveSearchCondition,
  addAccentInsensitiveSearchCondition,
} = require('./search');

describe('search utilities', () => {
  it('normalizes Vietnamese accents from staff search terms', () => {
    expect(normalizeVietnamese('Phạm Thị Thảo Quyền')).toBe('pham thi thao quyen');
    expect(normalizeVietnamese('NGUYỄN THỊ MỸ HÂN')).toBe('nguyen thi my han');
  });

  it('builds raw and accent-stripped SQL predicates', () => {
    const condition = accentInsensitiveSearchCondition(['p.name', 'p.ref'], 1);

    expect(condition).toContain('p.name ILIKE $1');
    expect(condition).toContain('TRANSLATE(LOWER(COALESCE(p.name::text');
    expect(condition).toContain('LIKE $2');
    expect(condition).toContain('p.ref ILIKE $1');
  });

  it('adds raw and normalized search params together', () => {
    const conditions = [];
    const params = [];

    const nextParam = addAccentInsensitiveSearchCondition({
      conditions,
      params,
      columns: ['p.name'],
      search: 'quyen',
      paramIdx: 4,
    });

    expect(nextParam).toBe(6);
    expect(params).toEqual(['%quyen%', '%quyen%']);
    expect(conditions[0]).toContain('p.name ILIKE $4');
    expect(conditions[0]).toContain('LIKE $5');
  });
});
