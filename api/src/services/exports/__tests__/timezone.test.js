'use strict';

const { toVNDate, buildFilename, formatDateTimeVN } = require('../exportWorkbook');

describe('toVNDate timezone handling', () => {
  test('preserves wall-clock time from a local Date', () => {
    // Simulate node-pg parsing a timestamp without timezone in local time
    const localDate = new Date('2025-05-07T14:30:00');
    const result = toVNDate(localDate);

    // toVNDate extracts local wall-clock components and rebuilds as UTC
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4); // May
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(localDate.getHours());
    expect(result.getUTCMinutes()).toBe(localDate.getMinutes());
  });

  test('handles plain YYYY-MM-DD string correctly', () => {
    const result = toVNDate('2025-05-07');

    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(4);
    expect(result.getUTCDate()).toBe(7);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });

  test('returns null for null/undefined/empty input', () => {
    expect(toVNDate(null)).toBeNull();
    expect(toVNDate(undefined)).toBeNull();
    expect(toVNDate('')).toBeNull();
  });

  test('returns null for invalid date strings', () => {
    expect(toVNDate('not-a-date')).toBeNull();
    expect(toVNDate('2025-13-45')).toBeNull();
  });
});

describe('buildFilename', () => {
  test('includes Vietnam timezone timestamp', () => {
    const filename = buildFilename('Test');
    expect(filename).toMatch(/^Test_\d{8}_\d{4}\.xlsx$/);
  });
});

describe('formatDateTimeVN', () => {
  test('formats a date to Vietnam wall-clock display', () => {
    const d = new Date(Date.UTC(2025, 4, 7, 14, 30, 0));
    const formatted = formatDateTimeVN(d);
    // Should be non-empty and match the dd/mm/yyyy hh:mm pattern
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
