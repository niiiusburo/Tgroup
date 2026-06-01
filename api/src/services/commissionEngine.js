/**
 * commissionEngine.js — Per-service CTV commission engine (v3, 2026-06)
 *
 * MODEL (confirmed with product owner 2026-06-01):
 *  - PER-SERVICE attribution: each saleorder carries an optional `ctv_id` (the CTV attached
 *    to THAT service). Only services WITH a ctv_id earn commission — explicit attribution.
 *    There is NO per-customer referrer rate, NO consultation/salestaff fallback.
 *  - RATE = commission_level_config levels applied DIRECTLY to the (paid) amount:
 *      level 0 (the attached CTV)     = share_percent[0] %  of the amount
 *      level 1 (their direct upline)  = share_percent[1] %  of the amount
 *      level 2 ...                     = share_percent[2] %  ...  (disabled levels pay 0)
 *    No product `commission_rate_percent`, no `default_referral_percent` (both removed).
 *  - PAY-AS-PAID ("earned" vs "potential"): earnings are written at PAYMENT time on the
 *    ALLOCATED (collected) amount, so a CTV earns only as the client actually pays. The
 *    full-service "potential" is a display concern computed elsewhere from saleorder totals.
 *
 * Append-only `dbo.earnings`. Cycle-guarded upline walk. Inserts are idempotent per
 * (payment_id, service_line_id, recipient_partner_id, level). Refund writes negative
 * reversal rows (level preserved), idempotently. Supports a tx client for atomicity.
 *
 * @crossref:owned-by[product-map/domains/earnings-commissions.yaml]
 * @crossref:called-by[payment mutation paths in routes/payments.js]
 */

const { getDb: defaultGetDb } = require('../db');

function _getDb(lob, injectedGetDb = null) {
  const getDbFn = injectedGetDb || defaultGetDb;
  return getDbFn(lob);
}

/** Run a query through either a tx client (.query) or a pooled handle (.queryRows). */
async function _rows(dbOrClient, useTx, sql, params = []) {
  if (useTx) return (await dbOrClient.query(sql, params)).rows;
  return dbOrClient.queryRows(sql, params);
}

/**
 * Get commission level configuration: [{level, share_percent, enabled}] sorted by level.
 */
async function _getCommissionLevelConfig(lob, txClient = null, injectedGetDb = null) {
  const db = txClient || _getDb(lob, injectedGetDb);
  const sql = 'SELECT level, share_percent, enabled FROM dbo.commission_level_config ORDER BY level';
  const rows = await _rows(db, !!txClient, sql);
  return Array.isArray(rows) ? rows : [];
}

/** enabled level -> share_percent (number). Disabled / null levels are excluded. */
async function _shareByLevel(lob, txClient = null, injectedGetDb = null) {
  const config = await _getCommissionLevelConfig(lob, txClient, injectedGetDb);
  const map = new Map();
  for (const c of config) {
    if (c && c.enabled !== false && c.level != null) {
      map.set(Number(c.level), parseFloat(c.share_percent || 0) || 0);
    }
  }
  return map;
}

/**
 * Walk the CTV referral chain from a starting CTV up to 5 levels.
 * level 0 = the attached CTV itself, level 1 = direct upline, etc.
 * CYCLE-GUARDED: a corrupt referred_by_ctv_id cycle stops the walk instead of
 * emitting the same partner at multiple levels (which would over-pay).
 * @returns {Promise<Array<{level:number, partner_id:string}>>}
 */
async function _walkCtvChain(startPartnerId, lob, txClient = null, injectedGetDb = null) {
  if (!startPartnerId) return [];
  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;
  const chain = [];
  const visited = new Set([startPartnerId]);

  let currentId = startPartnerId;
  let level = 0;
  while (currentId && level < 5) {
    chain.push({ level, partner_id: currentId });
    const rows = await _rows(db, useTx, 'SELECT referred_by_ctv_id FROM dbo.partners WHERE id = $1', [currentId]);
    const next = rows && rows[0] ? rows[0].referred_by_ctv_id : null;
    if (!next || visited.has(next)) break; // chain top, or a cycle — stop
    visited.add(next);
    currentId = next;
    level += 1;
  }
  return chain;
}

