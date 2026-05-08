import { describe, expect, it } from 'vitest';
import { mapApiAppointmentToCalendar } from '../calendarUtils';
import type { ApiAppointment } from '../api';

function appointment(overrides: Partial<ApiAppointment>): ApiAppointment {
  return {
    id: 'apt-1',
    name: null,
    date: '2024-01-01',
    time: '09:00',
    datetimeappointment: null,
    timeexpected: 30,
    timeExpected: 30,
    note: null,
    state: 'confirmed',
    reason: null,
    partnerid: 'p1',
    partnername: 'Patient',
    partnerdisplayname: null,
    partnerphone: '0900000000',
    partnercode: 'P001',
    doctorid: 'd1',
    doctorId: 'd1',
    doctorname: 'Doctor',
    companyid: 'c1',
    companyname: 'Clinic',
    color: null,
    productid: null,
    productname: null,
    datecreated: null,
    lastupdated: '2024-01-01T09:00:00',
    datetimearrived: null,
    datetimeseated: null,
    datetimedismissed: null,
    datedone: null,
    assistantid: null,
    assistantname: null,
    dentalaideid: null,
    dentalaidename: null,
    ...overrides,
  };
}

describe('mapApiAppointmentToCalendar', () => {
  it('does not start an arrival timer for confirmed appointments', () => {
    const mapped = mapApiAppointmentToCalendar(appointment({ state: 'confirmed' }));

    expect(mapped.status).toBe('confirmed');
    expect(mapped.arrivalTime).toBeNull();
    expect(mapped.treatmentStartTime).toBeNull();
  });

  it('uses the staff arrival timestamp for arrived appointments', () => {
    const mapped = mapApiAppointmentToCalendar(appointment({
      state: 'arrived',
      datetimearrived: '2024-01-01T09:17:22.000Z',
    }));

    expect(mapped.status).toBe('arrived');
    // ISO timestamp passed through unchanged so WaitTimer can compute the
    // diff in absolute UTC ms regardless of browser timezone.
    expect(mapped.arrivalTime).toBe('2024-01-01T09:17:22.000Z');
    expect(mapped.treatmentStartTime).toBeNull();
  });
});
