const {
  getEmployeeLobScope,
  isEmployeeCtv,
  resolveEffectiveLobScope,
} = require('../authSession');

describe('authSession', () => {
  it('reads lob_scope from employee row', () => {
    expect(getEmployeeLobScope({ lob_scope: ['cosmetic'] })).toEqual(['cosmetic']);
    expect(getEmployeeLobScope({ lobScope: ['dental'] })).toEqual(['dental']);
    expect(getEmployeeLobScope({})).toEqual([]);
  });

  it('detects CTV flag from either casing', () => {
    expect(isEmployeeCtv({ is_ctv: true })).toBe(true);
    expect(isEmployeeCtv({ isCtv: true })).toBe(true);
    expect(isEmployeeCtv({ is_ctv: false })).toBe(false);
  });

  it('defaults empty lob_scope to authLob for non-admin staff', () => {
    expect(resolveEffectiveLobScope({
      employee: { lob_scope: null },
      isAdmin: false,
      authLob: 'cosmetic',
    })).toEqual(['cosmetic']);
  });

  it('keeps empty lob_scope for CTV accounts', () => {
    expect(resolveEffectiveLobScope({
      employee: { is_ctv: true, lob_scope: null },
      isAdmin: false,
      authLob: 'dental',
    })).toEqual([]);
  });

  it('grants both LOBs to admins when row scope is empty', () => {
    expect(resolveEffectiveLobScope({
      employee: {},
      isAdmin: true,
      authLob: 'dental',
    })).toEqual(['dental', 'cosmetic']);
  });
});