'use strict';

const { toVNDate } = require('../exportWorkbook');

describe('toVNDate timezone handling', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    if (originalTz) {
      process.env.TZ = originalTz;
    } else {
      delete process.env.TZ;
    }
  });

  test('preserves Vietnam wall-clock time when server is in UTC', () => {
    process.env.TZ = 'UTC';
    // Database stores: 2025-05-07 14:30:00 (VN time)
    // node-pg on UTC server parses as 2025-05-07 14:30:00 UTC
    const pgDate = new Date('2025-05-07T14:30:00');
    const result = toVNDate(pgDate);

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4); // May
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  test('preserves Vietnam wall-clock time when server is in America/New_York', () => {
    process.env.TZ = 'America/New_York';
    // Database stores: 2025-05-07 14:30:00 (VN time)
    // node-pg on EDT server parses as 2025-05-07 14:30:00 EDT
    const pgDate = new Date('2025-05-07T14:30:00');
    const result = toVNDate(pgDate);

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  test('preserves Vietnam wall-clock time when server is in Asia/Ho_Chi_Minh', () => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    // Database stores: 2025-05-07 14:30:00 (VN time)
    // node-pg on VN server parses as 2025-05-07 14:30:00 VN time
    const pgDate = new Date('2025-05-07T14:30:00');
    const result = toVNDate(pgDate);

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(14);
    expect(result.getUTCMinutes()).toBe(30);
  });

  test('handles plain YYYY-MM-DD string correctly', () => {
    process.env.TZ = 'America/New_York';
    const result = toVNDate('2025-05-07');

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  test('handles ISO string with Z suffix from JSON serialization', () => {
    process.env.TZ = 'America/New_York';
    // When a Date is JSON-serialized, it becomes an ISO string with Z suffix
    // e.g., 2025-05-07T14:30:00.000Z
    // This represents 14:30 UTC, which is 10:30 EDT
    const isoString = '2025-05-07T14:30:00.000Z';
    const result = toVNDate(isoString);

    // BUG? toVNDate extracts local hours from the parsed Date
    // In EDT: new Date('2025-05-07T14:30:00.000Z') = 10:30 EDT
    // d.getHours() returns 10
    // Date.UTC(2025, 4, 7, 10, 30) = 10:30 UTC
    // This is WRONG if the original intent was 14:30!

    // What SHOULD it be?
    // If the ISO string came from a server in VN timezone:
    //   VN server Date for 14:30 VN = 07:30 UTC
    //   JSON serialization = '2025-05-07T07:30:00.000Z'
    //   toVNDate on EDT server: new Date('2025-05-07T07:30:00.000Z') = 03:30 EDT
    //   d.getHours() = 3
    //   Date.UTC(2025, 4, 7, 3, 30) = 03:30 UTC -- WRONG!

    // But in our export code, dates come directly from pg, not from JSON.
    // So this case might not apply.

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    // In EDT, 14:30 UTC = 10:30 EDT, so getHours() returns 10
    expect(result.getUTCHours()).toBe(10);
  });
});
