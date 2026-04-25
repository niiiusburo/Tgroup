'use strict';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../db');
const { resolveEffectivePermissions, hasPermission } = require('../permissionService');

beforeEach(() => {
  query.mockReset();
});

describe('permissionService', () => {
  describe('resolveEffectivePermissions', () => {
    it('returns empty when employeeId is invalid', async () => {
      const result = await resolveEffectivePermissions('not-a-uuid');
      expect(result).toEqual({
        groupId: null, groupName: null, effectivePermissions: [], locations: [],
      });
    });

    it('returns empty when employee not found', async () => {
      query.mockResolvedValueOnce([]); // partner query
      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).toEqual([]);
    });

    it('returns empty when no tier_id assigned', async () => {
      query.mockResolvedValueOnce([{ tier_id: null, group_name: null }]);
      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).toEqual([]);
    });

    it('returns base permissions from group', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Admin' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }, { permission: 'appointments.view' }]);
      query.mockResolvedValueOnce([]); // overrides
      query.mockResolvedValueOnce([]); // locations

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.groupId).toBe('group-1');
      expect(result.groupName).toBe('Admin');
      expect(result.effectivePermissions).toEqual(['customers.view', 'appointments.view']);
    });

    it('applies grant overrides', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Staff' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([
        { permission: 'customers.edit', override_type: 'grant' },
      ]);
      query.mockResolvedValueOnce([]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).toContain('customers.view');
      expect(result.effectivePermissions).toContain('customers.edit');
    });

    it('applies revoke overrides', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Staff' }]);
      query.mockResolvedValueOnce([
        { permission: 'customers.view' },
        { permission: 'customers.edit' },
      ]);
      query.mockResolvedValueOnce([
        { permission: 'customers.edit', override_type: 'revoke' },
      ]);
      query.mockResolvedValueOnce([]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).toContain('customers.view');
      expect(result.effectivePermissions).not.toContain('customers.edit');
    });

    it('returns location scope', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Staff' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([
        { id: 'loc-1', name: 'HCM Clinic' },
        { id: 'loc-2', name: 'HN Clinic' },
      ]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.locations).toEqual([
        { id: 'loc-1', name: 'HCM Clinic' },
        { id: 'loc-2', name: 'HN Clinic' },
      ]);
    });

    it('reports 3 parallel DB calls (optimized)', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Admin' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(query).toHaveBeenCalledTimes(4); // 1 partner + 3 parallel
    });
  });

  describe('hasPermission', () => {
    it('returns true when permission in set', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Admin' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'customers.view');
      expect(result).toBe(true);
    });

    it('returns false when permission not in set', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Staff' }]);
      query.mockResolvedValueOnce([{ permission: 'appointments.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'customers.delete');
      expect(result).toBe(false);
    });

    it('returns false when no permissions', async () => {
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'customers.view');
      expect(result).toBe(false);
    });

    it('wildcard grants everything', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Admin' }]);
      query.mockResolvedValueOnce([{ permission: '*' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'any.permission');
      expect(result).toBe(true);
    });
  });
});
