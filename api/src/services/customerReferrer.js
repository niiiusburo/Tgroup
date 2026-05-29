'use strict';

/**
 * customerReferrer.js — assign a CTV (Cộng tác viên) as a customer's commission referrer.
 *
 * The commission engine (commissionEngine.js, D13 priority #1) attributes paid-service
 * earnings to the CTV stored on the customer partner's `referred_by_ctv_id`. There was no
 * dashboard surface to set that field — services/appointments now expose a CTV selector that
 * routes through here.
 *
 * SAFETY: this is "assign only". A null / empty / non-UUID `ctvId` is a NO-OP — it never
 * clears an existing referrer. That prevents an untouched (or not-prefilled) selector from
 * silently wiping a customer's commission attribution on every save.
 *
 * `referred_by_ctv_id` is a soft reference (no FK in migration 047), matching the existing
 * /api/ctv/bookings reclaim path which UPDATEs it directly.
 *
 * @crossref:used-in[saleOrders/createSaleOrder, saleOrders/updateSaleOrder, appointments/mutationHandlers]
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * @returns {Promise<boolean>} true if a row was updated, false if it was a no-op
 */
async function setCustomerReferrer(q, customerId, ctvId) {
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
  return Array.isArray(updated) && updated.length > 0;
}

module.exports = { setCustomerReferrer, isUuid };
