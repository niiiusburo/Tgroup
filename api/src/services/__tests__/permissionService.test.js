'use strict';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../db');
const {
  resolveEffectivePermissions,
  hasPermission,
  V2_LOB_PERMISSIONS,
  ADMIN_GROUP_ID,
  isAdminPermissionState,
} = require('../permissionService');

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

    it('returns primary company plus additional scoped locations', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-1', group_name: 'Staff' }]);
      query.mockResolvedValueOnce([{ permission: 'appointments.view' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([
        { id: 'primary-loc', name: 'Primary Clinic' },
        { id: 'extra-loc', name: 'Second Clinic' },
      ]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.locations).toEqual([
        { id: 'primary-loc', name: 'Primary Clinic' },
        { id: 'extra-loc', name: 'Second Clinic' },
      ]);
      expect(query.mock.calls[3][0]).toContain('FROM dbo.partners p');
      expect(query.mock.calls[3][0]).toContain('UNION ALL');
      expect(query.mock.calls[3][0]).toContain('dbo.employee_location_scope');
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

  describe('V2_LOB_PERMISSIONS (cosmetic LOB + CTV + crossview auto-seeding)', () => {
    it('exports the canonical 9 keys used by seed-cosmetic-lob.js + permission-registry + requirePermission gates', () => {
      expect(Array.isArray(V2_LOB_PERMISSIONS)).toBe(true);
      expect(V2_LOB_PERMISSIONS).toContain('cosmetic.access');
      expect(V2_LOB_PERMISSIONS).toContain('dental.access');
      expect(V2_LOB_PERMISSIONS).toContain('ctv.dashboard.view');
      expect(V2_LOB_PERMISSIONS).toContain('ctv.commission.view.self');
      expect(V2_LOB_PERMISSIONS).toContain('ctv.referrals.view.self');
      expect(V2_LOB_PERMISSIONS).toContain('commissions.view.team');
      expect(V2_LOB_PERMISSIONS).toContain('commissions.payout.run');
      expect(V2_LOB_PERMISSIONS).toContain('commissions.export');
      expect(V2_LOB_PERMISSIONS).toContain('lob.crossview');
      expect(V2_LOB_PERMISSIONS.length).toBe(9);
    });

    it('keys match those auto-granted by ensureAdminV2Permissions + ctv overrides in seed (no manual PermissionBoard required for t@ / ctv-demo)', () => {
      // This test documents the contract so future seed/auth changes keep them in sync
      const expectedForAdminAndCtvDemo = [
        'cosmetic.access', 'dental.access', 'lob.crossview',
        'ctv.dashboard.view', 'ctv.commission.view.self', 'ctv.referrals.view.self'
      ];
      expectedForAdminAndCtvDemo.forEach(k => expect(V2_LOB_PERMISSIONS).toContain(k));
    });
  });

  describe('isAdminPermissionState', () => {
    it('recognizes only admin permission groups for multi-LOB selection', () => {
      expect(isAdminPermissionState({ groupId: ADMIN_GROUP_ID, groupName: 'Doctor' })).toBe(true);
      expect(isAdminPermissionState({ groupId: 'x', groupName: 'Admin' })).toBe(true);
      expect(isAdminPermissionState({ groupId: 'x', groupName: 'Super Admin' })).toBe(true);
      expect(isAdminPermissionState({ groupId: 'x', groupName: 'Doctor' })).toBe(false);
      expect(isAdminPermissionState({ groupId: 'x', groupName: 'Manager' })).toBe(false);
      expect(isAdminPermissionState(null)).toBe(false);
    });
  });
});
