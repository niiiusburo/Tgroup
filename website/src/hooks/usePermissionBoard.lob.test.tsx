import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePermissionBoard } from './usePermissionBoard';
import {
  fetchPermissionGroups,
  fetchEmployeePermissions,
  updateEmployeePermission,
  fetchCompanies,
} from '@/lib/api';

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

vi.mock('@/lib/api', () => ({
  fetchPermissionGroups: vi.fn(),
  fetchEmployeePermissions: vi.fn(),
  updateEmployeePermission: vi.fn(),
  updatePermissionGroup: vi.fn(),
  fetchCompanies: vi.fn(),
}));

describe('usePermissionBoard LOB routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPermissionGroups).mockResolvedValue([
      { id: 'group-1', name: 'Admin', color: '#000000', description: null, isSystem: true, permissions: ['permissions.edit'] },
    ]);
    vi.mocked(fetchEmployeePermissions).mockResolvedValue([
      {
        employeeId: 'emp-1',
        employeeName: 'Cosmetic Staff',
        groupId: 'group-1',
        groupName: 'Admin',
        groupColor: '#000000',
        locScope: 'all',
        locations: [],
        overrides: { grant: [], revoke: [] },
      },
    ]);
    vi.mocked(fetchCompanies).mockResolvedValue({
      offset: 0,
      limit: 50,
      totalItems: 1,
      items: [{ id: 'cosmetic-branch', name: 'Thẩm mỹ Hà Nội' } as any],
    });
    vi.mocked(updateEmployeePermission).mockResolvedValue({
      employeeId: 'emp-1',
      employeeName: 'Cosmetic Staff',
      groupId: 'group-1',
      groupName: 'Admin',
      groupColor: '#000000',
      locScope: 'all',
      locations: [],
      overrides: { grant: [], revoke: [] },
    });
  });

  it('loads and saves employee permissions through the active Cosmetic LOB', async () => {
    const { result } = renderHook(() => usePermissionBoard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPermissionGroups).toHaveBeenCalledWith('cosmetic');
    expect(fetchEmployeePermissions).toHaveBeenCalledWith('cosmetic');
    expect(fetchCompanies).toHaveBeenCalledWith({ offset: 0, limit: 50, lob: 'cosmetic' });

    await act(async () => {
      await result.current.updateEmployee('emp-1', {
        groupId: 'group-1',
        locScope: 'all',
        locationIds: [],
        overrides: { grant: [], revoke: [] },
      });
    });

    expect(updateEmployeePermission).toHaveBeenCalledWith(
      'emp-1',
      {
        groupId: 'group-1',
        locScope: 'all',
        locationIds: [],
        overrides: { grant: [], revoke: [] },
      },
      'cosmetic',
    );
  });
});
