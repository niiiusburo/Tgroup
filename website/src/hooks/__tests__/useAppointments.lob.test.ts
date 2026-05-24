import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppointments } from '../useAppointments';

const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'cosmetic' as 'dental' | 'cosmetic',
}));

const mockFormatDate = vi.hoisted(() =>
  vi.fn((date: Date | string) => {
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return date.split('T')[0];
  }),
);

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({
    currentLOB: mockBusinessUnit.currentLOB,
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental', 'cosmetic'],
    isMultiLOBUser: true,
    isCosmeticEnabled: true,
  }),
}));

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    formatDate: mockFormatDate,
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
}));

import { createAppointment, fetchAppointments, updateAppointment } from '@/lib/api';

const cosmeticAppointment = {
  id: 'appointment-1',
  partnerid: 'customer-1',
  partnername: 'Cosmetic Customer',
  partnerphone: '0909000000',
  companyid: 'cosmetic-company-1',
  companyname: 'Cosmetic Branch',
  productid: 'service-1',
  productname: 'Consultation',
  date: '2026-05-24',
  time: '10:00',
  datetimeappointment: null,
  timeexpected: 30,
  timeExpected: 30,
  note: 'Cosmetic booking',
  state: 'scheduled',
  reason: null,
  partnerdisplayname: null,
  partnercode: null,
  doctorid: null,
  doctorId: null,
  doctorname: null,
  color: '1',
  name: 'Consultation',
  datecreated: null,
  lastupdated: null,
  datetimearrived: null,
  datetimeseated: null,
  datetimedismissed: null,
  datedone: null,
  assistantid: null,
  assistantname: null,
  dentalaideid: null,
  dentalaidename: null,
};

describe('useAppointments cosmetic LOB routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'cosmetic';
    vi.mocked(fetchAppointments).mockResolvedValue({ items: [], totalItems: 0 });
    vi.mocked(createAppointment).mockResolvedValue(cosmeticAppointment);
    vi.mocked(updateAppointment).mockResolvedValue({ id: 'appointment-1' } as any);
  });

  it('loads and creates appointments with the active cosmetic LOB', async () => {
    const { result } = renderHook(() => useAppointments('cosmetic-company-1'));

    await waitFor(() => {
      expect(fetchAppointments).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'cosmetic-company-1',
        lob: 'cosmetic',
      }));
    });

    await act(async () => {
      await result.current.createAppointment({
        customerId: 'customer-1',
        customerName: 'Cosmetic Customer',
        customerPhone: '0909000000',
        locationId: 'cosmetic-company-1',
        locationName: 'Cosmetic Branch',
        appointmentType: 'consultation',
        serviceName: 'Consultation',
        serviceId: 'service-1',
        date: '2026-05-24',
        startTime: '10:00',
        endTime: '10:30',
        notes: 'Cosmetic booking',
        estimatedDuration: 30,
      });
    });

    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerid: 'customer-1',
        companyid: 'cosmetic-company-1',
        productid: 'service-1',
      }),
      'cosmetic',
    );
  });

  it('updates appointments with the active cosmetic LOB', async () => {
    vi.mocked(fetchAppointments).mockResolvedValue({
      items: [cosmeticAppointment],
      totalItems: 1,
    });
    const { result } = renderHook(() => useAppointments('cosmetic-company-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateAppointment('appointment-1', {
        customerId: 'customer-1',
        customerName: 'Cosmetic Customer',
        customerPhone: '0909000000',
        locationId: 'cosmetic-company-1',
        locationName: 'Cosmetic Branch',
        appointmentType: 'consultation',
        serviceName: 'Updated Consultation',
        serviceId: 'service-1',
        date: '2026-05-24',
        startTime: '10:00',
        endTime: '10:30',
        notes: 'Updated cosmetic booking',
        estimatedDuration: 30,
      });
    });

    expect(updateAppointment).toHaveBeenCalledWith(
      'appointment-1',
      expect.objectContaining({
        partnerid: 'customer-1',
        companyid: 'cosmetic-company-1',
        productid: 'service-1',
      }),
      'cosmetic',
    );
  });
});
