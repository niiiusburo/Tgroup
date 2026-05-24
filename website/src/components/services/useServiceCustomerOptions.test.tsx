import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useCustomerSelectorOptions } from '@/components/shared/useCustomerSelectorOptions';

const mockFetchPartners = vi.fn();
const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'dental' as 'dental' | 'cosmetic',
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: (...args: unknown[]) => mockFetchPartners(...args),
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({
    currentLOB: mockBusinessUnit.currentLOB,
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental', 'cosmetic'],
    isMultiLOBUser: true,
    isCosmeticEnabled: true,
  }),
}));

describe('useCustomerSelectorOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'dental';
  });

  it('uses remote partner search once the phone search is specific enough', async () => {
    mockFetchPartners.mockResolvedValue({
      items: [{
        id: 'remote-customer',
        name: 'Nguyễn Remote',
        phone: '0901333444',
        email: null,
        companyid: 'branch-id',
        status: true,
        lastupdated: '2026-04-29',
      }],
      totalItems: 1,
    });

    const baseCustomers = [{
      id: 'local-customer',
      name: 'Local Customer',
      phone: '0901000000',
      email: '',
      locationId: 'branch-id',
      status: 'active' as const,
      lastVisit: '2026-04-29',
    }];

    const { result, rerender } = renderHook(
      ({ searchTerm }) => useCustomerSelectorOptions(baseCustomers, null, searchTerm),
      { initialProps: { searchTerm: '09' } },
    );

    expect(mockFetchPartners).not.toHaveBeenCalled();
    expect(result.current.customers.map((c) => c.id)).toEqual(['local-customer']);

    rerender({ searchTerm: '09013' });

    await waitFor(() => {
      expect(mockFetchPartners).toHaveBeenCalledWith(
        expect.objectContaining({ search: '09013', limit: 20 }),
      );
    });
    await waitFor(() => {
      expect(result.current.customers.map((c) => c.id)).toEqual(['remote-customer']);
    });
  });

  it('keeps a selected remote customer visible after the search box clears', async () => {
    mockFetchPartners.mockResolvedValue({
      items: [{
        id: 'remote-customer',
        name: 'Nguyễn Remote',
        phone: '0901333444',
        email: null,
        companyid: 'branch-id',
        status: true,
        lastupdated: '2026-04-29',
      }],
      totalItems: 1,
    });

    const baseCustomers = [{
      id: 'local-customer',
      name: 'Local Customer',
      phone: '0901000000',
      email: '',
      locationId: 'branch-id',
      status: 'active' as const,
      lastVisit: '2026-04-29',
    }];

    const { result, rerender } = renderHook(
      ({ selectedId, searchTerm }) => useCustomerSelectorOptions(baseCustomers, selectedId, searchTerm),
      { initialProps: { selectedId: null as string | null, searchTerm: '09013' } },
    );

    await waitFor(() => {
      expect(result.current.customers.map((c) => c.id)).toEqual(['remote-customer']);
    });

    rerender({ selectedId: 'remote-customer', searchTerm: '' });

    await waitFor(() => {
      expect(result.current.customers.map((c) => c.id)).toContain('remote-customer');
    });
  });

  it('searches cosmetic customers from the cosmetic mirror route', async () => {
    mockBusinessUnit.currentLOB = 'cosmetic';
    mockFetchPartners.mockResolvedValue({
      items: [],
      totalItems: 0,
    });

    const { rerender } = renderHook(
      ({ searchTerm }) => useCustomerSelectorOptions([], null, searchTerm),
      { initialProps: { searchTerm: '09' } },
    );

    rerender({ searchTerm: '09013' });

    await waitFor(() => {
      expect(mockFetchPartners).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '09013',
          limit: 20,
          lob: 'cosmetic',
        }),
      );
    });
  });
});
