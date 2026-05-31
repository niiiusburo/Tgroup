/**
 * commissionEngine.js — Earnings attribution engine for Cosmetic LOB v2 (Phase 2+)
 * 
 * Append-only transactional earnings in dbo.earnings (both DBs).
 * Distinct from legacy rules tables (commissions, commissionproductrules, saleorderlinepartnercommissions — NEVER touched).
 * 
 * D13 recipient resolution (strict priority, first match wins):
 *   1. client.referred_by_ctv_id → CTV (source='ctv', crosses LOBs)
 *   2. cosmetic + active open consultation → consulting_staff (source='consultation')
 *   3. dental + client.salestaffid → salestaff (source='salestaff')
 *   4. else: no earnings row written
 * 
 * Trigger: on payment collected (positive earnings row).
 * Refund: negative reversal row written; original earnings row left untouched (status stays 'pending' until payout).
 * 
 * Uses getDb(lob) for correct physical DB. Supports tx client for atomicity with payment.
 * 
 * @crossref:owned-by[product-map/domains/earnings-commissions.yaml]
 * @crossref:called-by[payment mutation paths in routes/payments.js]
 */

const { getDb: defaultGetDb } = require('../db');

/**
 * Internal helper: get a DB handle or use provided.
 */
function _getDb(lob, injectedGetDb = null) {
  const getDbFn = injectedGetDb || defaultGetDb;
  return getDbFn(lob);
}

/**
 * Resolve the commission recipient partner for a client/payment context.
 * @param {object} args
 * @param {object} args.clientRow - row from partners (must have referred_by_ctv_id, salestaffid, id)
 * @param {'dental'|'cosmetic'} args.lob
 * @param {object} [args.txClient] - optional pg client for tx (has .query)
 * @param {function} [args.getDb] - injectable for tests
 * @returns {Promise<{recipient_partner_id: string, source: 'ctv'|'consultation'|'salestaff'} | null>}
 */
async function resolveRecipient({ clientRow, lob, txClient = null, getDb: injectedGetDb = null, asOf = new Date(), referralClaim = null }) {
  if (!clientRow) return null;

  // 1. CTV referrer (highest priority, works for both LOBs) — only while the
  // referral claim is ACTIVE as of the payment date. A lapsed claim earns
  // nothing and does not auto-revive; we fall through to the other sources.
  if (clientRow.referred_by_ctv_id) {
    const claimSvc = referralClaim || require('./referralClaim');
    const status = await claimSvc.getReferralClaimStatus(clientRow.id, lob, { asOf, txClient, getDb: injectedGetDb });
    if (status && status.active && status.ownerCtvId) {
      return { recipient_partner_id: status.ownerCtvId, source: 'ctv' };
    }
  }

  // 2. Cosmetic active consultation card
  if (lob === 'cosmetic') {
    const dbOrClient = txClient || _getDb('cosmetic', injectedGetDb);
    const q = txClient
      ? txClient.query('SELECT consulting_staff_id FROM consultations WHERE client_id = $1 AND status = \'open\' ORDER BY opened_at DESC LIMIT 1', [clientRow.id])
      : dbOrClient.queryRows('SELECT consulting_staff_id FROM consultations WHERE client_id = $1 AND status = \'open\' ORDER BY opened_at DESC LIMIT 1', [clientRow.id]);
    const rows = txClient ? (await q).rows : await q;
    if (rows && rows[0] && rows[0].consulting_staff_id) {
      return { recipient_partner_id: rows[0].consulting_staff_id, source: 'consultation' };
    }
  }

  // 3. Dental salestaff fallback
  if (lob === 'dental' && clientRow.salestaffid) {
    return { recipient_partner_id: clientRow.salestaffid, source: 'salestaff' };
  }

  return null;
}

/**
 * Fetch product commission rate (defaults 0).
 */
async function getProductRate(productId, lob, txClient = null, injectedGetDb = null) {
  if (!productId) return 0;
  const dbOrClient = txClient || _getDb(lob, injectedGetDb);
  const q = txClient
    ? txClient.query('SELECT commission_rate_percent FROM products WHERE id = $1', [productId])
    : dbOrClient.queryRows('SELECT commission_rate_percent FROM products WHERE id = $1', [productId]);
  const rows = txClient ? (await q).rows : await q;
  const rate = rows && rows[0] ? rows[0].commission_rate_percent : 0;
  return rate != null ? parseFloat(rate) : 0;
}

