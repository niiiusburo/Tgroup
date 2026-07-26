'use strict';

const { getAllocatedPaymentTotal, parseMoney } = require('./saleOrderTotals');

const SOURCE_IMMUTABLE = 'SOURCE_IMMUTABLE';
const SOURCE_CORRECTION_CONFLICT = 'SOURCE_CORRECTION_CONFLICT';
const SOURCE_CORRECTION_INVALID = 'SOURCE_CORRECTION_INVALID';
const CLINIC_TZ = 'Asia/Ho_Chi_Minh';

function normalizeSourceId(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim().toLowerCase();
}

function sourceIdsEqual(a, b) {
  return normalizeSourceId(a) === normalizeSourceId(b);
}

/**
 * Open reporting period starts at 00:00 on the 1st of the current calendar month
 * in Asia/Ho_Chi_Minh. Any order attribution date strictly before that is closed.
 */
function getOpenPeriodStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}-01`;
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function evaluateSourceLock({ totalPaid = 0, attributionDate = null, now = new Date() } = {}) {
  const reasons = [];
  if (parseMoney(totalPaid) > 0) {
    reasons.push('paid');
  }
  const openStart = getOpenPeriodStart(now);
  const dateOnly = toDateOnly(attributionDate);
  if (dateOnly && dateOnly < openStart) {
    reasons.push('closed_period');
  }
  return {
    locked: reasons.length > 0,
    reasons,
    open_period_start: openStart,
  };
}

async function loadSaleOrderSourceLockState(saleOrderId, queryFn) {
  const rows = await queryFn(
    `SELECT
       so.id,
       so.sourceid AS order_sourceid,
       so.totalpaid,
       so.datestart,
       so.datecreated,
       so.isdeleted
     FROM dbo.saleorders so
     WHERE so.id = $1
     FOR UPDATE OF so`,
    [saleOrderId],
  );
  const order = rows[0];
  if (!order || order.isdeleted === true) {
    return null;
  }

  const allocatedPaid = await getAllocatedPaymentTotal(queryFn, saleOrderId);
  const totalPaid = Math.max(parseMoney(order.totalpaid), allocatedPaid);
  const attributionDate = order.datestart || order.datecreated;
  const lock = evaluateSourceLock({ totalPaid, attributionDate });

  return {
    id: order.id,
    // Owning customer. Callers need this to enforce investor row scoping before they
    // mutate the source, and it must come from this locked read so the scope decision
    // cannot race a concurrent partner reassignment.
    partnerid: order.partnerid ?? null,
    order_sourceid: order.order_sourceid ?? null,
    total_paid: totalPaid,
    attribution_date: toDateOnly(attributionDate),
    ...lock,
  };
}

function buildSourceImmutableError(lockState) {
  const reasonText = lockState.reasons.includes('paid') && lockState.reasons.includes('closed_period')
    ? 'Order is paid and belongs to a closed reporting period'
    : lockState.reasons.includes('paid')
      ? 'Order has payment activity'
      : 'Order belongs to a closed reporting period';

  return {
    error: `Sale order source is immutable (${reasonText}). Use the audited source-correction path.`,
    code: SOURCE_IMMUTABLE,
    reasons: lockState.reasons,
    open_period_start: lockState.open_period_start,
    order_sourceid: lockState.order_sourceid,
  };
}

module.exports = {
  CLINIC_TZ,
  SOURCE_IMMUTABLE,
  SOURCE_CORRECTION_CONFLICT,
  SOURCE_CORRECTION_INVALID,
  normalizeSourceId,
  sourceIdsEqual,
  getOpenPeriodStart,
  toDateOnly,
  evaluateSourceLock,
  loadSaleOrderSourceLockState,
  buildSourceImmutableError,
};
