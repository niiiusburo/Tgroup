import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCustomerSources } from '@/lib/api';
import { useCustomerSources } from './useSettings';

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn(),
  updateProduct: vi.fn(),
  fetchCustomerSources: vi.fn(),
  createCustomerSource: vi.fn(),
  updateCustomerSource: vi.fn(),
  deleteCustomerSource: vi.fn(),
  fetchSystemPreferences: vi.fn(),
  upsertSystemPreference: vi.fn(),
  updateSystemPreference: vi.fn(),
  deleteSystemPreference: vi.fn(),
}));

describe('useCustomerSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears fallback source chips when the active LOB has no customer sources', async () => {
    vi.mocked(fetchCustomerSources).mockResolvedValue({
      items: [],
      aggregates: {
        total: 0,
        active: 0,
        totalCustomers: 0,
        topSource: '-',
      },
    });

    const { result } = renderHook(() => useCustomerSources());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchCustomerSources).toHaveBeenCalledWith({
      type: undefined,
      lob: 'cosmetic',
    });
    expect(result.current.allSources).toEqual([]);
    expect(result.current.sources).toEqual([]);
  });
});