const FORWARD_INSERT_SQL = `
  INSERT INTO dbo.earnings (
    client_id, recipient_partner_id, payment_id, service_line_id,
    source, level, amount, status, earned_at
  )
  SELECT $1, $2, $3, $4, 'ctv', $5, $6, 'pending', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.earnings
    WHERE payment_id = $3 AND service_line_id = $4 AND recipient_partner_id = $2 AND level = $5
  )
  RETURNING id, amount, level, recipient_partner_id
`;

/**
 * Create earnings rows for a collected payment, PER SERVICE.
 *
 * @param {object} args.payment      {id, customer_id, ...}
 * @param {Array}  args.lines        [{ id: saleorderline uuid, ctv_id: uuid|null, amount: paidAmount }]
 *                                    `ctv_id` is the saleorder's attached CTV; `amount` is the
 *                                    ALLOCATED (paid) amount for that service in this payment.
 * @param {'dental'|'cosmetic'} args.lob
 * @param {object} [args.clientRow]  the customer row (id used as earnings.client_id)
 * @param {object} [args.txClient]   pg client for atomic write with the payment
 */
async function createEarningsForPayment({ payment, lines = [], lob, clientRow = null, txClient = null, getDb: injectedGetDb = null }) {
  if (!payment || !payment.id) return [];
  const clientId = (clientRow && clientRow.id) || payment.customer_id || payment.customerid || null;
  if (!clientId) return [];

  const shareByLevel = await _shareByLevel(lob, txClient, injectedGetDb);
  if (shareByLevel.size === 0) return []; // no level config → no commission

  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;
  const created = [];

  for (const line of lines) {
    const ctvId = line && line.ctv_id;
    const serviceLineId = line && line.id;
    const base = line && line.amount != null ? parseFloat(line.amount) : 0;
    if (!ctvId || !serviceLineId || !(base > 0)) continue; // explicit CTV + real line + positive paid amount

    const chain = await _walkCtvChain(ctvId, lob, txClient, injectedGetDb);
    for (const link of chain) {
      const share = shareByLevel.get(link.level);
      if (!share || share <= 0) continue; // disabled / unconfigured level → no payout
      const amount = Math.round(base * (share / 100) * 100) / 100;
      if (amount <= 0) continue;
      const params = [clientId, link.partner_id, payment.id, serviceLineId, link.level, amount];
      const rows = await _rows(db, useTx, FORWARD_INSERT_SQL, params);
      const row = rows && rows[0];
      if (row) created.push(row);
    }
  }
  return created;
}

const REVERSAL_INSERT_SQL = `
  INSERT INTO dbo.earnings (
    client_id, recipient_partner_id, payment_id, service_line_id,
    source, level, amount, status, earned_at
  )
  SELECT $1, $2, $3, $4, $5, $6, $7, 'pending', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.earnings
    WHERE payment_id = $3 AND service_line_id = $4 AND recipient_partner_id = $2
      AND COALESCE(level, -1) = COALESCE($6, -1) AND amount < 0
  )
  RETURNING id, amount, level, recipient_partner_id
`;

/**
 * On refund/void/delete: write matching NEGATIVE reversal rows for a payment's positive
 * earnings. Preserves `level` (so net-by-level reconciles and the forward idempotency guard
 * still matches). Idempotent per (refund payment_id, service_line, recipient, level): running
 * the same reversal twice (e.g. delete-then-void, or a retried request) does NOT double-reverse.
 * Does NOT mutate the original earnings rows.
 */
async function reverseOnRefund({ originalPaymentId, refundPayment, lob, txClient = null, getDb: injectedGetDb = null }) {
  if (!originalPaymentId || !refundPayment || !refundPayment.id) return [];
  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  const originals = await _rows(
    db,
    useTx,
    'SELECT client_id, recipient_partner_id, service_line_id, source, level, amount FROM dbo.earnings WHERE payment_id = $1 AND amount > 0 ORDER BY created_at',
    [originalPaymentId]
  );

  const reversals = [];
  for (const orig of originals) {
    const negAmount = -Math.abs(parseFloat(orig.amount));
    const params = [
      orig.client_id,
      orig.recipient_partner_id,
      refundPayment.id,
      orig.service_line_id,
      orig.source,
      orig.level != null ? orig.level : 0,
      negAmount,
    ];
    const rows = await _rows(db, useTx, REVERSAL_INSERT_SQL, params);
    const rev = rows && rows[0];
    if (rev) reversals.push(rev);
  }
  return reversals;
}

