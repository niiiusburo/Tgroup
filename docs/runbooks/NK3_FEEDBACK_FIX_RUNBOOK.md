# NK3 Feedback Fix Runbook

Source: Google Doc `1Zs1cYQm4_H_qGb83GTkf-CAe1kcy_fLzyUe1ef7IF2M`, exported as text on 2026-05-25.

## Scope

This runbook compiles the NK3 staff feedback into a fix queue. Default assumption is the current NK3/TMV Cosmetic LOB path, so reproduce with Cosmetic selected and `/api/cosmetic/*` routes unless the reporter confirms the issue happened in Dental. Do not run a database sync, import, restore, or replacement as part of these fixes without the AGENTS.md database sync gate: compare VPS against local first, save a fresh source backup, show the backup path, then get two explicit confirmations.

Primary live URLs:

- `https://tmv.2checkin.com/customers?lob=cosmetic`
- `https://tmv.2checkin.com/calendar?lob=cosmetic`
- `https://tmv.2checkin.com/appointments?lob=cosmetic`
- `https://tmv.2checkin.com/payment?lob=cosmetic`
- `https://tmv.2checkin.com/employees?lob=cosmetic`
- `https://tmv.2checkin.com/permissions?lob=cosmetic`

Baseline regression URL:

- `https://nk.2checkin.com`

## Feedback Inventory

| Priority | Original feedback | Product surface | Likely routes/data | Fix owner |
| --- | --- | --- | --- | --- |
| P0 | `Không thêm được hồ sơ khách hàng.` | Add customer / customer profile | `POST /api/cosmetic/Partners`, `tcosmetic_demo.dbo.partners`, AddCustomerForm | Customer workflow |
| P0 | `Không thêm được lịch hẹn` | Calendar and appointment create | `POST /api/cosmetic/Appointments`, `tcosmetic_demo.dbo.appointments`, customer/service/staff selectors | Appointment workflow |
| P0 | `Thêm tạm ứng nhưng không nhảy tiền tạm ứng` | Deposit top-up and customer balance | `POST /api/cosmetic/Payments`, `GET /api/cosmetic/CustomerBalance/:id`, `GET /api/cosmetic/Payments/deposits` | Money workflow |
| P0 | `Không ghi nhận được thanh toán` | Payment recording | `POST /api/cosmetic/Payments`, `GET /api/cosmetic/Payments`, `payment_allocations`, residual refresh | Money workflow |
| P1 | `Khi phân quyền cho nhân sự, ấn lưu thì báo lỗi` | Staff permissions | `PUT /api/Permissions/employees/:employeeId`, `employee_permissions`, `permission_overrides`, `employee_location_scope` | Auth/permissions workflow |

## Execution Model

The full implementation should be split across workers because it crosses customers, appointments, money, and permissions. Use one independent reviewer who only checks the work, TestSprite ledger, screenshots, Semgrep output, and live proof.

- Agent A: customer create and customer profile save.
- Agent B: appointment create from calendar and customer profile.
- Agent C: deposit balance and payment recording.
- Agent D: staff permission save.
- Reviewer: independent diff, docs, tests, Semgrep, TestSprite, screenshots, and deploy proof.

Use a clean worktree for implementation. The current root checkout may contain unrelated dirty work.

```bash
cd /Users/thuanle/Documents/TamTMV/Tgrouptest
git fetch origin
git worktree add .worktrees/nk3-feedback-fixes -b codex/nk3-feedback-fixes origin/main
cd .worktrees/nk3-feedback-fixes
bash scripts/prompt-authority-check.sh
```

### NK3 Deploy Prerequisites

Before any NK3 deploy, the VPS shell MUST export the Cosmetic LOB v2 feature flags:

```bash
export COSMETIC_LOB_ENABLED=true
export VITE_COSMETIC_LOB_ENABLED=true
```

Then build with:

```bash
docker compose up -d --build web api
```

Without these flags the frontend hides the LOB toggle and the backend returns 503 on `/api/cosmetic/*`. NK and NK2 must NOT set these flags.

## Required First Pass

- [ ] Confirm the exact LOB and domain with the reporter. Default to `tmv.2checkin.com` Cosmetic if no clarification is available.
- [ ] Reproduce each failure locally first when practical.
- [ ] Capture live read-only state and screenshots before live mutations.
- [ ] For live mutation tests, create clearly named QA records like `NK3 QA FEEDBACK <timestamp>` and record cleanup IDs.
- [ ] Pull current manual and auto feedback IDs from `/api/Feedback/all` so fixed items can be tied back to the feedback queue.
- [ ] Check browser console and network failures for every failed save, especially status, request URL, payload, and response body.
- [ ] Verify Cosmetic mode rewrites data APIs to `/api/cosmetic/*` and never writes Dental data.

