# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## [0.32.53] — 2026-05-27 (codex/tmv-ctv-flip-cards)
### Added
- TMV CTV referral tracking cards now flip on click/tap to show every attributed service under the referred client, including service name, amount, status, LOB, and earned date. `GET /api/ctv/referrals` now includes `services[]` and `service_count` derived from `dbo.earnings` joined to service-line/product display names across both LOB databases. — @agent — UC-022, INV-006, INV-016, INV-017.
### Tests
- Targeted verification required for this release: `api/src/routes/__tests__/ctvReferrals.test.js`, `website/src/components/ctv/ReferralFlipCard.test.tsx`, `website/src/pages/CTV/tabs/CtvTrackingTab.test.tsx`, CTV i18n coverage, website build, scoped Semgrep, and live `https://tmv.2checkin.com/ctv` screenshot after deploy. — @agent — TMV-only deployment path.

## [0.32.52] — 2026-05-26 (codex/nk3-balance-hotfix)
### Fixed
- NK3 employee-account login now searches the employee's source LOB database during `/api/Auth/login`, stamps `auth_lob` / `lob_context` into the JWT and user payload, and resolves `/api/Auth/me`, `/api/me/lob-scope`, password changes, and permission checks under that source LOB. Cosmetic employee creation now writes `partners.lob_scope = ARRAY['cosmetic']`, so newly created Cosmetic staff accounts can authenticate without falling back to Dental. — @agent — preserves INV-008A/INV-008B and closes the live report "tạo được nhân viên rồi, nhưng tạo tài khoản cho nhân viên đăng nhập thì không được".
- Production web API fallback now defaults to same-origin `/api` instead of localhost when `VITE_API_URL` is missing, preventing a bad NK3 web image from showing Chrome local-network prompts and `Failed to fetch` on login. — @agent — live restore evidence: `output/live-verification/nk3-live-login-restored-20260526T074600Z/`.
### Tests
- Targeted verification: `NODE_PATH=.../api/node_modules npx jest --runTestsByPath tests/loginRateLimiter.test.js --runInBand` passed 5 tests, including a Cosmetic-only employee auth-source regression; `npm --prefix website test -- --run src/lib/api/__tests__/apiFetch.lob.test.ts src/lib/api/__tests__/employees.lob.test.ts` passed 2 files / 7 tests. — @agent — auth/source-LOB regression lock.

## [0.32.51] — 2026-05-26 (codex/nk3-balance-hotfix)
### Fixed
- NK3 Cosmetic appointment form submit now passes `BusinessUnitContext.currentLOB` into `createAppointment` and `updateAppointment`, so Calendar and customer-profile appointment writes use `/api/cosmetic/Appointments` while Cosmetic is active instead of falling back to dental and failing with `Partner with given partnerId does not exist`. — @agent — preserves INV-008B and Cosmetic LOB v2 physical isolation.
### Tests
- Targeted verification: `npm --prefix website test -- src/components/appointments/unified/__tests__/useAppointmentForm.test.ts` passed 1 file / 7 tests, including Cosmetic create/edit LOB routing assertions. — @agent — NK3 live UI reproduction lock.

## [0.32.50] — 2026-05-25 (codex/nk3-balance-hotfix)
### Fixed
- NK3 Cosmetic feedback hotfix: customer create/edit/delete, customer-code resolve, customer profile, appointment create/edit/reschedule, customer service records, and Permission Board save now pass the active LOB into API clients so Cosmetic UI writes route through `/api/cosmetic/*` instead of silently falling back to dental. — @agent — Cosmetic LOB v2 physical isolation invariant.
- `GET /api/cosmetic/CustomerBalance/:id` is now mounted and `customerBalance.js` uses `getQuery(req)`, so customer profile/deposit screens calculate Cosmetic advance balance from `tcosmetic_demo` instead of returning 404 or using the dental pool. — @agent — closes NK3 feedback bug "Thêm tạm ứng nhưng không nhảy tiền tạm ứng".
### Tests
- Targeted verification: `npm test -- src/hooks/__tests__/useCustomers.cskh.test.ts src/hooks/__tests__/useCustomers.permissions.test.ts src/hooks/__tests__/useCustomerProfile.date-normalization.test.tsx src/hooks/useServices.payment-state.test.tsx src/hooks/usePermissionBoard.lob.test.tsx` passed 5 files / 23 tests; `JWT_SECRET=test jest --runTestsByPath src/__tests__/cosmeticLobGuards.test.js --runInBand` passed 15 tests. — @agent — NK3 feedback regression lock.

## [0.32.49] — 2026-05-25 (codex/nk3-ctv-deploy)
### Added
- NK3 CTV self portal refresh: `/ctv` now uses the modular CTV page set under `website/src/pages/CTV/*`, shared CTV components, and the `ctv` i18n namespace. The portal keeps Home, Commission, Referrals, and Me while adding the Tracking tab for client journey status. — @agent — UC-CTV self-service, preserves Cosmetic LOB v2 D14 CTV admin isolation.
- `GET /api/ctv/client-journeys` returns self-owned referred clients from both dental and cosmetic databases with stage/progress, visit, service, payment, and earned-commission fields. The backend CTV router was split into smaller route modules (`ctv.js`, `ctvActions.js`, `ctvClientJourneys.js`, `ctvHelpers.js`) without changing the NK3 two-DB discipline. — @agent — contract v1.0.5, CTV is the approved cross-DB composition surface.
### Changed
- `/ctv` route guarding now explicitly renders only for authenticated CTV users and redirects non-CTV users back to the admin app. `POST /api/ctv/bookings` keeps `B_CLIENT_CLAIMED` compatibility by returning both camelCase and snake_case owner/expiry fields for the refreshed sheet UI. — @agent — D14 role isolation and referral-claim eligibility.
- `vite.config.ts` now honors `GIT_SHA`/`GIT_BRANCH` build args when generating `dist/version.json`, so NK3 Docker builds can prove the exact deployed commit even though git is not installed inside the build image. — @agent — release verification invariant.
### Tests
- Targeted verification: `npm --prefix website test -- src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts`; `npx jest --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js src/services/__tests__/referralCard.test.js src/services/__tests__/commissionEngine.test.js`; `npx tsc --noEmit` in `website`; `node --check api/src/routes/ctv*.js`; scoped Semgrep scan; local and NK3 live `/ctv` screenshot verification. — @agent — docs/test matrix sync.

