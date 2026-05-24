import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppointmentForm } from '../useAppointmentForm';

const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'dental' as 'dental' | 'cosmetic',
}));

// Mock API
vi.mock('@/lib/api', () => ({
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
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

import { createAppointment, updateAppointment } from '@/lib/api';

const mockCreateAppointment = createAppointment as ReturnType<typeof vi.fn>;
const mockUpdateAppointment = updateAppointment as ReturnType<typeof vi.fn>;

describe('useAppointmentForm validation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mockBusinessUnit.currentLOB = 'dental';
    mockCreateAppointment.mockClear();
    mockUpdateAppointment.mockClear();
  });

  it('defaults new appointment start time to the current Vietnam time rounded to 5 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T11:42:00.000Z')); // 18:42 in Vietnam

    const { result } = renderHook(() => useAppointmentForm('create'));

    expect(result.current.data.startTime).toBe('18:45');
  });

  it('should block submit when estimatedDuration is 0', async () => {
    const { result } = renderHook(() => useAppointmentForm('create'));

    // Fill required fields
    act(() => {
      result.current.handleChange({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Test',
        locationId: '770e8400-e29b-41d4-a716-446655440002',
        date: '2026-04-21',
        startTime: '09:00',
        estimatedDuration: 0,
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    // Should NOT call API
    expect(mockCreateAppointment).not.toHaveBeenCalled();
    // Should show validation error for estimatedDuration
    expect(result.current.errors.estimatedDuration).toBeDefined();
  });

  it('should block submit when locationId is empty', async () => {
    const { result } = renderHook(() => useAppointmentForm('create'));

    act(() => {
      result.current.handleChange({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Test',
        date: '2026-04-21',
        startTime: '09:00',
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateAppointment).not.toHaveBeenCalled();
    expect(result.current.errors.locationId).toBeDefined();
  });

  it('should call createAppointment with valid data', async () => {
    mockCreateAppointment.mockResolvedValue({ id: 'new-id' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAppointmentForm('create', undefined, onSuccess));

    act(() => {
      result.current.handleChange({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Test',
        locationId: '770e8400-e29b-41d4-a716-446655440002',
        locationName: 'Clinic',
        date: '2026-04-21',
        startTime: '09:00',
        estimatedDuration: 30,
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateAppointment).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should submit from database duration without requiring an end time', async () => {
    mockCreateAppointment.mockResolvedValue({ id: 'new-id' });
    const { result } = renderHook(() => useAppointmentForm('create'));

    act(() => {
      result.current.handleChange({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Test',
        locationId: '770e8400-e29b-41d4-a716-446655440002',
        locationName: 'Clinic',
        date: '2026-04-21',
        startTime: '09:00',
        estimatedDuration: 45,
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateAppointment).toHaveBeenCalledTimes(1);
    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        time: '09:00',
        timeexpected: 45,
      }),
      'dental',
    );
    expect(result.current.errors.endTime).toBeUndefined();
  });

  it('submits new cosmetic appointments through the cosmetic mirror route', async () => {
    mockBusinessUnit.currentLOB = 'cosmetic';
    mockCreateAppointment.mockResolvedValue({ id: 'new-id' });
    const { result } = renderHook(() => useAppointmentForm('create'));

    act(() => {
      result.current.handleChange({
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Cosmetic Customer',
        locationId: '770e8400-e29b-41d4-a716-446655440002',
        locationName: 'Cosmetic Branch',
        date: '2026-05-22',
        startTime: '10:00',
        estimatedDuration: 30,
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerid: '550e8400-e29b-41d4-a716-446655440000',
        companyid: '770e8400-e29b-41d4-a716-446655440002',
      }),
      'cosmetic',
    );
  });

  it('updates cosmetic appointments through the cosmetic mirror route', async () => {
    mockBusinessUnit.currentLOB = 'cosmetic';
    mockUpdateAppointment.mockResolvedValue({ id: 'appointment-1' });
    const { result } = renderHook(() => useAppointmentForm('edit', {
      id: 'appointment-1',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      customerName: 'Cosmetic Customer',
      locationId: '770e8400-e29b-41d4-a716-446655440002',
      locationName: 'Cosmetic Branch',
      date: '2026-05-22',
      startTime: '10:00',
      estimatedDuration: 30,
    }));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateAppointment).toHaveBeenCalledWith(
      'appointment-1',
      expect.objectContaining({
        partnerid: '550e8400-e29b-41d4-a716-446655440000',
        companyid: '770e8400-e29b-41d4-a716-446655440002',
      }),
      'cosmetic',
    );
  });
});
