# TGroup Clinic — Changelog

> Append-only. What changed, when, by whom (human or agent), why. Semver.

## [unreleased] — 2026-05-22 (feat/ctv-mlm-commission)
### Fixed
- NK3/CTV Cosmetic LOB employee add/edit modal leaked dental branches because EmployeeForm and EmployeeProfile loaded `/api/Companies` without the active LOB. They now load branches with `lob=currentLOB`, and employee create/update sends the same LOB so Cosmetic uses `/api/cosmetic/Companies` and `/api/cosmetic/Employees`. Added form and API-client regression tests. — @agent — 2026-05-22 (0.32.40, preserves Cosmetic LOB v2 D5/D6 data isolation).
- Commission Config % inputs (global default + per-level share) were unusable: parse-and-clamp on every keystroke dropped the decimal point (typing `14.5` reverted to `14`) and clearing the field snapped to `0`. Now backed by a raw-text draft per input — type freely incl. decimals, parsed into the model on change, clamped to 0–100 on blur. — @agent — 2026-05-22 (0.32.39).
- NK3 browser login returned 500 "internal error": `https://ctv.2checkin.com` was missing from the API CORS allowlist (`api/src/server.js`). Added it (+ www). curl checks had passed because they send no Origin header. — @agent — 2026-05-22.
### Added
- **MLM commission config + CTV signup.** Migration `049_add_commission_level_config.sql` (additive, both DBs, guarded schema_migrations insert): `commission_level_config` (per-level enabled + share_percent, seeded L0–L4 = 72.7/14.5/7.3/3.6/1.8), `commission_settings` (singleton `default_referral_percent`), and `earnings.level`. — @agent — 2026-05-22.
- `commissionEngine.js` rewritten: for `source='ctv'` it walks the `referred_by_ctv_id` upline (≤5 levels) and splits the per-line commission pool by configured level shares; disabled levels / missing upline are not paid (remainder stays with the clinic, no redistribution). `consultation`/`salestaff` keep a single full-pool row at level 0. 9 jest cases (split + salestaff + refund). — @agent — 2026-05-22.
- New endpoints: `POST /api/ctv` (create CTV — CTV-or-admin only, instant active, `employee=true` so login works, `lob_scope` bound as text[], dental row always + cosmetic mirror if scoped), `POST /api/ctv/clients` (refer a customer into one LOB), `GET/PATCH /api/Ctvs` (admin list/suspend), `GET/PUT /api/CommissionConfig` (admin level split; PUT validates enabled sum ≤ 100 → `B_LEVEL_SUM_EXCEEDS_100`). — @agent — 2026-05-22.
### Changed
- `CtvDashboard.tsx` — header gains two pills under the title: **+ Client** (refer customer) and **+ CTV** (recruit), each opening a bottom-sheet wired to `referClient`/`createCtv`. Bottom nav unchanged (4 tabs). — @agent — 2026-05-22.
- `Commission.tsx` — placeholder replaced with admin **Config** (editable level table + global default %, live ≤100% validation, surfaced save error) and **CTVs** (list + suspend + Add CTV) sub-tabs; new `website/src/lib/api/commission.ts`. — @agent — 2026-05-22.
### Security
- Registered `ctv.manage` + `commission.config.manage` in `permission-registry.yaml`. CTV creation is closed (no public signup): self-recruit gated by the `is_ctv` flag, admin by wildcard `*`. — @agent — 2026-05-22.

## [unreleased] — 2026-05-21 (feat/cosmetic-lob-nk3-phase2)
### Added
- **Phase-2 Task-1 — Admin Permission Seeding:** `api/migrations/048_grant_lob_permissions_to_admin.sql` auto-grants cosmetic.access, dental.access, and lob.crossview to Admin group (UUID 11111111-0000-0000-0000-000000000001). Migration is idempotent (ON CONFLICT DO NOTHING) and applies to both tdental_demo and tcosmetic_demo, enabling multi-scope admins to access /api/dental/* and /api/cosmetic/* routes without manual PermissionBoard steps. Paired Jest test `api/src/__tests__/adminLobPermissions.test.js` (9 assertions) verifies migration file structure, naming, permission keys, idempotency, UUID, and rollback notes. — @agent — Phase-2 critical path Task 1, per spec D5.
- **Phase-2 Task-2 — Cosmetic Transactional Seed:** `api/scripts/seed-cosmetic-lob-transactional.js` populates tcosmetic_demo with real money-flow data: 2-3 customers with referred_by_ctv_id set (D13 CTV attribution path), 3-5 appointments (mix past/today/future), 3-5 payments, earnings rows with source='ctv', and refund reversals (negative amounts for append-only ledger validation). Validates CTV referrer existence (ctv-demo@clinic.vn), gracefully handles optional consultations table, uses ON CONFLICT DO NOTHING idempotency, and supports --dry-run mode for syntax validation. Exports seedCosmeticTransactionalData function. Paired Jest test `api/src/__tests__/cosmeticTransactionalSeed.test.js` (15 assertions) verifies script structure, INSERT statements, source='ctv' attribution, refund logic, CTV validation, and --dry-run support. — @agent — Phase-2 critical path Task 2 ("Make CTV real"), per spec D12, D13, D16.

### Tests
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

## [0.32.37] — 2026-05-21
### Added
- **FeedbackWidget login hint:** small dismissible bubble next to the speech-bubble icon in the header that prompts "Có vấn đề? Nhấn vào đây để báo cho chúng tôi — mọi phản hồi đều được đọc." (EN: "Any problem? Tap here to report it — we read every one."). Shows once per fresh login session — `AuthContext.login` clears `sessionStorage['tg_feedback_hint_dismissed']`, the X button on the bubble sets it. New i18n keys: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI). — @agent — 2026-05-21 surfaces the feedback channel to staff on every login.

### Fixed
- **`Xu hướng dòng tiền` cash flow chart no longer truncates dates.** `BarChart` (`website/src/components/reports/BarChart.tsx`) gains a `labelOrientation: 'auto' | 'horizontal' | 'vertical'` prop. `'auto'` (default) rotates labels -90° when there are >= 8 bars so per-column width is no longer the constraint. `ReportsRevenue.tsx` passes `labelOrientation="vertical"` explicitly to the cash-flow chart since daily dates with month suffix are always long. The same auto-rotation applies to every other `BarChart` consumer (weekly trend, monthly summary) without per-call changes. — @agent — 2026-05-21 fixes the "4..." / "2..." mid-character truncation on /reports/revenue.

## [0.32.36] — 2026-05-21
### Added
- Frontend foundation for Cosmetic LOB v2 (Phase 0/1 per PLAN): full `BusinessUnitContext.tsx` (TDD, stable memoized, auth-event synced mirroring LocationContext), `FilterByBusinessUnit` toggle component (placed left of location filter in header, renders for isMultiLOBUser), wired `BusinessUnitProvider` + keyed remount (`key={currentLOB}` around Outlet in Layout) in App/Layout, LOB-aware `apiFetch(..., { lob })` support in core.ts for future /cosmetic/* routes. Toggle is now renderable (visible for admins with lob_scope >=2). — Frontend Foundation Agent — Follows website/agents.md + v2 spec + visual companion.

### Docs
- Added cosmetic line-of-business design specs (v1, v2, visual companion) and SMS messaging system research under `docs/superpowers/specs/`. These design documents are now present on the `feat/cosmetic-line-of-business` worktree (cherry-picked from the parking branch) to guide implementation of the new Cosmetic LOB feature — @agent — Pre-implementation design capture for feat/cosmetic-line-of-business.


## [unreleased] — 2026-05-21
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
