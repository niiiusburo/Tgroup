'use strict';

jest.mock('../../../db', () => ({
  query: jest.fn(),
}));

const { query } = require('../../../db');
const { buildAppointmentDate, build, preview } = require('../builders/appointmentsExport');

beforeEach(() => {
  query.mockReset();
});

describe('buildAppointmentDate', () => {
  test('prefers calendar date over stale datetimeappointment', () => {
    const row = {
      datetimeappointment: new Date('2026-05-08T09:00:00'),
      date: new Date('2026-05-20T00:00:00'),
      time: '09:00',
    };
    const result = buildAppointmentDate(row);
    expect(result instanceof Date).toBe(true);
    expect(Number.isNaN(result.getTime())).toBe(false);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(20);
    expect(result.getUTCHours()).toBe(9);
  });

  test('falls back to datetimeappointment when calendar date is missing', () => {
    const row = {
      datetimeappointment: new Date('2025-05-07T14:30:00'),
      date: null,
      time: '09:00',
    };
    const result = buildAppointmentDate(row);
    expect(result instanceof Date).toBe(true);
    expect(Number.isNaN(result.getTime())).toBe(false);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
  });

  test('combines date + time when time is provided', () => {
    // Use a local-time string so wall-clock components are TZ-stable across runners.
    const row = {
      datetimeappointment: null,
      date: new Date('2025-05-07T00:00:00'),
      time: '14:30',
    };
    const result = buildAppointmentDate(row);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  test('does not drop a day when server TZ is +07:00 (NK2 case)', () => {
    // Mirrors AP15079592 on NK2:
    //   date = '2026-06-04 00:00:00' (timestamp without time zone)
    //   time = '15:30'
    // On a TZ=Asia/Ho_Chi_Minh server, node-pg parses date as ICT local time,
    // so the JS Date is internally 2026-06-03T17:00:00Z but wall-clock day is 4.
    // The export must show 04/06/2026, not 03/06/2026.
    const row = {
      datetimeappointment: null,
      // Simulate what node-pg produces on a +07:00 server: a Date whose
      // local wall-clock is 2026-06-04 00:00 but UTC instant is the day before.
      date: new Date('2026-06-04T00:00:00'),
      time: '15:30',
    };
    const result = buildAppointmentDate(row);
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5); // June
    expect(result.getUTCDate()).toBe(4);
    expect(result.getUTCHours()).toBe(15);
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

describe('appointments export filters', () => {
  const USER = { name: 'Admin' };

  test('filters selected clinic day by calendar date and phone search', async () => {
    query.mockResolvedValueOnce([{
      total: '1',
      scheduled_count: '1',
      done_count: '0',
      cancelled_count: '0',
      arrived_count: '0',
      repeat_count: '0',
    }]);

    await preview({
      search: '922403152',
      companyId: 'all',
      dateFrom: '2026-05-20',
      dateTo: '2026-05-20',
      state: '',
      doctorId: '',
    }, USER);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('a.date::date >= $1::date');
    expect(sql).toContain('a.date::date <= $2::date');
    expect(sql).toContain('p.phone ILIKE $3');
    expect(params).toEqual(['2026-05-20', '2026-05-20', '%922403152%']);
  });

  test('exports the displayed calendar date when datetimeappointment is stale', async () => {
    query
      .mockResolvedValueOnce([{
        id: 'appointment-922403152',
        code: 'AP-922403152',
        date: new Date('2026-05-20T00:00:00'),
        time: '10:30:00',
        datetimeappointment: new Date('2026-05-08T10:30:00'),
        state: 'scheduled',
        reason: 'Feedback regression',
        note: '',
        isrepeatcustomer: false,
        partnercode: 'T922403152',
        partnername: 'Safe Fixture',
        partnerdisplayname: 'Safe Fixture',
        partnerphone: '922403152',
        companyname: 'Tấm Dentist',
        doctorname: '',
        assistantname: '',
        dentalaidename: '',
        productname: 'Khám',
      }])
      .mockResolvedValueOnce([{
        total: '1',
        scheduled_count: '1',
        done_count: '0',
        cancelled_count: '0',
        arrived_count: '0',
        repeat_count: '0',
      }]);

    const result = await build({
      search: '922403152',
      companyId: 'all',
      dateFrom: '2026-05-20',
      dateTo: '2026-05-20',
      state: '',
      doctorId: '',
    }, USER);

    const sheet = result.workbook.getWorksheet('Data');
    expect(sheet.getCell('B2').value).toEqual(new Date(Date.UTC(2026, 4, 20, 10, 30, 0)));
    expect(sheet.getCell('E2').value).toBe('922403152');
  });
});
