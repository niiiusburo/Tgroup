import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReportData } from '../useReportData';

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
const mockFetch = vi.mocked(apiFetch);

const defaultFilters = { dateFrom: '2025-01-01', dateTo: '2025-12-31', companyId: '' };

describe('useReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('tgclinic_token', 'test-token');
  });

  afterEach(() => {
    localStorage.removeItem('tgclinic_token');
  });

  it('returns loading=true initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useReportData('/test', defaultFilters));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets data on successful response', async () => {
    const mockData = { total: 42, items: [1, 2, 3] };
    mockFetch.mockResolvedValueOnce({ success: true, data: mockData });

    const { result } = renderHook(() => useReportData('/test', defaultFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('sets error when success is false', async () => {
    mockFetch.mockResolvedValueOnce({ success: false });

    const { result } = renderHook(() => useReportData('/test', defaultFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Failed to load report');
  });

  it('sets error on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useReportData('/test', defaultFilters));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('calls API with correct endpoint and POST method', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: {} });

    const { result } = renderHook(() => useReportData('/Reports/dashboard', defaultFilters));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/Reports/dashboard', {
      method: 'POST',
      body: defaultFilters,
    });
  });

  it('refetch triggers a new API call', async () => {
    mockFetch.mockResolvedValueOnce({ success: true, data: { v: 1 } });
    mockFetch.mockResolvedValueOnce({ success: true, data: { v: 2 } });

    const { result } = renderHook(() => useReportData('/test', defaultFilters));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ v: 1 });

    result.current.refetch();

    await waitFor(() => expect(result.current.data).toEqual({ v: 2 }));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when params change', async () => {
    mockFetch.mockResolvedValue({ success: true, data: {} });

    const { result, rerender } = renderHook(
      (props: { dateFrom: string }) => useReportData('/test', { ...defaultFilters, dateFrom: props.dateFrom }),
      { initialProps: { dateFrom: '2025-01-01' } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender({ dateFrom: '2025-06-01' });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
