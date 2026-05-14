/**
 * Permission Resolution Tests
 * Tests resolveEffectivePermissions from permissionService.js
 */

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));

const { query } = require('../src/db');
const { resolveEffectivePermissions } = require('../src/services/permissionService');

describe('resolveEffectivePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty for invalid employeeId', async () => {
    const result = await resolveEffectivePermissions('not-a-uuid');
    expect(result.effectivePermissions).toEqual([]);
    expect(result.locations).toEqual([]);
  });

  it('returns empty when employee has no tier', async () => {
    query.mockResolvedValueOnce([{ tier_id: null, group_name: null }]);
    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.effectivePermissions).toEqual([]);
    expect(result.locations).toEqual([]);
  });

  it('resolves base permissions from group', async () => {
    query
      .mockResolvedValueOnce([{ tier_id: 'g1', group_name: 'Admin' }])
      .mockResolvedValueOnce([{ permission: 'customers.view' }, { permission: 'services.view' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c1', name: 'HQ' }]);

    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.effectivePermissions).toEqual(['customers.view', 'services.view']);
    expect(result.locations).toEqual([{ id: 'c1', name: 'HQ' }]);
  });

  it('applies grant overrides', async () => {
    query
      .mockResolvedValueOnce([{ tier_id: 'g1', group_name: 'Staff' }])
      .mockResolvedValueOnce([{ permission: 'customers.view' }])
      .mockResolvedValueOnce([{ permission: 'services.edit', override_type: 'grant' }])
      .mockResolvedValueOnce([]);

    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.effectivePermissions).toContain('customers.view');
    expect(result.effectivePermissions).toContain('services.edit');
  });

  it('applies revoke overrides', async () => {
    query
      .mockResolvedValueOnce([{ tier_id: 'g1', group_name: 'Staff' }])
      .mockResolvedValueOnce([{ permission: 'customers.view' }, { permission: 'customers.delete' }])
      .mockResolvedValueOnce([{ permission: 'customers.delete', override_type: 'revoke' }])
      .mockResolvedValueOnce([]);

    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.effectivePermissions).toContain('customers.view');
    expect(result.effectivePermissions).not.toContain('customers.delete');
  });

  it('wildcard * grants all permissions', async () => {
    query
      .mockResolvedValueOnce([{ tier_id: 'g1', group_name: 'Super' }])
      .mockResolvedValueOnce([{ permission: '*' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c1', name: 'HQ' }, { id: 'c2', name: 'Branch' }]);

    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.effectivePermissions).toContain('*');
    expect(result.locations).toEqual([
      { id: 'c1', name: 'HQ' },
      { id: 'c2', name: 'Branch' },
    ]);
  });

  it('empty location scope returns primary branch only', async () => {
    query
      .mockResolvedValueOnce([{ tier_id: 'g1', group_name: 'Staff' }])
      .mockResolvedValueOnce([{ permission: 'customers.view' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'c1', name: 'Primary' }]);

    const result = await resolveEffectivePermissions('11111111-1111-1111-1111-111111111111');
    expect(result.locations).toEqual([{ id: 'c1', name: 'Primary' }]);
  });
});
