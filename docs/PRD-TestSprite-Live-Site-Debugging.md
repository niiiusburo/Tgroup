# PRD: TestSprite Live-Site Debugging For NK3 / TMV

Date: 2026-06-09
Target site: https://tmv.2checkin.com
Execution mode: TestSprite Web Portal / live URL exploration, not localhost and not local MCP bootstrap.
Default line of business: Cosmetic / Tham my, unless a test explicitly says Dental.

## 1. TestSprite Research Summary

TestSprite is a spec-driven AI testing platform. Its Web Portal takes a PRD, a live URL, optional credentials, and any supporting API docs, then extracts a feature map, explores the live app, generates an editable test plan, runs Playwright UI tests or Python API tests in the cloud, and produces reports with screenshots, video, logs, and suggested causes/fixes.

Official behavior this PRD is designed for:

- TestSprite Web Portal is the correct surface when QA needs a browser dashboard to configure projects, manage credentials, run tests, review reports, group tests, and schedule monitoring: https://docs.testsprite.com/web-portal/getting-started/overview
- PRD upload is strongly recommended because it creates the feature map that grounds generated tests: https://docs.testsprite.com/web-portal/getting-started/overview
- UI testing runs against a live URL with Playwright-style browser automation and records video plus per-step screenshots: https://docs.testsprite.com/web-portal/core/ui/ui-testing
- Feature Exploration visits the live app before plan generation, attempts real user flows, records what it can and cannot reach, and falls back to the PRD where exploration is blocked: https://docs.testsprite.com/web-portal/core/ui/feature-exploration
- Test reports expose pass/fail/blocked status, per-step evidence, generated code, recordings, authentication state, and AI-authored cause/fix summaries: https://docs.testsprite.com/web-portal/core/working-with-test/test-detail
- Test Lists and Monitoring can group stable live checks and schedule repeated runs: https://docs.testsprite.com/web-portal/maintenance/test-lists and https://docs.testsprite.com/web-portal/monitoring

## 2. Product Being Tested

NK3 / CTV is a clinic operations and referral web app for T Group. The live target for this PRD is `https://tmv.2checkin.com`. The same React shell contains Cosmetic and Dental data paths, public visitor flows, admin/staff workflows, CTV referral workflows, report views, commission management, payments, customer operations, and calendar scheduling.

This PRD is not a product marketing PRD. It is a TestSprite-ready debugging contract: generate tests that find broken pages, wrong API routes, permission failures, blank states, stale redirects, LOB leakage, slow-loading workflows, and production-only regressions on the live site.

Existing source-grounded companion PRD:

- `docs/PRD-extracted.md` contains the broader code-derived feature map and route inventory.
- `website/testsprite_tests/testsprite_frontend_test_plan.json` contains the latest local TestSprite-style plan with 41 live-route scenarios.
- `website/.testsprite/config.json` already records the live base URL and project scopes, but credentials must be configured in TestSprite's Authentication UI or shared out-of-band, not copied into this PRD.

## 3. Objectives

1. Generate a live-site UI test plan that can be uploaded into TestSprite Web Portal and pointed at `https://tmv.2checkin.com`.
2. Separate safe read-only checks from mutation checks so production data is not changed accidentally.
3. Give TestSprite enough product intent to classify failures as product bugs, stale test-plan assumptions, auth/setup blockers, or expected blocked flows.
4. Capture browser-visible proof for every failure: screenshot, video, route, visible text, network status code, and console/API errors.
5. Support repeated live debugging by creating stable Test Lists: daily read-only smoke, public visitor smoke, CTV/commission regression, and approved mutation run.

## 4. Non-Goals

- Do not bootstrap or run TestSprite against localhost for this PRD.
- Do not use local MCP project analysis as the primary execution path.
- Do not run destructive or money-moving production tests without explicit approval and disposable setup data.
- Do not validate database sync, restore, or import flows in TestSprite. Those require the repo database-sync double-confirmation process.
- Do not assert old bugs as still present unless the current live TestSprite run reproduces them.

