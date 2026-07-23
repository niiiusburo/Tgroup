# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note.

---

# TestSprite Plan: investor client selection fix (admin cannot add clients) 2026-07-08

Feature/edit name: v0.32.56 — investor visibility admin toggle (UUID regex, admin gate, deterministic resolver, scope-union list/untick).

Changed URLs / API routes / data flow:
- Frontend surface (unchanged code): `/customers` — investor checkbox column (`input[type=checkbox][aria-label]`), admin only.
- API: `GET /api/Partners/investor-visibility`, `PATCH /api/Partners/:id/investor-visibility` (`api/src/routes/partners/investorVisibility.js`, route gating in `api/src/routes/partners.js`).
- Data flow: admin JWT → `assertAdmin` (NOT `permissions.edit`) → `getConfiguredInvestor` (deterministic single investor, `scopeMatchIds` union of partner id + active `dbo.investor_accounts.id`) → upsert/clear `dbo.investor_clients`; investor read (`resolveInvestorScope`) matches the SAME union.

Expected behavior:
- Admin ticks a customer's investor checkbox → `PATCH` 200, row `is_visible=true`, checkbox checked.
- Admin unticks → `PATCH` 200, cleared under every union key, checkbox unchecked; investor no longer sees the client.
- Malformed customer id → 400 `VALIDATION`; a canonical 8-4-4-4-12 UUID is accepted (the regression).
- More than one active investor account never 409s; the admin list equals the investor's visible set.
- Non-admin (staff/investor) hitting these routes → 403 `ADMIN_REQUIRED` (investors cannot self-grant clients).

User roles:
- Admin `t@clinic.vn` (tick/untick). Investor `investor@2checkin.com` (read scope). Non-admin (negative path).

Execution items:
- [x] PASS: `investorVisibilityCompatibility.test.js` + `investorVisibilityHandlers.test.js` — 8/8; full investor+permission suite 46/46 (2026-07-08, local).
- [x] PASS: Local demo DB end-to-end — login `t@clinic.vn` → `GET` 200 → `PATCH` on 200 (`is_visible=t`) → `PATCH` off 200 (`is_visible=f`); malformed id → 400.
- [x] PASS: Real headless-Chromium at `127.0.0.1:5175` — 20 investor checkboxes rendered, tick ON → PATCH 200 + checked, tick OFF → PATCH 200 + unchecked, zero console errors.
- [ ] PENDING: nk2 (staging) live deploy verification — admin `t@clinic.vn` at `https://nk2.2checkin.com/customers` ticks/unticks a client, PATCH 200, checkbox reflects; then investor login sees exactly the admin-selected set.
- [ ] PENDING: nk2 negative path — a non-admin session gets 403 on `PATCH /api/Partners/:id/investor-visibility`.
- [ ] PENDING: nk (prod) verification — deferred until after nk2 sign-off.

Setup/login data: Admin `t@clinic.vn` and investor `investor@2checkin.com` on nk2; do not print credentials in this ledger.

---

# TestSprite Plan: phantom update toast + investor employees.view 403 2026-07-07

Feature/edit name: v0.32.55 — update-check unknown-commit guard, GIT_SHA baking in vite.config, useEmployees permission gate.

Changed URLs / API routes / data flow:
- Frontend only: `website/src/hooks/useEmployees.ts` (gates `GET /api/Employees` on `employees.view`), `website/src/hooks/useVersionCheck/versionUtils.ts` (`hasUpdate` ignores `unknown` commits), `website/vite.config.ts` (bakes `GIT_SHA`/`GIT_BRANCH` env vars into `__APP_GIT_COMMIT__`/`__APP_GIT_BRANCH__`).
- No API or contract changes.

Expected behavior:
- Fresh browser load on nk/nk2 while fully up to date shows NO "Có bản cập nhật / New version is ready" toast.
- Investor session (investor@2checkin.com) Overview load produces zero `employees.view` 403 console errors; dashboard still renders appointments.
- Admin session still loads employees everywhere (Employees page, appointment/service forms).
- A real deploy of a newer version still shows the update toast (semver bump path unaffected).

User roles:
- Investor account (no employees.view), admin t@clinic.vn (full permissions).

