const LEGACY_GREEDY_ALLOCATION_FLAG = 'TDENTAL_ALLOW_LEGACY_GREEDY_ALLOCATIONS';

function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function isPostedPayment(row) {
  return clean(row?.State || row?.state).toLowerCase() === 'posted';
}

function numberOrZero(value) {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function relationRows(source) {
  return source?.saleorderpaymentaccountpaymentrels || source?.rows?.saleorderpaymentaccountpaymentrels || [];
}

function postedPayments(source) {
  return (source?.accountpayments || source?.rows?.payments || [])
    .filter((row) => isPostedPayment(row) && numberOrZero(row.Amount || row.amount) > 0);
}

function assertRelationDrivenAllocationData(source) {
  const posted = postedPayments(source);
  if (posted.length === 0) return;
  if (relationRows(source).length > 0) return;

  throw new Error(
    'TDental apply requires SaleOrderPaymentAccountPaymentRels relation data before writing posted payments. Run dry-run only or provide relation-driven allocation export data.',
  );
}

function greedyAllocationWouldRun(plan) {
  const lines = plan?.rows?.lines || [];
  const payments = plan?.rows?.payments || [];
  return lines.some((row) => clean(row.OrderId || row.orderid)) &&
    payments.some((row) => isPostedPayment(row) && numberOrZero(row.Amount || row.amount) > 0);
}

function assertLegacyGreedyAllocationAllowed(plan, env = process.env) {
  if (!greedyAllocationWouldRun(plan)) return;
  if (env[LEGACY_GREEDY_ALLOCATION_FLAG] === '1') return;

  throw new Error(
    `TDental legacy greedy allocation apply is disabled by default. Use relation-driven allocation data, or set ${LEGACY_GREEDY_ALLOCATION_FLAG}=1 only for a reviewed legacy one-client apply.`,
  );
}

module.exports = {
  LEGACY_GREEDY_ALLOCATION_FLAG,
  assertLegacyGreedyAllocationAllowed,
  assertRelationDrivenAllocationData,
  greedyAllocationWouldRun,
};
