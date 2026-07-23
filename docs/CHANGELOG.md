# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## Format

```
## [x.y.z] — YYYY-MM-DD
### Category
- Change description — @author — reason/ref
```

Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Docs`.

---

## [0.32.58] — 2026-07-23

### Fixed
- Reject inactive or missing `CustomerSources` on new `SaleOrders`; make active-only selectors fail closed; omit unchanged inherited source values from unrelated service edits; and preserve only an explicitly assigned inactive source on the same historical order — @codex — INV-023 / INV-024 / FM-20260723-01.
- Count both `partners` and `saleorders` references in CustomerSources management, lock lookup rows through sale-order/source-management transactions, and block deletion while either table still uses the lookup — @codex — INV-024; prevents deleting or racing historical report attribution that has zero customer-level references.
- Add validated `ON DELETE RESTRICT` foreign keys from both `partners.sourceid` and `saleorders.sourceid` to `customersources.id`; live read-only preflight found zero existing orphans and the migration was proved twice on a disposable restore — @codex — INV-024 / migration 050.
- Applied the separately confirmed Q10 43-order production transaction and proved transaction `276262` wrote exactly 43 `saleorders`, one `customersources` row, 43 repair audit rows, and one metadata row; it wrote zero `partners` and zero `payments` — @codex — INV-023 / Q10 June source repair. A newly detected 44th workbook mismatch remains unmodified pending a fresh explicit confirmation.

### Testing
- Added API and frontend regression tests for transaction commit/rollback, inactive-source selection, fail-closed lookup errors, unchanged inherited-source omission, explicit source changes, same-order historical preservation, sale-order-aware deletion, foreign-key retention, numeric usage-count mapping, and exact immutable hashes/distributions for the executed 43-order repair artifacts — @codex — `dbTransaction.test.js`, `customerSourceIntegrity.test.js`, `customerSourceReferenceMigration.test.js`, `q10CustomerSourceRepairGuard.test.js`, `useSettings.customer-sources.test.tsx`, `useServices.payment-state.test.tsx`.

### Docs
- Updated customer-source contracts, data model, invariants, failure mode, use case/workflow traceability, product maps, dependency map, repair runbook, test matrix, and coordination status — @codex — INV-023 / INV-024 / FM-20260723-01.

## [0.32.57] — 2026-07-23

### Fixed
- Quarantined five historical customer-source rewrite migrations behind non-executable `.sql.retired` extensions and added a CI-required recursive migration-selection regression guard — @codex — INV-023 / FM-20260723-01; prevents another batch migration run from rewriting `partners.sourceid` and `saleorders.sourceid` and changing past revenue exports to `Sale Online`.
- Added confirmation-locked, transaction-scoped Q10 apply and rollback scripts with 43-order live-state assertions, persistent before/after audit rows, backup/workbook hashes, and zero customer/payment writes — @codex — INV-023 / Q10 June source repair.

### Docs
- Recorded the customer-source attribution incident, runnable migration count, rollback boundary, focused regression command, and exact confirmation-gated 43-order Q10 repair runbook — @codex — Snake group Q10 June report comparison and production read-only audit.

## [0.32.56] — 2026-07-08

### Fixed
- Admin could not add clients to the investor model — @agent-claude — `api/src/routes/partners/investorVisibility.js`'s `UUID_RE` was malformed (`8-4-4-12`, missing the 4th group), so `setInvestorVisibility` rejected EVERY real customer UUID with 400 `VALIDATION`; every checkbox tick on the Customers investor column silently failed. Regex corrected to the canonical `8-4-4-4-12` (matches `permissionService`). Introduced in `2bd2ac4bd` when the same-portal investor scope was restored.
- Investor visibility management was gated on `permissions.edit` — @agent-claude — the Customers page shows the investor checkbox to any admin group (`canManageInvestorVisibility`), but the routes required `permissions.edit`, which the Admin group does not hold, so admins got 403 from the API. Routes now rely on the handler's `assertAdmin` (admin / super-admin / system-admin / `*`) plus global `requireAuth`; the route-level `requirePermission('permissions.edit')` was removed so any admin can tick.
- `getConfiguredInvestor` threw 409 `MULTIPLE_INVESTOR_ACCOUNTS` when more than one active investor account existed (E2E/duplicate rows) — @agent-claude — the single-global-investor model now resolves deterministically to the in-use investor (most visible clients, then oldest) and never 409s, so a stray account cannot block the admin flow.
- Admin management and investor read used different `investor_clients` keys — @agent-claude — `resolveInvestorScope` (investor read) matches the union of the investor's partner id OR any active `investor_accounts.id`, but the admin list/untick matched only one key. A client added under a legacy key was invisible to the admin list and an untick silently missed it, leaving a "removed" client permanently visible to the investor. Admin list + untick now match the SAME union (`investor_id = ANY(scopeMatchIds)`); ticks write under the canonical key.

### Testing
- `api/tests/investorVisibilityCompatibility.test.js` extended (write-key selection for both keyings, `scopeMatchIds` union, deterministic multi-account resolution with no 409, 404 when unconfigured) and new `api/tests/investorVisibilityHandlers.test.js` (rejects malformed UUID with 400, ACCEPTS a real 8-4-4-4-12 UUID, untick clears via `ANY($1::uuid[])` union) — 8 tests. Verified end-to-end against the local demo DB (login → `GET` 200 → `PATCH` on/off 200 → DB row flips) and in a real headless-Chromium browser at `127.0.0.1:5175` (t@clinic.vn): 20 investor checkboxes rendered, tick ON → PATCH 200 + checkbox checked, tick OFF → PATCH 200 + unchecked, zero console errors.

## [0.32.55] — 2026-07-07

### Fixed
- Phantom "New version is ready" toast on every fresh page load — @agent-claude — `website/vite.config.ts`'s `getVersionInfo()` only ran `git rev-parse` (absent inside the Docker build context), so the bundle baked `__APP_GIT_COMMIT__ = "unknown"` while `scripts/generate-version.js` (which does read the `GIT_SHA` build arg) wrote the real SHA into `/version.json`; `hasUpdate()` compares commits, so every client permanently saw an update prompt. `vite.config.ts` now uses the same `GIT_SHA`/`GIT_COMMIT`/`GIT_BRANCH` env-var-first precedence as `generate-version.js`, and `hasUpdate()` in `useVersionCheck/versionUtils.ts` no longer treats an `unknown` commit on either side as an update (newer semver still wins).
- Guaranteed 403 `Permission denied: employees.view` console error for investor sessions — @agent-claude — `useEmployees` fired `GET /api/Employees` on every mount regardless of permission (Overview dashboard, appointment/service forms, customer assignments); the hook now checks `hasPermission('employees.view')` (exported as `PERMISSION_VIEW_EMPLOYEES`) and skips the fetch entirely when missing, composing with the existing `enabled` option. Observed live on nk prod as the only console error in an investor session (v0.32.54 verification, 2026-07-06).

### Testing
- New `useEmployees.permissions.test.ts` (4 tests: fetch with permission, skip without, no search fetch without, explicit `enabled=false` still honored) modeled on `useCustomers.permissions.test.ts`; 3 new `hasUpdate` unknown-commit cases in `useVersionCheck.test.ts`; `Overview.test.tsx` now mocks `AuthContext` like sibling page tests. Full website suite: 548 passed, 11 pre-existing failures unchanged from the v0.32.54 baseline (faceRecognition ×4, AuthenticatedCheckupImage ×2, customer-deep-link ×2, useCustomerFormActions ×1, AppointmentFormCore.customer-search ×1, Calendar.click ×1 — verified identical at HEAD before this change).

## [0.32.54] — 2026-07-06

### Security
- Discovered while auditing every report route for the same class of bug fixed in v0.32.53 (counted `resolveInvestorScope()` calls vs. route handlers per file). Found two routes that never applied the investor customer allowlist at all:
  - `api/src/routes/reports/revenueBreakdowns.js`'s `/revenue/by-source` handler never called `resolveInvestorScope()` — unlike its three sibling handlers (`by-doctor`, `by-category`, `payment-plans`) in the same file, which already scoped correctly. An investor hitting this route saw the clinic's full company-wide revenue-by-source breakdown.
  - `api/src/routes/dashboardReports.js`'s legacy `/GetSumary` endpoint (powers the Dashboard's totalBank/totalCash/totalOther/totalAmount KPI cards) validated branch scope via `resolveReportCompanyScope()` but never checked `resolveInvestorScope()` at all — investors saw the clinic's full unscoped cash totals on both the "today" and "yesterday" queries.
- Fix: both routes now call `resolveInvestorScope()` and, when `isInvestor` is true, add a `partnerid = ANY($n::uuid[])` condition (via `COALESCE(p.customer_id, so.partnerid)` for `by-source`'s two CTEs, `ap.partnerid` for the legacy dashboard summary), matching the convention used everywhere else. Non-investor callers are unaffected.
- Audited (not changed): `employeesOverview.js` and `cashFlow.js`'s static `/revenue/rules` route have no `resolveInvestorScope()` call — verified this is correct as-is: `employeesOverview.js` reports on staff/employee roster data (location-scoped, no customer identity involved), and `/revenue/rules` returns a static config array with no query at all.

### Testing
- Added investor-allowlist unit coverage for all 7 revenue/revenue-breakdown routes in `revenueRecognition.test.js` (previously zero investor test cases existed there) plus new coverage in `dashboardReports.test.js` for the legacy summary endpoint — including a regression test per file asserting non-investor staff never get the allowlist condition applied. 41 tests in the two touched suites, 158 across the full reports test surface, all passing.

## [0.32.53] — 2026-07-06

### Security
- Fixed `api/src/services/reports/canonicalRevenue.js`'s `buildWhere()` silently ignoring the `allowedCustomerIds` field that `dashboard.js`, `doctors.js`, and `locationsComparison.js` already passed for investor accounts — meaning an investor's "paid revenue" (Dashboard), 12-month revenue trend, per-doctor revenue (Doctors report), and per-branch revenue (Locations Comparison) all showed the clinic's full company-wide total instead of being restricted to that investor's assigned customers. Discovered via a live read-only verification of the NK2 Investor Demo account immediately after shipping v0.32.52 (the location-scope fix does not touch this code path — this is a separate, pre-existing gap).
- Fix: `buildWhere()` now applies `so.partnerid = ANY($n::uuid[])` when `allowedCustomerIds` is provided, matching the customer-scoping convention already used everywhere else in the report routes. Non-investor callers are unaffected (the field is only ever populated for investor accounts).

### Testing
- Added 5 unit tests in `canonicalRevenue.test.js` locking the investor allowlist filter across all 4 canonical-revenue functions, including combined branch+investor scoping param ordering.

## [0.32.52] — 2026-07-06

### Security
- Report routes (`dashboard`, `revenue`, `revenueBreakdowns`, `appointments`, `doctors`, `customers`, `employeesOverview`, `locationsComparison` under `api/src/routes/reports/`, plus `dashboardReports.js`) now call `resolveReportCompanyScope()` before running any query, rejecting requests for a `companyId` outside the caller's own location scope with `403 Location not allowed`. Previously these routes accepted a client-supplied `companyId` unchecked (only `cashFlow.js` validated it), so any authenticated employee with `reports.view` could request another branch's revenue, customer, or employee data regardless of their own assigned locations.
- `customers.js`'s total-customer-count, gender/city breakdowns, top-spenders, and outstanding-balance sub-queries previously had **no** location filtering at all (even ignoring a requested `companyId`) — now scoped to the caller's allowed branches via `dbo.partners.companyid`.
- `locationsComparison.js` and `employeesOverview.js`'s per-branch breakdowns now restrict the driving `dbo.companies` set to the caller's allowed branches instead of always comparing every branch in the clinic chain.
- Super Admin, Admin, and investor accounts are unaffected — `resolveReportCompanyScope()` returns unrestricted scope for them, preserving byte-identical query behavior to before this fix.
- Root cause note: discovered while auditing a report-export complaint from a Super Admin account (whose own access was already correct); the scoping gap affects non-admin staff on both NK and NK2, which share `tdental_demo`.
- `api/src/routes/reports/helpers.js`'s `dateCompanyFilter`, `revenueRecognition.js`'s `buildPairedRevenueFilters`/`buildPaymentRevenueFilter`, and `api/src/services/reports/canonicalRevenue.js`'s shared `buildWhere` now accept `companyId` as either a single UUID (unchanged `= $n` behavior) or an array (`= ANY($n::uuid[])`), backing the scope-aware filtering above.

### Testing
- Added `api/src/routes/reports/__tests__/helpers.test.js` (new) plus scope-enforcement test coverage across all 9 fixed route files and their existing/new test files: 403-on-out-of-scope, correct `ANY()` multi-location filtering, and unrestricted-admin no-op assertions. Extended `canonicalRevenue.test.js` for the array-form filter. Net +142 tests in the reports test surface, all passing; full API suite (872 tests) shows no regressions from this change (2 pre-existing, unrelated failures: a flaky external network test and a pre-existing `saleOrderLines` failure present on `main` before this branch).

## [0.32.51] — 2026-07-06

### Fixed
- Staff login (`POST /api/Auth/login`) now verifies the typed password against **every** active account sharing an email and logs into the one that matches, instead of only checking the first row returned by an unordered query. Fixes the case where employees sharing an email were locked out (only `rows[0]` could authenticate) and the non-deterministic behavior where the resolved account could silently change after DB maintenance. — @claude — `api/src/routes/auth.js` `findStaffLoginCandidates`/`matchingCandidates`/`resolveLoginCandidate`.

### Security
- Login fails closed (401) when two or more active accounts share both the same email and the same password (ambiguous), rather than guessing which account to grant. — @claude

### Testing
- `authSharedEmailLogin.test.js`: correct-account resolution in both directions, ambiguous same-password rejection, `last_login` attributed to the matched account, single-account and wrong-password paths, and staff-before-investor short-circuit. Full API suite 763/765 (2 pre-existing `saleOrderLines` failures unrelated). — @claude

## [0.32.50] — 2026-07-06

### Changed
- Employee revenue Excel export (`report-sales-employees`) now treats `companyId=all` as full extraction across branches for any account with `reports.export`; explicit branch IDs still return `403 EXPORT_LOCATION_DENIED` when outside the caller's resolved location scope, and investor customer allowlists still apply. — @codex — product correction for UC-019 / INV-009 after NK/NK2 live report extraction review.

### Testing
- Added focused `reportSalesEmployeesExport` regression coverage for no-location `companyId=all` extraction and retained explicit out-of-scope branch rejection. — @codex

## [0.32.49] — 2026-07-04

### Added
- Payment receipt-proof viewing and confirmation for NK/NK2: payment history proof column opens `PaymentProofModal` (proof image, QR description, confirmation status); `POST /Payments/:id/proof/confirm` gated by `payment.confirm`, idempotent, stamps confirming user + Asia/Ho_Chi_Minh timestamp; `GET /Payments/:id` returns the latest proof object. — @claude — surgical port of the payment chain from `feature/permission-domain-repair` (30ef2478b) onto main (4372048da), preserving shipped v0.32.48 investor scoping, timezone-safe date keys, and hardened export builders.
- Revenue report money-in KPI shows Confirmed (Đã xác nhận) vs Pending (Chờ xác nhận) breakdown driven by latest proof confirmation per payment (cash-flow LATERAL join + `KPICard` breakdown prop). — @claude
- Migrations `047_payment_proof_confirmation.sql`, `048_grant_payment_confirm_permission.sql`, `051_payment_proofs_payment_id_uuid.sql` committed for repo/DB parity; 047/051 already applied to prod `tdental_demo` in May, 048 (grants `payment.confirm` to Dentist + Super Admin) NOT yet run — migrations remain manual. — @claude

### Changed
- `PATCH /Payments/:id` now requires `payment.edit` instead of `payment.add`, completing the 0.32.0 permission split. Live grant check 2026-07-04: Assistant group holds `payment.add` but not `payment.edit`, so Assistant loses payment editing unless granted `payment.edit` (data-side, manual). `payment.confirm` currently granted to Editor only in prod. — @claude

### Testing
- Confirm-proof endpoint suite (auth 401, 404 payment/proof, 409 non-posted, idempotent re-confirm), route permission assertions (`payment.edit`, `payment.confirm`), `PaymentProofModal` permission gating tests, proof-migration idempotency tests. Full API sweep 567/569 (2 failures pre-existing on main in `saleOrderLines.test.js`), vitest 24/24, `tsc --noEmit` clean. — @claude

## [0.32.48] — 2026-07-04

### Fixed
- NK2 employee revenue Excel exports now treat explicit wildcard `*` permission as the only all-location override; Admin/Super Admin group names without `*` remain constrained to resolved employee locations, and out-of-scope branch requests return `403 EXPORT_LOCATION_DENIED` before export SQL. Merged from PR #57 (`fix/nk2-employee-export-scope-20260704`, originally labeled 0.32.45), which the same-day 0.32.47 full redeploy did not include. — @codex — preserves INV-009, INV-020, UC-019, and WF-005.

### Testing
- Added `reportSalesEmployeesExport` regression coverage for Super Admin-named scoped employees, out-of-scope branch rejection, and the wildcard all-location override. — @codex — NK2 live proof captured in `output/proof/location-report-scope-20260704/` outside the commit.

## [0.32.47] — 2026-07-04

### Fixed
- NK/NK2 investor Excel exports now apply the same admin-allowlisted customer scope as the normal portal for customer, service, appointment, payment, revenue, deposit, and employee-revenue exports. — @codex — preserves INV-021 same-portal investor scoping and closes the export leak found during live verification.

## [0.32.46] — 2026-07-04

### Added
- NK/NK2 investor access now uses the normal staff portal with admin-assigned visible customers, server-side `dbo.investor_clients` scoping across customer reads, appointments, payments, services, reports, and exports, plus admin customer-list visibility toggles. — @codex — preserves INV-008 and new INV-021 same-portal investor scoping.
- Investor migrations normalize the already-deployed NK/NK2 same-portal successor schema (`is_active`, `lob`, account-keyed visibility rows) instead of replacing it, so previous investor allowlists survive the hotfix. — @codex — preserves INV-021 and fixes the 2026-07-04 deploy conflict discovered on VPS.
- Investor group checks are case-insensitive, matching the live `Investor` permission group and preventing allowlist filters from silently skipping. — @codex — preserves INV-021 fail-closed investor scoping.
- Deployment continuity preflight now requires every NK/NK2/NK3 deploy candidate to contain the live target commit and list the product-facing feature manifest before build, with a worktree audit helper for stale/dirty sibling branches. — @codex — prevents FM-20260704-01 live feature erasure.

## [0.32.45] — 2026-07-03

### Fixed
- NK2 staff role inference now classifies migrated `Trợ lý bác sĩ` employees as `doctor-assistant` before the generic doctor role, so service and appointment `Trợ lý Bác sĩ` selectors can list rows that have both `isdoctor=true` and `isassistant=true`; restored the required `testbright.md` ledger for this verification path. — @codex — preserves Employees & HR role assignment behavior and Appointments/Services staff selector workflows.

## [0.32.44] — 2026-05-23

### Added
- Cosmetic LOB source workbook importer and audit runbook for the exact three tabs `Hồ sơ`, `Phiếu cọc`, and `Phiếu khám`; dry-runs, applies, and re-runs idempotency checks for cosmetic-only partners, branches, staff, products, treatments, payments, and allocations after backup/compare confirmation gates; bumps `website/package.json` to `0.32.38`. — @agent — preserves UC-COS-IMPORT-01 / WF-COS-IMPORT-01 and invariants INV-001, INV-003, INV-004, INV-010, INV-012.

### Fixed
- NK3 Cosmetic add-customer intake now generates collision-checked `TM######` customer codes for `/api/cosmetic/Partners`, keeps dental `T######` codes, honors explicit `apiFetch` LOB options, bypasses LOB rewriting for server-proxied `/api/Places/*`, and removes the browser-side `VITE_GOOGLE_PLACES_API_KEY` gate; bumps `website/package.json` to `0.32.44`. — @agent — preserves UC-001 customer create, INV-001, and the server-only Google Places key contract.

