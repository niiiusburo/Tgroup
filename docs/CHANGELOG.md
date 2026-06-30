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

## [0.32.56] — 2026-06-30
### Security
- **NK2 reports and Excel extraction now enforce backend scope for investors and location-scoped staff:** `/api/Reports` endpoints and operational Excel builders resolve allowed company IDs from the employee primary branch plus `employee_location_scope`; empty/all `companyId` is limited to allowed branches for scoped employees, unauthorized explicit branch requests fail with 403, and the Reports location picker locks single-location employees to their assigned branch. Investor report aggregates and customer-linked workbook rows compose branch/date filters with `dbo.investor_clients`, and locations comparison no longer exposes employee counts to investors. — @agent — Preserves INV-021 / INV-023 / UC-013 / UC-019 / WF-005.

### Tested
- `cd api && npx jest --runTestsByPath src/routes/reports/__tests__/locationScope.test.js src/services/exports/__tests__/legacyFlatReportsExport.test.js --runInBand` passed 2 suites / 13 tests; `cd api && npx jest --runTestsByPath src/routes/reports/__tests__/locationScope.test.js src/routes/reports/__tests__/cashFlow.test.js src/routes/reports/__tests__/revenueRecognition.test.js src/routes/reports/__tests__/servicesBreakdown.test.js src/services/reports/__tests__/canonicalRevenue.test.js src/services/exports/__tests__/reportSalesEmployeesExport.test.js src/services/exports/__tests__/legacyFlatReportsExport.test.js --runInBand` passed 7 suites / 52 tests; `npm --prefix website test -- src/pages/reports/__tests__/ReportsLocationScope.test.tsx src/pages/reports/__tests__/ReportsDashboard.test.tsx src/pages/reports/__tests__/ReportsSubpages.test.tsx src/hooks/__tests__/useReportData.test.ts` passed 4 files / 37 tests; `npm --prefix website run build` passed and generated `version.json` for `0.32.56`; production-file Semgrep over changed report/export runtime files found 0 findings. — @agent

