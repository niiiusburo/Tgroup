# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note.

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

# TestSprite Plan: NK2 employee revenue export branch-scope hardening 2026-07-04

Feature/edit name: NK2-only employee revenue export branch-scope hardening.

Changed URLs / API routes / data flow:
- NK2 live route: `https://nk2.2checkin.com/reports/revenue`
- API: `POST /api/Exports/report-sales-employees/preview`
- API: `POST /api/Exports/report-sales-employees/download`
- Data flow: JWT employee -> `resolveEffectivePermissions()` -> resolved employee locations -> `reportSalesEmployeesExport.resolveCompanyScope()` -> scoped SQL/workbook rows.

Expected behavior:
- A report-capable employee assigned to one branch who submits `companyId=all` downloads only their resolved branch rows.
- An out-of-scope explicit `companyId` returns `403 EXPORT_LOCATION_DENIED` before SQL runs.
- Admin/Super Admin group names do not bypass branch scope unless effective permissions include wildcard `*`.
- A true wildcard `*` permission remains the only all-location export override.

User roles:
- One-location NK2 employee with `reports.export`.
- Global NK2 employee with explicit wildcard `*`.

Execution items:
- [x] PASS: Focused Jest proves Super Admin-named one-location employee is scoped and wildcard `*` remains global - verified in the original hotfix checkout before NK2 deploy.
- [x] PASS: Scoped Semgrep scan reports no blocking findings for the export builder - `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off api/src/services/exports/builders/reportSalesEmployeesExport.js` returned 0 findings.
- [x] PASS: NK2-only API deploy updates `tgroup-staging-api` without changing NK or NK3 - rebuilt only `/opt/tgroup-staging/runtime` API service after backing up the original builder to `/opt/tgroup-staging/backups/nk2-employee-export-scope/reportSalesEmployeesExport.js.pre-20260704T035337Z`.
- [x] PASS: Live NK2 API proof shows `companyId=all` workbook branches are limited to the employee's allowed location - local artifact `output/proof/location-report-scope-20260704/nk2-live-api-proof-after.json` shows XLSX branch list `["Tấm Dentist Quận 3"]` and `branchViolations: []`.
- [x] PASS: Live NK2 negative-path proof returns `403 EXPORT_LOCATION_DENIED` for another branch - local artifact `output/proof/location-report-scope-20260704/nk2-live-api-proof-after.json` shows requested branch `Nha khoa Tấm Dentist` returned 403 with code `EXPORT_LOCATION_DENIED`.
