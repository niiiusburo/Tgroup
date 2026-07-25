/** Mirrors api/src/lib/saleOrderSourceLock.js for UI disable/error behavior (INV-026). */

export type SourceLockReason = 'paid' | 'closed_period';

export interface SourceLockState {
  locked: boolean;
  reasons: SourceLockReason[];
  openPeriodStart: string;
}

export function getOpenPeriodStart(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}-01`;
}

function toDateOnly(value?: string | null): string | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function evaluateSourceLock(input: {
  paidAmount?: number | null;
  attributionDate?: string | null;
  now?: Date;
}): SourceLockState {
  const reasons: SourceLockReason[] = [];
  const paid = Number(input.paidAmount ?? 0);
  if (Number.isFinite(paid) && paid > 0) {
    reasons.push('paid');
  }
  const openPeriodStart = getOpenPeriodStart(input.now ?? new Date());
  const dateOnly = toDateOnly(input.attributionDate ?? null);
  if (dateOnly && dateOnly < openPeriodStart) {
    reasons.push('closed_period');
  }
  return { locked: reasons.length > 0, reasons, openPeriodStart };
}

export function sourceLockMessage(state: SourceLockState): string {
  if (!state.locked) return '';
  if (state.reasons.includes('paid') && state.reasons.includes('closed_period')) {
    return 'Nguồn khách đã khóa (đã thanh toán và thuộc kỳ đã chốt). Dùng đường sửa nguồn có kiểm soát.';
  }
  if (state.reasons.includes('paid')) {
    return 'Nguồn khách đã khóa vì đơn đã có thanh toán. Dùng đường sửa nguồn có kiểm soát.';
  }
  return 'Nguồn khách đã khóa vì thuộc kỳ báo cáo đã chốt. Dùng đường sửa nguồn có kiểm soát.';
}
