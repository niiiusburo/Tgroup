# TGroup Clinic — Test Matrix

> "If you change X, run test suite Y." Maps modules → regression tests. Includes coverage requirements.

**Cosmetic LOB v2 Sync (2026-05-19):** Registered LOB isolation, CTV earnings aggregation (both DBs via getDb), D13 engine tests, partners identity cases, two-pool db-factory tests, migration rollback. See product-map/domains/earnings-commissions.yaml + ctv.yaml + v2 spec Testing Strategy. Full matrix in product-map/test-matrix.md.



## Traceability IDs

Use UC/WF IDs from `docs/USE-CASES.md` and `docs/WORKFLOWS.md` for feature traceability. Contract IDs in this matrix are compact route labels, for example `CON-Reports-RevenueSummary` = `POST /api/Reports/revenue/summary`, `CON-Reports-CashFlowSummary` = `POST /api/Reports/cash-flow/summary`, `CON-Reports-ServicesBreakdown` = `POST /api/Reports/services/breakdown`, `CON-Exports-Preview` = `POST /api/Exports/:type/preview`, and `CON-Exports-Download` = `POST /api/Exports/:type/download`.

Current governance note: when changing `contracts/payment.ts`, `website/src/hooks/useDeposits.ts`, or `/reports/revenue` payment totals together, run the contracts build plus the focused payment and reports tests before treating the method enum or revenue-recognition behavior as safe.

## Coverage Requirements by Domain

| Domain | Minimum Coverage | Test Types Required |
|---|---|---|
| Auth | 80% | Unit (backend), E2E (frontend), rate limiter |
| Appointments | 75% | Unit (frontend + backend), E2E, integration |
| Customers & Partners | 75% | Unit (frontend + backend), E2E, search filters |
| Payments & Deposits | 80% | Unit (allocation math), backend route, E2E |
| Services Catalog | 70% | Unit (frontend), backend route, delete guards |
| Reports & Exports | 60% | Backend export builders, E2E downloads, workbook verification |
| Settings & System | 70% | Unit (timezone, version check), E2E |
| Integrations | 60% | Face recognition API, Hosoonline proxy, telemetry auth |

## Module → Test Mapping

### Auth & Permissions

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/middleware/auth.js` | `api/tests/loginRateLimiter.test.js`, `api/tests/readRoutePermissions.test.js`, all E2E auth specs | Single point of failure for all protected routes. |
| `api/src/routes/auth.js` | Same as above + `api/tests/authInvestorLogin.test.js`, `website/e2e/auth-setup.spec.ts` | Login payload shape changes break frontend AuthContext; NK2 investor credential fallback must not create production-login-capable partner passwords. |
| `api/src/services/permissionService.js` | `api/tests/readRoutePermissions.test.js`, `api/src/services/__tests__/permissionService.test.js`, `api/tests/investorIdorScoping.test.js`, `api/tests/investorScopeRoutePermissions.test.js`, `website/e2e/permissions-*.spec.ts` | Effective permission divergence causes 403s; investor employees must stay scoped to `dbo.investor_clients` and view-only routes. |
| `website/src/contexts/AuthContext.tsx` | `website/e2e/auth-setup.spec.ts`, `website/e2e/permissions-check.spec.ts` | Auth state hydration affects every protected page. |
| `website/src/constants/index.ts` (ROUTE_PERMISSIONS) | All E2E specs that navigate protected routes | Route guard changes may hide/show pages incorrectly. |

### API & Frontend Bridge

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/lib/api/core.ts` (`apiFetch` LOB-aware routing) | `website/src/lib/api/__tests__/apiFetch.lob.test.ts` | Cosmetic LOB v2 Phase-1 Gap B: LOB-aware path rewriting routes `/api/X` to `/api/cosmetic/X` when `VITE_COSMETIC_LOB_ENABLED=true` and `tgclinic_lob='cosmetic'`. Whitelisted routes (`/Auth/*`, `/me/*`, `/version/*`, `/ctv/*`) bypass rewriting. Feature flag and localStorage fallbacks tested with 4 vitest cases. |

