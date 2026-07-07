/**
 * TDD Tests for Employee List Permission Gating
 * Issue: Users without 'employees.view' (e.g. investor role) triggered a
 * guaranteed 403 from GET /api/Employees on every page using useEmployees.
 * - With 'employees.view' permission: fetch employees as before
 * - Without permission: skip the fetch entirely, expose empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth hook before importing useEmployees
const mockHasPermission = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchEmployees: vi.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { useEmployees, PERMISSION_VIEW_EMPLOYEES } from '../useEmployees';
import { fetchEmployees } from '@/lib/api';

describe('useEmployees - Permission gating on employees.view', () => {
  const mockFetchEmployees = vi.mocked(fetchEmployees);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEmployees.mockResolvedValue({
      items: [
        {
          id: 'e1',
          name: 'Bác sĩ 01',
          avatar: null,
          tierId: 't1',
          tierName: 'Doctor',
          isdoctor: true,
          isassistant: false,
          isreceptionist: false,
          jobtitle: null,
          hrjobname: null,
          active: true,
          companyid: 'c1',
          companyname: 'Chi nhánh 1',
          phone: '0900000001',
          email: 'bs01@test.com',
          startworkdate: null,
          datecreated: '2025-01-01T00:00:00Z',
          ref: null,
          wage: null,
          allowance: null,
          locationScopeIds: [],
        },
      ],
      totalItems: 1,
    });
  });

  describe('Permission: employees.view granted', () => {
    it('fetches employees on mount', async () => {
      mockHasPermission.mockImplementation((perm: string) => perm === PERMISSION_VIEW_EMPLOYEES);

      const { result } = renderHook(() => useEmployees());

      await waitFor(() => {
        expect(mockFetchEmployees).toHaveBeenCalledWith(
          expect.objectContaining({ offset: 0, limit: 500 })
        );
      });

      await waitFor(() => {
        expect(result.current.employees).toHaveLength(1);
      });
      expect(result.current.error).toBeNull();
    });

    it('still respects an explicit enabled=false option', async () => {
      mockHasPermission.mockImplementation((perm: string) => perm === PERMISSION_VIEW_EMPLOYEES);

      const { result } = renderHook(() => useEmployees(undefined, { enabled: false }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchEmployees).not.toHaveBeenCalled();
      expect(result.current.employees).toHaveLength(0);
    });
  });

  describe('Permission: employees.view missing (e.g. investor role)', () => {
    it('does NOT call the API and settles into an empty non-error state', async () => {
      mockHasPermission.mockReturnValue(false);

      const { result } = renderHook(() => useEmployees());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchEmployees).not.toHaveBeenCalled();
      expect(result.current.employees).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('does NOT fetch on search input either', async () => {
      mockHasPermission.mockReturnValue(false);

      const { result } = renderHook(() => useEmployees());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.setSearchQuery('Nguy');

      // Wait past the 300ms search debounce
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(mockFetchEmployees).not.toHaveBeenCalled();
    });
  });
});
