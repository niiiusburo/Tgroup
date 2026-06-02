# Design: CTV Eligibility Bar + Doctor→CTV Breadcrumb

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Surface:** NK3 (Cosmetic LOB enabled), but additive to both dental + cosmetic
**Author session:** Claude (Opus 4.8)

---

## 1. Problem & Goal

A customer (client) is linked to a CTV (cộng tác viên / referral agent). Today that link is shown
only as a static text badge on the admin profile, and the CTV portal shows a 4-step journey with no
notion of time. The business rule is time-bounded:

> A client stays linked to a CTV for **6 months** from their **most recent CTV-bearing appointment or
> service**. When that window lapses, the client is no longer effectively linked and becomes
> **eligible to be claimed by another CTV**. Nothing is deleted — eligibility is a *computed* status.

We will:

1. Build a reusable **6-month countdown bar** (`CtvLinkBar`) and show it on the admin client profile
   and on every CTV-portal customer card.
2. Show a **Doctor → CTV breadcrumb** (`DoctorCtvTrail`) next to the doctor name on each appointment
   and service row in the admin client profile.
3. Make the CTV portal (cards + booking gate) reflect the eligibility / "can be linked to another
   CTV" state, using the **same** computation everywhere.

## 2. The Rule (confirmed with stakeholder)

- **Anchor event** = the single most-recent **CTV-bearing** event (appointment OR service) that is
  not cancelled.
  - "CTV-bearing appointment" = `appointments.ctv_id IS NOT NULL` (new column — see §4).
  - "CTV-bearing service" = `saleorders.ctv_id IS NOT NULL`.
  - "Counts as a real event" = appointment `state NOT ILIKE 'cancel%'`; service ordered (any of
    `pending/draft/sale/completed`) and not soft-deleted — **paid or unpaid both count**.
- **Window** = `anchorDate + 6 months`. The bar counts down the *remaining* time.
- **Linked CTV** = the CTV on that latest anchor event (**latest event wins**). When two events tie
  on date, prefer the service (it earns commission); deterministic tiebreak documented in code.
- **Active** = `expiresAt > now()` (VN-local naive, per project timestamp convention — no
  `AT TIME ZONE` math added; compare in JS Date space consistently).
- **Eligible** = `!active` OR no CTV-bearing event exists → another CTV may claim.
- **Non-destructive:** eligibility is computed on read. `referred_by_ctv_id`, `saleorders.ctv_id`,
  `dbo.earnings`, payouts, and commission math are **never** mutated by this feature. A new
  CTV-stamped event automatically re-extends the window. Re-claim by a new CTV happens through the
  existing `setCustomerReferrer` / `/ctv/bookings` reclaim path (which overwrites
  `referred_by_ctv_id`), keeping the stored referrer in sync with "latest event wins."

### Worked example
```
01-Jan  Referred by CTV-A (booking stamps appointment.ctv_id = A)   → anchor 01-Jan, expires 01-Jul
04-May  Clinic checkup, NO ctv_id                                    → clock NOT reset (still 01-Jul)
02-Jul  onward                                                       → expired → eligible for any CTV
```

## 3. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| D1 | Per-row breadcrumb CTV source | Per-row where it exists (service = its own `ctv_id`; appointment = its own `ctv_id`) |
| D2 | On expiry | Display-only, non-destructive (no unlink, no commission change) |
| D3 | Clock reset | Only CTV-bearing events reset it (a no-CTV visit does not) |
| D4 | What counts | Ordered & not cancelled; services count paid OR unpaid |
| D5 | Data model | **Option A** — add real `appointments.ctv_id` (+ persist at booking/edit + backfill) |
| D6 | Bar style | Remaining time, color-shift green→amber→red→grey(expired), VN labels |
| D7 | Portal prominence | Bar on every card; expired card gets a banner + dimmed journey |

## 4. Data-model change (D5 — Option A)

**Why:** `appointments` currently has **no `ctv_id` column**. The API merely aliases
`partners.referred_by_ctv_id AS ctv_id` on reads, so an appointment cannot truthfully say "I was
booked under CTV-X." The Zod contract (`contracts/appointment.ts`) already declares `ctv_id`, so this
finishes an intended-but-unbuilt field and makes the rule honestly computable.

**Migration `api/migrations/054_add_appointment_ctv.sql`** (053 is taken by `053_drop_default_referral_percent.sql`; 054 is next free):
```sql
ALTER TABLE dbo.appointments ADD COLUMN IF NOT EXISTS ctv_id uuid;  -- soft ref, matches saleorders.ctv_id
CREATE INDEX IF NOT EXISTS idx_appointments_ctv_id ON dbo.appointments (ctv_id) WHERE ctv_id IS NOT NULL;
COMMENT ON COLUMN dbo.appointments.ctv_id IS 'CTV attributed to THIS appointment (soft ref partners.id). NULL = no CTV. Drives 6-month eligibility window.';
```