---

## [unreleased] — 2026-05-22
### Docs
- `docs/superpowers/specs/2026-05-22-ctv-signup-and-commission-config-design.md` — design spec for CTV signup (CTV-or-admin only, instant active, no public signup/approval queue), header "+ Client" / "+ CTV" actions on the built portal, admin CTVs sub-tab, and fully manual commission level config (enabled ≤ 100%, unallocated stays with clinic). No runtime code changed. — @agent — 2026-05-22 brainstormed design for the CTV/MLM commission layer on the cosmetic-LOB foundation.
- `ctv.2checkin.com/tbot` static Feature Board deploy documented in `testbright.md`; live route now serves `/Users/thuanle/Downloads/feature_kanban_2.html` from `/var/www/ctv.2checkin.com/tbot/` with browser backup plus shared file sync through `/tbot/state/board.json`, leaving shared `/var/www/tbot` and other vhosts untouched. — @agent — 2026-05-22 CTV-only static deploy proof.
- `ctv.2checkin.com/tbot` board content seeded with 36 Backlog feature cards from the linked 6-week TBot planning spreadsheet; no NK route or clinic data changed. — @agent — 2026-05-22 live board content import.
- `ctv.2checkin.com/tbot` header now shows live day counters for the July 3, 2026 six-week checkpoint and October 15, 2026 final checkpoint; deployed source snapshot added under `docs/live-artifacts/ctv-tbot/`. — @agent — 2026-05-22 deadline visibility for the shared TBot board.
- `ctv.2checkin.com/tbot/t2.html` now serves `/Users/thuanle/Downloads/kanban_calendar.html` as a CTV-only static Kanban Calendar page; deployed file checksum matches the source and a source snapshot is tracked under `docs/live-artifacts/ctv-tbot/t2.html`. — @agent — 2026-05-22 additive CTV-only calendar board deploy.
- `ctv.2checkin.com/tbot` header summary now uses the Kanban Calendar-style task counter from the provided screenshot: task/done counts, current date, 132-days-left Apr 1 → Oct 1 countdown, and progress bar. — @agent — 2026-05-22 CTV TBot header visibility update.
- `report.tjbot.vn` now has its own static TBot report project on VPS `76.13.16.68`: root `/` serves the moved Feature Board, `/t2.html` serves the moved Kanban Calendar, `/state/board.json` preserves the 41-card shared state, HTTPS is issued for the domain, and old `ctv.2checkin.com/tbot` paths redirect to the new report domain. — @agent — 2026-05-23 TBot reports moved off the CTV domain.
- `testbright.md` — appended NK3 Cosmetic LOB feedback triage with live screenshot evidence, pending manual feedback IDs, related auto-detected API error clusters, and TestSprite follow-up checks. No runtime code changed. — @agent — 2026-05-22 preserves cosmetic LOB feedback scope for follow-up fixes.