Execution items:
- [x] PASS: `useEmployees.permissions.test.ts` — 4/4 (fetch with permission, skip without, no debounced search fetch without, enabled=false honored).
- [x] PASS: `useVersionCheck.test.ts` — 3 new unknown-commit `hasUpdate` cases green; full suite at pre-existing-failure baseline (11), zero new failures.
- [x] PASS: 2026-07-07 ~8:00 AM — investor@2checkin.com session on nk prod: 0 console errors (was 2), no update toast, v0.32.55 badge, Overview renders; same result on nk2.
- [x] PASS: nk + nk2 both serve version.json gitCommit `59a038c` AND bundle `assets/index-C1uhLzSi.js` bakes `gitCommit:"59a038c"` — first deploy where they match (previously bundle said "unknown").

---

# TestSprite Plan: NK/NK2 employee revenue all-location extraction 2026-07-06

Feature/edit name: Employee revenue export treats `companyId=all` as full extraction.

Changed URLs / API routes / data flow:
- API: `POST /api/Exports/report-sales-employees/preview`
- API: `POST /api/Exports/report-sales-employees/download`
- Data flow: JWT employee -> `reports.export` registry permission -> `reportSalesEmployeesExport.resolveCompanyScope()` -> unfiltered branch SQL when `companyId=all`; explicit branch IDs still validate against resolved employee locations unless `*` is present.

Expected behavior:
- A report-capable employee who submits `companyId=all` can extract all branches, even if the account has no resolved branch scope.
- An explicit out-of-scope `companyId` still returns `403 EXPORT_LOCATION_DENIED` before SQL runs.
- Investor sessions still apply `dbo.investor_clients` allowlist filters after the all-branch choice.

User roles:
- Report-capable employee with `reports.export`.
- Investor account with `reports.export` and allowlisted customers.

Execution items:
- [x] PASS: Focused Jest proves `companyId=all` omits the `so.companyid` SQL predicate and no-scope accounts can preview.
- [x] PASS: Focused Jest proves explicit out-of-scope branch requests still return `EXPORT_LOCATION_DENIED`.
- [x] PASS: Investor export-scope Jest still proves allowlisted customer filtering for `report-sales-employees`.
- [ ] PENDING: After deploy, live NK and NK2 preview for `t@clinic.vn` and June 2026 returns 200 for `report-sales-employees` with `companyId=all`.

---

# TestSprite Plan: NK2 Trợ lý bác sĩ selector restore 2026-07-03

Feature/edit name: Employee role inference classifies Trợ lý bác sĩ rows as `doctor-assistant` even when migrated data also has `isdoctor=true`.

Changed URLs / API routes / data flow:
- Frontend: `/services` patient service form and appointment staff fields consume `useEmployees()` roles for `DoctorSelector filterRoles={['doctor-assistant']}`.
- Data flow: `GET /api/Employees` → `useEmployees.mapApiEmployeeToEmployee` → `inferRoleFromFlags` → `DoctorSelector`.

User roles: Clinic staff creating or editing appointments and patient service records.

Happy paths:
- [ ] PENDING: Open a service form on NK2, choose a branch with active Trợ lý bác sĩ rows, and confirm the `Trợ lý Bác sĩ` dropdown lists staff.
- [ ] PENDING: Search the dropdown with unaccented text such as `tro ly` and confirm Vietnamese role/name matches still appear.
- [ ] PENDING: Plain doctors remain visible in the `Bác sĩ` dropdown and plain assistants remain visible in the `Phụ tá` dropdown.

Edge cases / regressions:
- [ ] PENDING: A migrated row with `isdoctor=true`, `isassistant=true`, and `jobtitle='Trợ lý bác sĩ'` maps to role `doctor-assistant`.
- [ ] PENDING: An inactive Trợ lý bác sĩ row stays hidden from the dropdown.
- [ ] PENDING: Employee list role counts include doctor-assistant rows without breaking the employees page.

Setup/login data: Staff login on NK2 with a branch containing active Trợ lý bác sĩ employees.

---

# TestSprite Plan: NK/NK2 investor same-portal scope 2026-07-04

Feature/edit name: Investor users log in through the normal portal and see only admin-allowlisted customers, reports, exports, services, and appointments.

