import { describe, expect, it } from 'vitest';
import { evaluateSourceLock, getOpenPeriodStart, sourceLockMessageKey } from './saleOrderSourceLock';
import en from '@/i18n/locales/en/services.json';
import vi from '@/i18n/locales/vi/services.json';

describe('saleOrderSourceLock', () => {
  it('keeps current-month unpaid orders editable', () => {
    const now = new Date('2026-07-15T05:00:00Z');
    const lock = evaluateSourceLock({
      paidAmount: 0,
      attributionDate: getOpenPeriodStart(now),
      now,
    });
    expect(lock.locked).toBe(false);
    expect(sourceLockMessageKey(lock)).toBe('');
  });

  it('locks paid and prior-month orders', () => {
    const now = new Date('2026-07-15T05:00:00Z');
    expect(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-07-10', now }).reasons).toContain('paid');
    expect(evaluateSourceLock({ paidAmount: 0, attributionDate: '2026-06-30', now }).reasons).toContain('closed_period');
  });

  it('selects the right message key per lock reason', () => {
    const now = new Date('2026-07-15T05:00:00Z');
    expect(sourceLockMessageKey(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-07-10', now })))
      .toBe('sourceLock.paid');
    expect(sourceLockMessageKey(evaluateSourceLock({ paidAmount: 0, attributionDate: '2026-06-30', now })))
      .toBe('sourceLock.closedPeriod');
    expect(sourceLockMessageKey(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-06-30', now })))
      .toBe('sourceLock.paidAndClosedPeriod');
  });

  it('returns keys only, never user-visible prose', () => {
    // The evaluator must stay framework-free and locale-free; the consumers translate.
    const now = new Date('2026-07-15T05:00:00Z');
    for (const input of [
      { paidAmount: 1, attributionDate: '2026-07-10', now },
      { paidAmount: 0, attributionDate: '2026-06-30', now },
      { paidAmount: 1, attributionDate: '2026-06-30', now },
    ]) {
      const key = sourceLockMessageKey(evaluateSourceLock(input));
      expect(key).toMatch(/^sourceLock\.[A-Za-z]+$/);
      expect(key).not.toMatch(/\s/);
    }
  });

  it('has every key wired in both locales', () => {
    // Defining a key without wiring it, or wiring one locale only, is the recurring i18n
    // failure mode in this repo. Assert both bundles resolve every key this module can emit.
    const now = new Date('2026-07-15T05:00:00Z');
    const keys = [
      sourceLockMessageKey(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-07-10', now })),
      sourceLockMessageKey(evaluateSourceLock({ paidAmount: 0, attributionDate: '2026-06-30', now })),
      sourceLockMessageKey(evaluateSourceLock({ paidAmount: 1, attributionDate: '2026-06-30', now })),
    ];
    for (const bundle of [en, vi] as Array<Record<string, unknown>>) {
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          bundle,
        );
        expect(typeof value).toBe('string');
        expect(String(value).length).toBeGreaterThan(10);
      }
    }
  });
});
