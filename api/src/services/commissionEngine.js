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
async function resolveRecipient({ clientRow, lob, txClient = null, getDb: injectedGetDb = null }) {
  if (!clientRow) return null;

  // 1. CTV referrer (highest priority, works for both LOBs)
  if (clientRow.referred_by_ctv_id) {
    return { recipient_partner_id: clientRow.referred_by_ctv_id, source: 'ctv' };
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
async function createEarningsForPayment({ payment, lines = [], lob, clientRow, txClient = null, getDb: injectedGetDb = null }) {
  if (!payment || !payment.id || !clientRow) return [];

  const db = txClient || _getDb(lob, injectedGetDb);
  const useTx = !!txClient;

  const recipient = await resolveRecipient({ clientRow, lob, txClient, getDb: injectedGetDb });
  if (!recipient) {
    return []; // no attribution path
  }

  const earnedRows = [];
  const paymentAmount = parseFloat(payment.amount || 0);
  const lineList = lines.length > 0 ? lines : [{ id: null, product_id: null, amount: paymentAmount }];

  // Calculate total commission pool from all lines
  let totalCommissionAmount = 0;
  for (const line of lineList) {
    const lineAmount = line.amount != null ? parseFloat(line.amount) : (paymentAmount / lineList.length);
    const rate = await getProductRate(line.product_id, lob, txClient, injectedGetDb);
    const commissionAmount = Math.round((lineAmount * (rate / 100)) * 100) / 100;
    totalCommissionAmount += commissionAmount;
  }

  if (totalCommissionAmount <= 0) return [];

  // Get commission level config for MLM split
  const levelConfig = await _getCommissionLevelConfig(lob, txClient, injectedGetDb);
  const serviceLineId = lineList[0].id || '00000000-0000-0000-0000-000000000000';

  // MLM Split for CTV source: walk chain and distribute across levels
  if (recipient.source === 'ctv') {
    const ctvChain = await _walkCtvChain(recipient.recipient_partner_id, lob, txClient, injectedGetDb);

    for (const chainNode of ctvChain) {
      const levelConf = levelConfig.find(c => c.level === chainNode.level);

      // Skip if level not in config or disabled
      if (!levelConf || !levelConf.enabled) continue;

      // Calculate share for this level
      const levelShare = Math.round((totalCommissionAmount * (levelConf.share_percent / 100)) * 100) / 100;
      if (levelShare <= 0) continue;

      const insertSql = `
        INSERT INTO dbo.earnings (
          client_id, recipient_partner_id, payment_id, service_line_id,
          source, level, amount, status, earned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now())
        RETURNING id, amount, source, level, recipient_partner_id
      `;
      const params = [
        clientRow.id,
        chainNode.partner_id,
        payment.id,
        serviceLineId,
        recipient.source,
        chainNode.level,
        levelShare,
      ];

      const res = useTx
        ? await txClient.query(insertSql, params)
        : await db.queryRows(insertSql, params);

      const row = useTx ? res.rows[0] : res[0];
      if (row) earnedRows.push(row);
    }
  } else {
    // Single-row for consultation or salestaff: full pool at level 0
    const insertSql = `
      INSERT INTO dbo.earnings (
        client_id, recipient_partner_id, payment_id, service_line_id,
        source, level, amount, status, earned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now())
      RETURNING id, amount, source, level, recipient_partner_id
    `;
    const params = [
      clientRow.id,
      recipient.recipient_partner_id,
      payment.id,
      serviceLineId,
      recipient.source,
      0,
      totalCommissionAmount,
    ];

    const res = useTx
      ? await txClient.query(insertSql, params)
      : await db.queryRows(insertSql, params);

    const row = useTx ? res.rows[0] : res[0];
    if (row) earnedRows.push(row);
  }

  return earnedRows;
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

module.exports = {
  resolveRecipient,
  createEarningsForPayment,
  reverseOnRefund,
  // internal for tests
  _getProductRate: getProductRate,
};