**Persist on write** (`api/src/routes/appointments/mutationHandlers.js`):
- CREATE (~line 107) and UPDATE (~line 351): in addition to `setCustomerReferrer(...)`, write the
  resolved `ctvId` to the new `appointments.ctv_id` column on the inserted/updated row.
- CTV portal booking (`api/src/routes/ctv.js` `POST /bookings`, ~line 837): stamp
  `appointments.ctv_id = <booking CTV>` on the created appointment.

**Backfill (idempotent, one-time, inside the migration or a guarded script):**
- For existing appointments belonging to a customer who has `referred_by_ctv_id` set AND whose
  appointment was the referral booking, set `appointments.ctv_id = customer.referred_by_ctv_id`.
- Conservative default: backfill the customer's **earliest** appointment per referred customer (the
  referral booking) so every currently-referred client keeps a valid anchor. Exact backfill predicate
  finalized at plan time after checking the referral-start product linkage; must be idempotent and
  must not stamp clinic walk-ins retroactively beyond the referral event.

**Read paths** add `ctv_id` (real column now) + `ctv_name` via `LEFT JOIN partners`:
- `appointments/readHandlers.js` (lines 167/203/355) — replace the aliased
  `referred_by_ctv_id AS ctv_id` with the real `a.ctv_id`, plus `c.name AS ctv_name`.
- sale-order-line reads used by the customer profile services — add `ctv_name`.

> ⚠️ Dev DB `tdental_demo` (port 5433) is behind: it lacks `saleorders.ctv_id` (migration 052).
> Run all pending migrations on dev before local verification, then apply 053.

## 5. Backend computation

**`api/src/services/referralClaim.js`** — add `getCtvLinkStatus(clientId, lob, opts)` returning:
```js
{
  linkedCtvId,      // uuid | null  — CTV on the latest CTV-bearing event
  linkedCtvName,    // string | null
  anchorAt,         // Date | null  — date of that event
  anchorSource,     // 'appointment' | 'service' | null
  expiresAt,        // Date | null  — anchorAt + 6 months
  active,           // boolean      — expiresAt > now
  eligible,         // boolean      — !active || no anchor
  windowMonths: 6,
}
```
Query: most-recent across two sources for the client, each filtered to CTV-bearing + not-cancelled:
- appointments: `MAX(COALESCE(date, datecreated))` where `ctv_id IS NOT NULL AND state NOT ILIKE 'cancel%'`, returning the winning row's `ctv_id`.
- saleorders: `MAX(COALESCE(dateordered, datecreated))` where `ctv_id IS NOT NULL AND state NOT ILIKE 'cancel%' AND isdeleted = false`, returning the winning row's `ctv_id`.
Pick the later of the two (service wins ties). Resolve `linkedCtvName` from `partners`.

**Fallback safety:** if `referred_by_ctv_id` is set but no CTV-bearing event exists (should be rare
after backfill), treat as linked-with-no-anchor: `active=true, eligible=false, expiresAt=null`, bar
renders "linked — awaiting first activity" with no countdown. Prevents accidentally freeing a
freshly-assigned client.

Keep existing `computeClaim` / `getReferralClaimStatus` exported & working (other callers); the new
function is additive. Consider implementing `getReferralClaimStatus` in terms of the new one if the
booking gate should adopt the stricter CTV-bearing anchor (decide at plan time; default: switch the
booking gate + lookup to `getCtvLinkStatus` so the bar and the gate agree exactly).

**Endpoints touched:**
- `GET /api/ctv/referrals` (`ctv.js` ~163–324): for each customer in the `byId` map, attach
  `{ linkedCtvId, linkedCtvName, anchorAt, expiresAt, active, eligible }`. Cross-LOB merge: a client
  may have one window per LOB; the card shows the **latest-expiring** active window, or eligible only
  if all LOB windows are inactive. Document the chosen reduction in code.
- `GET /api/ctv/client-lookup` and `POST /api/ctv/bookings` gate: use `getCtvLinkStatus` so
  "claimed by other vs eligible" matches the bar.
