import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomers } from '../useCustomers';

const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'cosmetic' as 'dental' | 'cosmetic',
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchPartners: vi.fn(),
  createPartner: vi.fn(),
  updatePartner: vi.fn(),
}));

import { createPartner, fetchPartners, updatePartner } from '@/lib/api';
import type { CustomerFormData } from '@/data/mockCustomerForm';

describe('useCustomers cosmetic LOB mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'cosmetic';
    vi.mocked(fetchPartners).mockResolvedValue({ items: [], totalItems: 0 });
  });

  it('creates cosmetic customers through the cosmetic mirror route', async () => {
    vi.mocked(createPartner).mockResolvedValue({
      id: 'customer-1',
      name: 'Cosmetic Customer',
      phone: '0909000000',
      email: null,
      companyid: 'cosmetic-company-1',
      companyname: 'Cosmetic Branch',
      status: true,
    } as any);

    const { result } = renderHook(() => useCustomers('all'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createCustomer({
        name: 'Cosmetic Customer',
        phone: '0909000000',
        companyid: 'cosmetic-company-1',
      } as CustomerFormData);
    });

    expect(createPartner).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cosmetic Customer',
        companyid: 'cosmetic-company-1',
      }),
      'cosmetic',
    );
  });

  it('updates cosmetic customers through the cosmetic mirror route', async () => {
    vi.mocked(updatePartner).mockResolvedValue({ id: 'customer-1', name: 'Updated' } as any);

    const { result } = renderHook(() => useCustomers('all'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateCustomer('customer-1', {
        name: 'Updated',
        phone: '0909000000',
        companyid: 'cosmetic-company-1',
      } as CustomerFormData);
    });

    expect(updatePartner).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({
        name: 'Updated',
        companyid: 'cosmetic-company-1',
      }),
      'cosmetic',
    );
  });
});
