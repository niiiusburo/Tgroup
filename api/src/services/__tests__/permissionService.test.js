'use strict';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../db');
const {
  INVESTOR_STAFF_PERMISSIONS,
  resolveEffectivePermissions,
  hasPermission,
  resolveInvestorScope,
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

    it('expands investor into staff-shell permissions without wildcard or auth locations', async () => {
      query.mockResolvedValueOnce([{ tier_id: 'group-investor', group_name: 'investor' }]);
      query.mockResolvedValueOnce([{ permission: 'customers.view' }, { permission: '*' }]);
      query.mockResolvedValueOnce([]);
      query.mockResolvedValueOnce([{ id: 'home-loc', name: 'Home Clinic' }]);

      const result = await resolveEffectivePermissions('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
      expect(result.effectivePermissions).not.toContain('*');
      expect(result.locations).toEqual([]);
      expect(result.effectivePermissions).toEqual(
        expect.arrayContaining([
          'overview.view',
          'calendar.view',
          'customers.add',
          'customers.edit',
          'payment.add',
          'payment.void',
          'permissions.view',
          'permissions.edit',
        ])
      );
      for (const permission of INVESTOR_STAFF_PERMISSIONS) {
        expect(result.effectivePermissions).toContain(permission);
      }
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

  describe('resolveInvestorScope', () => {
    const VALID_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    it('returns not-investor for an invalid employeeId without touching the DB', async () => {
      const result = await resolveInvestorScope('not-a-uuid');
      expect(result).toEqual({ isInvestor: false, allowedCustomerIds: [] });
      expect(query).not.toHaveBeenCalled();
    });

    it('returns not-investor for an empty employeeId', async () => {
      const result = await resolveInvestorScope(undefined);
      expect(result).toEqual({ isInvestor: false, allowedCustomerIds: [] });
      expect(query).not.toHaveBeenCalled();
    });

    it('returns not-investor when no employee/group row is found', async () => {
      query.mockResolvedValueOnce([]); // group lookup empty
      const result = await resolveInvestorScope(VALID_ID);
      expect(result).toEqual({ isInvestor: false, allowedCustomerIds: [] });
    });

    it('returns not-investor (and never reads the allowlist) for a non-investor group', async () => {
      query.mockResolvedValueOnce([{ group_name: 'Admin' }]); // group lookup
      const result = await resolveInvestorScope(VALID_ID);
      expect(result).toEqual({ isInvestor: false, allowedCustomerIds: [] });
      expect(query).toHaveBeenCalledTimes(1); // short-circuits before investor_clients
    });

    it('returns the visible allowlist for an investor with assigned customers', async () => {
      query.mockResolvedValueOnce([{ group_name: 'investor' }]); // group lookup
      query.mockResolvedValueOnce([
        { partner_id: 'cust-1' },
        { partner_id: 'cust-2' },
      ]); // investor_clients
      const result = await resolveInvestorScope(VALID_ID);
      expect(result).toEqual({ isInvestor: true, allowedCustomerIds: ['cust-1', 'cust-2'] });
      // the allowlist query must scope by investor + visibility flag
      expect(query.mock.calls[1][0]).toContain('FROM dbo.investor_clients');
      expect(query.mock.calls[1][0]).toContain('is_visible = true');
      expect(query.mock.calls[1][1]).toEqual([VALID_ID]);
    });

    it('fails closed: an investor with no assigned customers yields an empty allowlist', async () => {
      query.mockResolvedValueOnce([{ group_name: 'investor' }]); // group lookup
      query.mockResolvedValueOnce([]); // no investor_clients rows
      const result = await resolveInvestorScope(VALID_ID);
      expect(result).toEqual({ isInvestor: true, allowedCustomerIds: [] });
    });
  });
});
