# CTV Referral Claim + Eligibility — Design

**Date:** 2026-05-22
**Status:** Approved (brainstorming)
**Builds on:** `2026-05-22-ctv-signup-and-commission-config-design.md`, migration 047 (`referred_by_ctv_id`, `earnings`), the live CTV/commission feature on NK3.

## Purpose

Let a CTV claim a client when they refer/book them, hold that claim exclusively for a rolling 6-month window, block other CTVs (and admins) from booking a client who is actively claimed by someone else, and credit the owning CTV for services done while the claim is active. Implemented by **deriving** claim state from existing data — no new claim tables.

## Locked decisions

1. **Exclusive ownership, expires.** A client has at most one CTV owner at a time: existing `partners.referred_by_ctv_id`.
2. **The claim anchor + expiry (computed, never stored):**
   `anchor = max(Referral Start card date, last paid-service date)`; the claim is **active** while `anchor + 6 months ≥ today`, otherwise **lapsed**.
3. **"Referral Start" card** = a `saleorderline` for an admin-created, zero-amount product called **Referral Start**, dated the referral date. It is the visible service card and the initial anchor before any paid service.
4. **The Referral Start product is admin-created (not seeded).** Referenced via `commission_settings.referral_start_product_id` (admin sets it once after creating the product). If unset, claim creation is blocked with a clear admin-facing message (the card is the claim anchor, so we cannot silently skip it).
5. **Eligibility is a hard gate on booking.** A client is **eligible** iff: not in the system, OR in the system but unclaimed, OR claim lapsed. If a client is **actively claimed by another CTV**, the booking is **blocked** — no appointment is created. This gate applies to **both CTVs and admins**.
6. **Credit only while active.** `commissionEngine.resolveRecipient` returns the CTV recipient only if the claim is active **as of the payment date**. A lapsed claim earns nothing, and a late payment does **not** silently revive the claim — the client must be re-claimed (a new Referral Start card) to start crediting again.

## Data model — no new tables

- **Owner**: `partners.referred_by_ctv_id` (exists, migration 047).
- **Card**: `saleorderline` rows referencing the Referral Start product (admin-created). The earliest such card's date is the claim's start anchor.
- **Config**: add `referral_start_product_id UUID NULL` to `commission_settings` (migration). Admin picks the product after creating it.
- Expiry/active is computed; nothing persisted.

## Shared helper (single source of truth)

`getReferralClaimStatus(clientId, lob, { asOf = today }) → { ownerCtvId, ownerName, anchorDate, expiresAt, active }`

- `anchorDate = max(min Referral-Start-card date, max paid-service date)` for the client.
- `expiresAt = anchorDate + 6 months`; `active = expiresAt >= asOf`.
- Used by: the resolve/eligibility endpoint, the customer profile, and the commission engine (with `asOf = paymentDate`). The 6-month rule lives in exactly one place.

## Booking gate flow (CTV panel + admin)

CTV/admin enters phone → `GET /api/Partners/resolve?key=<phone>` (extended to include `referralClaim`):
- **Not found** → eligible → create partner (`referred_by_ctv_id = claimingCtv`) + Referral Start card (dated today) + appointment.
- **Found, unclaimed or claim lapsed** → eligible → set `referred_by_ctv_id = claimingCtv`, add a fresh Referral Start card, create appointment.
- **Found, claim active (different CTV)** → **NOT eligible → block**. Return `B_CLIENT_CLAIMED` with `{ ownerName, expiresAt }`; UI shows "Already active with another CTV until `<date>`." No appointment created.

`claimingCtv`: when a CTV books from the CTV panel, it is them. When an admin books on behalf of a CTV, the admin selects the CTV (or none). The active-claim-by-another block applies regardless of who is booking.

## Commission engine change

`resolveRecipient({ clientRow, lob, asOf })`: before returning the `ctv` source, call `getReferralClaimStatus`; return the CTV only if `active` as of the payment date. Otherwise fall through to consultation/salestaff/none as today. `createEarningsForPayment` passes the payment date as `asOf`.

## Customer profile (admin)

Add a **"Referred by"** block to `CustomerProfileContent.tsx`: owning CTV name + status badge (`active until <date>` / `lapsed`). The Referral Start card appears in the existing service-card list like any other `saleorderline`.

## Contract changes

- `GET /api/Partners/resolve` response gains `referralClaim: { ownerCtvId, ownerName, active, expiresAt } | null`.
- Booking endpoints used by the CTV panel enforce the eligibility gate → `400 B_CLIENT_CLAIMED` when blocked.
- Migration: `commission_settings.referral_start_product_id UUID NULL` (additive, both DBs).
- Error code `B_CLIENT_CLAIMED` registered in BEHAVIOR.md.

## Testing

- Unit (`getReferralClaimStatus`): anchor = max(card, last payment); active/lapsed at exactly 6 months; no Referral Start card → uses last payment; no data → no claim.
- Unit (engine): credit suppressed when claim lapsed as of payment date; late payment after lapse does not revive/credit; active claim credits the owner.
- Integration: `/resolve` returns claim status; booking blocked (`B_CLIENT_CLAIMED`) when actively claimed by another CTV; new-client path creates partner + Referral Start card + appointment; `referral_start_product_id` unset → claim creation blocked with clear message.
- E2E (NK3): CTV refers a new client (created + card + booking); second CTV blocked from the same active client; admin sees "Referred by" on the profile.

## Out of scope (v1)

- Admin force-reassign / override of an active claim (parked in `unknowns.md`).
- Notifying a CTV when their claim is about to lapse.
- Bulk re-claim or claim history/audit beyond the saleorderline cards.
- Configurable window length (hardcoded 6 months for v1; revisit if needed).