Changed URLs / API routes / data flow:
- Frontend: `/login`, `/customers`, `/customers/:id`, `/services`, `/reports/*`, customer list admin visibility checkbox.
- API: `POST /api/Auth/login`, `GET/PATCH /api/Partners/*investor-visibility`, customer/appointment/payment/service/report/export read routes.
- Data flow: `dbo.investor_accounts` → `dbo.partners.tier_id=investor` → `resolveInvestorScope()` → `dbo.investor_clients` allowlist filters.

User roles: Admin assigning investor-visible customers; investor viewing approved customer data.

Happy paths:
- [ ] PENDING: Investor logs in on NK and lands in the normal app shell, not a separate investor portal.
- [ ] PENDING: Investor logs in on NK2 and lands in the normal app shell, not a separate investor portal.
- [ ] PENDING: Admin-visible customer list checkbox allows one test customer and the investor sees that customer in `/customers`.
- [ ] PENDING: Investor opens the allowed customer profile and a service or appointment card; TLBS data populates.
- [ ] PENDING: Investor report and Excel/export output includes only allowlisted customer rows.

Edge cases / regressions:
- [ ] PENDING: Existing NK/NK2 `dbo.investor_clients` rows keyed by `dbo.investor_accounts.id` still scope the investor linked through `investor_accounts.partner_id`.
- [ ] PENDING: Live permission group name `Investor` (capitalized) still activates investor allowlist filters and does not fall back to unscoped staff reads.
- [ ] PENDING: Investor cannot open a direct URL for a non-allowlisted customer; API returns 404/empty result.
- [ ] PENDING: Investor lacks write actions for customers, payments, appointments, and services.
- [ ] PENDING: Stale deploy preflight rejects old investor branches that do not contain the live NK/NK2 commit.

Setup/login data: Use the live admin account to assign visibility, then the live investor account to verify portal/data scope. Do not print credentials in this ledger.

---

# TestSprite Plan: NK/NK2 investor export allowlist hotfix 2026-07-04

Feature/edit name: Investor Excel/export builders apply the same admin-allowlisted customer scope as the normal portal.

Changed URLs / API routes / data flow:
- API: `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download`.
- Export types: `customers`, `services`, `appointments`, `payments`, `revenue-flat`, `deposit-flat`, `report-sales-employees`.
- Data flow: normal staff JWT → `resolveInvestorScope()` → `dbo.investor_clients` allowlist → export builder SQL predicate.

User roles: Investor downloading/previewing export data; admin assigning investor-visible customers.

Happy paths:
- [ ] PENDING: Investor export preview for an allowed customer search returns rows for the allowlisted customer.
- [ ] PENDING: Investor export download for customer-derived exports excludes non-allowlisted customers.
- [ ] PENDING: Employee revenue report export still honors branch/location scope while also applying investor customer allowlist.

Edge cases / regressions:
- [ ] PENDING: Empty investor allowlist returns zero export rows instead of falling back to all customers.
- [ ] PENDING: Non-investor staff/admin exports remain unchanged.
- [ ] PENDING: Legacy NK/NK2 account-keyed `dbo.investor_clients` rows still scope exports through the linked partner account.

Setup/login data: Use the live investor account and known allowed/forbidden customer refs from the NK/NK2 investor same-portal proof. Do not print credentials in this ledger.

---

# TestSprite Plan: NK2 employee revenue export branch-scope hardening 2026-07-04 — SUPERSEDED

Feature/edit name: NK2-only employee revenue export branch-scope hardening. Superseded by "NK/NK2 employee revenue all-location extraction 2026-07-06" above.

Changed URLs / API routes / data flow:
- NK2 live route: `https://nk2.2checkin.com/reports/revenue`
- API: `POST /api/Exports/report-sales-employees/preview`
- API: `POST /api/Exports/report-sales-employees/download`
- Data flow: JWT employee -> `resolveEffectivePermissions()` -> resolved employee locations -> `reportSalesEmployeesExport.resolveCompanyScope()` -> scoped SQL/workbook rows.

Expected behavior:
- SUPERSEDED: The July 6 product rule now says `companyId=all` downloads all branch rows for `report-sales-employees`.
- Still current: an out-of-scope explicit `companyId` returns `403 EXPORT_LOCATION_DENIED` before SQL runs.

User roles:
- One-location NK2 employee with `reports.export`.
- Global NK2 employee with explicit wildcard `*`.

