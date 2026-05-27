# Agent 4 Finish Check: CTV / Referral / Commission Flow

Date: 2026-05-19
Worktree: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`
Scope: report-only code inspection and available focused tests. No production code modified.

## Overall Result: FAIL

The CTV dashboard surface and commission engine foundation exist, and the focused engine/permission unit tests pass. The end-to-end PRD business flow is not complete because CTV API access is not consistently restricted to CTV users, refund/void paths do not call the reversal engine, payment-created earnings are not tied to real service lines/product rates in the live payment route, and appointment/client consultation attribution is documented but not implemented in the appointment/client mutation paths.

## Authority Gate

- FAIL: requested `bash scripts/prompt-authority-check.sh` could not run in this worktree because `scripts/prompt-authority-check.sh` is missing. Shell output: `bash: scripts/prompt-authority-check.sh: No such file or directory`.
- Required docs inspected by search/code reading: `AGENTS.md`, `product-map/domains/ctv.yaml`, `product-map/domains/earnings-commissions.yaml`, `product-map/domains/cosmetic-clients.yaml`, `product-map/schema-map.md`, `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, `docs/INVARIANTS.md`.

## Flow Checks

### 1. Visible CTV Dashboard URL: PASS with gaps

- PASS: frontend route `/ctv` is mounted outside the admin `Layout`, so it bypasses sidebar/admin chrome (`website/src/App.tsx:160-162`).
- PASS: authenticated CTV users are redirected out of admin routes to `/ctv` (`website/src/App.tsx:103-107`).
- PASS: login returns `redirectTo: '/ctv'` when backend auth sees `is_ctv` (`api/src/routes/auth.js:83-100`), and frontend login hard-redirects on `is_ctv` (`website/src/contexts/AuthContext.tsx:108-117`).
- PASS: dashboard calls live API clients for `/ctv/commission-summary`, `/ctv/referrals`, and `/ctv/me` (`website/src/pages/CtvDashboard.tsx:30-45`; `website/src/lib/api/ctv.ts:39-49`).
- GAP: `/ctv` itself is public in the router and depends on API failures for unauthorized users; no route-level frontend auth guard wraps the dashboard (`website/src/App.tsx:160-162`).

Changed/verified URL: `/ctv`.

### 2. CTV API Route and Aggregation: FAIL

- PASS: `/api/ctv/commission-summary` queries `getDb('dental')` and `getDb('cosmetic')`, combines rows, and tags each row by LOB (`api/src/routes/ctv.js:54-65`).
- PASS: summary is scoped by `recipient_partner_id = req.user.employeeId` (`api/src/routes/ctv.js:37-50`).
- PASS: `/api/ctv/referrals` reads referrals from both DBs by `referred_by_ctv_id` and computes per-client earnings totals (`api/src/routes/ctv.js:131-194`).
- FAIL: route handlers only use `requireAuth`; they do not assert `req.user.is_ctv` or per-endpoint self permissions (`api/src/routes/ctv.js:37`, `api/src/routes/ctv.js:131`, `api/src/routes/ctv.js:200`).
- FAIL: server mounts CTV routes multiple times. `/api/Ctv` is mounted before the feature-flag gate without `requirePermission` (`api/src/server.js:240`), `/api/ctv` is mounted behind `ctv.dashboard.view` when the flag is true (`api/src/server.js:344`), and then `/api/ctv` is mounted again unconditionally at the end without the permission gate (`api/src/server.js:430-431`). Because `ctv.js` itself only requires auth, this leaves a broad authenticated access path.
- FAIL: the CTV domain requires `auth: is_ctv + ctv.commission.view.self` for `/api/ctv/commission-summary` and self-only access (`product-map/domains/ctv.yaml:27-29`), but implementation does not enforce that inside the route.

Changed/verified API URLs: `/api/ctv/commission-summary`, `/api/ctv/referrals`, `/api/ctv/me`.

### 3. Referral Attribution on Client / Appointment Creation: FAIL

- PASS: the commission engine resolves CTV referral first when `clientRow.referred_by_ctv_id` is present (`api/src/services/commissionEngine.js:44-47`).
- FAIL: creating a customer/partner does not accept or persist `referred_by_ctv_id`; the insert fields include legacy `referraluserid` but not the v2 CTV field (`api/src/routes/partners/mutationHandlers.js:22-57`, `api/src/routes/partners/mutationHandlers.js:93-143`).
- FAIL: appointment creation does not create or supersede a cosmetic `consultations` attribution card; the handler inserts the appointment only and returns joined appointment details (`api/src/routes/appointments/mutationHandlers.js:11-142`).
- FAIL: the earnings domain says cosmetic appointment/client flow should auto-create `consultations` and use that as D13 priority #2 (`product-map/domains/earnings-commissions.yaml:13-18`; `product-map/domains/cosmetic-clients.yaml:18-24`), but no such lifecycle is wired in the inspected appointment/client mutation paths.

### 4. Commission / Earnings Append-Only Behavior: PARTIAL PASS