## 5. TestSprite Project Setup

Recommended Web Portal setup:

| Field | Value |
|---|---|
| Project name | `NK3 TMV Live Debug - Cosmetic` |
| Test type | UI / frontend |
| Base URL | `https://tmv.2checkin.com` |
| Starting URL | `https://tmv.2checkin.com/login` |
| Login required | Yes for admin/staff flows; no for public flows |
| Credentials | Configure in TestSprite Authentication. Use a dedicated live TestSprite/admin account with Cosmetic and Dental scope. Do not store passwords in the PRD. |
| Default viewport | Desktop 1440 x 900 for admin/staff; add mobile 390 x 844 coverage for CTV/public if supported. |
| Default LOB | Select `Tham my` / Cosmetic after login when the LOB toggle appears. |
| Evidence required | Screenshot and video for each failed/blocked/partial test. Network status and console errors required for debugging. |

Preflight note: on 2026-06-09 from the local Codex machine, `curl -I -L https://ctv.2checkin.com` returned DNS failure (`Could not resolve host`), and TestSprite also blocked on that retired host. The corrected target `https://tmv.2checkin.com` resolves to `76.13.16.68` and returns HTTP 200 from nginx, so TestSprite must run against `tmv.2checkin.com` for active live debugging.

## 6. Roles

| Role | What TestSprite should verify |
|---|---|
| Public visitor | Can open landing, CTV join, public booking/referral, and discount landing routes without login. |
| Admin/staff with Cosmetic access | Can log in, select Cosmetic, open all protected admin routes, search/filter records, and read reports without blank states or unexpected 403/404/500s. |
| Multi-LOB admin | Can switch Dental/Cosmetic without stale data leakage. |
| CTV user | Can log in to `/ctv` and use the mobile CTV portal when a known-good CTV credential is configured. |
| Unauthorized user | Cannot reach protected admin routes and is redirected to `/login`. |

## 7. Data-Safety Lanes

### Lane A: Always Safe / Read-Only

These tests may run on live without creating or editing data:

- Login success and invalid-login rejection.
- Route load sweep for admin pages.
- Customer, employee, service, commission, payment, permission, and report list rendering.
- Search and filter checks that do not save.
- Calendar view/date navigation without creating appointments.
- Public pages rendering without submit.
- LOB toggle read-only isolation checks.
- API/network observation for page loads.

### Lane B: Approved Disposable Writes Only

These require explicit approval and disposable records prefixed with `ZZ_TESTSPRITE_`:

- Create/edit/soft-delete customer.
- Create/deactivate employee.
- Create/suspend CTV.
- CTV portal QR generation: click `Tao ma & tai anh` / `Tạo mã & tải ảnh`, which creates a new `ctv_discount_codes` row through `POST /api/discount-codes/generate`.
- Public CTV signup submit.
- Public booking/referral submit.
- Staff discount verification using a disposable QR/code flow.

Cleanup expectation: TestSprite must record every created entity and either clean it up automatically or list orphaned records in the final report.

### Lane C: Prohibited Without Separate Approval

Do not run these in the normal live debug suite:

- Payments, deposits, refunds, voids, payout creation, payout approval, or allocation edits.
- Database import/export/sync/restore.
- Hard deletes of production people or money records.
- Permission changes that could lock out staff.
- Service-card creation that creates real revenue or CTV earnings.

## 8. Core Feature Requirements

### TS-LIVE-001: Authentication

Routes: `/login`, `/`, protected-route redirect.

Acceptance criteria:

- Valid admin credentials land on `/` and show the Overview dashboard.
- Invalid password stays on `/login` and shows an authentication error.
- Logout clears the browser session and protected routes return to `/login`.
- TestSprite must classify login failure as `blocked/auth setup` unless the same credential works manually in the current live site.

### TS-LIVE-002: Admin Shell And Route Load Sweep

Routes:

