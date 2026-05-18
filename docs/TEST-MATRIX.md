# TGroup Clinic — Test Matrix

> "If you change X, run test suite Y." Maps modules → regression tests. Includes coverage requirements.

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
| `api/src/routes/auth.js` | Same as above + `website/e2e/auth-setup.spec.ts` | Login payload shape changes break frontend AuthContext. |
| `api/src/services/permissionService.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/permissions-*.spec.ts` | Effective permission divergence causes 403s. |
| `website/src/contexts/AuthContext.tsx` | `website/e2e/auth-setup.spec.ts`, `website/e2e/permissions-check.spec.ts` | Auth state hydration affects every protected page. |
| `website/src/constants/index.ts` (ROUTE_PERMISSIONS) | All E2E specs that navigate protected routes | Route guard changes may hide/show pages incorrectly. |

### Appointments & Calendar

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/appointments.js` | `api/src/routes/appointments/__tests__/readHandlers.test.js`, `website/e2e/team-alpha-appointments.spec.ts` | Calendar data shape changes break all views. |
| `website/src/pages/Calendar.tsx` | `website/e2e/team-alpha-appointments.spec.ts`, `website/src/pages/Calendar.click.test.tsx` | Core scheduling surface. |
| `website/src/components/calendar/*.tsx` | Component unit tests + `website/e2e/team-alpha-appointments.spec.ts` | Drag-to-reschedule, filter chips, status badges. |
| `contracts/appointment.ts` | All appointment-related unit and E2E tests | Schema change cascades to both runtimes. |

### Customers & Partners

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/partners.js` | `api/src/routes/partners/__tests__/*.test.js` | Customer CRUD, search, uniqueness logic. |
| `website/src/components/forms/AddCustomerForm/` | `AddCustomerForm.test.tsx`, `website/e2e/customer-create-save.spec.ts` | New-customer intake is high-frequency workflow. |
| `website/src/components/customer/CustomerProfile/` | `CustomerProfile.test.tsx`, `website/e2e/customer-profile-crud.spec.ts` | Profile tabs (appointments, services, payments, photos). |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face registration, re-registration, recognition, and provider routing. |

### Payments & Deposits

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/payments.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/team-charlie-payments.spec.ts`, `website/src/lib/allocatePaymentSources.test.ts` | Money logic is high-risk. |
| `api/src/routes/payments/helpers.js` | `website/src/lib/allocatePaymentSources.test.ts`, payment backend tests | Allocation math, receipt generation, residual validation. |
| `website/src/components/payment/PaymentForm.tsx` | `PaymentForm.submit.test.tsx`, `website/e2e/vietqr-payment.spec.ts` | Payment entry and mixed-method breakdown. |
| `contracts/payment.ts` | `npm --prefix contracts run build`, `website/src/hooks/useDeposits.test.tsx`, `website/src/components/payment/PaymentHistory.test.tsx`, `website/src/components/payment/CustomerDeposits.test.tsx`, `website/e2e/team-charlie-payments.spec.ts`, `website/e2e/vietqr-payment.spec.ts` | Schema change cascades into payment method labels, deposit history, VietQR-as-bank-transfer entry, reports/export grouping, and shared package consumers. |
| `api/src/routes/monthlyPlans.js` | `website/e2e/team-charlie-payments.spec.ts` | Installment plan payments. |

### Reports & Exports

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/exports.js` | `website/e2e/export-downloads.spec.ts`, `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js` | UC-013/UC-019, WF-005. Locks `CON-Exports-Preview` and `CON-Exports-Download` as current `POST /api/Exports/:type/...` contracts plus workbook generation. |
| `api/src/services/exports/builders/legacyFlatReportsExport*.js` | `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `website/e2e/export-downloads.spec.ts` | UC-013, WF-005. Locks `revenue-flat` and `deposit-flat` workbook templates, SO-code column mapping, posted service-payment filters, allocation proration SQL, row-limit errors, and deposit top-up filtering. |
| `api/src/services/exports/builders/reportSalesEmployeesExport.js` | `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx` | UC-019, WF-005. Locks `report-sales-employees` preview/download filters, location scope, employee-type attribution, grouped workbook rows, and `/reports/revenue` export controls. |
| `api/src/routes/reports/revenue*.js` | `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js` | UC-013, WF-013. Locks `CON-Reports-RevenueSummary`, revenue trend, doctor/category/location paid revenue, canonical Excel-matching WHERE/JOIN topology, payment-date bucketing, and allocation capping. |
| `api/src/routes/reports/cashFlow.js` | `api/src/routes/reports/__tests__/cashFlow.test.js` | UC-013, WF-013. Locks `CON-Reports-CashFlowSummary`, service collections vs deposits/refunds/deposit usage/voided rows, route mounting, timezone-safe date buckets, and scoped location rejection. |
| `api/src/routes/reports/servicesBreakdown.js` | `api/src/routes/reports/__tests__/servicesBreakdown.test.js` | UC-013, WF-013. Locks `CON-Reports-ServicesBreakdown` so service/category/source revenue comes from posted payment allocations instead of listed service prices or raw order totals. |
| `website/src/hooks/useReportData.ts` | `website/src/hooks/__tests__/useReportData.test.ts` | UC-013, WF-013. Locks report API calls as POST payloads and strips the all-location sentinel from request bodies. |
| `website/src/pages/reports/ReportsRevenue.tsx` and other `website/src/pages/reports/*` subpages | `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`, `website/e2e/export-downloads.spec.ts` | UC-013/UC-019, WF-013. Locks visible revenue recognition basis, cash-flow cards, employee export controls, loading/error states, and report subpage routing. |
| `nginx.conf` or `nginx.docker.conf` | `website/e2e/export-downloads.spec.ts` (large dataset) | Timeout behavior for long-running exports. |

### Settings & System

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/contexts/TimezoneContext.tsx` | `website/src/__tests__/timezone.context.test.tsx`, `website/src/__tests__/timezone.core.test.ts` | Timezone conversion affects all date displays. |
| `website/src/hooks/useVersionCheck.ts` | `website/src/__tests__/useVersionCheck.test.ts` | Version polling and update prompt. |
| `api/src/routes/telemetry.js` | `api/tests/telemetry.test.js`, `api/tests/telemetryAuth.test.js` | Public vs auth-required telemetry routes. |
| `api/src/middleware/ipAccess.js` | `website/e2e/login-and-settings.spec.ts` | IP whitelist enforcement. |

### Integrations

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/externalCheckups.js` | `api/src/routes/__tests__/externalCheckups.test.js` | Hosoonline auth, patient search, image proxy. |
| `website/src/components/shared/FaceCaptureModal.tsx` / `website/src/components/shared/useFaceCaptureController.ts` / `website/src/components/shared/faceCaptureEngine.ts` | `website/src/components/shared/FaceCaptureModal.test.tsx`, `website/src/components/shared/faceCaptureEngine.test.ts`, `website/src/components/customer/CustomerCameraWidget.test.tsx`, `website/src/components/shared/GlobalFaceIdButton.test.tsx`, `website/src/hooks/__tests__/useFaceRecognition.test.ts` | Camera lifetime, no-face messaging, auto-capture gating, and caller error propagation. |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face register/re-register/recognize API contract in local and CompreFace modes. |
| `api/src/services/comprefaceClient.js` / `api/src/services/comprefaceFaceProvider.js` | `api/src/services/__tests__/comprefaceClient.test.js`, `api/src/services/__tests__/comprefaceFaceProvider.test.js` | CompreFace multipart file upload, subject/example calls, health check, no-face normalization, and partner subject mapping. |
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

# Face Lab — manual QA at /face (all envs)
# Activate each module, hold face in frame, wait for auto-capture,
# compare confidence/timing/resolution in the BEST badge table
```