## [0.32.37] — 2026-05-21
### Added
- **FeedbackWidget login hint:** small dismissible bubble next to the speech-bubble icon in the header that prompts "Có vấn đề? Nhấn vào đây để báo cho chúng tôi — mọi phản hồi đều được đọc." (EN: "Any problem? Tap here to report it — we read every one."). Shows once per fresh login session — `AuthContext.login` clears `sessionStorage['tg_feedback_hint_dismissed']`, the X button on the bubble sets it. New i18n keys: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI). — @agent — 2026-05-21 surfaces the feedback channel to staff on every login.

### Fixed
- **`Xu hướng dòng tiền` cash flow chart no longer truncates dates.** `BarChart` (`website/src/components/reports/BarChart.tsx`) gains a `labelOrientation: 'auto' | 'horizontal' | 'vertical'` prop. `'auto'` (default) rotates labels -90° when there are >= 8 bars so per-column width is no longer the constraint. `ReportsRevenue.tsx` passes `labelOrientation="vertical"` explicitly to the cash-flow chart since daily dates with month suffix are always long. The same auto-rotation applies to every other `BarChart` consumer (weekly trend, monthly summary) without per-call changes. — @agent — 2026-05-21 fixes the "4..." / "2..." mid-character truncation on /reports/revenue.

