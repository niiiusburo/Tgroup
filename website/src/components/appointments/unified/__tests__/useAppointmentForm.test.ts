import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppointmentForm } from '../useAppointmentForm';

// Mock API
vi.mock('@/lib/api', () => ({
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
}));

import { createAppointment, updateAppointment } from '@/lib/api';

const mockCreateAppointment = createAppointment as ReturnType<typeof vi.fn>;
const mockUpdateAppointment = updateAppointment as ReturnType<typeof vi.fn>;

describe('useAppointmentForm validation', () => {
  beforeEach(() => {
    mockCreateAppointment.mockClear();
    mockUpdateAppointment.mockClear();
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
    );
    expect(result.current.errors.endTime).toBeUndefined();
  });
});
