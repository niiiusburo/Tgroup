'use strict';

/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[api/src/routes/saleOrders/createSaleOrder.js, api/src/routes/saleOrders/updateSaleOrder.js, api/src/routes/appointments/mutationHandlers.js]
 * @crossref:uses[api/src/services/commissionEngine.js (backfillEarningsForClient), product-map/domains/customers-partners.yaml, product-map/domains/earnings-commissions.yaml, docs/TEST-MATRIX.md]
 */
/**
 * customerReferrer.js — assign a CTV (Cộng tác viên) as a customer's commission referrer.
 *
 * Commission money is attributed from **saleorders.ctv_id** on the service card
 * (`commissionEngine.js` / `createEarningsForServiceCard`). `referred_by_ctv_id` on the
 * customer partner is profile/claim bookkeeping only — it does not grant earnings by itself.
 * Services/appointments expose a CTV selector that routes through here to keep profile +
 * card columns aligned when staff explicitly assigns a CTV.
 *
 * `setCustomerReferrer` is "assign only": a null / empty / non-UUID `ctvId` is a NO-OP — it
 * never clears an existing referrer. CREATE paths use it so a not-prefilled selector can't
 * silently wipe attribution. UPDATE paths additionally call `clearCustomerReferrer` when the
 * user explicitly picks "None" (the edit forms pre-fill the current CTV, so an empty selector
 * on edit is a deliberate clear).
 *
 * `referred_by_ctv_id` is a soft reference (no FK in migration 047), matching the existing
 * /api/ctv/bookings reclaim path which UPDATEs it directly.
 *
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// NK3-only (INV-003C): payment-time backfill is for pay-as-paid (NK/NK2); skip when service-card model is on.
function serviceCardCommissionEnabled() {
  return process.env.CTV_SERVICE_CARD_COMMISSION === 'true' || process.env.CTV_SERVICE_CARD_COMMISSION === '1';
}

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/**
 * Assign a CTV as the customer's commission referrer (assign-only; never clears).
 *
 * @param {(sql: string, params?: any[]) => Promise<any[]>} q - request-scoped query fn
 *   (from getQuery(req)) bound to the correct LOB DB. The customer partner lives in the
 *   same physical DB the service/appointment is written to.
 * @param {string} customerId - partners.id of the customer
 * @param {string|null|undefined} ctvId - selected CTV partner id
 * @param {object} [opts]
 * @param {'dental'|'cosmetic'} [opts.lob] - when provided, retroactively backfill CTV earnings
 *   over the customer's already-collected payments so the CTV portal journey reflects past
 *   visits/services/payments (and pays the commission). Omit to skip backfill (CREATE paths on
 *   brand-new customers have no prior payments, but passing it is a harmless no-op).
 * @returns {Promise<boolean>} true if a row was updated, false if it was a no-op
 */
async function setCustomerReferrer(q, customerId, ctvId, opts = {}) {
  if (!isUuid(customerId) || !isUuid(ctvId)) return false;
  const normalized = ctvId.trim();

  // Defense-in-depth (never trust the client): only assign a CTV that actually exists as an
  // ACTIVE, non-deleted CTV in THIS physical (LOB) DB. `q` is bound to the request's LOB DB,
  // so this also enforces LOB safety — a CTV not scoped to this LOB has no row here and is
  // rejected. Without this, a tampered/cross-LOB id would be stored as a soft ref and later
  // FK-fail when the commission engine inserts earnings (which can break payment processing).
  const ctvRows = await q(
    `SELECT 1 FROM partners
      WHERE id = $1 AND is_ctv = true AND active = true AND isdeleted = false
      LIMIT 1`,
    [normalized],
  );
  if (!ctvRows || ctvRows.length === 0) return false;

  const updated = await q(
    `UPDATE partners
        SET referred_by_ctv_id = $1,
            lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      WHERE id = $2 AND isdeleted = false
      RETURNING id`,
    [normalized, customerId],
  );
  const didAssign = Array.isArray(updated) && updated.length > 0;

  // Retroactive earnings backfill: a customer who already came & paid BEFORE being linked to
  // this CTV produced no CTV earning at payment time, so their portal journey is frozen at
  // "referred" (1/4). Re-run the commission engine over their past payments now that the link
  // exists, so the CTV sees the real paid journey + commission. Non-fatal: a backfill failure
  // must never block the assignment. `q` is already bound to the request's LOB DB, so the
  // adapter ignores the lob arg and reuses it.
  if (didAssign && opts && opts.lob && !serviceCardCommissionEnabled()) {
    try {
      const { backfillEarningsForClient } = require('./commissionEngine');
      await backfillEarningsForClient({
        clientId: customerId,
        lob: opts.lob,
        getDb: () => ({ queryRows: q }),
      });
    } catch (err) {
      console.error('[customerReferrer] CTV earnings backfill failed (non-fatal):', err && err.message);
    }
  }

  return didAssign;
}

/**
 * Clear a customer's commission referrer (set referred_by_ctv_id = NULL).
 * Used by UPDATE paths when the user explicitly selects "None". Only call this when the form
 * reflected the current CTV (i.e. it was pre-filled), so an empty selector is a deliberate clear.
 *
 * @param {(sql: string, params?: any[]) => Promise<any[]>} q - request-scoped LOB-bound query fn
 * @param {string} customerId - partners.id of the customer
 * @returns {Promise<boolean>} true if a row was updated
 */
async function clearCustomerReferrer(q, customerId) {
  if (!isUuid(customerId)) return false;
  const updated = await q(
    `UPDATE partners
        SET referred_by_ctv_id = NULL,
            lastupdated = (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')
      WHERE id = $1 AND isdeleted = false
      RETURNING id`,
    [customerId],
  );
  return Array.isArray(updated) && updated.length > 0;
}

module.exports = { setCustomerReferrer, clearCustomerReferrer, isUuid };