## [0.32.55] — 2026-06-30
### Changed
- **NK2 customer profiles now show Face ID readiness:** `GET /api/face/status/:partnerId` returns a versioned readiness score, target sample count, stored-quality input when available, and recommended action. Customer profile headers display the percentage and sample coverage next to the Face ID badge, while CompreFace mode scores readiness from provider sample coverage instead of mixing in old local embeddings. The visible recognizer version is now `v0.32.55` / `face-recognition-0.32.55`; existing face samples are unchanged. — @agent — UC-003 / Face ID enrollment readiness.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest tests/faceRecognition.test.js src/services/__tests__/faceReadinessScore.test.js src/services/__tests__/faceMatchEngine.test.js src/services/__tests__/comprefaceFaceProvider.test.js --runInBand` passed 4 suites / 93 tests; `cd website && npx vitest run src/lib/api/__tests__/faceRecognition.test.ts src/hooks/__tests__/useFaceRecognition.test.ts src/hooks/__tests__/useCustomerProfile.date-normalization.test.tsx src/components/customer/CustomerProfile.test.tsx src/components/shared/GlobalFaceIdButton.test.tsx src/components/shared/FaceCaptureModal.test.tsx` passed 6 files / 75 tests; `npm --prefix website run build` passed; `npm --prefix website run lint` passed with warnings only; scoped Semgrep over changed Face ID backend files found 0 findings; `npm run verify:governance` passed. — @agent

## [0.32.54] — 2026-06-30
### Changed
- **NK2 Face ID no-match rescue now requires guided angles:** The staff header no-match popover no longer registers the failed one-shot scan directly. After staff selects a customer, Face ID opens the guided profile capture and requires straight, left, and right samples before saving examples with `source=no_match_rescue`; the visible recognizer version is now `v0.32.54` / `face-recognition-0.32.54`. Explicit profile re-register remains the only path that replaces active samples. — @agent — UC-003 / WF-007 multi-angle enrollment.

### Tested
- `cd website && npx vitest run src/components/shared/GlobalFaceIdButton.test.tsx src/components/shared/FaceCaptureModal.test.tsx src/hooks/__tests__/useFaceRecognition.test.ts src/lib/api/__tests__/faceRecognition.test.ts` passed 4 files / 62 tests; `cd api && JWT_SECRET=test-secret npx jest tests/faceRecognition.test.js src/services/__tests__/faceMatchEngine.test.js src/services/__tests__/comprefaceFaceProvider.test.js src/services/__tests__/faceDiagnostics.test.js --runInBand` passed 4 suites / 91 tests; `npm --prefix website run build` passed; `npm --prefix website run lint` passed with warnings only; scoped Semgrep over changed Face ID runtime files found 0 findings; `npm run verify:governance` passed; live NK2 proof returned `0.32.54` / `6c06dcb`, healthy API with `checks.faceService: true` and `faceProvider: compreface`, and live Playwright proof captured the header version, orange camera banner version, no-match guided hint, straight/left/right guided steps, plus 3 intercepted no-write register calls. — @agent

## [0.32.53] — 2026-06-29
### Changed
- **NK2 Face ID camera banner and stricter recognition policy:** The staff Face ID camera popup now shows `v0.32.53` in the orange header, `POST /api/face/recognize` returns `recognitionVersion: "face-recognition-0.32.53"`, staff header candidate-only results are rescan-only with no candidate identity buttons, and default recognition policy is stricter at auto-match `0.92`, candidate `0.84`, margin `0.05`. Existing face samples are unchanged. — @agent — UC-007 / WF-007 stricter Face ID decisioning.

### Tested
- Face ID local verification passed: `cd website && npx vitest run src/components/shared/FaceCaptureModal.test.tsx src/components/shared/GlobalFaceIdButton.test.tsx src/hooks/__tests__/useFaceRecognition.test.ts src/lib/api/__tests__/faceRecognition.test.ts` passed 4 files / 62 tests; `cd api && JWT_SECRET=test-secret npx jest tests/faceRecognition.test.js src/services/__tests__/faceMatchEngine.test.js src/services/__tests__/comprefaceFaceProvider.test.js src/services/__tests__/faceDiagnostics.test.js --runInBand` passed 4 suites / 91 tests; `cd api && JWT_SECRET=test-secret npx jest tests/envExampleValidation.test.js tests/dockerComposeValidation.test.js --runInBand` passed 2 suites / 28 tests; `npm --prefix website run build`, `npm --prefix website run lint`, scoped Semgrep, and `npm run verify:governance` passed; local Playwright proof captured the orange-banner `v0.32.53` and rescan-only ambiguous state with no hidden-candidate name leak. Live NK2 proof follows deploy. — @agent

## [0.32.52] — 2026-06-29
### Security
- **Investor staff-shell data filters now cover payment legacy fallback and cash-flow branch filters:** `GET /api/Payments?customerId=...` skips the legacy `accountpayments` fallback unless the requested customer is in the investor's `dbo.investor_clients` allowlist, and `/api/Reports/cash-flow/summary` lets investors use branch filters while still applying the checked-customer allowlist. — @agent — preserves INV-021 / UC-022.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest src/routes/appointments/__tests__/readHandlers.test.js tests/paymentsLegacyFallback.test.js src/routes/reports/__tests__/cashFlow.test.js --runInBand --no-coverage` passed 3 suites / 17 tests for the investor calendar all-location list, forbidden legacy-payment fallback, and investor cash-flow branch filtering; `cd api && JWT_SECRET=test-secret npx jest src/services/__tests__/permissionService.test.js tests/investorIdorScoping.test.js tests/investorScopeRoutePermissions.test.js tests/investorAdminMutationGuards.test.js tests/authInvestorLogin.test.js src/routes/partners/__tests__/investorVisibility.test.js --runInBand --no-coverage` passed 6 suites / 56 tests; production-file Semgrep over `api/src/routes/payments/readHandlers.js api/src/routes/reports/helpers.js` found 0 findings; `npm run verify:governance` and `npm --prefix website run build` passed. — @agent