/**
 * Get commission level configuration (cached per call).
 * Returns array of {level, share_percent, enabled} sorted by level.
 */
async function _getCommissionLevelConfig(lob, txClient = null, injectedGetDb = null) {
  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  const sql = 'SELECT level, share_percent, enabled FROM dbo.commission_level_config ORDER BY level';
  const res = useTx ? await txClient.query(sql) : await db.queryRows(sql);
  const rows = useTx ? res.rows : res;

  return rows && Array.isArray(rows) ? rows : [];
}

/**
 * Get default referral percent from commission_settings (singleton).
 */
async function _getDefaultReferralPercent(lob, txClient = null, injectedGetDb = null) {
  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  const sql = 'SELECT default_referral_percent FROM dbo.commission_settings LIMIT 1';
  const res = useTx ? await txClient.query(sql) : await db.queryRows(sql);
  const rows = useTx ? res.rows : res;

  return (rows && rows[0] && rows[0].default_referral_percent) ? parseFloat(rows[0].default_referral_percent) : 20.0;
}

/**
 * Walk up the CTV referral chain for MLM split.
 * Returns array of {level, partner_id} by traversing referred_by_ctv_id up to 5 levels.
 */
async function _walkCtvChain(startPartnerId, lob, txClient = null, injectedGetDb = null) {
  if (!startPartnerId) return [];

  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;
  const chain = [];

  let currentId = startPartnerId;
  let level = 0;

  while (currentId && level < 5) {
    chain.push({ level, partner_id: currentId });

    // Fetch referred_by_ctv_id from current partner
    const sql = 'SELECT referred_by_ctv_id FROM dbo.partners WHERE id = $1';
    const res = useTx ? await txClient.query(sql, [currentId]) : await db.queryRows(sql, [currentId]);
    const rows = useTx ? res.rows : res;

    if (!rows || !rows[0] || !rows[0].referred_by_ctv_id) break;

    currentId = rows[0].referred_by_ctv_id;
    level += 1;
  }

  return chain;
}

/**
 * Write MLM override earnings: the direct CTV earner's upline chain each earns
 * `commission_level_config.share_percent[level]` of the SAME commission amount.
 *
 * ADDITIVE — does NOT touch the direct L0 row (direct earners keep their full commission);
 * uplines get an extra row on top. This makes the CTV portal's projected "potential from
 * downline" (Σ downline direct-commission × share[level]) into real pending commission.
 *
 * IDEMPOTENT per (payment_id, service_line_id, recipient, level) via NOT EXISTS, so the live
 * payment hook and the one-time backfill can both run repeatedly without double-paying.
 *
 * Disabled levels pay 0 and do not redistribute to deeper levels. Only meaningful for
 * source='ctv' (consultation/salestaff have no referral chain).
 *
 * @returns {Promise<Array>} the override rows actually inserted
 */