## [0.32.48] — 2026-05-25 (codex/nk3-ctv-deploy)
### Added
- Admin Payouts cycle with receipt photo upload (Gap 1): migration `051_add_payout_receipt.sql` adds `receipt_url` + `receipt_uploaded_at` to `dbo.payouts`. `POST /api/Payouts` accepts optional `receipt_url`; `PATCH /api/Payouts/:id` attaches a receipt after creation; `POST /api/Payouts/upload-receipt` returns a stored image URL (multer + local disk, same pattern as feedback attachments). `EarningsPayoutsTabs.tsx` adds file picker to the payout form, thumbnail preview, and "Attach" button on past cycles. `CtvDashboard.tsx` Paid tab now shows real payout cycles with receipt thumbnails. Permission gates on `earnings.js` and `payouts.js` now accept `isAdminPermissionState` (matching `commissionConfig.js`/`ctvs.js`). 7 jest cases in `payouts.test.js`. — @agent — 2026-05-24 (0.32.46).
- Per-service referral commission % UI (Gap 2): `products.commission_rate_percent` is now exposed in `GET /api/Products`, editable in `ServiceCatalogModals.tsx` with raw-text draft pattern (decimals work, 0–100 clamp on blur), persisted through `POST/PUT /api/Products`, and shown as an "HH%" column in `ServiceCatalogTable.tsx`. The commission engine already reads this field; now admins can set it per service. — @agent — 2026-05-24 (0.32.46).
- Live payment-split proof on NK3 (Gap 3): `payments.js` wiring now maps `createdAllocations` to `dbo.saleorderlines` and passes `engineLines` to `createEarningsForPayment`, so per-product `commission_rate_percent` is applied on real payments. Verified on `tcosmetic_smoketest`: CTV-referred client → saleorder with 10% commission product → payment 500K → earnings row 145,400 (72.7% of 200K pool) at L0 for CTV Demo Referrer. Refund endpoint updated to accept `original_payment_id` and call `reverseOnRefund`, producing negative reversal row (-145,400) linked to the refund payment. — @agent — 2026-05-24 (0.32.46).
- Visual QA / polish pass (Gap 4): Removed fake stat cards from Commission page (were showing dummy data). Added full Vietnamese i18n coverage for commission UI: `commission.json` with keys for config/CTV/earnings/payouts tabs, `services.json` extended with `commissionRate`/`commissionRateShort`. Updated `Commission.tsx`, `EarningsPayoutsTabs.tsx`, `ServiceCatalogModals.tsx`, `ServiceCatalogTable.tsx` to use i18n instead of hardcoded English/Vietnamese. Build passes, all 787 tests pass. — @agent — 2026-05-24 (0.32.46).
### Changed
- NK3 canonical domain is now `https://tmv.2checkin.com` (was `https://ctv.2checkin.com`). nginx vhost `tmv.2checkin.com` proxies `/` to the NK3 web container (`:5375`) with a fresh Let's Encrypt cert; the old `ctv.2checkin.com` now 301-redirects `/` to tmv and keeps `/tbot/*` (kanban board) unchanged. API CORS allowlist drops `ctv.2checkin.com` (+ www) and adds `tmv.2checkin.com` (+ www). NK and NK2 untouched. — @agent — 2026-05-23.
### Added
- CTV-panel booking UI (`CtvDashboard.tsx` + `createBooking` in `website/src/lib/api/ctv.ts`): the `+ Client` sheet now takes a date and POSTs `/ctv/bookings`; a `B_CLIENT_CLAIMED` response shows a Vietnamese "already with another CTV until <date>" message. 3 vitest. — @agent — 2026-05-23 (0.32.41).
- Customer profile "Người giới thiệu (CTV)" block (`ProfileHeader.tsx`): shows the owning CTV + active/expired badge. `GET /api/Partners/:id` (`getPartnerById.js`) now returns `referralClaim`. 4 jest. — @agent — 2026-05-23.
- `POST /api/ctv/bookings` (in `api/src/routes/ctv.js`) — CTV/admin booking with hard eligibility gate: blocks `400 B_CLIENT_CLAIMED` when the client is actively claimed by a different CTV; otherwise creates/re-claims the client, writes a Referral Start card, and creates the appointment (canonical `dbo.appointments` insert). Uses `crypto.randomUUID()` (uuid v13 is ESM and breaks `require` under jest). `REFERRAL_PRODUCT_NOT_CONFIGURED` → 409. 2 jest cases. — @agent — 2026-05-22.
- `api/src/services/referralCard.js` — `createReferralStartCard({ clientId, lob })` creates a zero-amount saleorder + saleorderline referencing `commission_settings.referral_start_product_id`; throws `REFERRAL_PRODUCT_NOT_CONFIGURED` if unset. Mirrors `createSaleOrder.js` insert pattern. — @agent — 2026-05-22.
- `api/src/routes/partners/resolveHandler.js` — `/api/Partners/resolve` now includes `referralClaim` in the 200 response (active/lapsed status for the matched partner). — @agent — 2026-05-22.
### Docs
- `docs/superpowers/plans/2026-05-22-ctv-referral-claim.md` — 9-task TDD implementation plan for the referral-claim feature (migration 050, getReferralClaimStatus + createReferralStartCard helpers, engine active-window credit gate, POST /api/ctv/bookings eligibility gate, /resolve + profile claim display). No runtime code yet. — @agent — 2026-05-22.
- `docs/superpowers/specs/2026-05-22-ctv-referral-claim-design.md` — design for CTV referral claims: exclusive ownership via `referred_by_ctv_id`, a "Referral Start" saleorderline card as the claim anchor, a rolling 6-month expiry computed from `max(card date, last paid service)`, a hard eligibility gate that blocks booking a client actively claimed by another CTV (CTVs and admins), and crediting only while the claim is active as of payment date. No new tables; one additive column `commission_settings.referral_start_product_id`. No runtime code yet. — @agent — 2026-05-22.
### Fixed
- NK3 pre-deploy fixes: `permissions.js` migrated to `getQuery(req)` for Cosmetic DB routing (bug #5); `partners/mutationHandlers.js` now generates `TM######` prefix for Cosmetic customers (bug #1). Both align with LOB v2 two-DB discipline. — @agent — 2026-05-25.
- TMV/NK3 `/commission` no longer errors on Cosmetic LOB: the cosmetic router now exposes `/api/cosmetic/CommissionConfig` and `/api/cosmetic/Ctvs`, matching the LOB-aware frontend rewrite for the Commission Config and CTVs tabs. — @agent — 2026-05-23 (0.32.45, preserves Cosmetic LOB v2 D5 route isolation while unblocking admin commission setup).
- NK3/CTV Cosmetic LOB employee add/edit modal leaked dental branches because EmployeeForm and EmployeeProfile loaded `/api/Companies` without the active LOB. They now load branches with `lob=currentLOB`, and employee create/update sends the same LOB so Cosmetic uses `/api/cosmetic/Companies` and `/api/cosmetic/Employees`. Added form and API-client regression tests. — @agent — 2026-05-22 (0.32.40, preserves Cosmetic LOB v2 D5/D6 data isolation).
- Commission Config % inputs (global default + per-level share) were unusable: parse-and-clamp on every keystroke dropped the decimal point (typing `14.5` reverted to `14`) and clearing the field snapped to `0`. Now backed by a raw-text draft per input — type freely incl. decimals, parsed into the model on change, clamped to 0–100 on blur. — @agent — 2026-05-22 (0.32.39).
- NK3 browser login returned 500 "internal error": `https://ctv.2checkin.com` was missing from the API CORS allowlist (`api/src/server.js`). Added it (+ www). curl checks had passed because they send no Origin header. — @agent — 2026-05-22.
### Changed
- `commissionEngine.resolveRecipient` now credits a CTV only while the referral claim is **active as of the payment date** (`asOf` threaded from `createEarningsForPayment`); a lapsed claim falls through to consultation/salestaff/none and does not auto-revive. Both `resolveRecipient` and `createEarningsForPayment` accept an injectable `referralClaim` for tests. — @agent — 2026-05-22.
### Added
- `api/src/services/referralClaim.js` — `getReferralClaimStatus(clientId, lob)` + pure `computeClaim`: a client's CTV claim is active for 6 months from `max(earliest Referral Start card date, last paid-service date)`. Queries `dbo.payments(customer_id, payment_date, amount)` for the last paid service. 14 jest cases. — @agent — 2026-05-22.
- **MLM commission config + CTV signup.** Migration `049_add_commission_level_config.sql` (additive, both DBs, guarded schema_migrations insert): `commission_level_config` (per-level enabled + share_percent, seeded L0–L4 = 72.7/14.5/7.3/3.6/1.8), `commission_settings` (singleton `default_referral_percent`), and `earnings.level`. — @agent — 2026-05-22.
- `commissionEngine.js` rewritten: for `source='ctv'` it walks the `referred_by_ctv_id` upline (≤5 levels) and splits the per-line commission pool by configured level shares; disabled levels / missing upline are not paid (remainder stays with the clinic, no redistribution). `consultation`/`salestaff` keep a single full-pool row at level 0. 9 jest cases (split + salestaff + refund). — @agent — 2026-05-22.
- New endpoints: `POST /api/ctv` (create CTV — CTV-or-admin only, instant active, `employee=true` so login works, `lob_scope` bound as text[], dental row always + cosmetic mirror if scoped), `POST /api/ctv/clients` (refer a customer into one LOB), `GET/PATCH /api/Ctvs` (admin list/suspend), `GET/PUT /api/CommissionConfig` (admin level split; PUT validates enabled sum ≤ 100 → `B_LEVEL_SUM_EXCEEDS_100`). — @agent — 2026-05-22.
### Changed
- `CtvDashboard.tsx` — header gains two pills under the title: **+ Client** (refer customer) and **+ CTV** (recruit), each opening a bottom-sheet wired to `referClient`/`createCtv`. Bottom nav unchanged (4 tabs). — @agent — 2026-05-22.
- `Commission.tsx` — placeholder replaced with admin **Config** (editable level table + global default %, live ≤100% validation, surfaced save error) and **CTVs** (list + suspend + Add CTV) sub-tabs; new `website/src/lib/api/commission.ts`. — @agent — 2026-05-22.
### Security
- Registered `ctv.manage` + `commission.config.manage` in `permission-registry.yaml`. CTV creation is closed (no public signup): self-recruit gated by the `is_ctv` flag, admin by wildcard `*`. — @agent — 2026-05-22.
## [unreleased] — 2026-05-22 (feat/cosmetic-lob-nk3 — LOB write-isolation sweep)
### Fixed
- **Cross-LOB data leak in 25+ frontend write/read paths.** A full 6-domain code review (after the cosmetic-mode "cannot add payment" bug) found the same root pattern everywhere: API-client reads threaded the active `lob` but writes (and several reads) did not, so in cosmetic mode they hit the dental endpoints and wrote/read the wrong database. Backend isolation was verified SOLID (ALS `runWithLob` + `getQuery(req)` route every `/api/cosmetic/*` request to the cosmetic pool), so the fix is purely frontend `lob` threading. Threaded `currentLOB` from `BusinessUnitContext` through: appointments (create/update/check-in/status/cancel + form), partners (create/update/soft+hard-delete/resolve/check-unique), employees (create/update/delete), customer profile (partner/appointments/balance reads), external checkups (patient + raw-multipart checkup create), customer sources (CRUD), sale orders (create/update/state/delete-line/fetch-lines), monthly plans (create/update/delete/mark-paid), dotKhams read, bank settings (read+write), and payment-proof upload. Added matching `lob?` params to the API-client functions in `partners.ts`, `employees.ts`, `customerSources.ts`, `externalCheckups.ts`, `dotKhams.ts`, `saleOrders.ts`, `monthlyPlans.ts`, `websitePages.ts` (uploadPaymentProof). Backend: mounted `DotKhams`, `CustomerBalance`, `CustomerSources`, `ExternalCheckups`, and `settings` (bank) under the cosmetic router in `api/src/server.js` so the now-LOB-aware frontend calls resolve. Global vitest setup gained a default `BusinessUnitContext` mock so hook unit tests resolve `useBusinessUnit()`. Permissions / system-preferences / website-pages intentionally left LOB-global per product decision. — @agent — 2026-05-22 user request: "make sure cosmetic and dental don't leak into each other."

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3-phase2)
### Added
- **NK3 Cosmetic Catalog Sheet Import:** `api/scripts/import-nk3-cosmetic-catalog.js` extracts the Google Sheet into CSV/JSON artifacts and prepares an idempotent, guarded import for local `tcosmetic_demo` or NK3 online `tcosmetic_smoketest` only: 175 services, 11 categories, 2 locations, one skipped blank row, no deletes, and explicit refusal of dental/NK/NK2 targets. — @agent — User request to match the cosmetic line-of-business catalog to NK3 staging without touching NK or NK2.
- **Phase-2 Task-1 — Admin Permission Seeding:** `api/migrations/048_grant_lob_permissions_to_admin.sql` auto-grants cosmetic.access, dental.access, and lob.crossview to Admin group (UUID 11111111-0000-0000-0000-000000000001). Migration is idempotent (ON CONFLICT DO NOTHING) and applies to both tdental_demo and tcosmetic_demo, enabling multi-scope admins to access /api/dental/* and /api/cosmetic/* routes without manual PermissionBoard steps. Paired Jest test `api/src/__tests__/adminLobPermissions.test.js` (9 assertions) verifies migration file structure, naming, permission keys, idempotency, UUID, and rollback notes. — @agent — Phase-2 critical path Task 1, per spec D5.
- **Phase-2 Task-2 — Cosmetic Transactional Seed:** `api/scripts/seed-cosmetic-lob-transactional.js` populates tcosmetic_demo with real money-flow data: 2-3 customers with referred_by_ctv_id set (D13 CTV attribution path), 3-5 appointments (mix past/today/future), 3-5 payments, earnings rows with source='ctv', and refund reversals (negative amounts for append-only ledger validation). Validates CTV referrer existence (ctv-demo@clinic.vn), gracefully handles optional consultations table, uses ON CONFLICT DO NOTHING idempotency, and supports --dry-run mode for syntax validation. Exports seedCosmeticTransactionalData function. Paired Jest test `api/src/__tests__/cosmeticTransactionalSeed.test.js` (15 assertions) verifies script structure, INSERT statements, source='ctv' attribution, refund logic, CTV validation, and --dry-run support. — @agent — Phase-2 critical path Task 2 ("Make CTV real"), per spec D12, D13, D16.

### Tests
- **nk3CosmeticCatalogImport.test.js** (5 jest assertions): Validates the `Dịch vụ`/`Chi nhánh` workbook shape, Vietnamese identity keys that preserve tone-distinct names while keeping search keys accent-insensitive, CSV extraction formatting, non-destructive delta planning, dental/NK/NK2 target refusal, and the required `CONFIRM_NK3_COSMETIC_IMPORT=YES` gate before NK3 apply. — @agent — 2026-05-21.
- **adminLobPermissions.test.js** (9 jest assertions): Validates migration 048_grant_lob_permissions_to_admin.sql exists, has correct naming pattern, contains all three permission keys (cosmetic.access, dental.access, lob.crossview), is idempotent (ON CONFLICT DO NOTHING), targets the correct admin group UUID, includes rollback instructions, and groups all three permissions in a single VALUES clause for atomicity. — @agent — 2026-05-21.
- **cosmeticTransactionalSeed.test.js** (15 jest assertions): Validates seed-cosmetic-lob-transactional.js script exists, has correct shebang, contains INSERT INTO statements for appointments/payments/earnings, creates earnings with source='ctv' for D13 path, includes refund reversals (negative-amount rows), validates CTV referrer existence, uses ON CONFLICT DO NOTHING idempotency, handles consultations table gracefully (try/catch), supports --dry-run mode, exports seedCosmeticTransactionalData function, and creates per-customer earnings rows via loop structure. — @agent — 2026-05-21.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3-phase1-finish)
### Tests
- Phase-1 gap B regression lock: `website/src/lib/api/__tests__/apiFetch.lob.test.ts` (5 vitest assertions). Asserts `apiFetch({ lob: 'cosmetic' })` prepends `/cosmetic` to the URL, `lob: 'dental'` and omitted lob leave the URL untouched, query params land after the LOB prefix, and `/:id` style paths stay intact under the cosmetic prefix. If anyone removes the lobPrefix line in `website/src/lib/api/core.ts`, every cosmetic data hook would silently fall back to dental endpoints — this test catches that. — @agent — 2026-05-21.
- Phase-1 gap C regression lock: `website/src/__tests__/ProtectedRoute.ctv.test.tsx` (4 vitest assertions). Asserts a user with `is_ctv === true` (or legacy `isCtv === true`) is redirected to `/ctv` instead of seeing the admin route, a non-CTV user is not redirected, and the source-level grep on `App.tsx` still finds both the `is_ctv` condition and the `<Navigate to="/ctv" replace />` JSX. Spec D14: CTV-flagged users never enter the admin tree. — @agent — 2026-05-21.
- Phase-1 gap D regression lock: `api/src/__tests__/cosmeticLobGuards.test.js` (9 jest assertions). Builds a minimal Express app mirroring the `/api/cosmetic/*` gate composition from `server.js` (~lines 367-425) and uses the REAL `requireLobScope` middleware to exercise: flag off → 503 `COSMETIC_LOB_DISABLED` on all three sampled endpoints (Partners, Appointments, Payments); flag on + dental-only user → 403 `S_LOB_FORBIDDEN`; flag on + CTV-flagged user → 403 `S_LOB_FORBIDDEN` regardless of scope; flag on + dental+cosmetic admin → 200 (gate cleared). A final structural-regex assertion catches deletion of the flag check, the 503 branch, the `requireLobScope('cosmetic')` call, or the `app.use('/api/cosmetic', ...)` mount from `api/src/server.js`. The test does not load `server.js` itself because the jest haste map collides across sibling worktrees sharing the `@tgroup/contracts` package name — a tooling limitation, not a code one. — @agent — 2026-05-21.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3)
### Added
- Phase-1 gap A: `<Routes>` in `website/src/App.tsx` is now keyed by `currentLOB` from `BusinessUnitContext`, so toggling the LOB unmounts and remounts the entire route subtree. This is the spec §"LOB Toggle Behavior" requirement (line ~195 of `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md`): "The React tree under `<App>` is keyed on the LOB, so toggling unmounts+remounts the subtree — this is how we prevent 'flash of dental data' without per-component cache code." App.tsx was refactored to extract an `AppRoutes` component that calls `useBusinessUnit()` and renders `<Routes key={currentLOB}>`; the `BusinessUnitProvider` now sits above `AppRoutes` so the hook resolves. Regression-locked by `website/src/__tests__/App.remount.test.tsx` (4 assertions, incl. a source-level grep for `<Routes key={currentLOB}>`). — @agent — 2026-05-21 closes the foundation UX gap for the cosmetic LOB toggle.

## [Cosmetic LOB v2 — Phase 0 Governance] — 2026-05-19 (feat/cosmetic-line-of-business worktree only)

- Product-map domains split/created: business-unit, cosmetic-clients, ctv, earnings-commissions (earnings table per PLAN); cosmetic.yaml corrected.
- permission-registry + api-index updated with 9 keys + new routes.
- schema-map, unknowns, change-checklist, system-map updated for two-DB + earnings.
- New Governance Delta spec created documenting all authority/product-map changes.
- AGENTS, ARCHITECTURE, BEHAVIOR, DECISIONS (D1–D16), DATA-MODEL, SECURITY, RUNBOOK + runbooks, TEST-MATRIX, etc. updated with LOB notes + cross-refs per v2 spec § Documentation updates and PLAN Phase 0.
- Reinforced "local only", TDD-first, product-map governance, no cross-DB SQL.
- No runtime code or migrations yet — pure governance foundation. See 2026-05-18-cosmetic-line-of-business-governance-delta.md and PLAN.md.

## Format

```
## [x.y.z] — YYYY-MM-DD
### Category
- Change description — @author — reason/ref
```

Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Docs`.

---
## [0.31.19] — 2026-05-19
### Fixed
- Restricted Cosmetic LOB selector to Admin users only: auth responses cap non-admin visible `lob_scope` to one LOB, `BusinessUnitContext` ignores staff localStorage/query attempts to switch, and docs/tests now cite INV-008A. — @agent — User request: dental staff must not see or select Cosmetic LOB.
## [0.32.47] — 2026-05-25

### Fixed
- `permissions.js` LOB-aware query routing: migrated all 21 bare `query()` calls to `getQuery(req)` so Cosmetic permissions reads/writes route through the cosmetic database pool instead of the dental default. — @agent — fixes NK3 feedback bug #5 (staff permission save errors under Cosmetic LOB) and aligns with LOB v2 two-DB discipline (D13).
- Frontend test stability: added global `BusinessUnitContext` mock in `website/src/test/setup.ts` to prevent `useBusinessUnit must be used inside BusinessUnitProvider` errors in hooks/components that now depend on LOB context. — @agent — test infrastructure only, no runtime change.

## [0.32.46] — 2026-05-24
## [0.32.44] — 2026-05-23

## [0.32.37] — 2026-05-21
### Added
- **FeedbackWidget login hint:** small dismissible bubble next to the speech-bubble icon in the header that prompts "Có vấn đề? Nhấn vào đây để báo cho chúng tôi — mọi phản hồi đều được đọc." (EN: "Any problem? Tap here to report it — we read every one."). Shows once per fresh login session — `AuthContext.login` clears `sessionStorage['tg_feedback_hint_dismissed']`, the X button on the bubble sets it. New i18n keys: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI). — @agent — 2026-05-21 surfaces the feedback channel to staff on every login.

### Fixed
- **`Xu hướng dòng tiền` cash flow chart no longer truncates dates.** `BarChart` (`website/src/components/reports/BarChart.tsx`) gains a `labelOrientation: 'auto' | 'horizontal' | 'vertical'` prop. `'auto'` (default) rotates labels -90° when there are >= 8 bars so per-column width is no longer the constraint. `ReportsRevenue.tsx` passes `labelOrientation="vertical"` explicitly to the cash-flow chart since daily dates with month suffix are always long. The same auto-rotation applies to every other `BarChart` consumer (weekly trend, monthly summary) without per-call changes. — @agent — 2026-05-21 fixes the "4..." / "2..." mid-character truncation on /reports/revenue.

## [0.32.36] — 2026-05-21
### Added
- Frontend foundation for Cosmetic LOB v2 (Phase 0/1 per PLAN): full `BusinessUnitContext.tsx` (TDD, stable memoized, auth-event synced mirroring LocationContext), `FilterByBusinessUnit` toggle component (placed left of location filter in header, renders for isMultiLOBUser), wired `BusinessUnitProvider` + keyed remount (`key={currentLOB}` around Outlet in Layout) in App/Layout, LOB-aware `apiFetch(..., { lob })` support in core.ts for future /cosmetic/* routes. Toggle is now renderable (visible for admins with lob_scope >=2). — Frontend Foundation Agent — Follows website/agents.md + v2 spec + visual companion.
### Docs
- Cement cosmetic LOB v2 authority sync on `fix/feedback-reports`: AGENTS / DECISIONS / COORDINATION_REQUESTS get the LOB discipline + two-DB + partners-as-identity rules; `docs/CONTRACTS.md`, `DATA-MODEL.md`, `MIGRATIONS.md`, `RUNBOOK.md`, `SECURITY.md` get migration-047 / `getDb(lob)` / `getQuery(req)` / `COSMETIC_LOB_ENABLED` / `/api/cosmetic` + `/api/ctv` subsections; `product-map/contracts/{api-index,dependency-rules,permission-registry}` get LOB endpoints, `lob.*` permissions, and dep-cruise rules; `product-map/domains/appointments-calendar.yaml` records `companyId` on appointment update; `product-map/schema-map.md` gets the partners (lob_scope/is_ctv/referred_by_ctv_id) + earnings table diagram; split cosmetic domains added as `product-map/domains/{business-unit,cosmetic,cosmetic-clients,ctv,earnings-commissions}.yaml` plus `product-map/governance-delta-cosmetic-lob-v2.md`. Source-of-truth alignment only — no application code touched, no Excel export builders changed. — @agent — 2026-05-21 pre-build cementing so the cosmetic LOB UI work on this branch shares the same product-map as the nk3-deploy / Codex line.
- `testbright.md` — appended NK 2Checkin login monitor TestSprite entry (read-only auth health check, 3 non-destructive screens). — @agent — 2026-05-21.
---
## [0.32.47] — 2026-05-25

### Fixed
- `permissions.js` LOB-aware query routing: migrated all 21 bare `query()` calls to `getQuery(req)` so Cosmetic permissions reads/writes route through the cosmetic database pool instead of the dental default. — @agent — fixes NK3 feedback bug #5 (staff permission save errors under Cosmetic LOB) and aligns with LOB v2 two-DB discipline (D13).
- Frontend test stability: added global `BusinessUnitContext` mock in `website/src/test/setup.ts` to prevent `useBusinessUnit must be used inside BusinessUnitProvider` errors in hooks/components that now depend on LOB context. — @agent — test infrastructure only, no runtime change.


### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. These design documents are now present on the `feat/cosmetic-line-of-business` worktree (cherry-picked from the parking branch) to guide implementation of the new Cosmetic LOB feature — @agent — Pre-implementation design capture for feat/cosmetic-line-of-business.

## [0.32.53] — 2026-05-27
### Added
- Built the `/ctv` mobile referral-tracking portal with searchable/filterable referral cards that flip to show every service row under the referred client. — @agent — UC-022 / WF-015; preserves INV-006, INV-016, INV-017, and INV-020.

### Changed
- `GET /api/ctv/referrals` now returns `service_count` and `services[]`; `GET /api/ctv/commission-summary` recents now include service-line fields for read-only CTV service review. — @agent — CTV contract v1.1.1 and D13 earnings attribution.

### Fixed
- CTV portal dashboard and referral/service card copy now uses a dedicated `ctv` i18n namespace for English and Vietnamese labels, service statuses, LOB pills, ARIA labels, empty/error states, and language-aware short dates. — @agent — BEHAVIOR.md §9 localization and CTV self-portal parity.

## [0.33.0] — 2026-05-26
### Changed
- Face recognition model upgraded from OpenCV SFace/YuNet (128-dim, LFW ~99.4%) to InsightFace SCRFD + ArcFace buffalo_l (512-dim, LFW 99.80%, IJB-C 97.16% TAR@FAR=1e-4). Detection: SCRFD-10GF replaces YuNet. Recognition: ArcFace R50 on WebFace600K replaces SFace. Embedding dimension 128→512. All existing SFace embeddings deactivated by migration 047 — re-enrollment required. INV-005 updated. Thresholds retuned for ArcFace score distribution (AUTO_MATCH 0.88→0.55, CANDIDATE 0.80→0.40). Anti-spoofing liveness detection stub added (Phase 2 placeholder). — @agent — bank-grade facial recognition upgrade.

## [0.32.50] — 2026-05-26
### Fixed
- Added `DELETE /Appointments/:id` route for cosmetic LOB (soft-delete sets state='cancelled'). Was returning 404. — @agent — NK3 appointment deletion.
- Added `GET /Companies/:id`, `POST /Companies`, and `PUT /Companies/:id` routes for cosmetic LOB with proper LOB-aware `req.db.connect()` for transactions. POST creates a linked partner record (NOT NULL constraint on partnerid). Was returning 404 for all CUD operations. — @agent — NK3 locations CRUD.

## [0.32.49] — 2026-05-26
### Fixed
- Employee mutations (create/update) now use `req.db.connect()` for cosmetic LOB transactions instead of bare `pool.connect()`. This fixes employee creation writing to the dental DB instead of cosmetic DB when on the cosmetic LOB. — @agent — NK3 cosmetic employee CRUD.

## [0.32.48] — 2026-05-25
### Fixed
- Login route now includes `lob_scope` and `is_ctv` in JWT token payload and login response. GET /Auth/me also returns these fields. Fixes cosmetic LOB 403 — `requireLobScope` middleware requires `req.user.lob_scope` which was never populated by login. — @agent — NK3 cosmetic LOB access.

## [0.32.47] — 2026-05-25
### Fixed
- Cherry-picked cosmetic LOB v2 backend infrastructure from nk3-deploy: db/index.js two-DB factory, middleware/lob.js attachCosmeticDb, server.js cosmeticRouter mounting /api/cosmetic/* mirrors (Payments, CustomerBalance, Permissions, Appointments, Partners, etc.). Fixes P0 NK3 staff feedback: deposit top-up not reflecting balance, payment recording failing, permission save errors — all were 404s because frontend rewrote to /api/cosmetic/* but backend had no cosmetic route mounts. — @agent — NK3 staff feedback Tasks 3, 4, 5.

## [0.32.46] — 2026-05-24
### Fixed
- TMV Cosmetic feedback sweep: appointment create/update, customer create/edit selectors, employee create/edit permission selectors, payment/deposit balance reads, and payment history refreshes now pass the active Cosmetic LOB through the frontend API clients so Cosmetic screens stay on `/api/cosmetic/*`. — @agent — Staff feedback from TMV Cosmetic; preserves Cosmetic LOB v2 two-DB isolation.
- Feedback admin auto-error hygiene now filters the Auto-detected Errors tab to the current host by default while preserving the all-host cleanup toggle and manual feedback behavior. — @agent — Staff feedback from TMV feedback queue; keeps stale-host errors from obscuring current TMV defects.
- Added regression coverage for the Cosmetic `/CustomerBalance` API mirror so live payment modals do not regress to a missing balance route. — @agent — Staff feedback from Cosmetic customer payment/deposit workflows.
- NK3 web image builds now accept `GIT_SHA` and `GIT_BRANCH` build args for `/version.json` when Docker builds without `.git` in context. — @agent — Deploy verification must prove the live bundle matches the pushed commit.

## [0.32.45] — 2026-05-23
### Fixed
- TMV/NK3 Cosmetic LOB permissions board now has a request-scoped `/api/cosmetic/Permissions/*` mirror, so `/permissions` under Cosmetic no longer 404s on `/Permissions/employees`. — @agent — Staff feedback from TMV Cosmetic; preserves Cosmetic LOB v2 route isolation and permission-board parity.
- Cosmetic customer add-service failures now surface a visible form error instead of disappearing into the console; regression coverage keeps service create/update writes on the active Cosmetic LOB. — @agent — Staff feedback from TMV Cosmetic customer profile add-service flow.

## [0.32.43-nk3-cosmetic-lob] — 2026-05-23
### Fixed
- TMV/NK3 Cosmetic LOB redo: the Business Unit provider now initializes from `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic` before child data effects can fire, preventing first-render Dental requests while Cosmetic is selected; additional customer, appointment, payment, service, settings, face-ID, monthly-plan, HSO/checkup, customer-source, and DotKham callers now pass the active LOB so Cosmetic screens use `/api/cosmetic/*` consistently. — @agent — User found the prior sweep was being exercised in Dental; preserves Cosmetic LOB v2 two-DB isolation and active-LOB workflow parity.
- Added missing Cosmetic mirror mounts for customer sources, DotKhams, bank settings, external checkups, face-ID, and exports so the frontend callers above have request-scoped cosmetic API routes instead of falling back to dental/global endpoints. — @agent — Closes the live Cosmetic toggle leak observed on `https://tmv.2checkin.com`.

## [0.32.42-nk3-api-hotfix] — 2026-05-23
### Fixed
- TMV/NK3 API hotfix: restored healthy CompreFace-backed `/api/health`, mounted `/api/cosmetic/CustomerBalance`, removed the duplicate unguarded `/api/ctv` mount, required `is_ctv` on CTV self-dashboard reads, and restored service-catalog create/edit by importing `normalizeVietnamese` in `api/src/routes/products.js`. — @agent — NK3/TMV full-parity sweep; preserves Cosmetic LOB v2 two-DB isolation and CTV-only dashboard gating.

### Removed
- Retired the external `ctv.2checkin.com` hostname for NK3/TMV: removed it from API CORS and disabled the VPS nginx vhost so `tmv.2checkin.com` is the only supported NK3 clinic domain. — @agent — User request to nuke the unused CTV hostname while preserving the in-app `/ctv` route gating.

## [0.32.35-cosmetic-lob] — 2026-05-22
### Fixed
- NK3 Cosmetic LOB routing now sends employee branch loads, employee creates, customer creates/updates, appointment creates/updates, customer selectors, payments, deposits, customer profile reads, customer balance, sale-order lines, and revenue report reads through the cosmetic mirror when the active business unit is Cosmetic; the web Docker build now forwards `VITE_COSMETIC_LOB_ENABLED`, and the NK3 `sslip.io` browser origin is allowed by API CORS for live verification. Revenue summary, trend, and by-location cards now include direct posted `payment_category = 'payment'` receipts without allocation rows, including imported cosmetic receipts whose `service_id` is still blank; by-location shows unassigned paid receipts instead of dropping them, customer-balance advance cards count only deposit-category rows, and revenue still excludes deposits, refunds, usage, and voided payments. — @agent — Staff feedback from NK3 `/feedback` and `/reports/revenue`; preserves INV-003/INV-004 payment classification and Cosmetic LOB v2 two-DB isolation.

## [0.31.19] — 2026-05-19
### Fixed
- Restricted Cosmetic LOB selector to Admin users only: auth responses cap non-admin visible `lob_scope` to one LOB, `BusinessUnitContext` ignores staff localStorage/query attempts to switch, and docs/tests now cite INV-008A. — @agent — User request: dental staff must not see or select Cosmetic LOB.

### Added
- Frontend foundation for Cosmetic LOB v2 (Phase 0/1 per PLAN): full `BusinessUnitContext.tsx` (TDD, stable memoized, auth-event synced mirroring LocationContext), `FilterByBusinessUnit` toggle component (placed left of location filter in header, renders for isMultiLOBUser), wired `BusinessUnitProvider` + keyed remount (`key={currentLOB}` around Outlet in Layout) in App/Layout, LOB-aware `apiFetch(..., { lob })` support in core.ts for future /cosmetic/* routes. Toggle is now renderable (visible for admins with lob_scope >=2). — Frontend Foundation Agent — Follows website/agents.md + v2 spec + visual companion.

### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. These design documents are now present on the `feat/cosmetic-line-of-business` worktree (cherry-picked from the parking branch) to guide implementation of the new Cosmetic LOB feature — @agent — Pre-implementation design capture for feat/cosmetic-line-of-business.


## [unreleased] — 2026-05-19
### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. Parked on `fix/feedback-reports` so they exist on a tracked branch ahead of starting the cosmetic LOB feature work — @agent — Pre-implementation design capture.

## [0.32.34] — 2026-05-19
### Fixed
- Feedback image replies now persist message rows and attachment rows inside real transactions for `POST /api/Feedback`, `POST /api/Feedback/my/:threadId/reply`, and `POST /api/Feedback/all/:threadId/reply`; file-only replies store empty message content safely, missing-thread replies clean up uploaded files, and `DELETE /api/Feedback/all/:threadId` removes physical attachment files only after the DB delete commits. The missing revenue-resolution proof for feedback `06892fc6-5ccc-4c22-ad00-fed55199e9ad` was restored on NK production; 16 duplicate orphan files were restored, 4 unrecoverable stale attachment rows were backed up to `/opt/tgroup/backups/feedback-orphan-attachments-20260519T0249Z.csv` and pruned, and `/feedback` now has zero `feedback_attachments` rows pointing at missing `/uploads/feedback/*` files — @agent — FM-20260519-01.

## [0.32.33] — 2026-05-18
### Fixed
- `HealthCheckupEmptyState` (`website/src/components/customer/HealthCheckupEmptyState.tsx`) now consumes `patientExists` from `GET /api/ExternalCheckups/:code` and renders a distinct VN/EN guidance string instead of the generic "No health checkup images found." When the Hosoonline patient doesn't exist yet, staff see `checkupEmptyPatientMissing` pointing at the "Tạo bệnh nhân HSO" button; when it does exist but has no images, they see `checkupEmptyNoImages` pointing at "Thêm lịch khám". All Hosoonline auth/unavailable/not-configured warnings are now translated. `HealthCheckupGallery.handleCreatePatient` shows an emerald success notice (`createExternalPatientSuccess`) after creation succeeds so staff get confirmation instead of a silent refresh. Verified `tsc --noEmit` clean, `vitest run src/components/customer/` 56/56 pass — @agent — Resolves feedback `84adb3d5-d7ec-4173-9813-71121e128e1f` ("tạo được hồ sơ online nhưng chưa xem được ảnh và cũng chưa up ngược lên được").
- Feedback `7bd930b0-82b5-42a1-9137-167373f6cc38` (nk vs nk2 online-profile parity) closed without code change after live verification: `GET /api/ExternalCheckups/T6281` returns byte-identical responses on both envs; HOSO* env vars sha256-identical across containers; same git HEAD `a2a40b7d`. Issue at report time (2026-05-15) was a stale frontend bundle on the reporter's browser, resolved by the 2026-05-18 redeploys — @agent — No code change.

## [0.32.32] — 2026-05-18
### Fixed
- `/calendar` now keeps the wrapped toolbar layout through laptop widths so the date navigator, search, export, filter, and quick-add controls stay visible at `1280x720` and `1366x768`; `/employees` now bounds long role/location text and keeps the edit action column sticky on the right edge of the table. This follows the NK2 responsive population audit across iPhone, iPad, and desktop routes — @agent — Staff-reported responsive population/layout defect; preserves populated calendar and employee admin workflows.

## [0.32.30] — 2026-05-18
### Fixed
- `/calendar` toolbar now keeps iPad/tablet widths on the wrapped layout until extra-wide desktop, preventing the view tabs/date navigator from overlapping and the filter/quick-add controls from extending offscreen — @agent — Staff-reported iPad calendar population/layout issue; preserves the appointments-calendar tablet acceptance path.

## [0.32.29] — 2026-05-18
### Changed
- Face ID engine swap: `useFaceCaptureController` now uses the burst+adaptive-threshold+force-capture strategy validated in the `/face` lab. Single-shot captures (Global Face ID button, customer camera, AddCustomerForm) now grab 5 frames at 100ms intervals and ship the sharpest one to CompreFace. Adaptive threshold relaxes after ~6s and ~10s; force-capture safety net fires at ~15s using the best frame seen. `requireFaceDetection` falls back to `false` when the browser native FaceDetector is unavailable (fixes iPhone Safari/Firefox stalling at 34%). Profile-mode 3-pose capture is unchanged. The `/face` lab page and its components were deleted now that the engine ships in production — @agent — Lab validated Module D as winner; rolled into the shared engine.

## [0.32.28] — 2026-05-18
### Fixed
- `/face` lab: captured face is now preserved if the `/api/face/recognize` upload fails (e.g. mobile network timeout / HTTP 408). New "recognize-failed" phase shows the captured frame, an amber upload-failed banner, and the same Register-face panel so the user can still register without re-capturing. Camera shuts off as soon as the blob is in hand (was: only after upload completed) — @agent — User reported iPhone Safari load fail after capture, registration blocked.

## [0.32.27] — 2026-05-18
### Added
- `/face` lab: when a capture returns no_match, an inline "Register face" panel lets you search customers by name/phone/code and register the just-captured face directly — no need to leave the page. Uses the existing POST /api/face/register endpoint. Modules reordered so the recommended one (D — Burst) is first, with a RECOMMENDED badge — @agent — User wanted to register from the lab page.

## [0.32.26] — 2026-05-18
### Fixed
- `/face` lab modules no longer stall at 34% when browser's native FaceDetector is unavailable: when detector is null, requireFace falls back to false so quality scoring drives auto-capture; added adaptive threshold (relaxes after 6s/10s) and forced capture after 15s using best frame; added "Capture now" manual override beside Stop; lowered per-module thresholds to be reachable with quality-only scoring (A 0.55, B 0.42, C 0.55, D 0.50) — @agent — User-reported stall on 3 of 4 modules.

## [0.32.25] — 2026-05-18
### Changed
- `/face` lab rewritten as auto-capture with per-module Activate toggle: only one camera active at a time; each module runs a continuous detection loop and auto-captures when face is stable (no manual capture button); comparison table now shows BEST badge on highest-confidence match — @agent — Staff feedback that the lab needed bank-style automated capture.

## [0.32.24] — 2026-05-17
### Fixed
- Payment method contracts and UI labels now expose only live methods (`cash`, `bank_transfer`, `deposit`, `mixed`), with `contracts/dist` rebuilt to match source — @agent — Preserve INV-003/INV-004 money-flow consistency and remove unsupported card/e-wallet drift.

## [0.32.23] — 2026-05-17
### Fixed
- `/reports/revenue` total collected now reconciles to the Excel `Báo cáo doanh thu` collected total by using posted payment-method totals and preserving paid-only sale-order states in `/api/Reports/revenue/summary`; employee revenue Excel now applies the same deposit/refund/usage exclusions, and branch breakdowns honor the selected branch filter — @agent — Staff feedback on Revenue page vs Excel mismatch; preserves INV-003, INV-004, INV-019, and reports revenue recognition rules.

## [0.32.22] — 2026-05-17
### Fixed
- Face ID capture now keeps the camera modal open on `NO_FACE` and provider no-face errors, shows "Không phát hiện khuôn mặt" / "Face not detected", maps CompreFace no-face responses to `NO_FACE`, and sends CompreFace uploads as native multipart `FormData` so the provider receives the `file` part — @agent — Staff-reported Face ID failure; preserves UC-003, UC-007, and INV-014.

## [0.32.21] — 2026-05-17
### Changed
- Site favicon now uses a TGClinic orange butterfly mark at `/favicon.svg` instead of the default Vite icon — @agent — Align app-shell identity with `DESIGN.md` warm orange brand direction.

## [0.32.20] — 2026-05-17
### Added
- Face ID provider routing now supports `FACE_RECOGNITION_PROVIDER=compreface` while preserving the existing browser camera and `/api/face/*` contracts — @agent — User requested CompreFace for Face ID; preserves INV-005 local embedding boundary and INV-014 optional provider startup.
- `/api/health` now reports `faceProvider`, and Docker exposes CompreFace on configurable `COMPREFACE_HOST_PORT` defaulting to `8002` to avoid local port `8000` conflicts — @agent — Required provider observability and local startup safety.

## [0.32.10] — 2026-05-16
### Added
- Báo cáo doanh thu (Excel) now includes 4 additional columns: `Tên dịch vụ` (so.name), `Tổng tiền phiếu` (so.amounttotal), `Còn lại phiếu` (so.residual), `Số biên lai` (p.receipt_number) — @agent — Staff feedback: column E "Phiếu khám" only shows the SO code (e.g. `SO-2026-0644`) and lost the service name when 0.32.7 switched to so.code; restore the service name as its own column and surface useful per-SO totals + receipt number so the export is a complete read-out of the row's payment context.

## [0.32.9] — 2026-05-16
### Changed
- Reports date-range quick presets reordered to `Hôm nay / 3 ngày / 1 tuần / 1 tháng / 90 ngày / Tất cả` — @agent — Staff feedback: YTD ("Từ đầu năm") was confusing as the first option and the default; replaced with rolling windows.
- Default Reports date range is now last 30 days instead of start-of-year — @agent — Same feedback; opens the page with the most common working window.

## [0.32.8] — 2026-05-16
### Changed
- Revenue tab Excel exports consolidated into a single picker at the top of the page — @agent — Replace three separate export panels (revenue, deposit, employee revenue) with one report-type dropdown plus the existing employee filters; date range continues to come from the global Reports filter bar.

## [0.32.7] — 2026-05-16
### Fixed
- Báo cáo doanh thu (Excel) column E "Phiếu khám" now uses `saleorders.code` (e.g. `SO-2026-0644`) instead of `saleorders.name` — @agent — Match the SO reference shown on the customer detail page; falls back to `name` only when `code` is blank.
- Phiếu điều trị export "Số phiếu" column likewise prefers `saleorders.code` — @agent — Same SO-code source as customer UI.
- Revenue and treatment export search filters now match against `saleorders.code` in addition to `name` — @agent — Staff can paste `SO-...` codes into search.

## [0.32.6] — 2026-05-16
### Added
- NK production daily database backup script and VPS cron with 3-backup retention — @agent — Preserve production restore points for `tdental_demo` before future data operations.

### Fixed
- Hosoonline customer images on NK now use session-storage auth tokens as well as remembered tokens — @agent — Preserve INV-013 protected proxy access for non-remembered sessions.

## [0.27.27] — 2026-05-05
### Fixed
- iPhone modal height overflow in AddCustomerForm and EditCustomerForm — @agent — Prevent form fields from being unreachable on 390px viewports (FM-20260505-01).

## [0.27.26] — 2026-05-05
### Changed
- Sticky toolbar search spacing on Overview — @agent — Standardize compact toolbar layout per DESIGN.md (DEC-20260502-05).

## [0.27.25] — 2026-05-04
### Fixed
- Hosoonline mixed content blocking on production — @agent — Force HTTPS fallback for upstream image URLs (INC-20260506-02).

## [0.27.24] — 2026-05-03
### Added
- Patient v2 API with key-based authentication (`POST /api/patients/_create`, `GET /api/patients/_search`) — @agent — Enable external patient management without Caddy routing collision.

## [0.27.23] — 2026-05-02
### Added
- Revenue export Excel builder with location scope and employee-type filter — @agent — TC015 protected reports routing requirement.
- Cash flow report backend aggregation — @agent — Financial reporting accuracy.

## [0.27.22] — 2026-04-28
### Fixed
- Permission system drift: `resolveEffectivePermissions` now shared between auth middleware and login route — @agent — Prevent middleware rejecting valid tokens (INC-20260506-01).

## [0.27.21] — 2026-04-25
### Added
- IP access control per company (`ip_access_settings` + `ip_access_entries`) — @agent — Clinic network security requirement.

## [0.27.20] — 2026-04-20
### Fixed
- Login rate limiter scoped by email+IP instead of IP-only — @agent — Prevent one employee locking out entire clinic (FM-20260420-01).

## [0.27.19] — 2026-04-18
### Added
- Telemetry ingestion system (`POST /api/telemetry/errors`, error management UI) — @agent — Operational visibility into frontend crashes.

## [0.27.18] — 2026-04-15
### Fixed
- Export nginx timeout raised to 300s — @agent — Prevent 504 on large revenue/payment exports (FM-20260415-01).

## [0.27.17] — 2026-04-12
### Added
- Monthly plan installment payment flow (`PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`) — @agent — Large treatment financing.

## [0.27.16] — 2026-04-10
### Fixed
- `partners` NOT NULL constraint rollback after customer create breakage — @agent — All INSERT paths must include new columns (FM-20260410-01).

## [0.27.15] — 2026-04-05
### Added
- Face embedding soft-delete (`deleted_at` on `customer_face_embeddings`) — @agent — Preserve audit history on re-registration (FM-20260405-01).

## [0.27.14] — 2026-03-25
### Changed
- Payment allocation pre-validation (`validateAllocationResidual`) — @agent — Reduce negative residual race conditions (FM-20260325-01).

## [0.27.13] — 2026-03-20
### Added
- i18n coverage test (`i18n-coverage.test.ts`) — @agent — Catch missing Vietnamese keys before merge (FM-20260228-01).

## [0.27.12] — 2026-03-15
### Removed
- Mock data fallback from production components — @agent — Prevent API failures from being masked (FM-20260310-01).

## [0.27.11] — 2026-03-10
### Added
- Root authority stack (`AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, `DECISIONS.md`) — @agent — Establish durable decision routing (ADR-0001).

## [0.27.10] — 2026-03-05
### Added
- Product-map governance (`product-map/domains/*.yaml`, `schema-map.md`, `dependency-rules.yaml`) — @agent — Domain ownership and blast radius tracking (ADR-0002).

## [0.27.0] — 2026-02-01
### Added
- Enterprise domain routes (`api/src/domains/appointments`, `partners`, `auth`) — @agent — Clean architecture for new features.

## [0.26.0] — 2026-01-15
### Added
- Face recognition service (Python/OpenCV YuNet+SFace) — @agent — Local check-in accelerator.

## [0.25.0] — 2025-12-20
### Added
- Payment allocation engine (`payment_allocations` table) — @agent — Split payments across multiple invoices.

## [0.24.0] — 2025-11-10
### Added
- Deposit wallet and receipt number generation — @agent — Prepayment tracking.

## [0.23.0] — 2025-10-01
### Added
- External checkups integration (Hosoonline proxy) — @agent — Health-checkup image sync.

## [0.22.0] — 2025-09-15
### Added
- Permission tier system (`permission_groups`, `group_permissions`, `partners.tier_id`) — @agent — Replace hard-coded role checks.

## [0.21.0] — 2025-08-01
### Added
- TDental CSV import scripts — @agent — Migrate legacy clinic data.

## [0.20.0] — 2025-07-01
### Added
- React 18 + Vite 5 frontend rewrite — @human — Modern SPA replacing legacy web app.

---
## [0.32.47] — 2026-05-25

### Fixed
- `permissions.js` LOB-aware query routing: migrated all 21 bare `query()` calls to `getQuery(req)` so Cosmetic permissions reads/writes route through the cosmetic database pool instead of the dental default. — @agent — fixes NK3 feedback bug #5 (staff permission save errors under Cosmetic LOB) and aligns with LOB v2 two-DB discipline (D13).
- Frontend test stability: added global `BusinessUnitContext` mock in `website/src/test/setup.ts` to prevent `useBusinessUnit must be used inside BusinessUnitProvider` errors in hooks/components that now depend on LOB context. — @agent — test infrastructure only, no runtime change.


## Unreleased

### Added
- Complete documentation stack (`docs/GLOSSARY.md`, `CONTRACTS.md`, `DATA-MODEL.md`, `USE-CASES.md`, `WORKFLOWS.md`, `INVARIANTS.md`, `DEPENDENCY-MAP.md`, `OWNERSHIP.md`, `TEST-MATRIX.md`, `ADR/`, `RUNBOOK.md`, `FAILURE-MODES.md`, `OBSERVABILITY.md`, `SECURITY.md`, `CHANGELOG.md`, `MIGRATIONS.md`, `ROADMAP.md`) — @agent — Anti-breakage and parallel-work safety.
- Doc-update verification script (`scripts/verify-docs.sh`) — @agent — Enforce AGENTS.md §16 pre-commit.

### Docs
- Tightened the SMS/Zalo appointment messaging research with Phase 0 readiness, provider-webhook security, authority-doc handoff, permission coverage, and branch-scope TestSprite checks — @agent — Address reviewer findings before any messaging implementation work starts.
- Researched the SMS/Zalo appointment messaging system and recorded the Vietnam-first provider, compliance, late-reminder, data-model, API, UI, and TestSprite coverage plan — @agent — Prepare Phase 5 appointment messaging roadmap work without shipping runtime behavior yet.
- Synchronized the documentation traceability spine, API/product-map coverage, migration-path authority, TestSprite ledger, and doc verification gates — @agent — Close the 2026-05-17 architecture/docs audit gap so feature work can trace use cases, workflows, contracts, data model, permissions, and tests before implementation.
- Hardened `scripts/sync-claude-mem.sh` to keep generated memory in `.claude/memory.md` and strip accidental generated-memory blocks from `AGENTS.md` — @agent — Preserve AGENTS.md §9 shared-memory boundary and prevent authority-doc pollution.
- Wired documentation governance into local pre-commit, root npm verification scripts, and PR checks; stricter `verify-docs` now requires contract/API, schema, and feature changes to update their specific authority-map artifacts — @agent — Make future feature work cross-check docs/product-map/TestSprite before it can land.
- Added a prompt-level authority gate via `scripts/prompt-authority-check.sh`, `npm run verify:prompt`, and `.claude/settings.json` `UserPromptSubmit` so each new prompt surfaces the authority docs/domains before implementation starts — @agent — Enforce AGENTS.md §1.2 and reduce prompt-by-prompt drift.
- Hardened the prompt-level authority gate to strip accidental generated-memory blocks from `AGENTS.md` before checking the authority stack — @agent — Keep every prompt gate usable even when local memory tooling appends context to the root authority file.
- Reconciled the active prompt-governance workset with `docs/CONTRACTS.md`, `product-map/contracts/api-index.md`, and `docs/TEST-MATRIX.md` so the full governance gate can evaluate payment-contract and frontend/report changes in one pass — @agent — Keep AGENTS.md §16 enforcement from depending on stale previously-applied docs.

### Fixed
- Aligned `contracts/payment.ts` method enum with actual backend/frontend support (`cash`, `bank_transfer`, `deposit`, `mixed`) — @agent — Remove `card`, `momo`, `vnpay`, `zalopay` placeholders until end-to-end wiring exists.

## [0.32.5] — 2026-05-16
### Fixed
- Deposit creation now correctly sets `payment_category = 'deposit'` when explicit `deposit_type` is provided — @agent — Staff feedback: advance receipts showing in payment list (BUG-003)
- Restored legacy flat revenue (`revenue-flat`) and deposit (`deposit-flat`) Excel exports removed in earlier refactor — @agent — Staff feedback: missing report download section (BUG-004) and previous report shape (BUG-002)

## [0.32.4] — 2026-05-16
### Fixed
- (intermediate build — handoff checkpoint)

## [0.32.3] — 2026-05-16
### Changed
- Auto-detected Errors tab on /feedback now shows structured error metadata (error type, message, occurrence count, source file, stack trace) — @agent — Richer error triage for ops team
- Backend `GET /api/Feedback/all?source=auto` now JOINs `error_events` to return full error metadata — @agent — Support frontend structured display
- Backend `GET /api/Feedback/all/:id` now JOINs `error_events` for detail view — @agent — Support modal stack trace display
- Feedback detail modal widened to max-w-3xl with dark code blocks for stack traces — @agent — Readable stack trace viewing

## [0.32.2] — 2026-05-16
### Fixed
- (intermediate build)

## [0.32.1] — 2026-05-16
### Fixed
- Payments export now includes cash, bank, deposit columns — @agent — Staff feedback: deposit report missing payment method breakdown
- Revenue employee export split "Phiếu khám" into Mã phiếu khám (so.code) and Số phiếu điều trị (so.name) — @agent — Staff feedback: column mixing exam code and service
- Calendar export modal presets now use the viewed date instead of always today — @agent — Staff feedback: export includes wrong dates when viewing non-current dates

## 0.32.0 — 2026-05-16
- TestSprite: Complete v2 automated test suite (23/23 tests passing)
- TestSprite: Parallel test runner with 5 workers, ~38s full suite
- TestSprite: MCP config fixed with correct API_KEY in ~/.claude.json
- TestSprite: Added TESTSPRITE_STATUS.md and TESTSPRITE_MCP_SETUP_GUIDE.md