## [0.32.51] — 2026-06-29
### Changed
- **NK2 Face ID now exposes its recognizer version and uses a lighter privacy preview:** The header Face ID control shows `v0.32.51`, `POST /api/face/recognize` returns `recognitionVersion: "face-recognition-0.32.51"`, and public/staff camera previews use a light 3px overlay blur while face detection and JPEG capture still read the raw video element. Existing samples are unchanged. — @agent — preserves the Face ID diagnostics/privacy invariant while making the recognizer version visible.

### Tested
- `cd website && npx vitest run src/pages/CheckIn/CheckIn.test.tsx src/components/shared/FaceCaptureModal.test.tsx src/components/shared/faceCaptureEngine.test.ts src/components/shared/GlobalFaceIdButton.test.tsx src/hooks/__tests__/useFaceRecognition.test.ts src/lib/api/__tests__/faceRecognition.test.ts` passed 6 files / 71 tests; `cd api && JWT_SECRET=test-secret npx jest tests/faceRecognition.test.js --runInBand` passed 1 suite / 36 tests; `npm --prefix website run build` passed; `npm --prefix website run lint` passed with existing warnings only; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/faceRecognition.js website/src/components/shared/FaceCaptureModal.tsx website/src/pages/CheckIn/CheckIn.tsx website/src/components/shared/faceCaptureEngine.ts website/src/components/shared/useFaceCaptureController.ts website/src/components/shared/GlobalFaceIdButton.tsx website/src/hooks/useFaceRecognition.ts website/src/lib/api/partners.ts` found 0 findings; `npm run verify:governance` passed; local Playwright proof captured `v0.32.51` staff header and `/checkin` `backdrop-blur-[3px]` with unblurred video; live NK2 proof returned `0.32.51` / `ae5bda0`, healthy API with `faceProvider: compreface`, and live staff/public DOM proof showed `backdrop-blur-[3px]` with `videoHasBlur: false`. — @agent

## [0.32.49] — 2026-06-29
### Fixed
- **Investor calendar no longer auto-filters to the home clinic:** `resolveEffectivePermissions()` now returns empty auth `locations` for the `investor` group while preserving the explicit staff-shell permissions and customer allowlist guards. This keeps `/calendar` on all locations so allowlisted appointments populate instead of disappearing behind the investor employee's primary branch. — @agent — preserves INV-021 and CON-Auth-login.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest src/services/__tests__/permissionService.test.js tests/investorIdorScoping.test.js tests/investorScopeRoutePermissions.test.js --runInBand`; `cd api && JWT_SECRET=test-secret npx jest tests/authInvestorLogin.test.js tests/readRoutePermissions.test.js tests/investorAdminMutationGuards.test.js src/routes/partners/__tests__/investorVisibility.test.js --runInBand`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/services/permissionService.js api/src/services/__tests__/permissionService.test.js`; `npm run verify:governance`. Live NK2 v0.32.49 / `a834e73` health passed; authenticated investor `/api/Auth/me` returned group `investor`, no wildcard, and `locations: []`; `/calendar` loaded 119 June 29 appointments with screenshot proof in `output/playwright/nk2-investor-calendar-20260629/calendar-populated-v0.32.49.png`. — @agent
## [0.32.48] — 2026-06-27
### Changed
- **Investor now uses the staff shell with scoped customer data:** The `investor` group resolves to explicit staff-style permissions so `/`, `/calendar`, `/customers`, `/payment`, `/reports`, settings/admin views, and normal customer controls are visible without granting wildcard `*`. Customer-linked reads/writes, Face ID recognition/status, appointments, payments, and reports remain scoped to checked customers in `dbo.investor_clients`. — @agent — explicit product decision updating INV-021 / UC-022.

### Security
- Investor callers are blocked from permission-group and employee role mutations even when the staff shell exposes those controls, and the investor visibility checkbox/API still require Admin-class state that explicitly excludes the `investor` group. Investor-created customers are auto-added to that investor's allowlist. — @agent — preserves INV-021 and INV-022.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest src/services/__tests__/permissionService.test.js tests/investorAccountsMigration.test.js tests/investorIdorScoping.test.js tests/investorAdminMutationGuards.test.js src/routes/partners/__tests__/investorVisibility.test.js tests/readRoutePermissions.test.js tests/investorScopeRoutePermissions.test.js tests/faceRecognition.test.js --runInBand`; `cd website && npx vitest run src/__tests__/App.route-permissions.test.tsx src/pages/Customers/CustomerColumns.test.tsx src/hooks/__tests__/useInvestorVisibilityColumn.test.tsx`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/services/permissionService.js api/src/routes/partners/mutationHandlers.js api/src/routes/partners/investorVisibility.js api/src/routes/permissions.js api/src/routes/employees/mutations.js api/src/routes/faceRecognition.js api/migrations/048_investor_customer_scope.sql website/src/pages/Customers.tsx`; `npm run verify:governance`; live NK2 v0.32.48 health/login/scoped Partners/staff-route Playwright checks passed; NK production v0.32.44 health and investor-login rejection stayed unchanged. — @agent

## [0.32.47] — 2026-06-27
### Added
- **Admin-only investor customer checkbox:** Admin-class users now see an Investor checkbox in the `/customers` search/list table. Checking it adds the customer to the active NK2 investor allowlist; unchecking keeps the row but marks it hidden. Non-admin employees do not see the column. — @agent — preserves INV-021 and new INV-022.

### Security
- `GET /api/Partners/investor-visibility` and `PATCH /api/Partners/:id/investor-visibility` require `permissions.edit` plus an Admin-class permission state in the handler, so direct non-admin calls cannot mutate `dbo.investor_clients`. — @agent — investor allowlist hardening.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest src/routes/partners/__tests__/investorVisibility.test.js tests/readRoutePermissions.test.js --runInBand`; `cd website && npx vitest run src/pages/Customers/CustomerColumns.test.tsx src/hooks/__tests__/useCustomers.permissions.test.ts`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <investor visibility files>`; `npm run verify:governance`. Live NK2/NK proof follows deployment. — @agent

## [0.32.46] — 2026-06-27
### Fixed
- **Investor route access no longer inherits overview permission:** The authenticated layout route is now auth-only, and `overview.view` is enforced only on the `/` index route so NK2 investors with `customers.view` can open `/customers` without requiring dashboard access. The investor seed now includes the read-only `customers.view_all` list permission so the customer page can list the backend-scoped allowlist instead of forcing search-first mode. — @agent — fixes the live post-deploy `Không có quyền truy cập` route guard and empty customer page found during investor activation proof.

### Tested
- `cd website && npx vitest run src/__tests__/App.route-permissions.test.tsx`; `cd api && JWT_SECRET=test-secret npx jest tests/investorAccountsMigration.test.js --runInBand`; `npm --prefix website run build`; `npm run verify:governance`. Live NK2 screenshot proof follows deployment. — @agent

## [0.32.45] — 2026-06-27
### Security
- **NK2 investor credentials are isolated from NK production auth:** `POST /api/Auth/login` now falls back to `dbo.investor_accounts` only for mapped `investor` identities after normal active staff login fails, so NK2 can issue investor credentials without storing a production-login-capable `partners.password_hash` in the shared NK/NK2 database. — @agent — preserves INV-021 while NK production remains on older code.

### Added
- **Investor credential migration:** `049_investor_accounts_nk2_credentials.sql` adds the additive `dbo.investor_accounts` table and case-insensitive email index for NK2 investor password hashes. — @agent — deploy safety for shared `tdental_demo`.

### Tested
- `cd api && JWT_SECRET=test-secret npx jest tests/authInvestorLogin.test.js tests/investorAccountsMigration.test.js tests/investorIdorScoping.test.js tests/investorScopeRoutePermissions.test.js src/services/__tests__/permissionService.test.js --runInBand`; `cd api && JWT_SECRET=test-secret npx jest tests/loginRateLimiter.test.js --runInBand`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/routes/auth.js api/migrations/049_investor_accounts_nk2_credentials.sql api/tests/authInvestorLogin.test.js api/tests/investorAccountsMigration.test.js`; `npm run verify:governance`. Live NK2/NK proof follows deployment. — @agent