## Task 1: Fix Customer Profile Creation

Affected files to inspect first:

- `website/src/components/forms/AddCustomerForm/`
- `website/src/hooks/useCustomers.ts`
- `website/src/lib/api/partners.ts`
- `api/src/routes/partners.js`
- `api/src/routes/partners/`
- `api/src/db/index.js`

Checklist:

- [ ] Reproduce Add Customer save in Cosmetic mode.
- [ ] Confirm request path is `POST /api/cosmetic/Partners`.
- [ ] Confirm backend handler uses request-scoped `getQuery(req)` or `getDb('cosmetic')`, not a bare dental pool.
- [ ] Confirm generated Cosmetic customer code starts with `TM` and does not collide.
- [ ] Confirm phone duplicate handling follows product-map rules: phone is not durable unique identity.
- [ ] Confirm failed validation stays next to the field and server errors are visible to staff.
- [ ] Add or update unit/API tests for Cosmetic customer create and Dental regression.
- [ ] Add Playwright/TestSprite check for Cosmetic customer create, list refresh, profile open, and Dental non-mutation.

Done when:

- A Cosmetic QA customer can be created from the UI, appears in Cosmetic customer list/profile, and is not returned from Dental customer lookup.

## Task 2: Fix Appointment Creation

Affected files to inspect first:

- `website/src/components/appointments/`
- `website/src/hooks/useAppointments.ts`
- `website/src/lib/api/appointments.ts`
- `api/src/routes/appointments.js`
- `api/src/routes/appointments/`

Checklist:

- [ ] Reproduce appointment save from `/calendar?lob=cosmetic`.
- [ ] Reproduce appointment save from a Cosmetic customer profile.
- [ ] Confirm request path is `POST /api/cosmetic/Appointments`.
- [ ] Confirm selected customer, service, location, doctor, assistant, and consulting staff IDs all come from Cosmetic data when Cosmetic is active.
- [ ] Confirm backend appointment mutation uses Cosmetic DB request scope.
- [ ] Confirm selectors hydrate saved inactive/migrated staff values where required.
- [ ] Confirm successful save refreshes visible calendar/customer-profile appointment lists immediately.
- [ ] Add unit/API tests for Cosmetic appointment create and Dental regression.

Done when:

- Cosmetic appointment create succeeds from both calendar and customer profile, and the created row is visible only in Cosmetic mode.

## Task 3: Fix Deposit Top-Up Balance Refresh

Affected files to inspect first:

- `website/src/hooks/useDeposits.ts`
- `website/src/hooks/useCustomerPayments.ts`
- `website/src/hooks/usePayment.ts`
- `website/src/components/payment/`
- `api/src/routes/payments.js`
- `api/src/routes/customerBalance.js`
- `product-map/business-logic/payment-allocation.md`

Checklist:

- [ ] Reproduce deposit create for a Cosmetic customer.
- [ ] Confirm deposit create hits `POST /api/cosmetic/Payments`.
- [ ] Confirm top-up rows are classified with `deposit_type = 'deposit'` or match the backend deposit criteria.
- [ ] Confirm balance endpoint hits `GET /api/cosmetic/CustomerBalance/:id`.
- [ ] Confirm deposit list hits `GET /api/cosmetic/Payments/deposits`.
- [ ] Confirm frontend invalidates/refetches customer balance and deposit history after a successful deposit.
- [ ] Confirm Dental customer balance is unchanged by Cosmetic deposit creation.
- [ ] Add API tests for Cosmetic balance after deposit and frontend tests for refetch behavior.

Done when:

- After adding a Cosmetic deposit, the customer balance and deposit history update without manual reload.

## Task 4: Fix Payment Recording

Affected files to inspect first:

- `website/src/components/payment/PaymentForm.tsx`
- `website/src/lib/api/payments.ts`
- `website/src/hooks/usePayment.ts`
- `api/src/routes/payments.js`
- `api/src/services/commissionEngine.js` if payment collection triggers earnings

Checklist:

- [ ] Reproduce regular payment save for a Cosmetic customer.
- [ ] Confirm request path is `POST /api/cosmetic/Payments`.
- [ ] Confirm allocation target exists in Cosmetic DB (`saleorders` or `dotkhams`) before submit.
- [ ] Confirm over-allocation errors return clear staff-visible messages.
- [ ] Confirm payment success updates payment history, residual balance, service/treatment row, and customer balance immediately.
- [ ] Confirm mixed payment and deposit-used cases still satisfy `amount = cash_amount + bank_amount + deposit_used`.
- [ ] Add API tests for Cosmetic payment create with allocation and frontend tests for visible refresh.
- [ ] Run Semgrep for changed payment/backend data-flow paths before completion.

Done when:

- A Cosmetic service payment records successfully, updates canonical `payments + payment_allocations`, refreshes residuals, and does not affect Dental.

## Task 5: Fix Staff Permission Save

Affected files to inspect first:

- `website/src/pages/Permissions*`
- `website/src/components/settings/`
- `website/src/lib/api/permissions.ts`
- `website/src/hooks/usePermissions.ts`
- `api/src/routes/auth.js`
- `api/src/middleware/auth.js`
- Permission route file if split from auth.

Checklist:

- [ ] Reproduce permission save from `/permissions?lob=cosmetic`.
- [ ] Capture response body and failing endpoint.
- [ ] Confirm whether permission assignment is intended to remain top-level auth data or needs Cosmetic employee scoping. Do not guess if this conflicts with product-map/auth ownership.
- [ ] Confirm selected employee ID exists in the table the permission save route reads.
- [ ] Confirm permission save writes `employee_permissions`, `permission_overrides`, and `employee_location_scope` consistently.
- [ ] Confirm save handles employees with Cosmetic-only scope and no Dental employee row.
- [ ] Confirm frontend route guard and backend effective-permission resolution stay aligned after save.
- [ ] Add API tests for permission save and `GET /api/Auth/me` / `GET /api/Permissions/resolve/:employeeId` effective permission refresh.
- [ ] Run Semgrep for changed auth/permission paths before completion.

Done when:

- Saving permissions for a Cosmetic staff member succeeds, shows success feedback, and the next login or `/api/Auth/me` reflects the intended access.

## Test And Verification Matrix

Local commands before any deployment:

```bash
npm run verify:prompt
npm --prefix contracts run build
npm --prefix api test
npm --prefix website test
npm --prefix website run lint
npm --prefix website run build
```

Scoped security checks for implementation changes:

```bash
/opt/homebrew/bin/semgrep scan --config p/default --metrics=off \
  api/src/routes/auth.js \
  api/src/middleware/auth.js \
  api/src/routes/payments.js \
  api/src/routes/customerBalance.js \
  api/src/routes/partners.js \
  api/src/routes/appointments.js \
  website/src/lib/api \
  website/src/hooks \
  website/src/components/payment
```

Browser proof required for each fixed workflow:

- Screenshot of successful Cosmetic customer create and profile.
- Screenshot of successful Cosmetic appointment create from calendar.
- Screenshot of successful Cosmetic appointment create from customer profile.
- Screenshot of deposit top-up followed by updated deposit balance.
- Screenshot of payment save followed by updated payment history/residual.
- Screenshot of permission save success and refreshed effective access.
- Network evidence that Cosmetic writes went to `/api/cosmetic/*` where applicable.
- Dental regression check showing the same workflow still uses legacy top-level `/api/*`.

Production verification after deploy:

- Confirm `https://tmv.2checkin.com/version.json` matches the intended release.
- Confirm `https://tmv.2checkin.com/api/health` has `db:true`; separate optional face-service degradation from workflow health.
- Re-run the five staff feedback workflows on live with QA data and screenshots.
- Confirm no new current-host auto feedback errors were created by the QA run.
- Mark feedback items resolved only after live proof exists.

## TestSprite Plan

TestSprite should execute this as a feature-flow regression suite, not as isolated click checks.

- Roles: admin with Dental and Cosmetic LOB access, Cosmetic staff with customer/appointment/payment permissions, admin allowed to edit permissions.
- Setup: authenticated session on `https://tmv.2checkin.com`; Cosmetic selected; QA customer/service/employee records created or available; screenshots saved under `output/playwright/nk3-feedback-fixes-*`.
- Happy paths: customer create, appointment create, deposit top-up, payment record, permission save.
- Edge cases: duplicate phone, missing required fields, inactive/migrated staff hydration, over-allocation, empty deposit wallet, insufficient permission, LOB switch during open modal.
- Regressions: Dental writes accidentally using Cosmetic routes, Cosmetic writes accidentally using Dental routes, stale balance after save, silent 403/500 errors, feedback auto-error spam, broken `nk.2checkin.com` baseline.