Execution items:
- [x] PASS: Focused Jest proves Super Admin-named one-location employee is scoped and wildcard `*` remains global - verified in the original hotfix checkout before NK2 deploy.
- [x] PASS: Scoped Semgrep scan reports no blocking findings for the export builder - `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/services/exports/builders/reportSalesEmployeesExport.js` returned 0 findings.
- [x] PASS: NK2-only API deploy updates `tgroup-staging-api` without changing NK or NK3 - rebuilt only `/opt/tgroup-staging/runtime` API service after backing up the original builder to `/opt/tgroup-staging/backups/nk2-employee-export-scope/reportSalesEmployeesExport.js.pre-20260704T035337Z`.
- [x] PASS: Live NK2 API proof shows `companyId=all` workbook branches are limited to the employee's allowed location - local artifact `output/proof/location-report-scope-20260704/nk2-live-api-proof-after.json` shows XLSX branch list `["Tấm Dentist Quận 3"]` and `branchViolations: []`.
- [x] PASS: Live NK2 negative-path proof returns `403 EXPORT_LOCATION_DENIED` for another branch - local artifact `output/proof/location-report-scope-20260704/nk2-live-api-proof-after.json` shows requested branch `Nha khoa Tấm Dentist` returned 403 with code `EXPORT_LOCATION_DENIED`.

---

# TestSprite Plan: customer-source migration incident guard 2026-07-23

Feature/edit name: Historical `Nguồn khách` attribution recurrence guard.

Changed data flow: five destructive customer-source history files remain available for forensics but use `.sql.retired`, so neither top-level nor recursive `*.sql` selection can execute them. Customer-source lists now expose customer/order usage counts; new sale orders reject inactive/missing sources; an existing order can preserve only its exact inactive historical source; referenced lookups cannot be deleted.

Expected behavior:
- [x] PASS: Focused Jest proves all five destructive basenames are absent from active migrations.
- [x] PASS: Focused Jest proves each forensic artifact exists with an explicit `RETIRED` warning and non-executable extension.
- [x] PASS: Focused Jest simulates recursive `*.sql` discovery and selects no file from the quarantine directory. The combined migration, revenue-export, and import run passed 24/24 tests.
- [ ] PENDING REMOTE: The PR documentation-governance job now runs the focused customer-source migration guard; GitHub execution awaits a pushed PR.
- [x] PASS PRODUCTION: After the exact user confirmation, the 43-order Q10 transaction committed in `tdental_demo`. PostgreSQL transaction `276262` wrote exactly 43 `saleorders`, 0 `partners`, 0 `payments`, 1 `customersources`, 43 repair-audit rows, and 1 metadata row; post-checks found zero target mismatches.
- [x] PASS REHEARSAL: Restored the verified production backup into disposable PostgreSQL 16 databases. Both apply and rollback refused missing confirmation tokens; the authorized apply changed exactly 43 orders to 21 `Giới thiệu`, 16 `Khách cũ`, 4 `Khách hàng giới thiệu`, and 2 `Hotline`; the authorized rollback restored 41 `Sale Online` and 2 `Khách hàng giới thiệu`. Deterministic full-row SHA-256 comparisons against a second clean restore matched for all 39,938 partners, 78,136 payments, 68,268 sale orders, and 11 customer-source rows after rollback.
- [x] PASS LOCAL: API regression coverage rejects inactive/missing sources, preserves an already-assigned inactive source on the same order, counts sale-order references, and blocks referenced-source deletion. Frontend coverage verifies active-only choices, selected historical preservation, and numeric count mapping.
- [x] PASS LOCAL RACE/DB GUARD: Sale-order writes and source management use transaction-scoped lookup locks; migration 050 adds validated `ON DELETE RESTRICT` foreign keys. Applying the migration twice to a disposable restore passed, and both referenced-source deletion and orphan-source assignment failed as required.
- [ ] PENDING FRESH CONFIRMATION: Strict row-key comparison found one additional mismatch, `SO-2026-5176` (`T478964`, `Khách cũ` → `Sale Online`), outside the confirmed manifest. It remains unmodified.

Negative paths: renaming any retired artifact back to `.sql` makes the migration guard fail; submitting an inactive/missing source returns `400 CUSTOMER_SOURCE_NOT_SELECTABLE`; deleting a source referenced by any customer or order returns `400 CUSTOMER_SOURCE_IN_USE`; the checked-in 43-order manifest test explicitly excludes unconfirmed `SO-2026-5176`.
