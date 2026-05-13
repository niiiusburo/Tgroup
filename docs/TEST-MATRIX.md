# TGroup Clinic — Test Matrix

> "If you change X, run test suite Y." Maps modules → regression tests. Includes coverage requirements.

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
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face registration and recognition. |

### Payments & Deposits

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/payments.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/team-charlie-payments.spec.ts`, `website/src/lib/allocatePaymentSources.test.ts` | Money logic is high-risk. |
| `api/src/routes/payments/helpers.js` | `website/src/lib/allocatePaymentSources.test.ts`, payment backend tests | Allocation math, receipt generation, residual validation. |
| `website/src/components/payment/PaymentForm.tsx` | `PaymentForm.submit.test.tsx`, `website/e2e/vietqr-payment.spec.ts` | Payment entry and mixed-method breakdown. |
| `contracts/payment.ts` | All payment-related tests | Schema change cascades. |
| `api/src/routes/monthlyPlans.js` | `website/e2e/team-charlie-payments.spec.ts` | Installment plan payments. |

### Reports & Exports

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/exports.js` | `website/e2e/export-downloads.spec.ts`, backend export builder tests | Download routes and workbook generation. |
| `api/src/services/exports/builders/*.js` | `website/e2e/export-downloads.spec.ts`, builder unit tests | Excel shape, headers, formulas, numeric cells. |
| `api/src/routes/reports.js` | `api/src/routes/reports/__tests__/cashFlow.test.js` | Aggregation accuracy. |
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
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face register/recognize API contract. |
| `face-service/` Python code | `api/tests/faceRecognition.test.js`, manual face-service health check | Model inference and embedding generation. |

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
| **Reports (SQL aggregation accuracy)** | No automated accuracy tests against legacy Odoo reports | **Medium** — financial data may drift. |
| **Commission calculation** | No E2E or unit tests | **Medium** — unknown auto-calc trigger. |
| **Monthly plan installments** | No tests for installment payment flows | **Medium** — plan balance may miscalculate. |
| **Feedback attachment upload** | No E2E for file upload storage/deletion | **Low** — partial UI coverage exists. |

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
```
