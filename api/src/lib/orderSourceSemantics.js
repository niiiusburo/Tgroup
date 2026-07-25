'use strict';

/**
 * Order vs customer source semantics (Task 11).
 *
 * - order source  = saleorders.sourceid  (immutable attribution for closed periods)
 * - customer source = partners.sourceid (acquisition source; may change over time)
 *
 * Never silently COALESCE these for write paths or closed-period reports.
 * Legacy coalesce is versioned and opt-in only.
 */

const LEGACY_SOURCE_FALLBACK_VERSION = 'legacy_coalesce_v1';

/** Direct order attribution — never COALESCE with customer source. */
const ORDER_SOURCE_ID_SQL = {
  so: 'so.sourceid',
};

/** Customer acquisition source on the partner row. */
const CUSTOMER_SOURCE_ID_SQL = {
  p: 'p.sourceid',
  cust: 'cust.sourceid',
  customer: 'customer.sourceid',
};

/**
 * Versioned legacy effective source. Opt-in only (audits / migration review).
 * Closed-period reports and default exports MUST NOT use this.
 */
const LEGACY_V1_EFFECTIVE_SOURCE_ID_SQL = {
  so_p: 'COALESCE(so.sourceid, p.sourceid)',
  so_cust: 'COALESCE(so.sourceid, cust.sourceid)',
  so_customer: 'COALESCE(so.sourceid, customer.sourceid)',
};

/**
 * Resolve the sourceid to persist on a new sale order.
 * Explicit body value wins; otherwise snapshot the customer's current source.
 */
async function resolveCreateOrderSourceId(queryFn, { partnerId, sourceid }) {
  if (sourceid !== undefined && sourceid !== null && String(sourceid).trim() !== '') {
    return sourceid;
  }
  if (!partnerId) return null;
  const rows = await queryFn(
    'SELECT sourceid FROM partners WHERE id = $1 AND COALESCE(isdeleted, false) = false LIMIT 1',
    [partnerId],
  );
  return rows?.[0]?.sourceid ?? null;
}

/**
 * SQL select list fragments exposing both sources without conflation.
 * Aliases: so = saleorders, p = partners (customer).
 */
function orderAndCustomerSourceSelectSql({
  orderAlias = 'so',
  partnerAlias = 'p',
  orderSourceJoinAlias = 'order_cs',
  customerSourceJoinAlias = 'cust_cs',
} = {}) {
  return {
    select: `
      ${orderAlias}.sourceid AS sourceid,
      ${orderSourceJoinAlias}.name AS sourcename,
      ${partnerAlias}.sourceid AS customersourceid,
      ${customerSourceJoinAlias}.name AS customersourcename
    `.trim(),
    joins: `
      LEFT JOIN customersources ${orderSourceJoinAlias}
        ON ${orderSourceJoinAlias}.id = ${orderAlias}.sourceid
      LEFT JOIN customersources ${customerSourceJoinAlias}
        ON ${customerSourceJoinAlias}.id = ${partnerAlias}.sourceid
    `.trim(),
  };
}

module.exports = {
  LEGACY_SOURCE_FALLBACK_VERSION,
  ORDER_SOURCE_ID_SQL,
  CUSTOMER_SOURCE_ID_SQL,
  LEGACY_V1_EFFECTIVE_SOURCE_ID_SQL,
  resolveCreateOrderSourceId,
  orderAndCustomerSourceSelectSql,
};