- `/`
- `/calendar`
- `/customers`
- `/employees`
- `/locations`
- `/services`
- `/service-catalog`
- `/website`
- `/settings`
- `/relationships`
- `/commission`
- `/notifications`
- `/permissions`
- `/payment`
- `/feedback`
- `/reports/dashboard`
- `/reports/revenue`
- `/reports/appointments`
- `/reports/doctors`
- `/reports/customers`
- `/reports/locations`
- `/reports/services`
- `/reports/employees`

Acceptance criteria:

- Every route renders a nonblank page with a domain-specific heading or table/chart content.
- No route redirects unexpectedly to `/` unless it is intentionally guarded or unknown.
- Any visible 403/404/500, blank state, error boundary, infinite spinner, or console/network failure must be reported with screenshot, video timestamp, route, and failing request.

### TS-LIVE-003: Cosmetic LOB Isolation

Routes: `/customers`, `/calendar`, `/commission`, `/payment`, `/reports/*`.

Acceptance criteria:

- Multi-LOB admin can select Cosmetic / `Tham my`.
- Switching between Cosmetic and Dental remounts the page and changes counts/data where expected.
- Cosmetic API traffic should use `/api/cosmetic/*` for mirrored data routes.
- TestSprite must flag any Cosmetic action that calls an unprefixed Dental route when Cosmetic is selected.
- No Cosmetic-only user may read Dental data through unprefixed routes.

### TS-LIVE-004: Customer Management Read-Only

Routes: `/customers`, `/customers/:id`.

Acceptance criteria:

- Customer list loads with search controls and row count/content.
- Accent-insensitive search works: a no-accent query like `phuong` should match Vietnamese names with diacritics such as `Phuong` / `Phuong` variants visible in the UI.
- Opening a row shows a customer profile with tabs/content, not a blank or redirect.
- Mutation controls may be visible for authorized staff, but TestSprite must not click destructive actions in read-only mode.

Approved mutation criteria, only in Lane B:

- Create a `ZZ_TESTSPRITE_` customer.
- Edit only a harmless text field.
- Soft-delete the same created customer.
- If deletion fails, record the actual route. A prior live run suspected missing `/api/cosmetic` prefix on Cosmetic customer delete; retest and classify as fixed or still failing.

### TS-LIVE-005: Calendar

Route: `/calendar`.

Acceptance criteria:

- Day/week/month controls render and switch visible state.
- Next/previous date navigation updates the visible date.
- Existing appointments render without page crash.
- Do not create, drag, reschedule, or cancel appointments in Lane A.

### TS-LIVE-006: Employees

Route: `/employees`.

Acceptance criteria:

- Employee list loads with search/filter controls.
- Add/edit controls do not default to unexpectedly high privilege. If a create modal defaults to Super Admin or equivalent, flag as a UX/security issue.

Approved mutation criteria, only in Lane B:

- Create `ZZ_TESTSPRITE_EMP_*` with the lowest practical role/tier.
- Deactivate or clean up the created employee.

### TS-LIVE-007: Payments And Money Pages

Route: `/payment`.

Acceptance criteria:

- `/payment` renders the payment plan/history surface. The route is singular; `/payments` is stale unless the app intentionally adds it.
- Tables/cards render and can be filtered read-only.
- TestSprite must not submit payments, deposits, voids, refunds, allocations, or payout actions in the ordinary live suite.
- Any money API failure must be captured but not "fixed" by retrying destructive actions.

### TS-LIVE-008: Permissions

Route: `/permissions`.

Acceptance criteria:

- `/permissions` renders the permission board and its tabs.
- `/settings/permissions` should not be treated as canonical unless the app adds that route.
- TestSprite must not save permission changes in live mode.

### TS-LIVE-009: Services And Catalog

Routes: `/services`, `/service-catalog`.

Acceptance criteria:

- Service cards/grid and service catalog table render.
- Search/filter works without diacritic sensitivity where applicable.
- Do not create or edit service cards in Lane A because service-card writes can affect revenue and CTV earnings.

### TS-LIVE-010: Reports

