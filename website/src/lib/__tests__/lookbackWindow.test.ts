import { clampToLookback, getEarliestLookbackDate, isBeforeLookback, LOOKBACK_MONTHS } from '@/lib/dateUtils';

describe('calendar/report lookback window', () => {
  it('caps history at 3 calendar months', () => {
    expect(LOOKBACK_MONTHS).toBe(3);
    expect(getEarliestLookbackDate('2026-09-20')).toBe('2026-06-20');
    expect(isBeforeLookback('2026-06-19', '2026-09-20')).toBe(true);
    expect(isBeforeLookback('2026-06-20', '2026-09-20')).toBe(false);
    expect(clampToLookback('2020-01-01', '2026-09-20')).toBe('2026-06-20');
  });
});