- Customer profile payload (`useCustomerProfile` source — `fetchPartnerById` / partners route): add
  the link-status fields to `referralClaim` (extend, don't break existing `ownerCtvId/ownerName`).

**Contract:** extend `contracts/` (CtvReferral / referralClaim shapes) with the new optional fields;
validate where the project already validates.

## 6. Frontend

### 6a. `CtvLinkBar` (new shared component) — `website/src/components/shared/CtvLinkBar.tsx`
- Props: `{ expiresAt: string | null; anchorAt?: string | null; active: boolean; eligible: boolean; ctvName?: string | null; compact?: boolean }`.
- Renders a horizontal bar = **fraction of the 6-month window remaining**
  (`remaining = clamp((expiresAt - now) / (expiresAt - anchorAt), 0..1)`; if `anchorAt` missing, use
  `6 months` as denominator).
- Color: green (`emerald`) when healthy, amber when < ~6 weeks left, red when < ~1 week, grey when
  expired. Tokens/Tailwind palette consistent with `StatusBadge` (`50` bg / `600` fill / `700` text).
- Label (VN): `≈{n} tháng còn lại` / `≈{n} tuần` / `≈{n} ngày`; expired →
  `Đã hết hạn — khách có thể gắn CTV khác`. i18n via existing `ctv` / `customers` namespaces.
- Animation: width transition on `transform`/`width` only; `motion-reduce` safe.
- States covered (per UX F9): active, near-expiry, expired, no-anchor/awaiting, no-CTV (renders
  nothing or a muted "chưa có CTV").

### 6b. `DoctorCtvTrail` (new shared component) — `website/src/components/shared/DoctorCtvTrail.tsx`
- Props: `{ doctorName?: string | null; ctvName?: string | null }`.
- Renders `BS. {doctor} › CTV: {ctv}` as a breadcrumb (chevron separator, `text-xs text-gray-500`,
  CTV segment tinted to match the referral badge). If no CTV on the row → renders doctor only (no
  empty chevron). If no doctor → CTV only.

### 6c. Admin client profile
- `components/customer/CustomerProfile/ProfileHeader.tsx` (lines 118–141): replace the plain
  active/expired text badge with `CtvLinkBar` (keep the "Người giới thiệu (CTV): {name}" label above
  it). Drives off the new `referralClaim` fields.
- `components/customer/CustomerAppointmentHistory.tsx` (line ~168): next to
  `TeamLine label="Bác sĩ"`, render `DoctorCtvTrail` using the row's `ctv_name`.
- `components/customer/ServiceHistoryRow.tsx` (lines ~60–61): next to `service.doctor`, render
  `DoctorCtvTrail` using the service's `ctvName`. Requires `CustomerService.ctvName`
  (`types/customer.ts` + `mapSaleOrderLines.ts`) populated from API `ctv_name`.

### 6d. CTV portal
- `components/ctv/ReferralFlipCard.tsx`: add `CtvLinkBar` to the **front face** (below the 4-step
  journey row, ~line 183). When `eligible` (expired): show a banner
  (`Đã hết hạn liên kết — khách có thể gắn CTV khác`) and dim the journey steps. Extend
  `CtvReferral` (`lib/api/ctv.ts`) with the new fields; `CtvTrackingTab` passes them through.
- Booking/refer forms already consume `/ctv/client-lookup` `expiresAt` — verify they now reflect the
  stricter anchor; no UI change expected beyond accurate dates.

## 7. Out of scope / invariants

- No change to commission %, earnings rows, payout state machine, or the MLM level split.
- No auto-unlink; `referred_by_ctv_id` is only ever changed by the existing assign/claim/clear paths.
- No timezone-conversion math added (project stores VN-local naive timestamps).
- Permission model unchanged: CTV portal stays `ctv.dashboard.view` + `is_ctv`; admin profile stays
  behind existing customer-view perms.

## 8. Testing & verification

- **Unit** (`api`, vitest/jest as configured): `getCtvLinkStatus` — active, expired, no-CTV,
  latest-CTV-wins (appt vs service, and A→B switch), cancelled-ignored, paid-and-unpaid-both-count,
  fallback no-anchor.
- **Contract/type:** typecheck + zod parse of the extended shapes.
- **Playwright** (`http://127.0.0.1:5175`, `t@clinic.vn` / `123123`):
  1. Admin profile: bar renders with correct color/label; appointment + service rows show the
     Doctor→CTV breadcrumb.
  2. CTV portal: active customer shows countdown bar; an expired customer shows the
     "eligible for another CTV" banner + dimmed journey.
- **Audits the repo ships:** typecheck, lint, `depcruise`, i18n audit, build — must pass (or be no
  worse than pre-task, reported explicitly).
- **DB confirm:** verify on the correct DB/port before claiming done; run pending + 053 migrations on
  dev first.

## 9. Rollout

- Version bump `website/package.json` + new `website/public/CHANGELOG.json` entry.
- Update `docs/CHANGELOG.md` and `testbright.md` (task touches frontend + contract + backend data flow).
- Migration 053 runs on dev → then NK3 smoketest DBs (never touch `*_demo` for NK3 ops) per the
  NK3 → NK2 → NK promotion order.

## 10. Open items to finalize at plan time

- Exact backfill predicate for `appointments.ctv_id` (which existing appointment(s) to stamp).
- Cross-LOB window reduction in `/ctv/referrals` (latest-expiring vs per-LOB display).
- Whether to migrate the existing booking gate fully onto `getCtvLinkStatus` (recommended) vs leaving
  `getReferralClaimStatus` as-is for non-eligibility callers.
- Migration number confirmed: **054** (053 taken).
