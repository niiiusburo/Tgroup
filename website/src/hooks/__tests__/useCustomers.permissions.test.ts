/**
 * TDD Tests for Customer List Permission Feature
 * Issue: Permission-based customer list display
 * - With 'customers.view.all' permission: Show all customers immediately
 * - Without permission: Require minimum 3 characters to search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth hook before importing useCustomers
const mockHasPermission = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: vi.fn(),
  createPartner: vi.fn(),
  updatePartner: vi.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomers, PERMISSION_VIEW_ALL_CUSTOMERS, MIN_SEARCH_LENGTH } from '../useCustomers';
import { fetchPartners } from '@/lib/api';

describe('useCustomers - Permission-based List Display', () => {
  const mockFetchPartners = vi.mocked(fetchPartners);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPartners.mockResolvedValue({
      items: [
        { id: '1', name: 'Nguyễn Văn A', phone: '0901111111', email: 'a@test.com', companyid: 'c1', status: true },
        { id: '2', name: 'Trần Thị B', phone: '0902222222', email: 'b@test.com', companyid: 'c1', status: true },
        { id: '3', name: 'Lê Văn C', phone: '0903333333', email: 'c@test.com', companyid: 'c2', status: true },
      ],
      totalItems: 3,
    });
  });

  describe('Permission: customers.view.all', () => {
    it('should load all customers immediately when user has permission', async () => {
      // Given: User has the view.all permission
      mockHasPermission.mockImplementation((perm: string) => perm === PERMISSION_VIEW_ALL_CUSTOMERS);

      // When: Hook is initialized with empty search
      const { result } = renderHook(() => useCustomers('all'));

      // Then: Should fetch customers immediately (no search required)
      await waitFor(() => {
        expect(mockFetchPartners).toHaveBeenCalledWith(
          expect.objectContaining({
            offset: 0,
            limit: 200,
            search: undefined,
          })
        );
      });

      // And: Should display all customers
      await waitFor(() => {
        expect(result.current.customers).toHaveLength(3);
      });
    });

    it('should not show search required message when user has permission', async () => {
      // Given: User HAS the view.all permission
      mockHasPermission.mockImplementation((perm: string) => perm === PERMISSION_VIEW_ALL_CUSTOMERS);

      // When: Hook is initialized
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Then: Should NOT indicate search required
      expect(result.current.searchRequired).toBe(false);
      expect(result.current.canViewAllCustomers).toBe(true);
    });
  });

  describe('Permission: NO customers.view.all', () => {
    it('should NOT fetch customers when search is empty and user lacks permission', async () => {
      // Given: User does NOT have the view.all permission
      mockHasPermission.mockReturnValue(false);

      // When: Hook is initialized with empty search
      const { result } = renderHook(() => useCustomers('all'));

      // Then: Should NOT fetch customers (empty search = no results)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should return empty array
      expect(result.current.customers).toHaveLength(0);
    });

    it('should require minimum 3 characters to search when user lacks permission', async () => {
      // Given: User does NOT have the view.all permission
      mockHasPermission.mockReturnValue(false);

      // When: User searches with only 2 characters
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchTerm('Ng');
      });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 400));

      // Then: Should NOT trigger search (min 3 chars required)
      expect(mockFetchPartners).not.toHaveBeenCalled();
      expect(result.current.customers).toHaveLength(0);
    });

    it('should fetch customers when search has 3+ characters and user lacks permission', async () => {
      // Given: User does NOT have the view.all permission
      mockHasPermission.mockReturnValue(false);

      // When: User searches with 3+ characters
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSearchTerm('Nguy');
      });

      // Then: Should trigger search
      await waitFor(() => {
        expect(mockFetchPartners).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Nguy',
          })
        );
      });

      await waitFor(() => {
        expect(result.current.customers).toHaveLength(3);
      });
    });

    it('should show helpful message when search is required', async () => {
      // Given: User does NOT have the view.all permission
      mockHasPermission.mockReturnValue(false);

      // When: Hook is initialized
      const { result } = renderHook(() => useCustomers('all'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Then: Should indicate that search is required
      expect(result.current.searchRequired).toBe(true);
      expect(result.current.minSearchLength).toBe(MIN_SEARCH_LENGTH);
      expect(result.current.canViewAllCustomers).toBe(false);
    });
  });
});