Routes: `/reports/dashboard`, `/reports/revenue`, `/reports/appointments`, `/reports/doctors`, `/reports/customers`, `/reports/locations`, `/reports/services`, `/reports/employees`.

Acceptance criteria:

- All report subpages render charts, tables, totals, or useful empty states.
- Revenue report shows currency totals and date filters.
- Export buttons may be checked for presence but should not download huge live exports unless a specific run asks for export testing.

### TS-LIVE-011: Commission And CTV Admin

Routes: `/commission`, `/commission?tab=ctvs`, `/commission?tab=newClients`, `/commission?tab=earnings`, `/commission?tab=payouts`, `/commission?tab=discountCodes`.

Acceptance criteria:

- Commission config and each tab render without 403/404/500.
- CTV list, new clients, earnings, payouts, and discount codes are readable in Cosmetic mode.
- Payout actions are prohibited in normal live mode.
- Admin create/suspend CTV is Lane B only and must use disposable `ZZ_TESTSPRITE_CTV_*` records.
- CTV login regressions from prior live evidence should be retested only with a known-good CTV credential or a newly approved disposable CTV. Classify inability to enter `/ctv` as current bug, credential/setup blocker, or fixed.

### TS-LIVE-012: CTV Portal

Route: `/ctv`.

Acceptance criteria:

- Non-CTV admin users should not enter the CTV-only portal.
- A real CTV user should land on `/ctv` after login.
- CTV tabs Home, Commission, Tracking, Network, and Me should render with mobile-friendly layout.
- CTV self-profile/password tests are prohibited unless the test uses a disposable CTV account and the run is Lane B.

### TS-LIVE-013: Public Visitor Flows

Routes: `/welcome`, `/welcome?book=1`, `/ctv/join`, `/ctv/discount/:shortCode`, `/verify-discount`.

Acceptance criteria:

- Public landing renders without login.
- Booking/referral form opens but is not submitted in Lane A.
- CTV self-signup form renders and shows name, phone, password required; email optional.
- Discount landing renders public offer content for valid short codes; invalid short codes show a useful error, not admin Overview redirect.
- Staff verify-discount route must require appropriate staff auth and must not let CTV users operate staff verification.

### TS-LIVE-014: CTV QR Generation And Voucher Download

Routes: `/ctv`, `/ctv/discount/:shortCode`, `/verify-discount`.
Primary APIs: `POST /api/discount-codes/generate`, `GET /api/discount-codes/mine`, `GET /api/discount-codes/stats`, `GET /api/discount-codes/landing/:shortCode`.

Safety lane: Lane B only. QR generation writes a discount-code record, so TestSprite must use a disposable or approved CTV account and must record the generated code for cleanup/audit.

Acceptance criteria:

- A CTV user can open `/ctv`, navigate to `Gioi thieu/QR` / `Giới thiệu/QR`, and open the `Ma QR` / `Mã QR` sub-tab.
- The QR panel shows the current tier preview, landing link, copy/share controls, open-preview action, generation hint, and `Tao ma & tai anh` / `Tạo mã & tải ảnh` button.
- Clicking `Tao ma & tai anh` calls `POST /api/discount-codes/generate` with a new code request and succeeds.
- After generation, the UI shows a voucher card with the generated code and a QR canvas whose encoded URL points to `/verify-discount?code=<generated-code>`.
- The PNG download/share action completes or, on mobile share cancellation, leaves the generated voucher visible without crashing.
- `Ma cua toi` / `Mã của tôi` history updates to include the generated code with `generated` or equivalent initial status.
- Opening `/ctv/discount/:shortCode` from the same CTV still renders the public fan landing without redirecting to admin Overview.
- TestSprite report must include screenshot/video proof before generation, after generation with the QR visible, and the history row after refresh/poll.

Negative/edge cases:

- If the CTV account cannot log in, classify this as an auth/setup blocker, not a QR generation failure.
- If `POST /api/discount-codes/generate` returns 401/403, classify as auth/permission bug.
- If the QR canvas is missing after a successful API response, classify as frontend rendering bug.
- Do not proceed to staff `/verify-discount` completion unless the run is explicitly scoped to staff verification with disposable customer data.