- PASS: the engine writes positive append-only rows into `dbo.earnings` with `status='pending'` and does not touch legacy commission-rule tables (`api/src/services/commissionEngine.js:121-145`; domain rule at `product-map/domains/earnings-commissions.yaml:3-12`).
- PASS: migration creates `dbo.earnings` and `dbo.payouts` as additive tables and defines `amount` as negative-capable for reversals (`api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql:53-67`, `api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql:80-89`).
- FAIL: payment route calls `createEarningsForPayment` with `lines: []`, and the engine then uses a null product and product rate `0`, so normal payment-created earnings will usually be skipped unless another caller supplies line/product data (`api/src/routes/payments.js:130-143`; `api/src/services/commissionEngine.js:110-118`).
- FAIL: fallback `serviceLineId = '00000000-0000-0000-0000-000000000000'` cannot satisfy the migration FK to `saleorderlines(id)` if reached in real DB flow (`api/src/services/commissionEngine.js:119-126`; FK at `api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql:59-60`).
- FAIL: seed script can create demo rows by direct fallback insert, but that proves demo data seeding more than the live operational payment path (`api/scripts/seed-cosmetic-lob.js:376-405`).

### 5. Refund / Reversal Handling: FAIL

- PASS: `reverseOnRefund` exists and writes negative append-only reversal rows without mutating originals (`api/src/services/commissionEngine.js:148-190`).
- PASS: unit test covers negative reversal insertion and confirms no `UPDATE dbo.earnings SET status` call (`api/src/services/__tests__/commissionEngine.test.js:82-99`).
- FAIL: `/api/Payments/refund` does not call `reverseOnRefund`; it calls `createEarningsForPayment` with a negative payment amount, which will not create a negative row because `commissionAmount <= 0` is skipped (`api/src/routes/payments.js:217-227`; `api/src/services/commissionEngine.js:113-118`).
- FAIL: payment delete and void paths reverse allocations or mark payment voided but do not create negative earnings reversals (`api/src/routes/payments.js:309-354`, `api/src/routes/payments.js:356-404`).
- FAIL: the refund endpoint does not receive or resolve `originalPaymentId`, so it cannot reverse the exact prior earnings rows as the engine requires (`api/src/services/commissionEngine.js:153-162`).

### 6. Role Access Boundaries: FAIL

- PASS: CTV self permissions are registered in the permission service (`api/src/services/permissionService.js:13-23`), and CTV users without a group can be auto-granted the CTV self-view permissions (`api/src/services/permissionService.js:75-87`).
- PASS: `requireLobScope` blocks `is_ctv` users from LOB-scoped cosmetic/admin APIs (`api/src/middleware/auth.js:66-85`).
- PASS: frontend blocks CTV users from admin routes by redirecting to `/ctv` (`website/src/App.tsx:103-107`), and the matrix e2e has a CTV admin-attempt scenario (`website/e2e/cosmetic-lob-full-matrix.spec.ts:279-291`).
- FAIL: backend CTV API route duplication plus route-local `requireAuth` means any authenticated employee can hit the unguarded `/api/ctv` mount and see their own matching rows/profile shape, which violates the CTV-only API contract (`api/src/server.js:240`, `api/src/server.js:430-431`; `api/src/routes/ctv.js:37-39`, `api/src/routes/ctv.js:131-134`, `api/src/routes/ctv.js:200-208`).

## Available Test Results

- PASS: `JWT_SECRET=test npx jest src/services/__tests__/commissionEngine.test.js --runInBand`
  - Result: 1 suite passed, 7 tests passed.
- PASS: `JWT_SECRET=test npx jest src/services/__tests__/permissionService.test.js --runInBand`
  - Result: 1 suite passed, 16 tests passed.
- NOT PASS / blocked: `npm test -- src/services/__tests__/commissionEngine.test.js --runInBand`
  - The package script expands to `jest tests src ...` and failed before the focused test due `src/server.js` requiring `JWT_SECRET`.
- NOT RUN: Playwright matrix test `website/e2e/cosmetic-lob-full-matrix.spec.ts`.
  - Reason: this Agent 4 scope was code inspection/report-only and no services/browser verification were requested for this report pass.

## Missing PRD / Business Logic Coverage

- No backend CTV route-local `is_ctv` assertion or endpoint-level `ctv.commission.view.self` / `ctv.referrals.view.self` enforcement.
- Duplicate CTV route mounts create inconsistent feature-flag and permission behavior.
- Customer creation/update does not persist the v2 `referred_by_ctv_id` field.
- Appointment creation does not create/supersede cosmetic consultation cards.
- Payment-created earnings are not connected to actual sale order lines/products, so commission rates often resolve to zero.
- Refund/void/delete flows do not call the negative reversal engine.
- Admin payout runner and payout status linking are documented but not implemented (`product-map/domains/earnings-commissions.yaml:12`, `product-map/domains/earnings-commissions.yaml:55-60`).
- Domain docs still contain stale `users` wording while implementation/migration use `partners` as canonical auth/identity (`product-map/domains/ctv.yaml:3`, `product-map/domains/ctv.yaml:16`, `api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql:8-11`).

## Recommended Next Steps

1. Make `api/src/routes/ctv.js` enforce `is_ctv` and endpoint-specific CTV self permissions, then remove duplicate unguarded CTV mounts in `api/src/server.js`.
2. Add route tests proving admin/staff cannot access `/api/ctv/*`, CTV can access only `/api/ctv/*`, and feature flag behavior is deterministic.
3. Wire `referred_by_ctv_id` into partner/client create/update contracts and UI/API payloads.
4. Wire cosmetic appointment creation to create/supersede `consultations` cards with the 6-month TTL rule.
5. Replace the payment hook TODO with real sale order line/product-rate resolution and valid `saleorderlines.id`.
6. Change refund/void/delete flows to call `reverseOnRefund` with a real original payment id and add regression tests.
7. Add payout runner/linking before marking paid commission UX complete.
8. Run the full Playwright CTV matrix only after local API/Vite services are stable with `COSMETIC_LOB_ENABLED=true`.

