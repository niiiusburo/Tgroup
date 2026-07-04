# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note.

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