## [0.32.43] — 2026-06-27
### Fixed
- **NK2 iPhone Face ID scanner stability:** `/checkin` now preserves the full camera frame for CompreFace instead of sending a tight center crop, and transient `NO_FACE` / `MULTIPLE_FACES` / `LOW_QUALITY` provider errors keep the public kiosk scanning instead of ending the flow on a single bad frame. — @agent — UC-007A iPhone Safari no-face regression.

### Tested
- `cd website && npx vitest run src/pages/CheckIn/CheckIn.test.tsx src/components/shared/faceCaptureEngine.test.ts src/components/shared/FaceCaptureModal.test.tsx src/lib/api/__tests__/faceRecognition.test.ts src/i18n/__tests__/i18n-coverage.test.ts`; `npm --prefix website run build`; `npm run verify:governance`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <changed public Face ID files>`. — @agent

## [0.32.42] — 2026-06-27
### Added
- **Hidden Face ID diagnostics:** Public `/checkin` and authenticated `POST /api/face/recognize` now write server-only JSONL diagnostics under `uploads/face-diagnostics/` with provider, device class, thresholds, score margin, top candidate hashes, reason code, latency, and error metadata for later tuning. — @agent — UC-007A ambiguous-match refinement.

### Security
- Face ID diagnostics hash subject/IP/user-agent values and do not store raw images, raw embeddings, names, phone numbers, customer codes, or raw partner IDs; the public client response remains unchanged and privacy-minimized. — @agent — public kiosk biometric privacy boundary.

### Tested
- `cd api && JWT_SECRET=test npx jest src/services/__tests__/faceDiagnostics.test.js src/services/__tests__/faceMatchEngine.test.js src/services/__tests__/comprefaceFaceProvider.test.js src/routes/__tests__/faceCheckin.test.js tests/faceRecognition.test.js --runInBand`. — @agent

## [0.32.41] — 2026-06-27
### Fixed
- **NK2 public Face ID iPhone regression:** `/checkin` now keeps the visible flip-camera control, starts from the front camera via `defaultFacingMode: "user"`, and restores the softened privacy preview without blurring the captured frame sent to CompreFace. — @agent — UC-007A.
- **Phone Face ID capture framing:** shared capture now requests higher-resolution camera frames and center-crops to a 600x600 JPEG so the face fills more of the provider input on iPhone/iPad. — @agent — UC-007A no-face/no-match prevention.

### Tested
- `cd website && npx vitest run src/pages/CheckIn/CheckIn.test.tsx src/components/shared/faceCaptureEngine.test.ts src/components/shared/FaceCaptureModal.test.tsx src/lib/api/__tests__/faceRecognition.test.ts`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <changed public Face ID files>`; `npm run verify:governance`. NK2 live proof follows deploy. — @agent

