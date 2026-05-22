# CTV Signup + Commission Config — Design

**Date:** 2026-05-22
**Status:** Approved (brainstorming)
**Builds on:** `2026-05-18-cosmetic-line-of-business-design-v2.md`, `CTV-MLM-INTEGRATION-PLAN.md`, migration 047

## Purpose

Iterate the already-built CTV portal (`CtvDashboard.tsx`, 4-tab mobile) to add the two creation actions the MLM model needs — **refer a client** and **sign up a CTV** — and give admins a place to add and manage CTVs. Make the commission split fully admin-configurable as data. No rebuild of the portal; targeted additions only.

This spec deliberately scopes to **signup + commission config + the engine trigger**. It does not cover the full Payouts batch UI or the cross-DB earnings aggregator beyond what already exists.

## Locked decisions

### Commission math
1. **Level split is manual config.** `commission_level_config` stores N levels, each with an `enabled` flag and a `share_percent`. Admin edits them directly. Validation: the sum of *enabled* levels must never exceed 100% (save blocked above 100). A level can be toggled off (pays nothing). Any unallocated share — off levels, a missing upline, or a sum under 100% — **stays with the clinic**. No automatic redistribution. The percent the admin types is exactly what that level earns.
2. **Referral % = one global default + per-service override.** A single clinic-wide default referral percent lives alongside the commission config. Each service may override via `products.commission_rate_percent`. No category-level layer (the planned `productcategories.commission_rate_percent` is dropped).

### Signup / creation (closed system — no public signup)
3. **A CTV can only be created by another CTV or by an admin.** There is no open `/ctv/signup`. The create-CTV endpoint always requires an authenticated CTV-or-admin caller.
   - CTV signup fields: name + phone + email + password + LOB scope. Account is **active immediately** (no approval queue). When created by a CTV, `referred_by_ctv_id = caller` → joins caller's downline. When created by admin, admin may set `referred_by_ctv_id` (optional).
4. **Client referral** fields: name + phone + LOB. Creates a referred customer (a `partners` row) with `referred_by_ctv_id = caller`. The customer earns the referrer commission when they later pay for a service.

### Portal UI (iterate the built component)
5. **Header** (`CtvDashboard` orange gradient header) gains two pill buttons under the title: **+ Client** (solid/primary — the everyday action) and **+ CTV** (subtle). The 🔔 bell stays. Each opens a bottom-sheet form. Layout = two text pills on a second header row (chosen over icon-only for mobile legibility).
6. **Bottom nav unchanged** — Home · Comm · Refs · Me.
7. **Admin** gets a **CTVs** sub-tab on `Commission.tsx` with a **+ Add CTV** button (same create form, admin can set referred_by) and a list supporting view + suspend.

## Surfaces

### Build
- Header pills + two bottom-sheet forms (client referral, CTV signup) inside `CtvDashboard.tsx`.
- Admin **CTVs** sub-tab on `Commission.tsx`: list (name, phone, LOB, upline, status), `+ Add CTV`, suspend action.
- Admin **Config** sub-tab: editable level table (level, who, enabled toggle, share %), live "enabled ≤ 100%" validation, global default referral % field.
- Backend endpoints (new):
  - `POST /api/ctv` — create CTV. Auth: caller must be CTV or admin. Sets `is_ctv=true`, `referred_by_ctv_id` per rules above.
  - `POST /api/ctv/clients` — create referred client. Auth: CTV or admin. Sets `referred_by_ctv_id = caller`.
  - `GET /api/Ctvs` / `PATCH /api/Ctvs/:id` — admin list + suspend.
  - `GET/PUT /api/CommissionConfig` — read/write `commission_level_config` + global default referral %.

### Edit
- `CtvDashboard.tsx` — header actions + sheets; `lib/api/ctv.ts` — add `createCtv`, `referClient`.
- `Commission.tsx` — add Config + CTVs sub-tabs.
- `ServiceCatalog` + service form — per-service referral % box (falls back to global default).
- Global default referral % is owned solely by the Commission → Config sub-tab (no separate Settings field).
- Payment write-path — fire `commissionEngine` on a paid service line to write `earnings` rows split per the level config.

### Backend / data
- `commission_level_config` (new): `(level int, label text, enabled bool, share_percent numeric(5,2))` + a global `default_referral_percent`. Seeded Model B: L0 72.7 / L1 14.5 / L2 7.3 / L3 3.6 / L4 1.8.
- `earnings.level`, `earnings.service_line_id` (new columns).
- `products.commission_rate_percent` — already added in migration 047 ✓.
- `partners.referred_by_ctv_id`, `is_ctv`, `lob_scope` — already in migration 047 ✓.
- **Dropped from earlier plan:** `ctv_registrations` (no approval queue), `productcategories.commission_rate_percent` (no category layer).
- Permissions: `ctv.recruit.create` (CTV creates CTV/client), `ctv.manage` (admin list/suspend/add), `commission.config.manage` (admin), plus existing `ctv.commission.view.self`, `ctv.referrals.view.self`.

## Commission engine behavior

On a paid service line:
```
budget% = service.commission_rate_percent ?? global.default_referral_percent
pool    = lineAmount × budget% / 100
walk upline from the closer (referred_by_ctv_id chain):
  for each enabled level L with a real upline partner:
    earning[L] = pool × levelConfig[L].share_percent / 100  (status=pending)
  unallocated remainder (disabled levels, chain ends early, sum<100) → not paid (clinic margin)
```
Earnings are append-only. Refund/reversal writes a negative earnings row (existing `CtvDashboard` already renders negative amounts).

## Error envelope
- `S_LOB_FORBIDDEN` (existing) for cross-LOB access.
- `U_DUPLICATE_PHONE` / `U_DUPLICATE_EMAIL` on CTV signup collisions.
- `B_LEVEL_SUM_EXCEEDS_100` on commission config save when enabled levels sum > 100.
- `S_CTV_CREATE_FORBIDDEN` when a non-CTV, non-admin caller hits `POST /api/ctv`.

## Testing strategy
- Unit: commission engine split math (full chain, short chain, disabled level, sum<100 → clinic keeps remainder, refund negative row).
- Unit: config validation rejects enabled-sum > 100.
- Integration: `POST /api/ctv` forbidden for non-CTV/non-admin; sets `referred_by_ctv_id` correctly for CTV vs admin caller; duplicate phone/email rejected.
- Integration: `POST /api/ctv/clients` links `referred_by_ctv_id`.
- E2E (Playwright): CTV taps "+ CTV" → fills form → new CTV appears in downline; CTV taps "+ Client" → referred client created; admin Config edits a level % and it persists; admin adds a CTV from the CTVs sub-tab.
- Regression: dental untouched; existing CTV portal tabs still render with live data.

## Authority files to update (per governance-delta-cosmetic-lob-v2.md)
`DECISIONS.md` (new D-entries for manual split, no-public-signup, header actions), `BEHAVIOR.md` (new error codes), `DESIGN.md` (header pills, admin sub-tabs), `product-map/contracts/permission-registry.yaml`, `product-map/contracts/api-index.md`, `docs/CONTRACTS.md`, `docs/CHANGELOG.md`, `testbright.md`, `product-map/unknowns.md` (record deferred Payouts batch UI).

## Explicitly out of scope (v1)
- Public/open self-signup.
- Approval queue and `ctv_registrations`.
- Category-level referral %.
- Full Payouts batch-creation UI (earnings accrue; payout flip is a follow-up).
- SMS/OTP onboarding (plain email+password reused).
