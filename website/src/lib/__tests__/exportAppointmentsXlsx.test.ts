import { describe, it, expect } from 'vitest';
import { exportAppointmentsXlsx } from '../exportAppointmentsXlsx';
import type { CalendarAppointment } from '@/types/appointment';

const mockAppointment = (overrides: Partial<CalendarAppointment> = {}): CalendarAppointment => ({
  id: '1',
  customerId: 'c1',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0909123456',
  customerCode: 'KH001',
  serviceName: 'Cạo vôi',
  appointmentType: 'treatment',
  dentist: 'BS. Trang',
  dentistId: 'd1',
  date: '2026-04-17',
  startTime: '08:00',
  endTime: '08:30',
  status: 'scheduled',
  locationId: 'loc1',
  locationName: 'Q1',
  notes: 'Type: Khám mới\nGhi chú',
  color: '0',
  arrivalTime: null,
  treatmentStartTime: null,
  ...overrides,
});

describe('exportAppointmentsXlsx', () => {
  it('runs without throwing for a valid appointment list', async () => {
    const appointments = [
      mockAppointment(),
      mockAppointment({ id: '2', status: 'cancelled', notes: 'Type: Tái khám\nBận' }),
    ];

    await expect(
      exportAppointmentsXlsx(appointments, 'DanhSachLichHen_test.xlsx')
    ).resolves.toBeUndefined();
  });
});