## [0.32.40] — 2026-06-27
### Added
- **Public NK2 Face ID kiosk:** `/checkin` is now a committed public phone/tablet route backed by `POST /api/public/face/checkin`, with no JWT requirement, recognize-only behavior, per-IP rate limits, and privacy-minimized responses. — @agent — UC-007A public Face ID kiosk.

### Fixed
- **CompreFace Face ID status is provider-backed:** Registration verifies CompreFace saved at least one face example before updating `partners.face_registered_at`, and status now reports unregistered when the DB has `face_subject_id` but CompreFace has zero examples. — @agent — INV-SCHEMA-006A.
- **Phone Face ID camera startup:** The public `/checkin` kiosk starts on the front camera and the shared capture engine now tries iOS-friendly `facingMode: ideal` constraints before exact constraints, preventing Safari camera startup from failing before recognition. — @agent — UC-007A.
- **Vite release metadata honors Docker build args:** `website/vite.config.ts` now prefers `GIT_SHA` / `GIT_BRANCH` so `/version.json` can show the deployed commit in NK2 builds. — @agent — production proofability.

### Security
- Public Face ID check-in returns only a greeting, no-match, or ambiguous count; it does not expose `partnerId`, phone, customer code, confidence score, candidate identities, or tokens. — @agent — public kiosk privacy boundary.