## 9. Debugging Requirements For TestSprite Reports

Every failed or blocked case must include:

- Live URL and route.
- Auth role used.
- Current LOB.
- Screenshot and video timestamp.
- Visible error text.
- Failing request method/path/status/body snippet when available.
- Console error summary.
- Classification:
  - `Product bug`
  - `Auth/setup blocker`
  - `Stale test-plan route`
  - `Expected blocked by safety lane`
  - `Performance or timeout`
  - `Needs human decision`
- Suggested owner: frontend, backend, auth/permissions, data/money, infra/deploy, or product rule.

## 10. Test Lists

Create these TestSprite Test Lists after generation:

1. `NK3 Live Read-Only Smoke`
   - Auth, route load sweep, read-only customers, calendar, reports, permissions, services, commission, feedback.
   - Safe for daily monitoring.

2. `NK3 Public Visitor Smoke`
   - `/welcome`, `/welcome?book=1`, `/ctv/join`, discount landing, verify-discount guard.
   - Safe for daily monitoring as long as forms are not submitted.

3. `NK3 CTV / Commission Regression`
   - Commission tabs, CTV guard, CTV login with known-good disposable credential, portal tabs, QR generation, voucher download, and discount-code history.
   - Run manually after CTV/auth/commission changes.

4. `NK3 Approved Disposable Mutation`
   - Customer create/edit/delete, employee create/deactivate, CTV create/suspend, public signup/booking.
   - Run only after explicit approval and setup data confirmation.

5. `NK3 Money Manual Gate`
   - Payment, deposit, void/refund, payout, allocation, service-card revenue/earnings checks.
   - Do not schedule. Execute only after a separate money-flow test plan and production approval.

## 11. Monitoring

Recommended schedule:

- `NK3 Live Read-Only Smoke`: daily during low-traffic hours.
- `NK3 Public Visitor Smoke`: daily during low-traffic hours.
- `NK3 CTV / Commission Regression`: after deploys touching auth, CTV, commission, LOB, discount codes, or earnings.
- Mutation and money lists: manual only.

Alert threshold:

- Any failed auth, blank protected route, unexpected 403/404/500, or public page failure is high priority.
- Any live route timeout over the configured TestSprite timeout should be marked as performance/infra suspect and rerun once before filing as product bug.

## 12. Known Regression Candidates To Retest

These came from prior repo live-artifact evidence and should be retested against the current live build, not assumed current:

- Cosmetic customer soft-delete may call unprefixed `/api/Partners/:id/soft-delete` instead of `/api/cosmetic/Partners/:id/soft-delete`.
- Admin-created CTV login may fail if password/auth mirror rows drift.
- Feedback admin API previously surfaced 403 on `/feedback`; recent repo changelog indicates a permission fix, so classify the current result from live evidence.
- Stale test-plan routes `/payments` and `/settings/permissions` should stay corrected to `/payment` and `/permissions`.

## 13. Acceptance Criteria For This PRD

The PRD is successful when TestSprite can:

- Extract a feature map with admin, public, CTV, LOB, report, commission, payment, and safety-lane coverage.
- Explore `https://tmv.2checkin.com` live without needing localhost.
- Generate a test plan that clearly labels read-only, approved-write, and prohibited money/destructive cases.
- Produce reports with screenshots/video/network evidence usable by engineers to debug the live site.
- Avoid creating or mutating production data unless the TestSprite run is explicitly switched to the approved disposable mutation lane.

## 14. Open Questions

1. Which dedicated live admin/staff account should TestSprite use in the Web Portal Authentication tab?
2. Is there a known-good disposable CTV credential for `/ctv`, or should one be created in a Lane B run?
3. Should TestSprite daily monitoring run only against `tmv.2checkin.com`, or should a separate `nk.2checkin.com` project be created for NK production?
4. Which notification channel should receive TestSprite monitoring failures?
5. Are public booking submissions allowed with disposable data, or should public booking stay render-only?
