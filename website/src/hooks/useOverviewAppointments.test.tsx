import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as api from '@/lib/api';

const getToday = vi.fn().mockReturnValue('2024-01-01');
const getEndOfDay = vi.fn().mockReturnValue('2024-01-01T23:59:59');
function mockFormatDate(date: string) {
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
});