### Tested
- `cd api && JWT_SECRET=test npx jest src/services/__tests__/comprefaceClient.test.js src/services/__tests__/comprefaceFaceProvider.test.js src/routes/__tests__/faceCheckin.test.js tests/faceRecognition.test.js --runInBand`; `cd website && npx vitest run src/pages/CheckIn/CheckIn.test.tsx src/lib/api/__tests__/faceRecognition.test.ts src/components/shared/FaceCaptureModal.test.tsx`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off <changed Face ID paths>`; `bash scripts/verify-docs.sh`; `npm run verify:governance`. — @agent

## [0.32.39] — 2026-06-27
### Added
- **NK2 investor customer scoping:** Investors remain normal employee accounts in `dbo.partners`, but the `investor` permission group plus `dbo.investor_clients` allowlist now scopes customer, appointment, payment, service, and report reads to explicitly assigned customers. The seeded investor group is view-only; write/refund/void permissions are not granted. — @agent — preserves INV-008 and new INV-021.

### Docs
- Documented migration 048, investor allowlist blast radius, product-map domains, TestSprite coverage, and the test matrix for read-only investor scoping. — @agent — schema/data-model governance for `dbo.investor_clients`.

### Tested
- `npm --prefix api ci`; `cd api && JWT_SECRET=test-secret npx jest tests/investorIdorScoping.test.js tests/investorScopeRoutePermissions.test.js src/services/__tests__/permissionService.test.js src/routes/reports/__tests__/cashFlow.test.js --runInBand`; `cd api && JWT_SECRET=test-secret npx jest src/routes/reports/__tests__/revenueRecognition.test.js src/routes/reports/__tests__/servicesBreakdown.test.js src/services/reports/__tests__/canonicalRevenue.test.js --runInBand`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off` on changed production API JS returned 0 findings; `bash scripts/verify-docs.sh`; `npm run verify:governance`; `npm --prefix website ci`; `npm --prefix website run build`. Full changed-file Semgrep also ran and reported two local Express test-harness CSRF warnings in `api/src/routes/reports/__tests__/cashFlow.test.js`, with no production findings. — @agent

## [0.32.38] — 2026-06-01
### Fixed
- **Customer profile saves no longer fail on migrated blank DOB parts.** The shared `@tgroup/contracts` partner schema now normalizes blank, `0`, and `"0"` birthday/birthmonth/birthyear values to `null` before validation, so unrelated edits on migrated customer records are not blocked while real invalid days/months still fail. — @agent — UC-001 customer profile edit.
### Added
- **Revenue report now shows in-app revenue by customer source.** `/reports/revenue` calls `POST /api/Reports/revenue/by-source` and renders a `Doanh thu theo nguồn` card using the same posted service-payment recognition rules as the main revenue report, attributing by sale-order source first and customer source second. — @agent — UC-013 report analytics.
### Tested
- `npm --prefix contracts run build`; `cd api && JWT_SECRET=test npx jest --runInBand src/routes/partners/__tests__/partnerValidation.test.js src/routes/reports/__tests__/revenueRecognition.test.js`; `npm --prefix website test -- src/pages/reports/__tests__/ReportsSubpages.test.tsx`; `npm --prefix website run build`; `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off contracts/partner.ts api/src/routes/reports/revenueRecognition.js api/src/routes/reports/revenueBreakdowns.js website/src/pages/reports/ReportsRevenue.tsx`; local Playwright screenshot `output/playwright/nk-feedback-fixes-20260601/reports-revenue-by-source-local.png`. — @agent

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
