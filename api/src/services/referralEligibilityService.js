/**
 * referralEligibilityService.js — Eligibility gate for CTV client referrals
 * Checks whether a client (by phone) can be referred by a given CTV in a target DB.
 * Gate rules:
 *   1. Phone must be valid (normalized)
 *   2. If partner exists with referred_by_ctv_id pointing to ANOTHER CTV → REJECT
 *   3. If partner exists with referred_by_ctv_id = this CTV and has an active
 *      saleorder (origin='ctv_referral', state IN ('draft','pending'), <6mo) → REJECT
 *   4. Otherwise → ELIGIBLE
 */
const { normalizePhone } = require('./phoneNormalize');

async function safeQueryRows(db, sql, params = []) {
  try {
    if (typeof db.queryRows === 'function') {
      return await db.queryRows(sql, params);
    }
    const r = await db.query(sql, params);
    return Array.isArray(r) ? r : r.rows || [];
  } catch (e) {
    console.error('[referralEligibility] query error:', e.message);
    return [];
  }
}

/**
 * @param {Object} db          — DB query interface (dental or cosmetic)
 * @param {string} ctvId       — UUID of the referring CTV
 * @param {string} clientPhone — Raw phone number
 * @returns {Promise<{eligible: boolean, reason?: string, existingPartnerId?: string}>}
 */
async function checkEligibility(db, ctvId, clientPhone) {
  const normalized = normalizePhone(clientPhone);
  if (!normalized) {
    return { eligible: false, reason: 'INVALID_PHONE' };
  }

  // Find partner by phone
  const partners = await safeQueryRows(
    db,
    `SELECT id, referred_by_ctv_id, name
     FROM dbo.partners
     WHERE phone = $1 AND isdeleted = false
     LIMIT 1`,
    [normalized]
  );

  const partner = partners[0];

  if (partner) {
    // Referred by another CTV?
    if (partner.referred_by_ctv_id && partner.referred_by_ctv_id !== ctvId) {
      return {
        eligible: false,
        reason: 'REFERRED_BY_OTHER',
        existingPartnerId: partner.id,
      };
    }

    // Already has an active referral from this CTV?
    const activeOrders = await safeQueryRows(
      db,
      `SELECT id, state, datecreated
       FROM dbo.saleorders
       WHERE partnerid = $1
         AND origin = 'ctv_referral'
         AND state IN ('draft', 'pending')
         AND isdeleted = false
         AND datecreated > NOW() - INTERVAL '6 months'
       LIMIT 1`,
      [partner.id]
    );

    if (activeOrders.length > 0) {
      return {
        eligible: false,
        reason: 'ACTIVE_REFERRAL_EXISTS',
        existingPartnerId: partner.id,
      };
    }

    // Partner exists, was referred by this CTV, but no active order → eligible
    return {
      eligible: true,
      existingPartnerId: partner.id,
      partnerName: partner.name,
    };
  }

  // No partner found → eligible (will be created)
  return { eligible: true };
}

module.exports = { checkEligibility };
