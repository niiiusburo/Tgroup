/**
 * allocatePaymentSources — Pure utility for distributing a payment cap across
 * deposit, cash, and bank sources in priority order (deposit first, then cash,
 * then bank). No I/O, no globals, no React imports.
 */

export interface PaymentSources {
  deposit: number;
  cash: number;
  bank: number;
}

export interface AllocatedSources extends PaymentSources {
  total: number;
  overflow: number;
}

const FLOAT_TOLERANCE = 0.01;

/**
 * Allocate a payment cap across three sources in priority order.
 *
 * Rules:
 * - Negative inputs (cap or sources) are clamped to 0.
 * - If sum <= cap, return sources unchanged with overflow = 0.
 * - If sum > cap, fill deposit first (up to cap), then cash from remaining
 *   room, then bank from whatever is left.  Anything that cannot fit becomes
 *   overflow.
 * - If the post-clamp total is within 0.01 of cap, treat as at-cap (overflow = 0).
 */
export function allocatePaymentSources(cap: number, sources: PaymentSources): AllocatedSources {
  const safeCap = Math.max(0, cap);

  const deposit = Math.max(0, sources.deposit);
  const cash = Math.max(0, sources.cash);
  const bank = Math.max(0, sources.bank);

  const sum = deposit + cash + bank;

  // Within tolerance — no overflow needed.
  if (sum <= safeCap + FLOAT_TOLERANCE) {
    return { deposit, cash, bank, total: sum, overflow: 0 };
  }

  // Allocate deposit first.
  const usedDeposit = Math.min(deposit, safeCap);
  const afterDeposit = safeCap - usedDeposit;

  // Then cash from remaining room.
  const usedCash = Math.min(cash, afterDeposit);
  const afterCash = afterDeposit - usedCash;

  // Then bank from remaining room.
  const usedBank = Math.min(bank, afterCash);

  const total = usedDeposit + usedCash + usedBank;
  const overflow = sum - total;

  return {
    deposit: usedDeposit,
    cash: usedCash,
    bank: usedBank,
    total,
    overflow,
  };
}