async function _writeCtvOverrides({
  clientId,
  paymentId,
  serviceLineId,
  baseAmount,
  directRecipientId,
  lob,
  txClient = null,
  getDb: injectedGetDb = null,
}) {
  const base = parseFloat(baseAmount || 0);
  if (!directRecipientId || !(base > 0)) return [];

  const config = await _getCommissionLevelConfig(lob, txClient, injectedGetDb);
  const shareByLevel = new Map();
  for (const c of config || []) {
    if (c && c.enabled !== false && c.level != null) {
      shareByLevel.set(Number(c.level), parseFloat(c.share_percent || 0) || 0);
    }
  }
  if (shareByLevel.size === 0) return []; // no MLM config → direct-only (unchanged behavior)

  const chain = await _walkCtvChain(directRecipientId, lob, txClient, injectedGetDb);
  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;
  const created = [];

  const insertSql = `
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

  for (const link of chain) {
    if (!link || link.level < 1) continue; // L0 = the direct earner, already paid
    const share = shareByLevel.get(link.level);
    if (!share || share <= 0) continue; // disabled / unconfigured level → no override
    const amount = Math.round(base * (share / 100) * 100) / 100;
    if (amount <= 0) continue;
    const params = [clientId, link.partner_id, paymentId, serviceLineId, link.level, amount];
    const res = useTx ? await txClient.query(insertSql, params) : await db.queryRows(insertSql, params);
    const row = useTx ? res.rows && res.rows[0] : res && res[0];
    if (row) created.push(row);
  }
  return created;
}

/**
 * Create earnings row(s) for a collected payment.
 *
 * MLM Split Logic (source='ctv'):
 *   - Walk up referred_by_ctv_id chain (L0=direct, L1-L4=upline)
 *   - For each enabled level in commission_level_config, write earnings row at that level
 *   - Calculate share = commissionAmount * (level_share_percent / 100)
 *   - Skip disabled levels (no payout to that level, do not redistribute to deeper levels)
 *
 * Single-row Logic (source='consultation' or 'salestaff'):
 *   - Write single full-pool earnings row at level 0 to the recipient
 *
 * @param {object} args
 * @param {object} args.payment - {id, amount, customer_id, ...}
 * @param {Array} [args.lines] - [{id: saleorderline uuid, product_id?, amount?}]
 * @param {'dental'|'cosmetic'} args.lob
 * @param {object} args.clientRow - the customer/partner row for resolution
 * @param {object} [args.txClient] - pg client from BEGIN for atomic write with payment
 */
async function createEarningsForPayment({ payment, lines = [], lob, clientRow, txClient = null, getDb: injectedGetDb = null, referralClaim = null }) {
  if (!payment || !payment.id || !clientRow) return [];

  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  const asOf = payment.paymentdate || payment.payment_date || payment.date || new Date();
  const recipient = await resolveRecipient({ clientRow, lob, txClient, getDb: injectedGetDb, asOf, referralClaim });
  if (!recipient) {
    return []; // no attribution path
  }

  const earnedRows = [];
  const paymentAmount = parseFloat(payment.amount || 0);
  const lineList = lines.length > 0 ? lines : [{ id: null, product_id: null, amount: paymentAmount }];

  // Direct commission — NO "pool", NO MLM level split. The referral (L0 = the resolved recipient)
  // earns a flat percentage OF THE ACTUAL SERVICE amount: each line contributes
  // `lineAmount × product.commission_rate_percent`. That per-product rate IS the referral rate
  // (default 24%, braces 7% — set on dbo.products). A single earnings row is written to the
  // recipient at level 0 for every source (ctv / consultation / salestaff).
  let totalCommissionAmount = 0;
  for (const line of lineList) {
    const lineAmount = line.amount != null ? parseFloat(line.amount) : (paymentAmount / lineList.length);
    const rate = await getProductRate(line.product_id, lob, txClient, injectedGetDb);
    const commissionAmount = Math.round((lineAmount * (rate / 100)) * 100) / 100;
    totalCommissionAmount += commissionAmount;
  }

  if (totalCommissionAmount <= 0) return [];

  const serviceLineId = lineList[0].id || '00000000-0000-0000-0000-000000000000';
  const insertSql = `
    INSERT INTO dbo.earnings (
      client_id, recipient_partner_id, payment_id, service_line_id,
      source, level, amount, status, earned_at
    ) VALUES ($1, $2, $3, $4, $5, 0, $6, 'pending', now())
    RETURNING id, amount, source, level, recipient_partner_id
  `;
  const params = [
    clientRow.id,
    recipient.recipient_partner_id,
    payment.id,
    serviceLineId,
    recipient.source,
    totalCommissionAmount,
  ];

  const res = useTx
    ? await txClient.query(insertSql, params)
    : await db.queryRows(insertSql, params);

  const row = useTx ? res.rows[0] : res[0];
  if (row) earnedRows.push(row);

  // MLM override (D13 v2): make the projected downline override real — the direct CTV earner's
  // upline chain each earns share_percent[level] of THIS commission. Additive + idempotent; only
  // CTV-sourced commission cascades (consultation/salestaff have no referral chain).
  if (recipient.source === 'ctv') {
    const overrides = await _writeCtvOverrides({
      clientId: clientRow.id,
      paymentId: payment.id,
      serviceLineId,
      baseAmount: totalCommissionAmount,
      directRecipientId: recipient.recipient_partner_id,
      lob,
      txClient,
      getDb: injectedGetDb,
    });
    if (overrides.length) earnedRows.push(...overrides);
  }

  return earnedRows;
}

/**
 * Backfill CTV earnings for a client's already-collected payments.
 *
 * Why: earnings rows are normally born only at payment time (POST /api/Payments).
 * When a CTV is assigned to a customer AFTER they have already paid (the common
 * "this client already came & paid, then I added them to the CTV" case), those
 * past payments produced no CTV earning, so the CTV portal journey is frozen at
 * "referred" (1/4) and no commission is attributed. This re-runs the engine over
 * the client's positive payments so the CTV sees the real paid journey.
 *
 * Idempotent: a payment that already has a `source='ctv'` earning is skipped, so
 * calling this repeatedly (every assignment) never double-attributes. Pre-existing
 * salestaff/consultation earnings for the same payment are left untouched.
 *
 * Lines are reconstructed from payment_allocations -> saleorderlines so the same
 * per-product commission_rate_percent applies as at live payment time.
 *
 * @param {object} args
 * @param {string} args.clientId - partners.id of the customer
 * @param {'dental'|'cosmetic'} args.lob - physical DB the client/payments live in
 * @param {function} [args.getDb] - injectable getDb(lob) -> {queryRows}; defaults to real DB
 * @param {object} [args.referralClaim] - injectable for tests
 * @returns {Promise<{paymentsScanned:number, paymentsAttributed:number, earningsCreated:number}>}
 */
async function backfillEarningsForClient({ clientId, lob, getDb: injectedGetDb = null, referralClaim = null }) {
  const empty = { paymentsScanned: 0, paymentsAttributed: 0, earningsCreated: 0 };
  if (!clientId || !lob) return empty;

  const db = _getDb(lob, injectedGetDb);

  // Only backfill when the client actually has a CTV referrer — otherwise there is
  // nothing for the portal to attribute (consultation/salestaff already ran at pay time).
  const clientRows = await db.queryRows(
    'SELECT id, referred_by_ctv_id, salestaffid FROM dbo.partners WHERE id = $1 LIMIT 1',
    [clientId]
  );
  const clientRow = clientRows && clientRows[0];
  if (!clientRow || !clientRow.referred_by_ctv_id) return empty;

  const payments = await db.queryRows(
    'SELECT id, amount, payment_date FROM payments WHERE customer_id = $1 AND amount > 0 ORDER BY payment_date ASC NULLS FIRST',
    [clientId]
  );
  if (!payments || payments.length === 0) return { ...empty };

  let paymentsAttributed = 0;
  let earningsCreated = 0;

  for (const payment of payments) {
    // Idempotency: a CTV earning already exists for this payment -> already backfilled.
    const existing = await db.queryRows(
      "SELECT 1 FROM dbo.earnings WHERE payment_id = $1 AND source = 'ctv' LIMIT 1",
      [payment.id]
    );
    if (existing && existing.length > 0) continue;

    // Reconstruct order lines from this payment's invoice allocations so per-product
    // commission rates apply (mirrors the live POST /api/Payments earnings hook).
    let lines = [];
    const allocs = await db.queryRows(
      'SELECT invoice_id FROM payment_allocations WHERE payment_id = $1 AND invoice_id IS NOT NULL',
      [payment.id]
    );
    const invoiceIds = (allocs || []).map((a) => a.invoice_id).filter(Boolean);
    if (invoiceIds.length > 0) {
      const solRows = await db.queryRows(
        'SELECT id, productid, pricetotal FROM dbo.saleorderlines WHERE orderid = ANY($1) AND isdeleted = false',
        [invoiceIds]
      );
      lines = (solRows || []).map((sol) => ({
        id: sol.id,
        product_id: sol.productid,
        amount: parseFloat(sol.pricetotal || 0),
      }));
    }

    const created = await createEarningsForPayment({
      payment,
      lines,
      lob,
      clientRow,
      getDb: injectedGetDb,
      referralClaim,
    });
    if (created && created.length > 0) {
      paymentsAttributed += 1;
      earningsCreated += created.length;
    }
  }

  return { paymentsScanned: payments.length, paymentsAttributed, earningsCreated };
}

/**
 * One-time backfill: for every EXISTING direct CTV earning (level 0, source 'ctv', positive),
 * generate the upline override rows it should have produced under the MLM config. Idempotent
 * (per payment/line/recipient/level), so safe to re-run. Run once per LOB DB.
 *
 * @param {object} args
 * @param {'dental'|'cosmetic'} args.lob
 * @param {function} [args.getDb] - injectable getDb(lob) for tests
 * @returns {Promise<{directRowsScanned:number, overridesCreated:number}>}
 */
async function backfillOverridesForLob({ lob, getDb: injectedGetDb = null }) {
  const empty = { directRowsScanned: 0, overridesCreated: 0 };
  if (!lob) return empty;
  const db = _getDb(lob, injectedGetDb);
  const rows = await db.queryRows(
    "SELECT client_id, recipient_partner_id, payment_id, service_line_id, amount FROM dbo.earnings WHERE source = 'ctv' AND COALESCE(level, 0) = 0 AND amount > 0"
  );
  let overridesCreated = 0;
  for (const r of rows || []) {
    const overrides = await _writeCtvOverrides({
      clientId: r.client_id,
      paymentId: r.payment_id,
      serviceLineId: r.service_line_id,
      baseAmount: parseFloat(r.amount || 0),
      directRecipientId: r.recipient_partner_id,
      lob,
      getDb: injectedGetDb,
    });
    overridesCreated += overrides.length;
  }
  return { directRowsScanned: (rows || []).length, overridesCreated };
}

/**
 * On refund: find prior earnings for originalPaymentId, write matching negative reversal rows (new rows).
 * Does NOT mutate original earnings.status (remains pending/paid).
 * Net effect on CTV: +pos then -neg = 0 for that cycle.
 */
async function reverseOnRefund({ originalPaymentId, refundPayment, lob, txClient = null, getDb: injectedGetDb = null }) {
  if (!originalPaymentId || !refundPayment) return [];

  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  // Find original positive earnings (any status, we don't touch them)
  const findSql = 'SELECT * FROM dbo.earnings WHERE payment_id = $1 AND amount > 0 ORDER BY created_at';
  const q = useTx ? txClient.query(findSql, [originalPaymentId]) : db.queryRows(findSql, [originalPaymentId]);
  const originals = useTx ? (await q).rows : await q;

  const reversals = [];
  for (const orig of originals) {
    const negAmount = -Math.abs(parseFloat(orig.amount));

    const insertSql = `
      INSERT INTO dbo.earnings (
        client_id, recipient_partner_id, payment_id, service_line_id,
        source, amount, status, earned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', now())
      RETURNING *
    `;
    const params = [
      orig.client_id,
      orig.recipient_partner_id,
      refundPayment.id,
      orig.service_line_id,
      orig.source,
      negAmount,
    ];

    const res = useTx ? await txClient.query(insertSql, params) : await db.queryRows(insertSql, params);
    const rev = useTx ? res.rows[0] : res[0];
    if (rev) reversals.push(rev);
  }

  return reversals;
}

/**
 * Manual/admin trigger wrapper for the (currently unmounted) POST /commissionEngine/trigger route.
 *
 * Previously this name was imported by routes/commissionEngine.js but never existed on the service
 * (latent crash + a stale test). It now delegates to backfillEarningsForClient so a manual replay
 * re-runs earnings attribution over the client's collected payments — idempotent on source='ctv',
 * so repeated triggers never double-pay. `serviceLineId`/`partnerId` are accepted for API/back-compat
 * but recipient resolution is performed by the engine (D13). Never throws; returns a structured result.
 *
 * @param {string} serviceLineId - accepted for back-compat (unused; engine resolves via payments)
 * @param {string} clientId - partners.id of the customer
 * @param {string} partnerId - accepted for back-compat (unused; recipient resolved by D13)
 * @param {'dental'|'cosmetic'} lob
 * @param {function} [injectedGetDb] - injectable getDb(lob) for tests
 * @returns {Promise<{paymentsScanned:number, paymentsProcessed:number, earningsCreated:number, errors:string[]}>}
 */
async function triggerCommissionEngine(serviceLineId, clientId, partnerId, lob, injectedGetDb = null) {
  if (!clientId || !['dental', 'cosmetic'].includes(lob)) {
    return { paymentsScanned: 0, paymentsProcessed: 0, earningsCreated: 0, errors: ['clientId and a valid lob are required'] };
  }
  try {
    const r = await backfillEarningsForClient({ clientId, lob, getDb: injectedGetDb });
    return {
      paymentsScanned: r.paymentsScanned,
      paymentsProcessed: r.paymentsAttributed,
      earningsCreated: r.earningsCreated,
      errors: [],
    };
  } catch (err) {
    return { paymentsScanned: 0, paymentsProcessed: 0, earningsCreated: 0, errors: [err && err.message ? err.message : String(err)] };
  }
}

module.exports = {
  resolveRecipient,
  createEarningsForPayment,
  backfillEarningsForClient,
  backfillOverridesForLob,
  triggerCommissionEngine,
  reverseOnRefund,
  // internal for tests
  _getProductRate: getProductRate,
  _writeCtvOverrides,
};
