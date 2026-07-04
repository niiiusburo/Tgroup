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
- [ ] PENDING: Investor cannot open a direct URL for a non-allowlisted customer; API returns 404/empty result.
- [ ] PENDING: Investor lacks write actions for customers, payments, appointments, and services.
- [ ] PENDING: Stale deploy preflight rejects old investor branches that do not contain the live NK/NK2 commit.

Setup/login data: Use the live admin account to assign visibility, then the live investor account to verify portal/data scope. Do not print credentials in this ledger.