/**
 * Backfill per-service earnings for a client's already-collected payments.
 * Reconstructs lines from payment_allocations -> saleorders (ctv_id) so the same per-service
 * commission applies as at live payment time. Idempotent via createEarningsForPayment's
 * per-(payment,line,recipient,level) guard. Used when a CTV is attached to a service after
 * the client has already paid, so the earned commission is realized retroactively.
 */
async function backfillEarningsForClient({ clientId, lob, getDb: injectedGetDb = null }) {
  const empty = { paymentsScanned: 0, paymentsAttributed: 0, earningsCreated: 0 };
  if (!clientId || !lob) return empty;
  const db = _getDb(lob, injectedGetDb);

  const payments = await db.queryRows(
    'SELECT id, amount, customer_id, payment_date FROM payments WHERE customer_id = $1 AND amount > 0 ORDER BY payment_date ASC NULLS FIRST',
    [clientId]
  );
  if (!payments || payments.length === 0) return { ...empty };

  let paymentsAttributed = 0;
  let earningsCreated = 0;

  for (const payment of payments) {
    const lines = await _linesForPayment(payment.id, db);
    if (lines.length === 0) continue;
    const created = await createEarningsForPayment({
      payment: { ...payment, customer_id: clientId },
      lines,
      lob,
      clientRow: { id: clientId },
      getDb: injectedGetDb,
    });
    if (created && created.length > 0) {
      paymentsAttributed += 1;
      earningsCreated += created.length;
    }
  }
  return { paymentsScanned: payments.length, paymentsAttributed, earningsCreated };
}

/**
 * Reconstruct the per-service commission lines for a payment from its allocations.
 * Each allocation (payment -> saleorder, allocated_amount) becomes one line carrying the
 * saleorder's ctv_id and a representative saleorderline id (FK), with amount = allocated.
 * Exported as a helper so the payment-create hook and the backfill share one mapping.
 */
async function _linesForPayment(paymentId, db) {
  const allocs = await db.queryRows(
    `SELECT a.invoice_id, a.allocated_amount, so.ctv_id,
            (SELECT sl.id FROM dbo.saleorderlines sl
              WHERE sl.orderid = a.invoice_id AND COALESCE(sl.isdeleted,false)=false
              ORDER BY sl.id LIMIT 1) AS line_id
       FROM payment_allocations a
       JOIN dbo.saleorders so ON so.id = a.invoice_id
      WHERE a.payment_id = $1 AND a.invoice_id IS NOT NULL`,
    [paymentId]
  );
  return (allocs || [])
    .filter((a) => a.ctv_id && a.line_id)
    .map((a) => ({ id: a.line_id, ctv_id: a.ctv_id, amount: parseFloat(a.allocated_amount || 0) }));
}

/**
 * Manual/admin trigger (the currently-unmounted POST /commissionEngine/trigger route).
 * Delegates to backfillEarningsForClient; never throws.
 */
async function triggerCommissionEngine(serviceLineId, clientId, partnerId, lob, injectedGetDb = null) {
  if (!clientId || !['dental', 'cosmetic'].includes(lob)) {
    return { paymentsScanned: 0, paymentsProcessed: 0, earningsCreated: 0, errors: ['clientId and a valid lob are required'] };
  }
  try {
    const r = await backfillEarningsForClient({ clientId, lob, getDb: injectedGetDb });
    return { paymentsScanned: r.paymentsScanned, paymentsProcessed: r.paymentsAttributed, earningsCreated: r.earningsCreated, errors: [] };
  } catch (err) {
    return { paymentsScanned: 0, paymentsProcessed: 0, earningsCreated: 0, errors: [err && err.message ? err.message : String(err)] };
  }
}

module.exports = {
  createEarningsForPayment,
  reverseOnRefund,
  backfillEarningsForClient,
  triggerCommissionEngine,
  // internal (tests)
  _walkCtvChain,
  _linesForPayment,
  _getCommissionLevelConfig,
};
