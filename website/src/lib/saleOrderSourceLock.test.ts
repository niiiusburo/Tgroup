import { describe, expect, it } from 'vitest';
import { evaluateSourceLock, getOpenPeriodStart, sourceLockMessage } from './saleOrderSourceLock';

describe('saleOrderSourceLock', () => {
  it('keeps current-month unpaid orders editable', () => {
    const now = new Date('2026-07-15T05:00:00Z');
    const lock = evaluateSourceLock({
      paidAmount: 0,
      attributionDate: getOpenPeriodStart(now),
      now,
    });
    expect(lock.locked).toBe(false);
    expect(sourceLockMessage(lock)).toBe('');
  });

  it('locks paid and prior-month orders', () => {
    const now = new Date('2026-07-15T05:00:00Z');
    expect(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-07-10', now }).reasons).toContain('paid');
    expect(evaluateSourceLock({ paidAmount: 0, attributionDate: '2026-06-30', now }).reasons).toContain('closed_period');
  });
});
