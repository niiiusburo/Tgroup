'use strict';

const { buildAppointmentDate } = require('../builders/appointmentsExport');

describe('buildAppointmentDate', () => {
  test('uses datetimeappointment when available', () => {
    // datetimeappointment is passed directly to toVNDate
    // We verify the structure is preserved
    const row = {
      datetimeappointment: new Date(Date.UTC(2025, 4, 7, 14, 30, 0)),
      date: new Date(Date.UTC(2025, 4, 7, 10, 0, 0)),
      time: '09:00',
    };
    const result = buildAppointmentDate(row);
    expect(result instanceof Date).toBe(true);
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  test('combines date + time when time is provided', () => {
    const row = {
      datetimeappointment: null,
      date: new Date(Date.UTC(2025, 4, 7, 0, 0, 0)),
      time: '14:30',
    };
    const result = buildAppointmentDate(row);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  test('preserves full timestamp from date when time is null', () => {
    // Key bug fix: appointments.date is timestamp without timezone (OID 1114).
    // When row.time is null (~96% of rows), the old code called toISOString().slice(0,10)
    // which lost the time component. The fix passes row.date directly to toVNDate.
    const row = {
      datetimeappointment: null,
      date: new Date('2025-05-07T13:00:00'),
      time: null,
    };
    const result = buildAppointmentDate(row);
    expect(result instanceof Date).toBe(true);
    expect(Number.isNaN(result.getTime())).toBe(false);
    // toVNDate preserves the LOCAL wall-clock components as UTC.
    // Since we constructed the Date from '2025-05-07T13:00:00' in local time,
    // the result should have hours matching the local hour (13).
    expect(result.getUTCHours()).toBe(new Date('2025-05-07T13:00:00').getHours());
  });

  test('returns null when date is null', () => {
    const row = {
      datetimeappointment: null,
      date: null,
      time: null,
    };
    expect(buildAppointmentDate(row)).toBeNull();
  });

  test('handles date as ISO string when time is null', () => {
    const row = {
      datetimeappointment: null,
      date: '2025-05-07T13:00:00.000Z',
      time: null,
    };
    const result = buildAppointmentDate(row);
    expect(result instanceof Date).toBe(true);
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  test('handles plain YYYY-MM-DD string when time is null', () => {
    const row = {
      datetimeappointment: null,
      date: '2025-05-07',
      time: null,
    };
    const result = buildAppointmentDate(row);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });
});
