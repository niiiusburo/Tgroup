import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as api from '@/lib/api';

const getToday = vi.fn().mockReturnValue('2024-01-01');
const getEndOfDay = vi.fn().mockReturnValue('2024-01-01T23:59:59');
function mockFormatDate(date: string | Date, format?: string) {
  if (format === 'HH:mm:ss') return '12:34:56';
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return date.split('T')[0];
}

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    getToday,
    getEndOfDay,
    timezone: 'Asia/Ho_Chi_Minh',
    formatDate: mockFormatDate,
  }),
}));

import { useOverviewAppointments } from './useOverviewAppointments';

describe('useOverviewAppointments search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'fetchAppointments').mockResolvedValue({ items: [
      { id: 'a1', partnerid: 'p1', partnername: 'Nguyễn Văn A', partnerphone: '0901111222', doctorname: 'Bác sĩ X', doctorid: 'd1', date: '2024-01-01', time: '09:00', companyid: 'c1', companyname: 'CN1', note: 'Khám răng', state: 'arrived', lastupdated: '2024-01-01T09:00:00', color: null },
      { id: 'a2', partnerid: 'p2', partnername: 'Trần Thị B', partnerphone: '0903333444', doctorname: 'Bác sĩ Y', doctorid: 'd2', date: '2024-01-01', time: '10:00', companyid: 'c1', companyname: 'CN1', note: 'Tẩy trắng', state: 'scheduled', lastupdated: '2024-01-01T10:00:00', color: null },
      { id: 'a3', partnerid: 'p3', partnername: 'Lê Văn C', partnerphone: '0905555666', doctorname: 'Bác sĩ X', doctorid: 'd1', date: '2024-01-01', time: '11:00', companyid: 'c1', companyname: 'CN1', note: 'Nhổ răng', state: 'cancelled', lastupdated: '2024-01-01T11:00:00', color: null },
    ]} as any);
    vi.spyOn(api, 'updateAppointment').mockResolvedValue({});
  });

  it('filters zone3 appointments by search term (name, phone, doctor, note)', async () => {
    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone3Appointments).toHaveLength(3);

    act(() => {
      result.current.setZone3Search('Trần');
    });
    expect(result.current.zone3Appointments).toHaveLength(1);
    expect(result.current.zone3Appointments[0].customerName).toBe('Trần Thị B');

    act(() => {
      result.current.setZone3Search('0901111');
    });
    expect(result.current.zone3Appointments).toHaveLength(1);
    expect(result.current.zone3Appointments[0].customerName).toBe('Nguyễn Văn A');

    act(() => {
      result.current.setZone3Search('Bác sĩ X');
    });
    expect(result.current.zone3Appointments).toHaveLength(2);

    act(() => {
      result.current.setZone3Search('Nhổ răng');
    });
    expect(result.current.zone3Appointments).toHaveLength(1);
    expect(result.current.zone3Appointments[0].customerName).toBe('Lê Văn C');
  });

  it('filters zone1 appointments by search term', async () => {
    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone1Appointments).toHaveLength(1);

    act(() => {
      result.current.setZone1Search('Nguyễn');
    });
    expect(result.current.zone1Appointments).toHaveLength(1);
    expect(result.current.zone1Appointments[0].customerName).toBe('Nguyễn Văn A');

    act(() => {
      result.current.setZone1Search('Không có tên này');
    });
    expect(result.current.zone1Appointments).toHaveLength(0);
  });

  it('keeps confirmed appointments out of check-in until staff marks arrived', async () => {
    vi.mocked(api.fetchAppointments).mockResolvedValueOnce({ items: [
      { id: 'a4', partnerid: 'p4', partnername: 'Phạm Thị D', partnerphone: '0907777888', doctorname: 'Bác sĩ Z', doctorid: 'd3', date: '2024-01-01', time: '09:00', companyid: 'c1', companyname: 'CN1', note: 'Tư vấn', state: 'confirmed', lastupdated: '2024-01-01T09:00:00', color: null },
    ]} as any);

    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.zone3Counts).toMatchObject({ all: 1, arrived: 0, cancelled: 0 });
    expect(result.current.zone1Appointments).toHaveLength(0);
    expect(result.current.appointments[0]).toMatchObject({
      topStatus: 'scheduled',
      checkInStatus: null,
      arrivalTime: null,
      treatmentStartTime: null,
    });
  });

  it('does not use the scheduled time as a treatment timer fallback', async () => {
    vi.mocked(api.fetchAppointments).mockResolvedValueOnce({ items: [
      { id: 'a5', partnerid: 'p5', partnername: 'Võ Văn E', partnerphone: '0909999000', doctorname: 'Bác sĩ Z', doctorid: 'd3', date: '2024-01-01', time: '09:00', companyid: 'c1', companyname: 'CN1', note: 'Khám', state: 'in Examination', datetimeseated: null, lastupdated: '2024-01-01T09:00:00', color: null },
    ]} as any);

    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appointments[0]).toMatchObject({
      checkInStatus: 'in-treatment',
      treatmentStartTime: null,
    });
  });

  it('preserves full arrival and treatment timestamps for wait timers', async () => {
    vi.mocked(api.fetchAppointments).mockResolvedValueOnce({ items: [
      {
        id: 'a6',
        partnerid: 'p6',
        partnername: 'Đỗ Văn F',
        partnerphone: '0911111111',
        doctorname: 'Bác sĩ Z',
        doctorid: 'd3',
        date: '2024-01-01',
        time: '09:00',
        companyid: 'c1',
        companyname: 'CN1',
        note: 'Khám',
        state: 'in Examination',
        datetimearrived: '2024-01-01T08:45:00.000Z',
        datetimeseated: '2024-01-01T09:10:00.000Z',
        lastupdated: '2024-01-01T09:10:00.000Z',
        color: null,
      },
    ]} as any);

    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appointments[0]).toMatchObject({
      checkInStatus: 'in-treatment',
      arrivalTime: '2024-01-01T08:45:00.000Z',
      treatmentStartTime: '2024-01-01T09:10:00.000Z',
    });
  });

  it('starts treatment timer from staff action time', async () => {
    const { result } = renderHook(() => useOverviewAppointments('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateCheckInStatus('a1', 'in-treatment');
    });

    expect(api.updateAppointment).toHaveBeenCalledWith('a1', { state: 'in Examination' });
    expect(result.current.appointments.find((apt) => apt.id === 'a1')).toMatchObject({
      checkInStatus: 'in-treatment',
      treatmentStartTime: '12:34:56',
    });
  });
});