## [0.32.36] — 2026-05-21
### Added
- **apiFetch LOB-aware routing (Gap B):** `website/src/lib/api/core.ts` now rewrites endpoint paths from `/api/*` to `/api/cosmetic/*` when VITE_COSMETIC_LOB_ENABLED flag is true and current LOB (via localStorage tgclinic_lob) is 'cosmetic'. Whitelisted routes (/Auth/*, /me/*, /version/*, /ctv/*) bypass rewriting regardless of LOB. Added vitest coverage: `website/src/lib/api/__tests__/apiFetch.lob.test.ts` (4 assertions: dental LOB routing, cosmetic LOB routing, whitelist bypass, missing LOB fallback). Feature locked behind optional feature flag (defaults false in .env); zero impact on existing dental-only deployments. — @phase-1-executor — 2026-05-21 closes cosmetic LOB v2 Gap B.
- Feedback Lark alerts for the `T-Group` custom bot: `POST /api/Feedback` and public `POST /api/telemetry/errors` now queue non-blocking backend-only Lark text alerts after manual or auto-detected feedback threads commit. Added `api/src/services/larkNotifier.js`, `api/src/routes/publicTelemetryErrors.js`, env documentation for `LARK_FEEDBACK_WEBHOOK_URL` / optional `LARK_FEEDBACK_WEBHOOK_SECRET` / `TGROUP_PUBLIC_URL`, Docker env passthrough, Jest coverage, product-map updates, `testbright.md`, and website release metadata for `0.32.36`. — @agent — 2026-05-21 preserves UC-016/UC-020 and WF-011 by alerting without coupling feedback persistence to external delivery.

### Changed
- Archived agent audit reports under `docs/audits/<date>-<topic>/`: 2026-05-19 cosmetic-LOB v2 finishing-swarm pack (brutal audit #2, cross-LOB badge, docs-sync, overall-status) and the 2026-05-16 NK2 deeplink proof report. Added `docs/audits/README.md` as the index. Added `.gitignore` entries for `output/playwright/`, `reports/feedback-extract/`, `reports/responsive-qa/`, and `reports/calendar-five-digit-proof-2026-04-29/` so future Playwright runs do not dirty the working tree (already-tracked files in those paths remain tracked). — @agent — 2026-05-21 working-tree cleanup before starting the cosmetic LOB UI build.

### Tests
- `api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` — 40-assertion Jest cross-check that walks each `product-map/features/exports/*.yaml` and compares its declared column list (key + header, order-sensitive) against the COLUMNS arrays parsed from the corresponding builder source. Additive test only; does not touch any export builder source. — @agent — 2026-05-21 carries the YAML/code contract lock onto `fix/feedback-reports`.

## [0.32.35] — 2026-05-21
### Fixed
- `PUT /api/Appointments/:id` companyId persistence now ships on `fix/feedback-reports`: handler accepts `companyId`/`companyid`, validates as UUID, checks FK against `companies`, persists `appointments.companyid`, and the unified appointment form mapper sends `companyid` + `companyname` from the selected location. Added Jest coverage in `api/src/routes/appointments/__tests__/mutationHandlers.test.js` (valid UUID, missing FK 404, malformed UUID 400) and a Vitest case in `appointmentForm.mapper.test.ts` asserting payload passes `AppointmentUpdateSchema`. Version bumped to `0.32.35` + entry in `website/public/CHANGELOG.json`. — @agent — 2026-05-21 carries the 2026-05-19 NK feedback fix onto this branch with explicit tests.

### Docs
- Cement cosmetic LOB v2 authority sync on `fix/feedback-reports`: AGENTS / DECISIONS / COORDINATION_REQUESTS get the LOB discipline + two-DB + partners-as-identity rules; `docs/CONTRACTS.md`, `DATA-MODEL.md`, `MIGRATIONS.md`, `RUNBOOK.md`, `SECURITY.md` get migration-047 / `getDb(lob)` / `getQuery(req)` / `COSMETIC_LOB_ENABLED` / `/api/cosmetic` + `/api/ctv` subsections; `product-map/contracts/{api-index,dependency-rules,permission-registry}` get LOB endpoints, `lob.*` permissions, and dep-cruise rules; `product-map/domains/appointments-calendar.yaml` records `companyId` on appointment update; `product-map/schema-map.md` gets the partners (lob_scope/is_ctv/referred_by_ctv_id) + earnings table diagram; split cosmetic domains added as `product-map/domains/{business-unit,cosmetic,cosmetic-clients,ctv,earnings-commissions}.yaml` plus `product-map/governance-delta-cosmetic-lob-v2.md`. Source-of-truth alignment only — no application code touched, no Excel export builders changed. — @agent — 2026-05-21 pre-build cementing so the cosmetic LOB UI work on this branch shares the same product-map as the nk3-deploy / Codex line.
- `testbright.md` — appended NK 2Checkin login monitor TestSprite entry (read-only auth health check, 3 non-destructive screens). — @agent — 2026-05-21.

---

## [unreleased] — 2026-05-20
### Added
- `product-map/features/exports/` — canonical feature catalog for all 8 Excel exports (appointments, customers, payments, services, service-catalog, report-sales-employees, revenue-flat, deposit-flat). Each YAML specifies columns (position, key, header_vi, style, width, source), API routes, UI entry points, permission gates, code references, and acceptance filters. Jest cross-check test (`featureCatalog.crosscheck.test.js`) validates YAML column definitions match builder code COLUMNS arrays (keys and headers, order-sensitive). — @agent — 2026-05-20 Contract-First Monorepo pattern; single source of truth for Excel export column contracts.

### Fixed
- Commit the 7 working-tree-only export fixes (paymentNote/depositNote columns, SQL aliases, mapper wiring, COALESCE customer source) that had been bypassing git across 5 fix cycles. NK2 deployed code byte-identical to working tree confirms no behavioral change to NK2. NK production will gain the Note columns on next deploy. — @agent — 2026-05-20 root cause of recurring Excel export regression; persists fix to git so fresh checkouts no longer lose Note columns.

### Added
- `api/src/services/exports/__tests__/legacyFlatReportColumns.lock.test.js` — locked source-of-truth guard for REVENUE_COLUMNS and DEPOSIT_COLUMNS. Asserts column count, key+header snapshot (order-sensitive), uniqueness, and presence of every column key in the row mapper. Future column add/remove must intentionally edit two test arrays + the data file + SQL + mapper; silent drops cannot pass review. — @agent — 2026-05-20 anti-regression structural fix.

### Added (2026-05-20 — Defense in depth)
- `scripts/require-clean-tree.sh` and `scripts/deploy-build-args.sh` — refuse to build/deploy from a working tree with uncommitted changes (Layer 1 prevention). Set `ALLOW_DIRTY_BUILD=1` to override in emergencies. — @agent — 2026-05-20 5-cycle Excel export regression root cause prevention.
- `Dockerfile.web` accepts `GIT_SHA` / `GIT_BRANCH` build args; `website/scripts/generate-version.js` prefers these env vars before falling back to `git rev-parse` (which isn't available inside the build container). `/version.json` now reports the real commit deployed instead of `"unknown"`. — @agent — 2026-05-20 Layer 2 deploy parity.
- `api/src/services/exports/__tests__/allBuilderColumns.lock.test.js` (24 assertions) — locks COLUMNS arrays in appointments / customers / payments / services / serviceCatalog / reportSalesEmployees exports. Same pattern as `legacyFlatReportColumns.lock.test.js` but file-text based since these builders don't `module.exports` their column constants. — @agent — 2026-05-20 Layer 4 extension.


## [unreleased] — 2026-05-19
### Fixed
- `revenue-flat` and `deposit-flat` Excel exports now include payment/deposit notes, use sale-order customer source before customer fallback for revenue rows, and split deposit cash vs bank-transfer values from explicit split columns or payment-method fallback — @Worker A — 2026-05-19 live feedback export defects; preserves UC-013/WF-005 report export contracts.
- Calendar appointment export now serializes the same `appointments.date` clinic-calendar value used by `/calendar` before falling back to legacy `datetimeappointment`, and appointment export search now matches customer phone numbers so phone `922403152` day exports do not use stale appointment dates or unfiltered rows — @Worker B — 2026-05-19 live feedback calendar export date correctness.
- `PUT /api/Appointments/:id` now accepts `companyId`/`companyid`, validates the company FK, persists `appointments.companyid`, and returns the refreshed clinic/location so appointment edit saves no longer drop changed cơ sở values — @agent — 2026-05-19 live feedback appointment location persistence; preserves Appointments & Calendar edit contract.

### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. Parked on `fix/feedback-reports` so they exist on a tracked branch ahead of starting the cosmetic LOB feature work — @agent — Pre-implementation design capture.
- Documentation & Authority Sync (Governance Delta close-out): Created the 4 missing split product-map domains in main (business-unit.yaml, cosmetic-clients.yaml, ctv.yaml, earnings-commissions.yaml); corrected all 5 + cosmetic.yaml + schema-map.md + governance-delta + permission-registry for final implemented shape (partners as canonical identity/auth table with lob_scope/is_ctv/referred_by_ctv_id in BOTH tdental_demo + tcosmetic_demo per migration 047; earnings table not commissions for D13 transactional attribution; two-DB dual-pool getDb/getQuery topology; D13 recipient_partner_id). Updated AGENTS.md (new LOB discipline subsection + must-read list), governance-delta, and CHANGELOG. All authority files (DATA-MODEL, DECISIONS, CONTRACTS, MIGRATIONS, TEST-MATRIX, SECURITY, RUNBOOK etc.) aligned to reality vs early v2 spec deviations. Swarm progress updated. Produced AGENT_FINISH_DOCS_SYNC.md with before/after. — @Documentation & Authority Sync Agent — v2 spec §262-282 + AGENT_COSMETIC drift closure.

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
