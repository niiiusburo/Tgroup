import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  fetchCustomerSources: vi.fn(),
  createCustomerSource: vi.fn(),
  updateCustomerSource: vi.fn(),
  deleteCustomerSource: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  ...apiMocks,
}));

import { useCustomerSources } from './useSettings';

const activeSource = {
  id: 'active-source',
  name: 'Hotline',
  type: 'online' as const,
  description: '',
  is_active: true,
  customer_count: 3,
  order_count: 7,
  created_at: '',
  updated_at: '',
};

describe('useCustomerSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests active-only choices for new service/order selection', async () => {
    apiMocks.fetchCustomerSources.mockResolvedValue({
      items: [activeSource],
      aggregates: { total: 1, active: 1, totalCustomers: 3, topSource: 'Hotline' },
    });

    const { result } = renderHook(() => useCustomerSources({ activeOnly: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMocks.fetchCustomerSources).toHaveBeenCalledWith({
      type: undefined,
      is_active: true,
    });
    expect(result.current.allSources).toEqual([
      expect.objectContaining({ id: 'active-source', customerCount: 3, orderCount: 7 }),
    ]);
  });

  it('keeps inactive rows available to the settings management surface', async () => {
    const inactiveSource = {
      ...activeSource,
      id: 'historical-source',
      name: 'Giới thiệu',
      is_active: false,
      customer_count: 0,
      order_count: 21,
    };
    apiMocks.fetchCustomerSources.mockResolvedValue({
      items: [activeSource, inactiveSource],
      aggregates: { total: 2, active: 1, totalCustomers: 3, topSource: 'Hotline' },
    });

    const { result } = renderHook(() => useCustomerSources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMocks.fetchCustomerSources).toHaveBeenCalledWith({
      type: undefined,
      is_active: undefined,
    });
    expect(result.current.allSources).toEqual([
      expect.objectContaining({ id: 'active-source', orderCount: 7 }),
      expect.objectContaining({ id: 'historical-source', isActive: false, orderCount: 21 }),
    ]);
  });

  it('keeps only the selected inactive source while editing historical data', async () => {
    const inactiveSource = {
      ...activeSource,
      id: 'historical-source',
      name: 'Giới thiệu',
      is_active: false,
      customer_count: '0',
      order_count: '21',
    };
    const otherInactiveSource = {
      ...inactiveSource,
      id: 'other-historical-source',
    };
    apiMocks.fetchCustomerSources.mockResolvedValue({
      items: [activeSource, inactiveSource, otherInactiveSource],
      aggregates: { total: 3, active: 1, totalCustomers: 3, topSource: 'Hotline' },
    });

    const { result } = renderHook(() => useCustomerSources({
      activeOnly: true,
      preserveId: 'historical-source',
    }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMocks.fetchCustomerSources).toHaveBeenCalledWith({
      type: undefined,
      is_active: undefined,
    });
    expect(result.current.allSources.map((source) => source.id)).toEqual([
      'active-source',
      'historical-source',
    ]);
    expect(result.current.allSources[1]).toEqual(expect.objectContaining({
      customerCount: 0,
      orderCount: 21,
    }));
  });

  it('shows no selectable sources when the active-only response is empty', async () => {
    apiMocks.fetchCustomerSources.mockResolvedValue({
      items: [],
      aggregates: { total: 0, active: 0, totalCustomers: 0, topSource: '-' },
    });

    const { result } = renderHook(() => useCustomerSources({ activeOnly: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allSources).toEqual([]);
  });

  it('fails closed when the active-only source request fails', async () => {
    apiMocks.fetchCustomerSources.mockRejectedValue(new Error('lookup unavailable'));

    const { result } = renderHook(() => useCustomerSources({ activeOnly: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allSources).toEqual([]);
    expect(result.current.error).toBe('lookup unavailable');
  });
});
