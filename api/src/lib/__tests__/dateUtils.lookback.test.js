const {
  addCalendarMonths,
  getEarliestLookbackDate,
  isBeforeLookback,
  clampToLookback,
  LOOKBACK_MONTHS,
} = require('../dateUtils');

describe('calendar/report lookback window', () => {
  it('is 3 calendar months', () => {
    expect(LOOKBACK_MONTHS).toBe(3);
    expect(getEarliestLookbackDate('2026-09-20')).toBe('2026-06-20');
    expect(addCalendarMonths('2026-05-15', -1)).toBe('2026-04-15');
  });

  it('rejects dates older than the window and clamps missing/old values', () => {
    expect(isBeforeLookback('2026-06-19', '2026-09-20')).toBe(true);
    expect(isBeforeLookback('2026-06-20', '2026-09-20')).toBe(false);
    expect(clampToLookback('2026-01-01', '2026-09-20')).toBe('2026-06-20');
    expect(clampToLookback('', '2026-09-20')).toBe('2026-06-20');
    expect(clampToLookback('2026-08-01', '2026-09-20')).toBe('2026-08-01');
  });
});