### Appointments & Calendar

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/appointments.js` | `api/src/routes/appointments/__tests__/readHandlers.test.js`, `website/e2e/team-alpha-appointments.spec.ts` | Calendar data shape changes break all views. |
| Investor appointment scoping in `api/src/routes/appointments/*` and report appointment endpoints | `api/tests/investorIdorScoping.test.js`, `api/tests/investorScopeRoutePermissions.test.js` | Investor employees may view only allowlisted customer appointments and must not receive appointment write permissions by seed. |
| `api/src/routes/appointments/mutationHandlers.js` and `website/src/components/appointments/unified/appointmentForm.mapper.ts` | `api/src/routes/appointments/__tests__/mutationHandlers.test.js` (covers companyId valid-UUID write, `400 INVALID_COMPANY_ID` on malformed UUID, `404 COMPANY_NOT_FOUND` on missing FK), `website/src/components/appointments/unified/__tests__/appointmentForm.mapper.test.ts` (covers locationId → payload.companyid + AppointmentUpdateSchema parse) | Appointment edit saves must persist changed clinic/location (`companyid`) and still preserve explicit null staff clears. |
| `api/src/services/exports/builders/appointmentsExport.js` | `api/src/services/exports/__tests__/appointmentsExport.test.js`, `api/src/services/exports/__tests__/timezone.test.js` | Appointment exports must use the calendar `appointments.date` value, preserve date/time boundaries, and match phone searches such as `922403152`. |
| `website/src/pages/Calendar.tsx` | `website/e2e/team-alpha-appointments.spec.ts`, `website/src/pages/Calendar.click.test.tsx` | Core scheduling surface. |
| `website/src/components/calendar/*.tsx` | Component unit tests + `website/e2e/team-alpha-appointments.spec.ts` | Drag-to-reschedule, filter chips, status badges. |
| `website/src/components/calendar/CalendarToolbar.tsx` and `CalendarDateNavigator.tsx` | `website/src/components/calendar/__tests__/CalendarToolbar.test.tsx`, `/calendar` 1024x768, 1280x720, and 1366x768 screenshot checks | Tablet and laptop toolbar wrapping must keep view tabs, date navigation, search, export, filter, and quick-add visible while appointments populate. |
| Appointment late-reminder messaging (`api/src/routes/appointments*`, future `api/src/routes/notifications*`, `api/src/workers/messagingWorker.js`, `/calendar`, `/notifications`) | Late-candidate query tests, notification permission tests, provider dry-run tests, idempotency tests, branch/location-scope tests, provider webhook signature tests, `/calendar` and `/notifications` TestSprite screenshot checks | UC-005/WF-002 planned extension. Late reminders must not duplicate sends, leak medical detail, ignore opt-out state, spoof provider status, bypass branch scope, or treat `partners.phone` as a unique identity. |
| `contracts/appointment.ts` | All appointment-related unit and E2E tests | Schema change cascades to both runtimes. |

### Customers & Partners

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/partners.js` | `api/src/routes/partners/__tests__/*.test.js` | Customer CRUD, search, uniqueness logic. |
| Investor customer scoping in `api/src/routes/partners/*`, `api/src/routes/customerBalance.js`, `api/src/routes/customerReceipts.js`, `api/src/routes/dotKhams.js`, `api/src/routes/saleOrders*`, `api/src/routes/saleOrderLines.js` | `api/tests/investorIdorScoping.test.js`, `api/tests/investorScopeRoutePermissions.test.js`, `api/src/services/__tests__/permissionService.test.js` | Investor employees must see only allowlisted customers and get 404/empty results for all other customer-linked records. |
| `contracts/partner.ts` and `api/src/routes/partners/*` validation | `npm --prefix contracts run build`, `api/src/routes/partners/__tests__/partnerValidation.test.js` | Customer create/update contract must keep migrated blank/zero DOB fields saveable while still rejecting real invalid date parts. |
| `website/src/components/forms/AddCustomerForm/` | `AddCustomerForm.test.tsx`, `website/e2e/customer-create-save.spec.ts` | New-customer intake is high-frequency workflow. |
| `website/src/components/customer/CustomerProfile/` | `CustomerProfile.test.tsx`, `website/e2e/customer-profile-crud.spec.ts` | Profile tabs (appointments, services, payments, photos). |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face registration, re-registration, recognition, and provider routing. |

### Employees & HR

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/components/employees/EmployeeTable.tsx` | `website/src/components/employees/__tests__/EmployeeTable.test.tsx`, `/employees` 1280x720, 1366x768, and 1440x900 screenshot checks | Long role/location labels must not push the edit action offscreen on desktop workstations. |
| `website/src/components/shared/DataTable.tsx` sticky-column behavior | Component tests for each table using `sticky: 'right'`, plus the affected route screenshot check | Sticky action cells are shared table infrastructure and must not introduce page-level horizontal overflow or hide row actions. |

### Payments & Deposits

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/payments.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/team-charlie-payments.spec.ts`, `website/src/lib/allocatePaymentSources.test.ts` | Money logic is high-risk. |
| Investor payment read filters in `api/src/routes/payments*.js`, `api/src/routes/accountPayments.js`, `api/src/routes/receipts.js`, `api/src/routes/monthlyPlans.js` | `api/tests/investorIdorScoping.test.js`, `api/tests/investorScopeRoutePermissions.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js` | Investors may read allowlisted payment context, but the seeded group must not receive payment write/refund/void permissions. |
| `api/src/routes/payments/helpers.js` | `website/src/lib/allocatePaymentSources.test.ts`, payment backend tests | Allocation math, receipt generation, residual validation. |
| `website/src/components/payment/PaymentForm.tsx` | `PaymentForm.submit.test.tsx`, `website/e2e/vietqr-payment.spec.ts` | Payment entry and mixed-method breakdown. |
| `contracts/payment.ts` | `npm --prefix contracts run build`, `website/src/hooks/useDeposits.test.tsx`, `website/src/components/payment/PaymentHistory.test.tsx`, `website/src/components/payment/CustomerDeposits.test.tsx`, `website/e2e/team-charlie-payments.spec.ts`, `website/e2e/vietqr-payment.spec.ts` | Schema change cascades into payment method labels, deposit history, VietQR-as-bank-transfer entry, reports/export grouping, and shared package consumers. |
| `api/src/routes/monthlyPlans.js` | `website/e2e/team-charlie-payments.spec.ts` | Installment plan payments. |

### Reports & Exports

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/exports.js` | `website/e2e/export-downloads.spec.ts`, `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js` | UC-013/UC-019, WF-005. Locks `CON-Exports-Preview` and `CON-Exports-Download` as current `POST /api/Exports/:type/...` contracts plus workbook generation. |
| `api/src/services/exports/builders/*.js` COLUMNS arrays | `api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` (40 assertions) | **Feature Catalog Lock**: If you modify any export builder's COLUMNS, DATA_COLUMNS, REVENUE_COLUMNS, or DEPOSIT_COLUMNS arrays, the Jest cross-check test validates that `product-map/features/exports/*.yaml` specifications match code exactly (keys and headers, order-sensitive). Update the YAML file in lockstep with builder code changes. All 8 exports (appointments, customers, payments, services, service-catalog, report-sales-employees, revenue-flat, deposit-flat) use this pattern. Land 2026-05-21 on `fix/feedback-reports` — additive test only, does not touch builder code. |
| `api/src/services/exports/builders/legacyFlatReportsExport*.js` | `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `website/e2e/export-downloads.spec.ts` | UC-013, WF-005. Locks `revenue-flat` and `deposit-flat` workbook templates, SO-code column mapping, payment/deposit note columns, revenue source precedence, deposit cash/bank split fallback, posted service-payment filters, allocation proration SQL, row-limit errors, and deposit top-up filtering. |
| `api/src/services/exports/builders/reportSalesEmployeesExport.js` | `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx` | UC-019, WF-005. Locks `report-sales-employees` preview/download filters, location scope, employee-type attribution, grouped workbook rows, and `/reports/revenue` export controls. |
| `api/src/routes/reports/revenue*.js` | `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js` | UC-013, WF-013. Locks `CON-Reports-RevenueSummary`, revenue trend, doctor/category/location/source paid revenue, canonical Excel-matching WHERE/JOIN topology, payment-date bucketing, direct unallocated payment recognition, and allocation capping. |
| `api/src/routes/reports/cashFlow.js` | `api/src/routes/reports/__tests__/cashFlow.test.js` | UC-013, WF-013. Locks `CON-Reports-CashFlowSummary`, service collections vs deposits/refunds/deposit usage/voided rows, route mounting, timezone-safe date buckets, and scoped location rejection. |
| `api/src/routes/reports/servicesBreakdown.js` | `api/src/routes/reports/__tests__/servicesBreakdown.test.js` | UC-013, WF-013. Locks `CON-Reports-ServicesBreakdown` so service/category/source revenue comes from posted payment allocations instead of listed service prices or raw order totals. |
| Investor report scoping in `api/src/routes/reports/*.js`, `api/src/routes/dashboardReports.js`, `api/src/services/reports/canonicalRevenue.js` | `api/tests/investorIdorScoping.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js`, `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/routes/reports/__tests__/servicesBreakdown.test.js` | Investor aggregates must count only allowlisted customers while preserving canonical revenue formulas for normal staff. |
| `website/src/hooks/useReportData.ts` | `website/src/hooks/__tests__/useReportData.test.ts` | UC-013, WF-013. Locks report API calls as POST payloads and strips the all-location sentinel from request bodies. |
| `website/src/pages/reports/ReportsRevenue.tsx` and other `website/src/pages/reports/*` subpages | `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`, `website/e2e/export-downloads.spec.ts` | UC-013/UC-019, WF-013. Locks visible revenue recognition basis, cash-flow cards, employee export controls, loading/error states, and report subpage routing. |
| `nginx.conf` or `nginx.docker.conf` | `website/e2e/export-downloads.spec.ts` (large dataset) | Timeout behavior for long-running exports. |

### Settings & System

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/contexts/TimezoneContext.tsx` | `website/src/__tests__/timezone.context.test.tsx`, `website/src/__tests__/timezone.core.test.ts` | Timezone conversion affects all date displays. |
| `website/src/hooks/useVersionCheck.ts` | `website/src/__tests__/useVersionCheck.test.ts` | Version polling and update prompt. |
| `api/src/routes/telemetry.js` or `api/src/routes/publicTelemetryErrors.js` | `api/tests/telemetry.test.js`, `api/tests/telemetryAuth.test.js`, `api/src/services/__tests__/larkNotifier.test.js` | Public vs auth-required telemetry routes; first-seen errors can auto-create feedback and queue optional Lark alerts. |
| `api/src/routes/feedback/*.js`, `api/src/routes/feedback/attachments.js`, or `api/src/services/larkNotifier.js` | `api/tests/feedbackAttachments.test.js`, `api/src/services/__tests__/larkNotifier.test.js`, live `/feedback` screenshot check after any production restore | Feedback proof images cross DB rows and `/uploads/feedback` files; Lark alerts are non-blocking and env-gated. Failures can leave broken resolution evidence or missing external alerting. |
| `api/src/middleware/ipAccess.js` | `website/e2e/login-and-settings.spec.ts` | IP whitelist enforcement. |

### Integrations

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/externalCheckups.js` | `api/src/routes/__tests__/externalCheckups.test.js` | Hosoonline auth, patient search, image proxy. |
| `docker-compose.yml` / `.env.example` Lark feedback env vars | `api/tests/envExampleValidation.test.js`, `api/src/services/__tests__/larkNotifier.test.js` | Ensures the webhook/secret are documented as backend-only env and notifier accepts only the intended Lark/Feishu custom bot endpoints. |
| `website/src/components/shared/FaceCaptureModal.tsx` / `website/src/components/shared/useFaceCaptureController.ts` / `website/src/components/shared/faceCaptureEngine.ts` | `website/src/components/shared/FaceCaptureModal.test.tsx`, `website/src/components/shared/faceCaptureEngine.test.ts`, `website/src/components/customer/CustomerCameraWidget.test.tsx`, `website/src/components/shared/GlobalFaceIdButton.test.tsx`, `website/src/hooks/__tests__/useFaceRecognition.test.ts` | Camera lifetime, iOS-friendly camera constraints, no-face messaging, auto-capture gating, video playback blocks, and caller error propagation. |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face register/re-register/recognize API contract in local and CompreFace modes, plus hidden diagnostics recording without leaking private diagnostics in the staff response. |
| `api/src/routes/faceCheckin.js` / `website/src/pages/CheckIn/CheckIn.tsx` | `api/src/routes/__tests__/faceCheckin.test.js`, `website/src/pages/CheckIn/CheckIn.test.tsx`, `website/src/components/shared/faceCaptureEngine.test.ts` | Public no-auth kiosk route, front-camera startup, visible camera flip, privacy-softened preview, full-frame provider capture, transient no-face retry scanning, privacy-minimized match response, rate limiting, hidden diagnostic recording, and public page rendering without AuthProvider. |
| `api/src/services/faceDiagnostics.js` | `api/src/services/__tests__/faceDiagnostics.test.js` | Server-only Face ID diagnostic JSONL record shape, iPhone/iPad user-agent parsing, hashed identifiers, score-margin fields, and no PII/raw identifier leakage. |
| `api/src/services/comprefaceClient.js` / `api/src/services/comprefaceFaceProvider.js` | `api/src/services/__tests__/comprefaceClient.test.js`, `api/src/services/__tests__/comprefaceFaceProvider.test.js` | CompreFace multipart file upload, subject/example calls, example-count status verification, health check, no-face normalization, partner subject mapping, and private reason-code diagnostics. |
| Future SMS/Zalo provider adapters and messaging provider env (`api/src/services/messaging*`, `api/src/providers/sms*`, `api/src/providers/zalo*`) | Provider contract tests with dry-run, failed response, invalid phone, template rejection, delivery status, and retry/backoff cases | External messaging providers must remain optional, auditable, and safe to disable without blocking appointment/calendar workflows. |
| `face-service/` Python code | `api/tests/faceRecognition.integration.test.js`, manual face-service health check | Local-provider model inference and embedding generation. |

### Infrastructure

| If you change... | Run these tests... | Why |
|---|---|---|
| `docker-compose.yml` | `docker compose config`, local smoke test | Service topology and env var shape. |
| `scripts/deploy-tbot.sh` | `bash -n scripts/deploy-tbot.sh` | Syntax validation. |
| `Dockerfile.api` or `Dockerfile.web` | Local build: `docker build -f Dockerfile.api .` | Build breakage detection. |

## Coverage Gaps (Known)

| Domain | Missing Coverage | Risk |
|---|---|---|
| **Payments (backend allocation/void/refund)** | No backend unit tests for allocation edge cases, void logic, or refund math | **High** — money correctness relies on manual testing. |
| **Auth (backend permission resolution)** | No backend tests for `requirePermission` or `resolvePermissions` divergence | **High** — silent 403s or unauthorized access. |
| **Reports (legacy reconciliation)** | Targeted tests now cover current revenue recognition, cash-flow classification, services breakdown, and canonical revenue SQL, but there is still no automated full reconciliation against legacy Odoo/TDental audit exports | **Medium** — financial data can still drift outside the covered route formulas. |
| **Exports route shell** | Builder tests cover `legacyFlatReportsExport` and `reportSalesEmployeesExport`, but `/api/Exports/:type/preview` and `/api/Exports/:type/download` route-level permission filtering, audit-failure behavior, and row-limit response handling still need direct route tests | **Medium** — route wrapper behavior can drift while builder tests pass. |
| **Commission calculation** | No E2E or unit tests | **Medium** — unknown auto-calc trigger. |
| **Monthly plan installments** | No tests for `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`, plan completion, or next-installment advancement | **Medium** — plan status may miscalculate and the current route does not create a payments ledger row. |
| **Feedback moderation attachments** | Permission declarations are covered indirectly, but no E2E covers admin reply upload, attachment persistence, deletion, or orphan-file cleanup | **Low** — partial UI/permission coverage exists. |
| **IP Access backend enforcement** | Frontend component/types/validation tests exist, but middleware and `/api/IpAccess/*` route behavior lack focused backend integration tests | **Medium** — lockout and fail-open behavior are operationally sensitive. |

## Test Commands Quick Reference

```bash
# Frontend unit tests
npm --prefix website test

# Frontend lint
npm --prefix website run lint

# Frontend build
npm --prefix website run build

# API tests
npm --prefix api test

# Contracts build
npm --prefix contracts run build

# E2E tests
npm --prefix website run test:e2e

# Specific E2E spec
npm --prefix website run test:e2e -- e2e/export-downloads.spec.ts

# Deploy script syntax check
bash -n scripts/deploy-tbot.sh

# Docker compose validation
docker compose config

# Face ID engine (Global Face ID button, customer camera, AddCustomerForm)
# Validate: open via top-bar Face ID button → auto-capture in 5-15s on any browser
# Validate: 5-frame burst → sharpest sent to /api/face/recognize
# Validate: 15s force-capture safety net fires on poor light
# Validate: profile-mode 3-pose registration unchanged
# Tests: npm --prefix website run test -- shared/FaceCaptureModal shared/faceCaptureEngine shared/GlobalFaceIdButton customer/CustomerCameraWidget hooks/useFaceRecognition

# External-checkup gallery (Hosoonline) — HealthCheckupGallery + HealthCheckupEmptyState
# Validate: customer with patientExists:false → empty state shows checkupEmptyPatientMissing VN/EN guidance and Tạo bệnh nhân HSO CTA (requires external_checkups.upload)
# Validate: customer with patientExists:true and no checkups → checkupEmptyNoImages, points at Thêm lịch khám
# Validate: source=hosoonline-auth-failed|unavailable|not-configured → amber warning string from i18n, not hardcoded English
# Validate: clicking Tạo bệnh nhân HSO → emerald createExternalPatientSuccess notice, then upload button appears after refresh
# Regression: customer with checkups + images still renders gallery normally (e.g. /api/ExternalCheckups/T6281 returns 2 checkups; image proxy /api/ExternalCheckups/images/<name> returns 200 + JPEG)
# Tests: npm --prefix website run test -- customer/HealthCheckupGallery customer/HealthCheckupEmptyState customer/AuthenticatedCheckupImage
```

| `scripts/require-clean-tree.sh`, `Dockerfile.web` GIT_SHA arg, `api/src/services/exports/__tests__/allBuilderColumns.lock.test.js` | bash smoke test on dirty tree; `/version.json` curl; `npx jest src/services/exports/__tests__/allBuilderColumns.lock.test.js` | 2026-05-20 defense-in-depth additions: refuse dirty builds (Layer 1), stamp real git SHA into version.json (Layer 2), lock 6 more export column registries (Layer 4). |
| `website/src/components/shared/FeedbackWidget.tsx`, `website/src/contexts/AuthContext.tsx`, `website/src/components/reports/BarChart.tsx`, `website/src/pages/reports/ReportsRevenue.tsx` | Playwright login + visual check: hint "Có vấn đề?" renders next to MessageSquare icon on fresh login; clicking × dismisses; reload preserves dismissal; logout+login again re-shows hint. Reports → Revenue → Xu hướng dòng tiền chart: confirm labels render rotated -90° (computed transform = `matrix(0, -1, 1, 0, 0, …)`) and dates "22 thg 4", "23 thg 4", … are fully visible (no "4..." truncation). | 2026-05-21 v0.32.37 — login feedback hint + BarChart auto-vertical labels (>=8 bars) plus explicit `labelOrientation="vertical"` on cash-flow trend. |
