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

    it('returns empty when no permission group assigned', async () => {
      query.mockResolvedValueOnce([{ group_id: null, group_name: null, loc_scope: 'assigned' }]);
      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).toEqual([]);
    });

    it('returns base permissions from group', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }, { permission: 'appointments.view' }]);
      query.mockResolvedValueOnce([]); // overrides
      query.mockResolvedValueOnce([]); // locations

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.groupId).toBe('group-1');
      expect(result.groupName).toBe('Staff');
      expect(result.effectivePermissions).toEqual(['customers.view', 'appointments.view']);
    });

    it('applies grant overrides', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
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
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
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
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
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

    it('falls back to legacy employee_permissions group assignment', async () => {
      query.mockResolvedValueOnce([{ group_id: 'legacy-group', group_name: 'Receptionist', loc_scope: 'assigned' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.groupId).toBe('legacy-group');
      expect(result.effectivePermissions).toEqual(['customers.view']);
    });

    it('falls back when partners.tier_id column is absent', async () => {
      query.mockRejectedValueOnce({ code: '42703', message: 'column p.tier_id does not exist' });
      query.mockResolvedValueOnce([{ group_id: 'legacy-group', group_name: 'Receptionist', loc_scope: 'assigned' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.groupId).toBe('legacy-group');
      expect(result.groupName).toBe('Receptionist');
      expect(result.effectivePermissions).toEqual(['customers.view']);
    });

    it('returns all locations for all-location scope', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Clinic Manager', loc_scope: 'all' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([
        { id: 'loc-1', name: 'HCM Clinic' },
        { id: 'loc-2', name: 'HN Clinic' },
      ]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(query.mock.calls[3][1]).toEqual([]);
      expect(result.locations).toEqual([
        { id: 'loc-1', name: 'HCM Clinic' },
        { id: 'loc-2', name: 'HN Clinic' },
      ]);
    });

    it('reports 3 parallel DB calls (optimized)', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(query).toHaveBeenCalledTimes(4); // 1 partner + 3 parallel
    });
  });

  describe('hasPermission', () => {
    it('returns true when permission in set', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'customers.view');
      expect(result).toBe(true);
    });

    it('returns false when permission not in set', async () => {
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Staff', loc_scope: 'assigned' }]);
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
      query.mockResolvedValueOnce([{ group_id: 'group-1', group_name: 'Admin', loc_scope: 'all' }]);
      query.mockResolvedValueOnce([{ permission: '*' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([]);

      const result = await hasPermission('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'any.permission');
      expect(result).toBe(true);
    });
  });
});
