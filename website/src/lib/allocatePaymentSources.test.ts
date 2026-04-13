import { describe, it, expect } from 'vitest';
import { allocatePaymentSources } from './allocatePaymentSources';

describe('allocatePaymentSources', () => {
  it('sum below cap → unchanged, overflow 0', () => {
    const result = allocatePaymentSources(1_000_000, { deposit: 200_000, cash: 300_000, bank: 100_000 });
    expect(result).toEqual({ deposit: 200_000, cash: 300_000, bank: 100_000, total: 600_000, overflow: 0 });
  });

  it('sum exactly at cap → unchanged, overflow 0', () => {
    const result = allocatePaymentSources(600_000, { deposit: 200_000, cash: 300_000, bank: 100_000 });
    expect(result).toEqual({ deposit: 200_000, cash: 300_000, bank: 100_000, total: 600_000, overflow: 0 });
  });

  it('only deposit exceeds cap → deposit clamped to cap, others 0, overflow = deposit - cap', () => {
    const result = allocatePaymentSources(500_000, { deposit: 800_000, cash: 0, bank: 0 });
    expect(result).toEqual({ deposit: 500_000, cash: 0, bank: 0, total: 500_000, overflow: 300_000 });
  });

  it('deposit fills cap, cash supplied → cash forced to 0, overflow = cash', () => {
    const result = allocatePaymentSources(500_000, { deposit: 500_000, cash: 200_000, bank: 0 });
    expect(result).toEqual({ deposit: 500_000, cash: 0, bank: 0, total: 500_000, overflow: 200_000 });
  });

  it('mixed sources, last (bank) pushes over → bank clamped, earlier untouched', () => {
    const result = allocatePaymentSources(500_000, { deposit: 200_000, cash: 200_000, bank: 300_000 });
    expect(result).toEqual({ deposit: 200_000, cash: 200_000, bank: 100_000, total: 500_000, overflow: 200_000 });
  });

  it('cap = 0 → all zeros, overflow = sum of inputs', () => {
    const result = allocatePaymentSources(0, { deposit: 100_000, cash: 50_000, bank: 30_000 });
    expect(result).toEqual({ deposit: 0, cash: 0, bank: 0, total: 0, overflow: 180_000 });
  });

  it('negative cap treated as 0', () => {
    const result = allocatePaymentSources(-100_000, { deposit: 100_000, cash: 50_000, bank: 0 });
    expect(result).toEqual({ deposit: 0, cash: 0, bank: 0, total: 0, overflow: 150_000 });
  });

  it('negative source inputs clamped to 0', () => {
    const result = allocatePaymentSources(500_000, { deposit: -100_000, cash: 200_000, bank: 100_000 });
    expect(result).toEqual({ deposit: 0, cash: 200_000, bank: 100_000, total: 300_000, overflow: 0 });
  });

  it('floating-point tolerance — sum = cap + 0.005 → still no overflow', () => {
    const result = allocatePaymentSources(1_000_000, { deposit: 500_000, cash: 300_000, bank: 200_000.005 });
    expect(result.overflow).toBe(0);
    expect(result.total).toBeCloseTo(1_000_000.005, 2);
  });
});
