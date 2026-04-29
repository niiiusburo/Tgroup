import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useServiceCustomerOptions } from './useServiceCustomerOptions';

const mockFetchPartners = vi.fn();

vi.mock('@/lib/api', () => ({
  fetchPartners: (...args: unknown[]) => mockFetchPartners(...args),
}));

describe('useServiceCustomerOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      ({ searchTerm }) => useServiceCustomerOptions(baseCustomers, null, searchTerm),
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
});
