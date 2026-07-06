'use strict';

jest.mock('../../../services/permissionService', () => ({
  resolveEffectivePermissions: jest.fn(),
}));

const { resolveEffectivePermissions } = require('../../../services/permissionService');
const { dateCompanyFilter, resolveReportCompanyScope } = require('../helpers');

describe('dateCompanyFilter', () => {
  it('filters by a single companyId with plain equality (unchanged legacy behavior)', () => {
    const f = dateCompanyFilter('2026-05-01', '2026-05-31', 'loc-a', 'datecreated', 'companyid');
    expect(f.where).toBe('AND datecreated::date >= $1 AND datecreated::date <= $2 AND companyid = $3');
    expect(f.params).toEqual(['2026-05-01', '2026-05-31', 'loc-a']);
  });

  it('filters by an array of companyIds using ANY(uuid[])', () => {
    const f = dateCompanyFilter('2026-05-01', '2026-05-31', ['loc-a', 'loc-b'], 'datecreated', 'companyid');
    expect(f.where).toBe('AND datecreated::date >= $1 AND datecreated::date <= $2 AND companyid = ANY($3::uuid[])');
    expect(f.params).toEqual(['2026-05-01', '2026-05-31', ['loc-a', 'loc-b']]);
  });

  it('omits the company condition entirely for an empty array (unrestricted access)', () => {
    const f = dateCompanyFilter('2026-05-01', '2026-05-31', [], 'datecreated', 'companyid');
    expect(f.where).toBe('AND datecreated::date >= $1 AND datecreated::date <= $2');
    expect(f.params).toEqual(['2026-05-01', '2026-05-31']);
  });

  it('omits the company condition for null/undefined companyId', () => {
    expect(dateCompanyFilter(null, null, null).where).toBe('');
    expect(dateCompanyFilter(null, null, undefined).where).toBe('');
  });
});

describe('resolveReportCompanyScope', () => {
  const LOC_A = '11111111-1111-4111-8111-111111111111';
  const LOC_B = '22222222-2222-4222-8222-222222222222';

  function makeRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  }

  beforeEach(() => jest.clearAllMocks());

  it('returns null companyIds (unrestricted) for Super Admin with no requested location', async () => {
    resolveEffectivePermissions.mockResolvedValue({ groupName: 'Super Admin', effectivePermissions: [], locations: [] });
    const res = makeRes();
    const scope = await resolveReportCompanyScope({ user: { employeeId: 'e1' } }, res, undefined);
    expect(scope).toEqual({ companyIds: null });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('restricts a location-scoped employee to their allowed locations by default', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Staff',
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'A' }],
    });
    const res = makeRes();
    const scope = await resolveReportCompanyScope({ user: { employeeId: 'e1' } }, res, undefined);
    expect(scope).toEqual({ companyIds: [LOC_A] });
  });

  it('rejects a requested location outside the employee scope with 403', async () => {
    resolveEffectivePermissions.mockResolvedValue({
      groupName: 'Staff',
      effectivePermissions: ['reports.view'],
      locations: [{ id: LOC_A, name: 'A' }],
    });
    const res = makeRes();
    const scope = await resolveReportCompanyScope({ user: { employeeId: 'e1' } }, res, LOC_B);
    expect(scope).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Location not allowed' });
  });

  it('fails closed (zero locations) for an employee with no group/location rows at all', async () => {
    resolveEffectivePermissions.mockResolvedValue({ groupName: null, effectivePermissions: [], locations: [] });
    const res = makeRes();
    const scope = await resolveReportCompanyScope({ user: { employeeId: 'e1' } }, res, undefined);
    expect(scope).toEqual({ companyIds: [] });
  });
});
