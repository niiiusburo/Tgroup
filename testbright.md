# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note. Use this format:

- [ ] PENDING: Check name.
- [x] PASS: Check name - evidence.
- [ ] FAIL: Check name - failure evidence or reproduction.

Do not remove failed checks until the defect is fixed and rerun.

---

# TestSprite Plan: NK3 Cosmetic Customer Code and Places Proxy 2026-05-23

Feature/edit name: NK3 Cosmetic add-customer code generation and Google Places proxy fix

Changed URLs and API routes:
- Live UI to verify: `https://tmv.2checkin.com/customers`.
- API routes: `POST /api/cosmetic/Partners`, `POST /api/Partners`, `GET /api/Places/autocomplete`, `GET /api/Places/details`.

Affected data flows:
- Add Customer form -> `apiFetch('/Partners')` (including live NK3 `{ lob: 'cosmetic' }` data-hook calls) -> cosmetic LOB rewrite -> `/api/cosmetic/Partners` -> request-scoped cosmetic DB `dbo.partners`.
- Backend customer-code generation -> collision check against `partners.ref` -> insert with `TM######` for cosmetic and `T######` for dental.
- Address autocomplete -> backend Places proxy -> `GOOGLE_PLACES_API_KEY` from NK3 API env; browser must not need `VITE_GOOGLE_PLACES_API_KEY`.

User roles:
- Cosmetic staff/admin with `customers.add`, `cosmetic.access`, and cosmetic LOB scope.
- Dental staff/admin with `customers.add` for regression check that dental code still starts with `T`.

Happy paths:
- In cosmetic mode, opening Add Customer does not show the red `VITE_GOOGLE_PLACES_API_KEY` error.
- Typing a Vietnamese address of at least 3 characters calls `/api/Places/autocomplete` without rewriting to `/api/cosmetic/Places`.
- Saving a cosmetic customer creates a `partners.ref` beginning with `TM`.
- Saving a dental customer still creates a `partners.ref` beginning with `T`.

Edge cases:
- Existing generated `ref` collision retries instead of inserting a duplicate.
- Missing server-side `GOOGLE_PLACES_API_KEY` returns a backend config error but does not disable the address input because of missing browser env.
- Cosmetic LOB routing remains isolated to the cosmetic DB for customer create.

Regressions to prevent:
- Leaking Google Places API key into browser build env.
- Rewriting global Places proxy calls into an unmounted `/api/cosmetic/Places` path.
- Generating cosmetic customer codes with the old `T######` dental prefix.
- Breaking dental add-customer code generation.

Setup data and login state:
- Use an authenticated NK3/TMV session with cosmetic LOB selected.
- VPS env must contain `GOOGLE_PLACES_API_KEY` in `/opt/tgroup-nk3/.env.nk3` copied from the existing NK source without printing the secret.
- Test customer data should be clearly marked as QA and removed/soft-deleted after verification if created on live.

Execution checklist:
- [ ] PENDING: Verify Add Customer in cosmetic mode has no browser-side Google key error.
- [ ] PENDING: Verify Places autocomplete network call uses `/api/Places/autocomplete` and returns suggestions for a Vietnam address.
- [ ] PENDING: Create or API-create a cosmetic QA customer and confirm returned `ref` starts with `TM`.
- [ ] PENDING: Run focused backend customer-code tests and frontend LOB routing tests.

---

# TestSprite Plan: Cosmetic LOB Source Workbook Import 2026-05-23

Feature/edit name: Cosmetic LOB source workbook import staging and apply

Changed URLs and API routes:
- Source Google Sheet: `https://docs.google.com/spreadsheets/d/1g51Z2XCjgWu_rvxBG3lzaUIHaCu-if4NOsyXwqBpBlA/edit?gid=312794834#gid=312794834`.
- No frontend URLs changed.
- No API routes changed.
- New CLI-only dry-run/apply script: `api/scripts/cosmetic-lob-import.js`.

Affected data flows:
- `Hồ sơ` tab -> `tcosmetic_demo` / `tcosmetic_smoketest` `dbo.partners` customer/profile rows.
- `Phiếu cọc` tab -> `tcosmetic_demo` / `tcosmetic_smoketest` `dbo.payments` deposit rows.
- `Phiếu khám` tab -> `tcosmetic_demo` / `tcosmetic_smoketest` `dbo.products`, `saleorders`, `saleorderlines`, `payments`, and `payment_allocations`.
- Audit output: `artifacts/cosmetic-lob-import*/*.summary.json` and `*.anomalies.ndjson`.

User roles:
- Data admin / implementation agent running dry-run staging and approved apply.
- Finance/admin reviewer resolving preserved manual-review anomalies.

Happy paths:
- Workbook with exactly 3 tabs (`Hồ sơ`, `Phiếu cọc`, `Phiếu khám`) validates.
- Branch aliases normalize to `Thẩm mỹ Hà Nội` and `Thẩm mỹ Hồ Chí Minh`.
- `Chuyển khoản` normalizes to `bank_transfer`.
- Rows with safe customer candidates produce create/update/skip plan entries and apply idempotently through `COSMETIC_SHEET:*` references.
- Existing source reference codes are planned as `skip_existing`.

Edge cases:
- Missing or extra workbook tab must fail before row planning.
- Money rows with no customer match or multiple customer matches must go to manual review.
- Phone is never treated as a durable unique identity.
- Apply mode must be preceded by local rehearsal, local-vs-VPS compare, source/target backups, and the two explicit confirmations required by `AGENTS.md`.

Regressions to prevent:
- Accidentally importing cosmetic source rows into dental tables.
- Guessing ambiguous money/customer matches.
- Creating payments without canonical allocation planning for paid treatment rows.
- Breaking accent-insensitive matching for Vietnamese source names and branch labels.

Setup data and login state:
- No browser login required.
- Local workbook snapshot: `/tmp/tgroup-cosmetic-source.xlsx`.
- Local DB expected: `tcosmetic_demo` on `127.0.0.1:5433`; live target verified: `tcosmetic_smoketest` on VPS through `tgroup-nk3-api`.
- Latest dry-run summary: `artifacts/cosmetic-lob-import/cosmetic-lob-import-2026-05-23T09-25-00-066Z-5f9a9df7.summary.json`.
- Latest anomaly file: `artifacts/cosmetic-lob-import/cosmetic-lob-import-2026-05-23T09-25-00-066Z-5f9a9df7.anomalies.ndjson`.
- Local before-rehearsal backup: `backups/db-import/tcosmetic_demo-before-cosmetic-sheet-import-20260523-171709.dump`.
- VPS before-import backup: `backups/db-import/tcosmetic_smoketest-vps-before-cosmetic-sheet-import-20260523-171758.dump`.
- Live apply summary: `artifacts/cosmetic-lob-import-vps-apply/cosmetic-lob-import-2026-05-23T10-38-41-332Z-aa64081a.summary.json`.
- Live post-apply dry-run summary: `artifacts/cosmetic-lob-import-vps-post-apply/cosmetic-lob-import-2026-05-23T11-14-37-659Z-915b5266.summary.json`.

Execution checklist:
- [x] PASS 2026-05-23: Download workbook snapshot from Google Sheets as `/tmp/tgroup-cosmetic-source.xlsx` and confirm it contains exactly the 3 required tabs.
- [x] PASS 2026-05-23: Run focused importer tests - `npm --prefix api exec -- jest tests/cosmeticLobImport.test.js --runInBand` passed 6 tests.
- [x] PASS 2026-05-23: Run actual workbook dry-run - summary reported `Hồ sơ=12279`, `Phiếu cọc=1703`, `Phiếu khám=3922`, with 12278 customer creates, 1702 deposit creates, 3922 treatment creates, 3828 payment creates, and 1 anomaly.
- [x] PASS 2026-05-23: Local apply rehearsal backed up `tcosmetic_demo`, applied the workbook, then reran dry-run with zero new creates and the same 1 manual-review anomaly.
- [x] PASS 2026-05-23: Live import gate backed up `tcosmetic_smoketest`, compared local-vs-VPS counts, received both explicit confirmations, and applied only to Cosmetic LOB.
- [x] PASS 2026-05-23: Live post-import DB count check reported 3922 imported sale orders, 5530 imported payments, and 3828 imported allocations in `tcosmetic_smoketest`.
- [x] PASS 2026-05-23: Live post-apply dry-run reported zero new creates, 1702 deposit skips, 3922 treatment skips, 3828 payment skips, and 1 preserved anomaly.
- [x] PASS 2026-05-23: Refactored split-module importer reran against live `tcosmetic_smoketest` and again reported zero new creates with summary `artifacts/cosmetic-lob-import-vps-refactor-check/cosmetic-lob-import-2026-05-23T11-21-45-899Z-30002835.summary.json`.
- [ ] PENDING: Finance/data reviewer resolves `Phiếu cọc` row 1127 phone `0969698444`; it was intentionally not guessed during apply.

---

# TestSprite Plan: Feature Catalog 2026-05-20

Feature/edit name: Feature Catalog — Canonical Export Specifications 2026-05-20

Changed URLs and resources:
- No API routes changed.
- 8 new YAML feature specifications created in `product-map/features/exports/`: appointments-export.yaml, customers-export.yaml, payments-export.yaml, services-export.yaml, service-catalog-export.yaml, report-sales-employees-export.yaml, revenue-flat-export.yaml, deposit-flat-export.yaml.
- 1 new Jest cross-check test added: `api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js`.
- Documentation updated: `docs/CHANGELOG.md`, `docs/TEST-MATRIX.md`.

Affected data flows:
- YAML files in `product-map/features/exports/` are now the canonical specifications for export columns, API routes, UI entry points, and permissions.
- Each YAML specifies columns (position, key, header_vi, style, width, source), filters accepted, and code references (builder file, column array name, test file).
- Jest cross-check test validates that YAML column definitions match builder code COLUMNS arrays exactly (keys and headers_vi, order-sensitive) for all 8 exports.

Roles and scopes:
- Admin exporting all 8 export types: appointments, customers, payments, services, service-catalog, report-sales-employees, revenue, deposit.
- Each export must have columns in the correct order and with correct header_vi values per YAML spec.

Happy paths:
- All 8 exports render the correct columns in the correct order.
- Each export's UI lists the correct filters accepted (dateFrom, dateTo, companyId, search, etc.).
- Feature YAML spec matches the builder code COLUMNS array for all 8 exports.

Edge cases:
- Column order must match YAML position exactly.
- Column header_vi values must match YAML spec exactly (used for Excel header translation).
- Column keys must match builder code COLUMNS array keys exactly.

Regressions to prevent:
- Divergence between YAML spec and builder code (caught by featureCatalog.crosscheck.test.js).
- Silent column drops, reordering, or header changes.
- Missing code references in YAML files.

Setup and execution items:
- [x] PASS: All 8 YAML feature specs created in product-map/features/exports/ with complete column definitions and code references - verified by reading all 8 YAML files.
- [x] PASS: Jest cross-check test featureCatalog.crosscheck.test.js validates YAML columns match builder COLUMNS arrays for all 8 exports - `npm --prefix api test -- src/services/exports/__tests__/featureCatalog.crosscheck.test.js` passes all 8 assertions.
- [x] PASS: npm test passes all 696 tests and 53 test suites after YAML creation - final verification run.
- [x] PASS: docs/CHANGELOG.md updated with feature catalog entry - verified by reading file.
- [x] PASS: docs/TEST-MATRIX.md updated with feature catalog lock row - added row explaining YAML-to-code sync requirement.
- [ ] PENDING: Live NK/NK2/NK3 export downloads verify correct columns and headers for all 8 exports (appointments, customers, payments, services, service-catalog, report-sales-employees, revenue, deposit).
- [ ] PENDING: featureCatalog.crosscheck.test.js remains passing in CI after merge.

---

# TestSprite Plan: Export Column Registry Lock 2026-05-20

Feature/edit name: Export Column Registry Lock 2026-05-20

Changed URLs and API routes:
- `POST /api/Exports/revenue-flat/download` — workbook must contain exactly 22 columns in locked order, including `Note thanh toán` at column P.
- `POST /api/Exports/deposit-flat/download` — workbook must contain exactly 13 columns in locked order, including `Note cọc tiền` at column J.

Affected data flows:
- REVENUE_COLUMNS and DEPOSIT_COLUMNS (in `legacyFlatReportColumns.js`) are now the locked source of truth. Any change requires editing two test arrays + the data file + the SQL query + the row mapper in one PR.
- New test file `legacyFlatReportColumns.lock.test.js` (9 assertions) blocks silent column drops in CI.

Roles, paths, edge cases:
- Admin (`t@clinic.vn`) exports revenue and deposit reports — both must contain all expected columns.
- Edge: dropping any column from REVENUE_COLUMNS or DEPOSIT_COLUMNS must make the lock test fail (verified by simulated removal).
- Edge: NK production deploy after this commit gains the 2 Note columns (was 21/12, becomes 22/13).

Regressions to prevent:
- The 5-cycle pattern: Note column reappearing then disappearing in successive fix commits.

Setup data:
- NK2 staging or NK3 — login `t@clinic.vn` / `123123`, navigate `/reports/revenue`, export "Từ đầu năm" range, open .xlsx and verify column P = `Note thanh toán`.

Execution items:
- [ ] PENDING: NK2 revenue export returns exactly 22 columns with `Note thanh toán` at column P.
- [ ] PENDING: NK2 deposit export returns exactly 13 columns with `Note cọc tiền` at column J.
- [ ] PENDING: `legacyFlatReportColumns.lock.test.js` passes 9/9 on the committed tree.
- [ ] PENDING: NK production export gains the Note columns after next deploy.

---

# TestSprite Plan: Live NK Feedback Bugs 2026-05-19

Feature/edit name: Live NK Feedback Bugs 2026-05-19

Changed URLs and API routes:
- Live read-only review only; no app code or API routes changed in this triage pass.
- Worker A export fix changed backend workbook output for `POST /api/Exports/revenue-flat/download`, `POST /api/Exports/revenue-flat/preview`, `POST /api/Exports/deposit-flat/download`, and `POST /api/Exports/deposit-flat/preview`.
- Worker B calendar export fix changed backend workbook output for `POST /api/Exports/appointments/download` and `POST /api/Exports/appointments/preview`.
- Appointment location fix changed backend edit behavior for `PUT /api/Appointments/:id` and regression coverage for the frontend appointment form mapper.
- Checked `https://nk.2checkin.com/feedback`.
- Bug surfaces from Google Doc feedback: `/reports/revenue`, `/calendar`, `/customers/:id`, and appointment edit/location update flows.
- Likely export routes to verify after fixes: revenue report export/download, deposit report export/download, and calendar export/download.

Affected data flows:
- Revenue report Excel export must include payment note and customer source values consistently.
- Deposit report Excel export must split cash vs bank transfer and include deposit note.
- Calendar/appointment export must preserve appointment date for customer phone `922403152` and similar rows.
- Appointment edit must persist changed clinic/location/cơ sở for an existing appointment when an admin saves.
- In-app Feedback page should continue listing employee feedback and opening read-only detail without API errors.

User roles:
- Live admin/staff account with report export permission.
- Admin account editing an existing appointment only in a controlled verification environment unless production-safe reproduction is explicitly approved.

Happy paths:
- Export revenue report for the same date range shown in feedback and confirm `note thanh toán` is present.
- Export revenue report and confirm highlighted rows with customer source in the UI/export source data also show source in Excel.
- Export deposit report and confirm cash and bank-transfer deposits are separated into distinct columns/values.
- Export deposit report and confirm `note cọc tiền` is populated.
- Export calendar/appointment data for a patient matching phone `922403152` and confirm the appointment date remains `20/05/2026`, not `08/05/2026`.
- Change an appointment's clinic/location in a safe test record, save, refresh, and confirm the new clinic persists.

Edge cases:
- Revenue rows with source only on sale order/invoice context must not export blank source.
- Mixed payment/deposit rows must not collapse cash and bank transfer into one total.
- Calendar export must handle timezone/date boundary conversion without shifting by day or month.
- Appointment location update must work for admin and preserve other appointment fields.

Regressions:
- Existing feedback page `/feedback` must keep loading with no API or console errors.
- Existing resolved report/download fixes must not regress.
- Existing customer/profile and calendar pages must not require production data mutation for read-only checks.

Setup data and login state:
- Live login verified with `t@clinic.vn / 123123`.
- Google Doc source: `https://docs.google.com/document/d/1cpHPoA-EVSZHCrGfbhCAfZ_n6W7fN3O44rD2RuA1O9o/edit?usp=sharing`.
- Screenshot evidence from this triage: `output/playwright/live-feedback-review/feedback-list-2026-05-19T17-40-27-888Z.png`, `output/playwright/live-feedback-review/feedback-detail-2026-05-19T17-40-27-888Z.png`, and `output/playwright/live-feedback-review/google-doc-2026-05-19T17-39-18-766Z.png`.
- Before/after fix evidence: `output/playwright/live-feedback-fix/before/revenue-workbook.png`, `output/playwright/live-feedback-fix/after/revenue-workbook.png`, `output/playwright/live-feedback-fix/before/deposit-workbook.png`, `output/playwright/live-feedback-fix/after/deposit-workbook.png`, `output/playwright/live-feedback-fix/before/calendar-922403152-workbook.png`, `output/playwright/live-feedback-fix/after/calendar-922403152-workbook.png`, `output/playwright/live-feedback-fix/before/appointment-location-save.png`, and `output/playwright/live-feedback-fix/after/appointment-location-save.png`.

TestSprite execution items:
- [x] PASS: Verify `/feedback` still lists the 2026-05-19 appointment-location feedback item and opens its detail view without API or console errors - live read-only check on 2026-05-20 saved `output/playwright/live-feedback-meaning/feedback-list-2026-05-20T02-28-01-413Z.png`, `output/playwright/live-feedback-meaning/feedback-detail-2026-05-20T02-28-01-413Z.png`, and `output/playwright/live-feedback-meaning/result-2026-05-20T02-28-01-413Z.json`; API/console errors were 0.
- [x] PASS: Verify revenue Excel export includes payment note values - `npx jest src/services/exports/__tests__/legacyFlatReportsExport.test.js --runInBand` coverage asserts `Note thanh toán` workbook column/value.
- [x] PASS: Verify revenue Excel export keeps customer source populated for rows where the UI/source data has a customer source - focused Jest asserts `COALESCE(so.sourceid, cust.sourceid)` source precedence.
- [x] PASS: Verify deposit Excel export splits cash and bank-transfer amounts - focused Jest asserts workbook split columns and SQL method fallback for cash/bank-transfer/VietQR.
- [x] PASS: Verify deposit Excel export includes deposit note values - focused Jest asserts `Note cọc tiền` workbook column/value.
- [x] PASS: Verify calendar/appointment export preserves the correct `20/05/2026` appointment date for phone `922403152` - `npx jest src/services/exports/__tests__/appointmentsExport.test.js --runInBand` coverage checked phone search/date serialization; before/after screenshots saved at `output/playwright/live-feedback-fix/before/calendar-922403152-workbook.png` and `output/playwright/live-feedback-fix/after/calendar-922403152-workbook.png`.
- [x] PASS: Verify admin appointment edit persists a changed clinic/location/cơ sở after save and refresh in a safe test environment - backend mutation and frontend mapper tests passed; before/after screenshots saved at `output/playwright/live-feedback-fix/before/appointment-location-save.png` and `output/playwright/live-feedback-fix/after/appointment-location-save.png`.

---

# TestSprite Plan: NK2 Responsive Population Audit

Feature/edit name: NK2 Responsive Population Audit

Changed URLs and API routes:
- Full NK2 route sweep across authenticated app pages.
- No API routes changed by this QA pass.

Affected data flows:
- Authenticated page hydration from NK2 staging APIs.
- Route-level list/detail/report data population across phone, tablet, and desktop viewport classes.
- Browser console, network, overflow, and empty-state detection for visible app surfaces.

User roles:
- Authenticated NK2 admin/staff session used for broad route access.

Happy paths:
- Verify each primary route loads populated content or an intentional empty state on iPhone, iPad, and desktop widths.
- Verify core navigation remains reachable on each device family.
- Verify responsive wrapping prevents controls, filters, tabs, and action buttons from clipping offscreen.

Edge cases:
- Long Vietnamese labels, dense data tables, report tabs, modals, and side navigation must not overlap at iPhone or iPad widths.
- Pages with low or missing data must show deliberate empty/loading/error states rather than blank panels.
- API failures or unauthorized responses must not leave a false "populated" page.

Regressions:
- `/calendar` iPad toolbar wrapping must remain fixed while the broader app sweep runs.
- Desktop layouts must not degrade while mobile/tablet wrapping is corrected.
- Report/dashboard/customer/payment/service pages should not introduce page-level horizontal overflow.

Setup data and login state:
- Use NK2 staging: `https://nk2.2checkin.com`.
- Use an authenticated admin/staff session with access to the main navigation.
- Collect screenshot evidence for every checked device family and every failure.

TestSprite execution items:
- [x] PASS: Sweep iPhone representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/iphone`; no blank/unpopulated pages, console errors, failed network requests, or true page-wide overflow.
- [x] PASS: Sweep iPad portrait/landscape representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/ipad`; `/feedback` visible "Auto-detected Errors" was confirmed as a tab label, not a runtime error.
- [x] PASS: Sweep desktop representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/desktop`; true layout blockers isolated to `/calendar` toolbar controls and `/employees` edit action visibility.
- [x] PASS: Record all failed routes with screenshot path, viewport, visible symptom, and suspected data/UI category - consolidated in `reports/responsive-qa/desktop/report.md`, `reports/responsive-qa/ipad/report.md`, and `reports/responsive-qa/iphone/report.md`.
- [x] PASS: Recheck `/calendar` at 1280x720 and 1366x768 after the 0.32.32 toolbar breakpoint fix; export, filter, and quick-add controls are visible - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__calendar__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__calendar__after-0.32.32.png`.
- [x] PASS: Recheck `/employees` at 1280x720, 1366x768, and 1440x900 after the 0.32.32 sticky action/table text fix; edit action is visible and long location text is truncated - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/desktop-1440x900__employees__after-0.32.32.png`.

---

# TestSprite Plan: Calendar iPad Toolbar Wrapping

Feature/edit name: Calendar iPad Toolbar Wrapping

Changed URLs and API routes:
- `/calendar`
- No API routes changed.

Affected data flows:
- Calendar appointment data still loads through `GET /api/Appointments` with calendar-mode pagination.
- The responsive toolbar layout now wraps at tablet widths instead of forcing one row, so view mode tabs, date navigation, search, export, filters, and quick-add remain visible while appointment cards populate below.
- No appointment DTO, status, export, or mutation payload changed.

User roles:
- Admin and staff with `appointments.view`.
- Staff with `appointments.add`, `appointments.edit`, or `appointments.export` should see the same controls without clipping when those permissions are granted.

Happy paths:
- Open `/calendar` at iPad landscape width (`1024x768`) and verify Ngày/Tuần/Tháng, date navigation, search, export, filter, and quick-add controls are all visible and non-overlapping.
- Verify day-view appointment cards populate below the toolbar with the expected count for the selected day.
- Switch between day, week, and month at tablet width and confirm controls stay reachable.

Edge cases:
- Long Vietnamese date labels such as `Thứ Hai, 18 tháng 5, 2026` must not overlap the view tabs.
- Permission combinations that hide export or quick-add should not leave awkward empty toolbar space.
- Search suggestions should still open below the search input after the toolbar wraps.

Regressions:
- Desktop wide layout should still use a single-row toolbar.
- Mobile and narrow tablet layouts should keep controls wrapped instead of introducing horizontal page overflow.
- Export date-range modal, smart filter drawer, and quick-add appointment modal should still open from `/calendar`.

Setup data and login state:
- Use an authenticated local or NK2 admin session.
- Use a calendar day with multiple appointments, such as `2026-05-18` in local seeded data.

TestSprite execution items:
- [ ] PENDING: Verify `/calendar` at `1024x768` shows all toolbar controls without overlap or right-edge clipping.
- [ ] PENDING: Verify day-view appointment cards populate below the toolbar after calendar data finishes loading.
- [ ] PENDING: Verify day/week/month switching at tablet width keeps the toolbar wrapped and reachable.
- [ ] PENDING: Verify search, export menu, filter drawer, and quick-add controls still open from the wrapped tablet toolbar.
- [ ] PENDING: Verify wide desktop keeps the single-row toolbar with no visual regression.

---

# TestSprite Plan: Payment Method Contract Alignment

Feature/edit name: Payment Method Contract Alignment

Changed URLs and API routes:
- `/payment`
- `/customers/:id` payment/deposit surfaces
- `GET /api/Payments`
- `GET /api/Payments/:id`
- `POST /api/Payments`
- `PATCH /api/Payments/:id`
- `POST /api/Payments/:id/proof`
- No new API routes added.

Affected data flows:
- Frontend deposit/payment display labels now align with the live payment contract methods: `cash`, `bank_transfer`, `deposit`, and `mixed`.
- `contracts/dist` is rebuilt from `contracts/payment.ts`, so package consumers no longer see stale card/e-wallet enum values.
- VietQR remains a frontend entry alias that sends `bank_transfer` to the backend; it is not stored as a separate payment method.

User roles:
- Admin or payment staff with `payment.view` and `payment.add`.
- Customer-profile staff using deposit history and payment tabs.

Happy paths:
- Open `/payment` and verify existing cash, bank-transfer, deposit, and mixed payment rows display readable method labels.
- Open a customer profile payment/deposit surface and verify deposit history displays `bank_transfer` as a bank-transfer label, not the raw key.
- Create or edit a payment using cash/bank/deposit/mixed flows and confirm the backend receives only live method codes.

Edge cases:
- Legacy rows with unknown method strings should fall back to the raw method string instead of crashing.
- VietQR top-up flows should still map to `bank_transfer`.
- English and Vietnamese payment labels should both have `bank_transfer` and `deposit` keys.

Regressions:
- Payment history, deposit history, refunds, void/delete actions, payment proof uploads, and report/export payment-method grouping still work.
- No card/e-wallet methods should appear as accepted live payment methods in contracts, docs, or payment UI labels.

Setup data and login state:
- Use an authenticated admin/staff session with payment permissions.
- Use any customer with deposit/payment rows containing cash, bank transfer, deposit usage, or mixed payments.

TestSprite execution items:
- [ ] PENDING: Verify `/payment` renders live payment method labels without card/e-wallet options.
- [ ] PENDING: Verify `/customers/:id` deposit history renders `bank_transfer` and `deposit` labels in English and Vietnamese locales.
- [ ] PENDING: Verify VietQR top-up still posts `bank_transfer` to `POST /api/Payments`.
- [ ] PENDING: Verify `contracts/dist/payment.d.ts` and `contracts/payment.ts` expose the same live method enum.

---

# TestSprite Plan: Auth Type Extension And CTV User Redirect (Gap C)

Feature/edit name: Auth Type Extension And CTV User Redirect (Gap C) 2026-05-21

Changed URLs and API routes:
- Auth response documents updated for `POST /api/Auth/login` and `GET /api/Auth/me` to include optional `is_ctv` and `lob_scope` fields in user object.
- No runtime API changes; backend already supports optional fields.
- Frontend ProtectedRoute logic checks `is_ctv === true` and redirects to `/ctv` route.

Affected data flows:
- `AuthUser` TypeScript interface in `website/src/lib/api/auth.ts` extends with optional `is_ctv?: boolean` and `lob_scope?: string[]` fields (backward-compatible).
- ProtectedRoute component in `website/src/App.tsx` extracts user from `useAuth()` hook and redirects CTV users (where `is_ctv === true`) away from main dashboard to `/ctv` route.
- All other users pass through to main dashboard unaffected.

User roles and scopes:
- CTV users (`is_ctv === true`) — redirected to dedicated `/ctv` route.
- Regular admin/staff users — access main dashboard as before.
- Users where `is_ctv` is undefined or false — pass through to main dashboard (backward-compatible).

Happy paths:
- AuthUser type accepts optional `is_ctv` and `lob_scope` fields on login and `/me` responses.
- CTV users are immediately redirected from `/` or any protected route to `/ctv` without accessing the main dashboard.
- Non-CTV users continue to access main dashboard routes without interruption.
- Type validation passes; no TypeScript errors in auth usage.

Edge cases:
- `is_ctv: false` should be treated same as `is_ctv: undefined` (non-CTV, pass through).
- `lob_scope` array may be empty, single-element, or multiple elements — only `is_ctv === true` triggers redirect.
- ProtectedRoute redirect happens before permission checks (CTV users never reach permission evaluation).
- Backward compatibility: responses without `is_ctv` field work without modification.

Regressions to prevent:
- Existing non-CTV users accidentally redirected to `/ctv`.
- CTV users able to access main dashboard routes or bypass redirect.
- Type system regression on AuthUser usage sites across the app.
- Loss of existing permission/auth flow for non-CTV users.

Setup and execution items:
- [x] PASS: AuthUser interface extends with optional is_ctv and lob_scope fields - verified in `website/src/lib/api/auth.ts` at lines 1-15.
- [x] PASS: ProtectedRoute checks is_ctv === true and redirects to /ctv route - verified in `website/src/App.tsx` lines 95-107 and passing test assertions.
- [x] PASS: New test file website/src/components/ProtectedRoute/__tests__/protectedRoute.ctvRedirect.test.tsx created with 5 passing Vitest tests - verifies type support, redirect logic, and backward compatibility.
- [x] PASS: CONTRACTS.md updated to document new optional fields in Auth response - verified at lines 36-52 and 55-57.
- [x] PASS: product-map/contracts/api-index.md updated to reflect user response changes - verified at Auth section table.
- [x] PASS: product-map/test-matrix.md updated with new test file entry - documented under Unit Tests section.
- [x] PASS: Git commit passes pre-commit governance hooks for CONTRACTS.md, api-index.md, and test-matrix.md updates.
- [ ] PENDING: Manual E2E verification that CTV user with is_ctv=true is redirected to /ctv on login flow (requires test user account with is_ctv field set from backend).
- [ ] PENDING: Manual E2E verification that non-CTV user with is_ctv=false or undefined reaches main dashboard on login flow.

---

# TestSprite Plan: Documentation Traceability And Governance Sync

Feature/edit name: Documentation Traceability And Governance Sync

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API behavior changed.
- Documentation coverage updated for `/api/Partners/resolve`, `/api/Feedback/unread-count`, `/api/IpAccess/*`, `/api/DotKhams`, `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download`, `/api/Reports/*`, `GET /api/SaleOrders/lines`, `PATCH /api/SaleOrders/:id`, `DELETE /api/SaleOrderLines/:id`, `PATCH /api/Payments/:id`, and `POST /api/Payments/:id/proof`.

Affected data flows:
- Feature work should now be traceable across use case, workflow, contract, data model, product-map domain, permission registry, and test matrix entries.
- Deployment docs use `api/migrations/` as the canonical migration path and mark `api/src/db/migrations/` as supplemental stragglers needing explicit review.
- `scripts/verify-docs.sh` now enforces docs, changelog, and TestSprite ledger updates for contract/schema/API/frontend/backend-data-flow changes.
- Local `.husky/pre-commit`, root `npm run verify:docs` / `npm run verify:governance`, and PR checks now run the governance gate so future changes cannot rely on optional manual memory.
- Authority docs no longer embed generated memory blocks, and `scripts/sync-claude-mem.sh` strips accidental generated-memory blocks from `AGENTS.md` while keeping the real memory mirror in `.claude/memory.md`.

User roles:
- Architecture and product agents checking feature blast radius before implementation.
- Frontend, backend, data, QA, and release agents using the authority stack.
- TestSprite verification agent reading this ledger after a feature/edit.

Happy paths:
- Pick a report/export feature and confirm the route appears in `docs/CONTRACTS.md`, `product-map/contracts/api-index.md`, `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, and a test matrix entry.
- Run `bash scripts/verify-docs.sh` with the current diff and confirm it passes when docs, changelog, and `testbright.md` are present.
- Check `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md`; both should point canonical VPS migration application to `/opt/tgroup/api/migrations/*.sql`.

Edge cases:
- Docs-only governance edits still require `docs/CHANGELOG.md`.
- Frontend, feature, contract, product-map, and backend data-flow edits require `testbright.md`.
- Supplemental migrations under `api/src/db/migrations/` must not be silently assumed to run with the canonical migration loop.
- Authority docs must not contain `<claude-mem-context>` blocks.

Regressions:
- Existing Revenue Report Excel Reconciliation TestSprite plan remains intact.
- Existing production database backup, Hosoonline, Face ID, export, and search TestSprite plans remain intact.
- Runtime behavior, API responses, and website routes should not change from this docs/governance sync alone.

Setup data and login state:
- No login state required for docs/script verification.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `bash scripts/verify-docs.sh` passes through `npm run verify:governance` with this synchronized docs/changelog/testbright diff.
- [x] PASS 2026-05-17: `.husky/pre-commit` runs `bash scripts/verify-docs.sh` before website version checks.
- [x] PASS 2026-05-17: `.github/workflows/pr-checks.yml` includes a `doc-governance` job that runs documentation governance against the PR base SHA.
- [x] PASS 2026-05-17: `npm run verify:governance` runs the docs gate plus whitespace diff checks.
- [x] PASS 2026-05-17: Generated-memory marker grep returns no matches outside `docs/runbooks/VERIFICATION.md`.
- [x] PASS 2026-05-17: `bash scripts/sync-claude-mem.sh` does not leave generated-memory markers in `AGENTS.md`.
- [ ] PENDING: Verify `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md` both use `/opt/tgroup/api/migrations/*.sql` as the canonical deploy loop.
- [ ] PENDING: Verify `docs/DATA-MODEL.md` and `docs/MIGRATIONS.md` document 53 canonical root migrations and 2 supplemental migrations.
- [ ] PENDING: Verify payment methods in docs/contracts are `cash`, `bank_transfer`, `deposit`, and `mixed`, with no unsupported card/e-wallet methods described as live.
- [ ] PENDING: Verify key live routes above are represented in `docs/CONTRACTS.md` and `product-map/contracts/api-index.md`.

---

# TestSprite Plan: Prompt-Level Authority Gate

Feature/edit name: Prompt-Level Authority Gate

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API routes changed.

Affected data flows:
- Each new agent prompt in Claude-compatible local tooling now runs `scripts/prompt-authority-check.sh` through `.claude/settings.json` `UserPromptSubmit`.
- The prompt gate verifies core authority files exist, strips accidental generated-memory blocks from `AGENTS.md`, checks that generated memory markers did not leak into other authority docs, and prints prompt-matched docs/domains for agents to read before edits.
- Root `npm run verify:prompt` provides the manual fallback for agents/tools that do not execute `.claude/settings.json` prompt hooks.
- Root `npm run verify:governance` now includes the prompt authority gate before doc-update and whitespace checks.

User roles:
- Architecture, product, frontend, backend, data, QA, and release agents starting or continuing project work.
- TestSprite verification agent checking that prompt-start governance is visible before implementation.

Happy paths:
- Submit a prompt mentioning payments/revenue and verify the prompt gate points to money-flow, invariants, payment domain, and payment-allocation docs.
- Submit a prompt mentioning frontend UI and verify the prompt gate points to `website/agents.md`, `website/design.md`, behavior/use-case/workflow/test docs, and `testbright.md`.
- Run `npm run verify:prompt` from the repository root and verify it passes without stdin.

Edge cases:
- If authority docs are missing, the prompt gate must fail before work starts.
- If generated memory markers leak into non-`AGENTS.md` authority docs, the prompt gate must fail and print the matching file/line.
- If generated memory markers are appended to `AGENTS.md`, the prompt gate should strip them before checking so the next prompt is not blocked by memory-tool output.
- If the active agent does not support `UserPromptSubmit`, the fallback is manual `npm run verify:prompt` at prompt start.

Regressions:
- Existing commit/PR documentation governance must still run after the prompt gate.
- The hook output must stay compact enough that prompt checking does not become token-heavy.
- Runtime app behavior should not change from this governance hook.

Setup data and login state:
- No app login required.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `npm run verify:prompt` passes with no stdin and prints the compact authority reminder.
- [x] PASS 2026-05-17: Payment/revenue prompt text surfaces money-flow, invariants, payment domain, payment allocation, reports, and test matrix docs.
- [x] PASS 2026-05-17: Frontend prompt text surfaces website frontend/design docs, behavior, use-case, workflow, test matrix, and `testbright.md`.
- [x] PASS 2026-05-17: `.claude/settings.json` contains a `UserPromptSubmit` hook that runs `bash scripts/prompt-authority-check.sh`.
- [x] PASS 2026-05-17: `package.json` `verify:governance` runs the prompt authority gate before docs and whitespace checks.
- [x] PASS 2026-05-18: Prompt gate stripped an accidental `<claude-mem-context>` block from `AGENTS.md`, then `npm run verify:prompt` passed and marker grep returned clean.

---

# TestSprite Plan: Revenue Report Excel Reconciliation

Feature/edit name: Revenue Report Excel Reconciliation

Changed URLs and API routes:
- `/reports/revenue`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Exports/revenue-flat/preview`
- `POST /api/Exports/revenue-flat/download`
- `POST /api/Exports/report-sales-employees/preview`
- `POST /api/Exports/report-sales-employees/download`

Affected data flows:
- Revenue page `Tổng đã thu` uses posted payment-method totals from `/api/Reports/revenue/summary`, matching the revenue-flat Excel collected total.
- `/api/Reports/revenue/summary` keeps paid-only sale-order states instead of dropping payments whose sale order was created outside the selected report date.
- Employee revenue Excel applies the same posted allocation, deposit/refund/usage exclusion rules as revenue-flat.
- Branch revenue breakdown now honors the selected branch filter; all-location remains all branches.
- Cash-flow cards still show raw cash movement and should not be used as the Excel paid-revenue comparison.

User roles:
- Admin or manager with `reports.view`.
- Staff with `payments.export` for `revenue-flat` export.
- Staff with `reports.export` for employee revenue export.
- Scoped branch manager with assigned-location reporting access.

Happy paths:
- On `/reports/revenue`, select `2026-05-16` to `2026-05-16` and all locations; `Tổng đã thu` should equal `revenue-flat` preview `Tổng tiền` and downloaded workbook column `Số tiền`.
- Select a specific branch; revenue summary, revenue by branch, and revenue-flat preview should all use the same branch scope.
- Preview and download `Báo cáo doanh thu theo nhân viên`; deposits, refunds, deposit usage, and voided payments must not appear in employee revenue totals.

Edge cases:
- Payments collected in the selected date range for sale orders created before the selected date must still count in `Tổng đã thu`.
- A branch/date range with paid revenue but no new sale orders should still show collected revenue.
- `companyId: "all"` from any report caller should behave like no branch filter in frontend report payloads.
- Deposit top-ups and internal deposit usage remain visible only in cash-flow or deposit reports, not recognized paid revenue.

Regressions:
- Existing revenue trend, payment method donut, doctor/category breakdowns, and export preview modal still render.
- `Báo cáo doanh thu` workbook columns and filename stay unchanged.
- Existing cash-flow summary still separates money in, money out, net cash flow, and internal deposit usage.

Setup data and login state:
- Use an authenticated NK2 or local admin session with report/export permissions.
- For live reproduction, NK2 evidence used all-location filter `{ "dateFrom": "2026-05-16", "dateTo": "2026-05-16" }`.
- Download workbook and sum column `Số tiền`; do not compare dashboard `Tổng đã thu` to workbook `Tổng tiền phiếu`.

TestSprite execution items:
- [x] PRE-DEPLOY FAIL 2026-05-18: Live NK2 `/reports/revenue` for `2026-05-16` all locations still showed `Tổng đã thu` around `318.537.157 ₫`, while the posted-payment report API total was `533.697.000 ₫`; screenshot proof: `output/playwright/2026-05-18T04-48-03-856Z-feedback-06892fc6-revenue-total-fixed.png`.
- [x] PASS 2026-05-18: After NK2 web-only deploy to `v0.32.24`, `/reports/revenue` for `2026-05-16` all locations shows `Tổng đã thu 533.697.000 ₫`, matching `POST /api/Reports/revenue/summary` posted-payment total; proof screenshots: `output/playwright/2026-05-18T04-55-02-553Z-feedback-06892fc6-revenue-total-resolved-stable.png` and `output/playwright/2026-05-18T04-57-35-499Z-feedback-06892fc6-status-resolved-via-page.png`.
- [ ] PENDING: Verify `/reports/revenue` `Tổng đã thu` equals `POST /api/Exports/revenue-flat/preview` summary `Tổng tiền` for the same date/branch filters.
- [ ] PENDING: Verify downloaded `Báo cáo doanh thu` workbook column `Số tiền` equals the page `Tổng đã thu`.
- [ ] PENDING: Verify paid revenue from old sale orders inside the payment date range is not dropped from `Tổng đã thu`.
- [ ] PENDING: Verify selecting a branch scopes summary, branch breakdown, and revenue-flat preview consistently.
- [ ] PENDING: Verify employee revenue export excludes deposit, refund, deposit usage, and voided payment rows.
- [ ] PENDING: Verify cash-flow cards still show raw cash movement separately and are not mislabeled as Excel paid revenue.

---

# TestSprite Plan: TGClinic Orange Butterfly Favicon

Feature/edit name: TGClinic Orange Butterfly Favicon

Changed URLs and API routes:
- `/`
- All website routes that inherit `website/index.html`
- Static asset: `/favicon.svg`
- No API routes changed.

Affected data flows:
- Browser loads the SVG favicon from `website/public/favicon.svg`.
- Vite serves the icon through the app shell defined in `website/index.html`.
- No backend, database, auth, or user-record data flow changed.

User roles:
- Any authenticated or unauthenticated browser visitor.
- Admin, receptionist, dentist, and manager roles should see the same browser-tab icon.

Happy paths:
- Open the local website and confirm the browser tab loads the orange butterfly favicon.
- Fetch `/favicon.svg` and confirm it returns SVG content.
- Navigate between routes and confirm the favicon remains stable because the app shell owns it.

Edge cases:
- Browser cache may keep the old Vite icon until hard refresh or cache clear.
- SVG favicon should remain legible at 16x16 and 32x32 browser-tab sizes.
- Missing favicon should not block app startup or route rendering.

Regressions:
- `website/index.html` still loads `/src/main.tsx`.
- Existing page title and version bootstrap script remain unchanged.
- No API route or permission behavior changes.

Setup data and login state:
- No special data or login state required.
- Use the normal local website dev server.

TestSprite execution items:
- [ ] PENDING: Verify `GET /favicon.svg` returns the orange butterfly SVG asset.
- [ ] PENDING: Verify the browser tab icon changes from the default Vite icon to the orange butterfly on `/`.
- [ ] PENDING: Verify a nested app route keeps the same favicon after navigation.
- [ ] PENDING: Verify the app shell still mounts and renders the React app.

---

# TestSprite Plan: NK Production Database Daily Backup Rotation

Feature/edit name: NK Production Database Daily Backup Rotation

Changed URLs and API routes:
- No user-facing URLs changed.
- No API routes changed.
- VPS target: `https://nk.2checkin.com`
- VPS script: `/opt/tgroup/scripts/backup-nk-db.sh`
- Backup directory: `/opt/tgroup/backups/nk-db-daily/`

Affected data flows:
- `pg_dump` reads the production `tdental_demo` database from Docker container `tgroup-db`.
- The backup job writes compressed PostgreSQL custom-format dump files and `.sha256` checksums.
- Retention keeps only the latest 3 `nk-tdental_demo-*.dump` files after a successful new backup.

User roles:
- Infra/Release operator with root SSH access to the VPS.
- Clinic users should see no product behavior change.

Happy paths:
- Manual run of `/opt/tgroup/scripts/backup-nk-db.sh` creates a non-empty dump and checksum.
- `sha256sum -c` passes for the newest dump.
- `pg_restore -l` can list the dump table of contents through `tgroup-db`.
- Root crontab contains one daily entry scheduled for 12:00 Vietnam time.

Edge cases:
- If `tgroup-db` is missing or unhealthy, the script exits before writing a successful backup.
- If `pg_dump` creates an empty temp file, the temp file is removed and no retention cleanup runs.
- Retention cleanup should only remove older matching NK dump/checksum pairs after a successful backup.
- The VPS currently uses UTC, so the cron expression is `0 5 * * *`.

Regressions:
- Existing `tgroup-api`, `tgroup-web`, and `tgroup-db` containers must remain running.
- Existing `/opt/tgroup/backups/db-sync/` backups must not be touched.
- No database restore, sync, import, export to local, or schema migration should run as part of this job.

Setup data and login state:
- Use SSH alias `dokploy` or `root@76.13.16.68`.
- Use app path `/opt/tgroup`, container `tgroup-db`, database `tdental_demo`.

TestSprite execution items:
- [ ] PENDING: Verify the newest backup file exists in `/opt/tgroup/backups/nk-db-daily/` and is non-empty.
- [ ] PENDING: Verify the newest `.sha256` file passes `sha256sum -c`.
- [ ] PENDING: Verify `docker exec -i tgroup-db pg_restore -l < newest.dump` lists `tdental_demo` archive contents.
- [ ] PENDING: Verify `crontab -l` contains exactly one `backup-nk-db.sh` entry scheduled for `0 5 * * *`.
- [ ] PENDING: Verify the retained matching `.dump` count is not greater than 3 after future daily runs.

---

# TestSprite Plan: NK Hosoonline Session-Token Image Hotfix

Feature/edit name: NK Hosoonline Session-Token Image Hotfix

Changed URLs and API routes:
- `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`
- `/customers/:id`
- `GET /api/ExternalCheckups/:customerCode`
- `GET /api/ExternalCheckups/images/:imageName`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Hosoonline checkup list still loads through `GET /api/ExternalCheckups/:customerCode`.
- Proxied Hosoonline image and upload fetches now send the TGClinic bearer token from either local storage or session storage.
- Non-remembered NK login sessions should no longer get `401 {"error":"No token"}` for checkup thumbnails.

User roles:
- Authenticated admin or clinic staff with `external_checkups.view`.
- Staff with `external_checkups.upload` for upload regression coverage.

Happy paths:
- Log into NK without Remember Me, open `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, and verify Health Checkup Images thumbnails render.
- Verify `GET /api/ExternalCheckups/images/:imageName` requests include `Authorization: Bearer ...` and return image bytes.
- With upload permission, verify add-checkup upload still sends auth to `POST /api/ExternalCheckups/:customerCode/health-checkups`.

Edge cases:
- Remember Me sessions that store the token in local storage should continue to render images.
- Missing or expired sessions should still receive 401 and trigger the existing failed-image state.
- Hosoonline `http://` media URLs should still be normalized through the existing HTTPS/proxy path.

Regressions:
- Customer profile loading, profile tabs, and the checkup list must still render.
- Existing `external_checkups.view` permission gate must continue to protect image bytes.
- Existing upload form behavior and error parsing must remain unchanged.

Setup data and login state:
- Use NK production login state.
- Use customer `T056733` from `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, which currently has Hosoonline image records.

TestSprite execution items:
- [ ] PENDING: Verify non-remembered NK session renders Hosoonline thumbnails on `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`.
- [ ] PENDING: Verify image requests include Authorization and return `image/*`, not 401 JSON.
- [ ] PENDING: Verify remembered/local-storage sessions still render Hosoonline thumbnails.
- [ ] PENDING: Verify the upload form still sends Authorization when staff has `external_checkups.upload`.

---

# TestSprite Plan: Reporting And Permission Feedback Completion

Feature/edit name: Revenue Recognition Reports, Cash Flow Report, Payment Permission Split, and Ho so Online Upload Gate

Changed URLs and API routes:
- `/reports/revenue`
- `/reports/services`
- `/customers/:id`
- `/permissions`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/trend`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Reports/revenue/by-doctor`
- `POST /api/Reports/revenue/by-category`
- `POST /api/Reports/services/breakdown`
- `POST /api/Reports/cash-flow/summary`
- `POST /api/Payments`
- `POST /api/Payments/refund`
- `DELETE /api/Payments/:id`
- `POST /api/Payments/:id/void`
- `GET /api/ExternalCheckups/:customerCode`
- `POST /api/ExternalCheckups/:customerCode/patient`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Revenue report paid totals now come from posted `payment_allocations` linked to treatment invoices instead of unpaid sale-order totals or deposits.
- Deposits, refunds, deposit usage, and voided payments stay in cash-flow reporting and are excluded from revenue recognition.
- Cash-flow summary is mounted through `/api/Reports/cash-flow/summary`.
- Service/category/source report revenue uses posted payment allocations instead of listed service prices or unpaid order values.
- Payment creation, refunds, and destructive void/delete actions use separate permission strings: `payment.add`, `payment.refund`, and `payment.void`.
- Ho so Online view, patient creation, and image upload are split into `external_checkups.view`, `external_checkups.create`, and `external_checkups.upload`; the customer profile hides create/upload controls for view-only staff.

User roles:
- Super Admin/Admin with full reporting and permission access.
- Receptionist or clinic staff with payment add/view but without destructive payment void permission.
- Dentist or other view-only clinic role with `external_checkups.view` but no upload permission.
- Dental Assistant/Assistant role with assigned-location customer access and `external_checkups.upload`.
- Reporting staff with `reports.view`.

TestSprite execution items:
- [ ] PENDING: On `/reports/revenue`, verify summary paid totals match posted treatment payment allocations and do not count customer deposits.
- [ ] PENDING: On `/reports/revenue`, verify trend, location, doctor, and category breakdowns show paid service revenue by payment date.
- [ ] PENDING: On `/reports/services`, verify source/category revenue excludes unpaid listed treatment value and deposits.
- [ ] PENDING: Call `POST /api/Reports/cash-flow/summary` and verify deposits, refunds, deposit usage, voided payments, money in/out, and net cash-flow are separated.
- [ ] PENDING: With a user lacking `payment.void`, verify payment delete/void actions fail with 403 or are hidden where the UI has permission context.
- [ ] PENDING: With a user lacking `external_checkups.upload`, open `/customers/:id` and verify Ho so Online images can be viewed but the add-checkup upload button is hidden.
- [ ] PENDING: With a user that has `external_checkups.upload`, verify the add-checkup upload button appears and upload submits to `POST /api/ExternalCheckups/:customerCode/health-checkups`.
- [ ] PENDING: With a Dental Assistant/Assistant role, verify customer search/profile/Hồ sơ online upload works, while treatment, deposit, and payment creation remain blocked.
- [ ] PENDING: Open `/permissions` and verify `payment.void` and `external_checkups.upload` are visible permission options with descriptions.

Edge cases:
- Partial payments split across multiple sale-order lines.
- Overallocated imported payment allocation rows should not exceed the posted payment amount in service/person export-style calculations.
- Deposit usage with `method = deposit` should not increase revenue.
- Voided payments should stay out of recognized revenue and appear only as cash-flow adjustments.
- Ho so Online patient missing state should not show create/upload controls unless the user has the matching permission.

Regressions:
- Existing `/reports/revenue` chart/table shapes remain compatible with the frontend.
- Payment history, deposit list, and customer profile payment tabs still load for `payment.view` users.
- Existing Hosoonline image proxy remains protected by `external_checkups.view`.
- Existing permission-board role editing still saves unknown/new permission strings.

Setup data and login state:
- Use an authenticated admin session for full checks.
- Use at least one scoped clinic role without `payment.void` and without `external_checkups.upload`.
- Use customers with existing payments, deposits, and Ho so Online images.

---

# TestSprite Plan: Overview Wait Timer Arrival Timestamp Repair

Feature/edit name: Overview Wait Timer Arrival Timestamp Repair

Changed URLs and API routes:
- `/`
- `PUT /api/Appointments/:id`

Affected data flows:
- Marking an appointment `arrived` writes `datetimearrived` as Vietnam wall-clock time instead of a DB-session-dependent double timezone conversion.
- Overview `PatientCheckInCard` keeps the full `datetimearrived` timestamp through `useOverviewAppointments` and `WaitTimer` instead of comparing only time-of-day.
- In-treatment and done transitions continue stamping `datetimeseated` and `datedone` from the same Vietnam timestamp source.

User roles:
- Admin and clinic staff with `appointments.edit` and `overview.view`.

Happy paths:
- Mark a scheduled appointment as arrived from `/`, wait 3-5 seconds, and confirm the card timer counts upward instead of staying at `0s`.
- Refresh `/` after marking arrived and confirm the timer uses the persisted `datetimearrived` timestamp.
- Move the same appointment to `Đang khám` and confirm the waiting timer becomes static using the treatment start time.

Edge cases:
- Existing arrived rows with bad historical timestamps should not block new check-ins from getting correct timestamps after this fix.
- Local DB sessions with a non-Vietnam `current_setting('TimeZone')` should still stamp Vietnam wall-clock appointment timestamps.
- Persisted timestamps whose date differs from today should not clamp to `0s` only because their clock time is later than the current clock time.
- Check-in timers should not regress to whole-minute-only display after the first minute.

Regressions:
- Appointment creation still populates `datecreated` and `lastupdated`.
- Staff clear/save behavior on `PUT /api/Appointments/:id` remains intact.
- Calendar appointment listing and overview today-only filtering remain unchanged.

Setup data and login state:
- Use an authenticated admin session.
- Use any today appointment that is still scheduled or confirmed.
- For backend verification, assert the update SQL contains `NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'` and does not contain the double `UTC` timezone conversion.

---

# TestSprite Plan: Customer Appointment Start Time

Feature/edit name: Customer Appointment Start Time

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/Appointments?partner_id=...`

Affected data flows:
- Customer profile appointment history now preserves a start time from `dbo.appointments.date` when the legacy `time` column is null.
- The profile hook still normalizes appointment dates to the selected timezone for date badges.
- Duration continues to use `timeexpected`.

User roles:
- Authenticated admin or clinic staff with customer profile access.

Happy paths:
- Open `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39`.
- Go to `Lịch sử lịch hẹn`.
- Rows such as `AP244803` with `time = null` and timestamped `date` should show the local start time instead of `--:--`.
- Rows with explicit `time`, such as `09:00`, should keep that explicit time.

Edge cases:
- Plain `YYYY-MM-DD` dates without a time component should still show `--:--` if `time` is null.
- ISO timestamps should display in the selected app timezone, defaulting to `Asia/Ho_Chi_Minh`.

Regressions:
- Date badges must not shift one day.
- Customer profile appointment counts, doctor/team display, status badges, and edit buttons should continue to render.

Setup data and login state:
- Use an authenticated admin session.
- Use the current production customer URL `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39` or another customer with migrated appointments where `time` is null and `date` contains a timestamp.

---

# TestSprite Plan: Appointment Export Time Preservation

Feature/edit name: Appointment Export Time Preservation

Changed URLs and API routes:
- `/calendar`
- `/appointments`
- `/reports/appointments`
- `POST /api/Exports/:type/preview`
- `POST /api/Exports/:type/download`

Affected data flows:
- Appointment operational Excel exports now preserve the full appointment timestamp from `dbo.appointments.date` when the legacy `time` column is empty.
- Export filename and workbook date formatting should continue to use Vietnam time.
- The API runtime should run with `TZ=Asia/Ho_Chi_Minh` so PostgreSQL timestamp parsing matches the clinic UI.

User roles:
- Authenticated admin or clinic staff with export access for calendar, appointments, or reports surfaces.

Happy paths:
- Export appointments where `date` contains a full timestamp and `time` is null; the exported workbook should show the stored appointment hour, not `00:00`.
- Export appointments where both `date` and `time` are present; the explicit legacy time should still win.
- Preview and download should return the same row count for the same filters.

Edge cases:
- Null appointment date returns a blank export date instead of crashing.
- ISO string dates and plain `YYYY-MM-DD` strings still produce valid workbook dates.
- Large date-range downloads should complete behind the production `/api` proxy timeout.

Regressions:
- Existing export types must still register and download.
- Appointment calendar display should not shift by one day or lose appointment hours.
- Export audit behavior should continue to record preview/download attempts.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if valid.
- Use appointments with `dbo.appointments.date` values containing afternoon times and null `time` values.

---

# TestSprite Plan: Accent-Insensitive Search

Feature/edit name: Accent-Insensitive Search

Changed URLs and API routes:
- `/`
- `/calendar`
- `/appointments`
- `/customers`
- `/employees`
- `/services`
- `/service-catalog`
- `/payment`
- `/permissions`
- `/api/Appointments?search=...`
- `/api/Partners?search=...`
- `/api/Employees?search=...`
- `/api/Products?search=...`
- `/api/ProductCategories?search=...`
- `/api/SaleOrders?search=...`
- Other API list searches that accept `search`, including cash books, receipts, CRM tasks, monthly plans, stock pickings, journals, payslips, commissions, and website pages.

Affected data flows:
- Overview staff search within `Lịch trình ngày` and `Lịch hẹn hôm nay` normalizes both the query and appointment text before matching.
- Overview `Today's Services / Activity` search is currently a placeholder with no service rows to filter; when service rows are added, the same accent-insensitive rule applies.
- Staff type unaccented Vietnamese search terms into frontend search inputs.
- Frontend-only list filters normalize both the query and displayed row text.
- API-backed searches send the raw query; backend SQL compares both raw and accent-stripped forms.
- Customer code, phone, appointment number, sale order number, and receipt/reference searches must still work.

User roles:
- Admin user with access to customers, calendar, appointments, employees, services, payment, settings/permissions, and reporting-style operational lists.
- Scoped clinic staff should see only data allowed by existing route permissions and location filters.

Happy paths:
- On `/`, searching `nguyen`, `thoai`, or `duong` in the Overview appointment searches finds matching accented customer, doctor, assistant, TLBS, location, or note text when matching rows exist.
- On `/`, typing into the `Lịch trình ngày` search must not change the `Lịch hẹn hôm nay` search, and typing into `Lịch hẹn hôm nay` must not change `Lịch trình ngày`.
- Searching `quyen` finds records containing `Quyền`.
- Searching `nguyen` finds records containing `Nguyễn`.
- Searching `my han` finds records containing `Mỹ Hân`.
- Existing accented searches such as `quyền` still find the same records.
- Numeric and alphanumeric searches such as phone numbers, `T8250`, `AP...`, and `SO...` still return the expected records.

Edge cases:
- Mixed case search terms.
- Extra leading/trailing spaces.
- Empty search term should return the normal unfiltered list.
- Vietnamese `đ`/`Đ` should match `d`.
- Search counts and pagination totals should match the visible filtered rows.

Regressions:
- Customer search must not fall back to phone-digit matching for alphanumeric customer codes.
- Calendar day search, Today Appointments search, payment search, service catalog category search, and permission-board employee search should not require accents.
- Backend count/aggregate queries must not fail when search uses joined display fields.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if it is still valid.
- Seed or pick records containing accented Vietnamese names such as `Phạm Thị Thảo Quyền`, `Nguyễn Thị Mỹ Hân`, and a customer code like `T8250`.

---

# TestSprite Plan: Guided Face Profile Capture

Feature/edit name: Guided Face Profile Capture

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `POST /api/face/register`
- `GET /api/face/status/:partnerId`

Affected data flows:
- Add-customer face capture now guides staff through straight, left, and right customer head positions.
- New customers with a saved no-match face scan register all captured profile samples after the customer record is created.
- Existing customer face registration stores multiple profile samples through the existing face-register endpoint.
- Face status sample count should increase by the number of accepted profile samples.

User roles:
- Admin or clinic staff with `customers.view` and `customers.edit`.

Happy paths:
- Opening the customer add form and using face scan shows the three-step guide: straight, left, right.
- A no-match customer add stores the pending profile samples and registers them after Save.
- Editing an existing customer and pressing Register Face stores three samples without leaving the modal stuck in processing.

Edge cases:
- Camera denied shows the existing permission error.
- Staff can still switch camera before scanning.
- Manual Capture during a profile step advances to the next pose.
- Closing the modal clears pending profile samples.

Regressions:
- Quick Face ID recognition still opens from the header and can recognize or cancel.
- Existing single-image face recognition APIs remain compatible with `FaceCaptureModal` callers.
- Failed post-save face registration must not block the created customer record.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for browser automation, or a real local camera for manual verification.
- Use a test customer that can be safely edited for `/customers/:id` face registration checks.

---

# TestSprite Plan: CompreFace Face ID Provider

Feature/edit name: CompreFace Face ID Provider

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- Header Quick Face ID button on all authenticated routes
- `POST /api/face/recognize`
- `POST /api/face/register`
- `POST /api/face/re-register`
- `GET /api/face/status/:partnerId`
- `GET /api/health`

Affected data flows:
- Browser camera still captures the JPEG through `FaceCaptureModal`.
- Backend Face ID provider is selected by `FACE_RECOGNITION_PROVIDER=local|compreface`.
- CompreFace mode registers subjects with `partners.id`, uploads face examples to CompreFace, maps recognition subjects back to `dbo.partners`, and updates `partners.face_subject_id` / `face_registered_at`.
- Local mode continues to use `face-service` embeddings in `dbo.customer_face_embeddings`.

User roles:
- Admin or clinic staff with `customers.view` for recognition.
- Admin or clinic staff with `customers.edit` for registration/re-registration.

Happy paths:
- With `FACE_RECOGNITION_PROVIDER=compreface`, `/api/health` reports `faceProvider: "compreface"` and `checks.faceService: true` when CompreFace is reachable with a valid key.
- Registering a customer face creates or reuses a CompreFace subject and returns `{ success, partnerId, sampleId, sampleCount, faceRegisteredAt }`.
- Re-registering from `/customers/:id` replaces the CompreFace subject examples and returns all sample IDs.
- Quick Face ID recognition maps a CompreFace subject back to the correct customer and opens `/customers/:id`.

Edge cases:
- Missing or invalid `COMPREFACE_API_KEY` degrades Face ID health without blocking unrelated customer pages.
- Existing CompreFace subject returns 409 and registration still adds a new example.
- Deleted/missing CompreFace subject during re-register is ignored before recreating it.
- Unknown CompreFace subjects are ignored instead of linking to the wrong customer.
- Low-confidence results return candidates or no-match, not an automatic customer jump.
- Browser sessions without native `FaceDetector` support must not auto-capture a center face from frame quality alone.
- CompreFace recognize/register requests must send a native multipart `file` part; provider responses like "Required part file is missing" indicate the upload client is broken.
- `NO_FACE` from local or CompreFace providers must keep the camera modal open and show "Không phát hiện khuôn mặt" / "Face not detected".
- CompreFace no-face responses must return HTTP 422 with `error: "NO_FACE"`, not a generic engine error.

Regressions:
- `FACE_RECOGNITION_PROVIDER=local` still uses `face-service` and `dbo.customer_face_embeddings`.
- Single-image capture callers still work with `POST /api/face/register`.
- Guided profile capture still sends three images for re-registration.
- Manual customer search fallback still works after no-match.
- Header Quick Face ID, customer camera widget, and profile re-registration all keep capture open on no-face failures until staff manually closes it.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for automation or a real local camera for manual checks.
- Start CompreFace with `docker compose up -d compreface-postgres-db compreface-api compreface-core`.
- Set a valid `COMPREFACE_API_KEY` for the recognition service and set `FACE_RECOGNITION_PROVIDER=compreface`.
- Use a safe test customer whose Face ID can be replaced.

Execution checklist for the no-face fix:
- [ ] PENDING: With the camera pointed away or covered, verify the capture modal shows "Không phát hiện khuôn mặt" and remains open until cancel/close.
- [ ] PENDING: Trigger CompreFace no-face on `POST /api/face/re-register` and verify HTTP 422 `NO_FACE`, not `ENGINE_ERROR`.
- [ ] PENDING: Trigger Header Quick Face ID no-face and verify it keeps capture open without opening the no-match rescue popover.
- [ ] PENDING: Trigger customer profile re-registration no-face and verify no success toast appears until a valid face is captured.

---

# TestSprite Plan: Customer Service Quantity Save

Feature/edit name: Customer Service Quantity Save

Changed URLs and API routes:
- `/customers/:id`
- `/api/SaleOrders/:id`
- `/api/SaleOrders/lines?partner_id=...`

Affected data flows:
- Staff opens a customer profile and goes to `Phiếu khám`.
- Staff edits an existing service line quantity/unit such as `1 răng`.
- The edit form saves through the parent sale order route.
- The backend must update both `saleorders.quantity` and the rendered `saleorderlines.productuomqty`.
- The customer profile reloads sale-order lines and shows the saved quantity without a manual page reload.

User roles:
- Admin or clinic staff with `customers.edit` and service-record access.

Happy paths:
- Open a customer with at least one service line showing `1 răng`.
- Edit that service and change quantity to another value, for example `3`.
- Save the form.
- Reopen the same customer `Phiếu khám` row and confirm the quantity column shows `3 răng`.
- Reopen the edit modal and confirm the quantity field still shows the saved value.

Edge cases:
- Existing migrated rows where the line quantity differs from the parent order quantity.
- Quantity-only edits with the same price, doctor, service, and tooth values.
- Edits that also change service price, doctor, assistant, TLBS, tooth notes, or unit.

Regressions:
- Payment totals and remaining balance must not duplicate across multi-line orders.
- Delete service still targets the sale-order line id.
- Payment still targets the parent sale order id.
- Existing tooth label such as `manual` remains visible unless staff intentionally changes it.

Setup data and login state:
- Use an authenticated admin session.
- Prefer the current customer URL `/customers/f72f8c86-34e9-4377-b59c-b414002ec20c` if seeded locally.
- Use disposable or already-known QA service data when changing quantity.

## Fix Implemented (2026-05-07)

**Root cause:** `ServiceForm.tsx` stored `quantity` as a string, which caused React controlled-input reconciliation issues with `type="number"` — the browser's native number parsing conflicted with React's string value, making the input appear frozen/uneditable.

**Changes:**
- `website/src/components/services/ServiceForm.tsx`:
  - Changed `quantity` state from `string` to `number` (`initialData?.quantity ?? 1`)
  - Fixed `onChange` to parse to number: `setQuantity(v === '' ? 1 : Number(v))`
  - Simplified submit: `quantity || 1` (no more `Number()` coercion needed)
- `website/src/hooks/useServices/mapSaleOrderToServiceRecord.ts`:
  - Fixed `parseFloat("0")` being falsy: changed `order.quantity ? parseFloat(...) : 1` → `order.quantity != null ? parseFloat(...) : 1`

---

# TestSprite Plan: Customer Initial Load Performance

Feature/edit name: Customer Initial Load Performance

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `/api/Appointments?offset=0&limit=200`
- `/api/Employees?offset=0&limit=500&active=all`
- `/api/SaleOrders?offset=0&limit=500`

Affected data flows:
- Customer list initial render after login.
- Customer profile hooks that share appointment, employee, and service data.
- Empty-search state for appointments, employees, and services.

User roles:
- Authenticated admin or clinic staff with customer access.

Happy paths:
- Open `/customers` after login and confirm the customer table renders.
- Initial customer-list load should not request profile-only appointments, employees, or sale orders.
- Opening `/customers/:id` should still request profile-specific employees and service data.
- Searching appointments, employees, or services still triggers the debounced search request after typing.

Edge cases:
- Clearing a non-empty search term should reload the unfiltered data once.
- Switching selected customer profile should still load profile-specific services.
- Location-scoped views should still pass the selected location filter.

Regressions:
- Creating or updating appointments and services should still update local state.
- Employee filters and service filters should still work after the initial fetch.
- Version display and guided face capture should continue to load.

Setup data and login state:
- Use an authenticated admin session.
- Capture browser network requests for `/customers` and compare duplicate initial API calls before and after the change.

---

# TestSprite Plan: Staff Selector Clear Option

Feature/edit name: Staff Selector Clear Option

Changed URLs and API routes:
- `/appointments`
- `/calendar`
- `/services`
- `/customers/:id` through the service edit modal
- No API route shape changed; existing appointment and sale-order save routes should receive `null`/empty staff values when staff is cleared.

Affected data flows:
- Appointment edit/add form doctor, assistant, and dental-aide selectors.
- Service edit/add form doctor, assistant, and dental-aide selectors.
- Shared `DoctorSelector` clear action now emits `null` instead of an empty string.

User roles:
- Admin or clinic staff allowed to add/edit appointments and patient service records.

Happy paths:
- Open an appointment or service with a selected doctor, assistant, or TLBS.
- Open the staff dropdown and click `Không chọn (None)`.
- Save and reopen the record; the cleared field should stay empty.
- Select another staff member after clearing and save successfully.

Edge cases:
- Clear only one staff role while leaving the other two selected.
- Clear all three staff selectors and save.
- Use search inside the dropdown, then clear the current selection.

Regressions:
- Staff search remains accent-insensitive.
- Staff dropdown still filters by the correct role: doctor, assistant, and doctor-assistant.
- Calendar/service edit saves still close normally and refresh visible records after success.

Setup data and login state:
- Use an authenticated admin session.
- Use any appointment or service record that already has doctor, assistant, or TLBS selected.

Fix implemented:
- The shared staff selector now shows the `Không chọn (None)` clear row whenever clearing is enabled, even if the current record has a stale selected id that does not resolve in the active staff list.

---

# TestSprite Plan: Customer Payment Identity Reconciliation

Feature/edit name: Customer Payment Identity Reconciliation

Changed URLs and API routes:
- `/payment`
- `/customers/:id`
- `GET /api/Payments`
- `GET /api/Payments?customerId=...&type=payments`
- `GET /api/Payments/deposits`
- `GET /api/Payments/deposit-usage`
- `GET /api/Payments/:id`

Affected data flows:
- Canonical payment rows now include the linked customer name, phone, and location name from `dbo.partners` / `dbo.companies`.
- `/payment` history maps canonical `dbo.payments` rows into visible customer payment rows without losing customer identity.
- Payment search can match customer names and phones on canonical payment rows, including accent-insensitive searches like `ma van thanh`.
- Customer profile payment tabs and service history still use the same payment and allocation IDs.

User roles:
- Admin or clinic staff with `payment.view`.
- Staff with customer profile access when checking `/customers/:id` payment history.

Happy paths:
- Open `/payment`, search `ma van thanh`, and confirm payments for `MÃ VĂN THÀNH - UP` remain visible.
- Search `0985227087` and confirm both duplicate customer profiles can be reconciled from visible payment identity.
- Open `T050559` customer profile and confirm orthodontic payments total `14.801.000 ₫` against `SO45244`.
- Open `T058004` customer profile and confirm the two `700.000 ₫` payments remain separate on the QL profile.

Edge cases:
- Payment rows with missing partner records should still render without crashing.
- Legacy `accountpayments` fallback rows should include customer identity when fallback is used.
- Voided payments should keep existing status behavior.
- Deposit and deposit-usage endpoints should still return the same rows and counts.

Regressions:
- `/payment` all-location history should not lose receipt/reference code display.
- Outstanding balance cards should still derive from sale orders and not double-count canonical payment rows.
- Customer profile service residual display should still use sale order residual and allocation data.
- Existing accent-insensitive search behavior across payment text fields should remain intact.

Setup data and login state:
- Use an authenticated admin session with `payment.view`.
- Use local customer records `T050559` (`MÃ VĂN THÀNH - UP`) and `T058004` (`MÃ VĂN THÀNH - QL`), both phone `0985227087`.
- Use local sale order `SO45244` and payment references `CUST.IN/2026/103918`, `CUST.IN/2026/103919`, and `CUST.IN/2026/102219` as verification anchors.

---

# TestSprite Plan: Customer Service Paid Total Reconciliation

Feature/edit name: Customer Service Paid Total Reconciliation

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/SaleOrders/lines`

Affected data flows:
- Customer service rows derive the paid total from posted payment amounts when imported payment allocation rows overstate the receipt amount.
- Expanded service payment history remains tied to canonical `dbo.payments` rows and should match the service row total.
- Residual display recalculates from the corrected paid amount and imported sale-order total.

User roles:
- Admin or clinic staff with `services.view`.
- Staff reviewing customer service history and payment history on a customer profile.

Happy paths:
- Open customer `T050557` / sale order `SO45243` and expand the payment history.
- Confirm the 8 history rows add to `15.400.000 ₫`.
- Confirm the collapsed service row shows paid `15.400.000 ₫` and residual `4.400.000 ₫` for total `19.800.000 ₫`.
- Confirm direct posted service payments without allocation rows still count in service paid totals.

Edge cases:
- Imported allocation rows where one payment is duplicated above its real posted amount.
- Payments split across more than one invoice should be proportionally capped only when the total allocation exceeds the real payment.
- Voided or non-payment category records should not increase the service paid total.

Regressions:
- Customer service rows with no overallocated imports should keep the same paid and residual totals.
- Service history sorting and product/doctor/dental-aide fields should remain unchanged.
- Payment button and expanded payment-history drawer should still render for partially paid services.

Setup data and login state:
- Use an authenticated admin session with `services.view`.
- Use local customer `T050557` and sale order `SO45243`.
- Verification anchor receipts: `CUST.IN/2025/80040`, `CUST.IN/2025/80041`, `CUST.IN/2025/84122`, `CUST.IN/2025/88698`, `CUST.IN/2025/92961`, `CUST.IN/2026/99621`, `CUST.IN/2026/102814`, `CUST.IN/2026/106326`.

---

# TestSprite Plan: Employee Sales Export Payment Reconciliation

Feature/edit name: Employee Sales Export Payment Reconciliation

Changed URLs and API routes:
- `/reports`
- Operational export preview/download route for the employee sales report builder.

Affected data flows:
- Employee sales report/export rows normalize overallocated imported `payment_allocations` rows before splitting payment amount across service lines.
- Report totals should match actual posted payment amounts instead of duplicated imported allocation amounts.

User roles:
- Admin or reporting staff with report/export permission.

Happy paths:
- Preview and export employee sales revenue for a date range that includes a fully paid imported service.
- Confirm the report total does not exceed the underlying posted payment amount when allocation rows are duplicated.
- Confirm line-level splitting still works for services with multiple active sale-order lines.

Edge cases:
- Payment allocations whose total exceeds the posted payment amount.
- Multi-line service orders where a normalized allocation needs to be split by line price.
- Location-scoped report users should keep the same permission behavior.

Regressions:
- Normal report filters for date, company, employee type, and employee ID still apply.
- Export workbook grouping and summary totals remain unchanged for non-overallocated data.

Setup data and login state:
- Use an authenticated admin/reporting session.
- Use a date range containing known overallocated imported sale orders such as `SO45243` or high-delta examples from the audit query.

---

# TestSprite Plan: NK2 Feedback Bug Triage

Feature/edit name: NK2 Feedback Bug Triage

Changed URLs and API routes:
- `https://nk2.2checkin.com/feedback`
- `GET /api/Feedback/all`
- `GET /api/Feedback/all/:threadId`

Affected data flows:
- Feedback admin page lists pending staff-submitted bug reports from `feedback_threads`.
- Feedback verification API returns manual staff reports plus auto-detected API/frontend error threads.
- Report artifacts are written under `reports/feedback-extract/`.

User roles:
- Admin with feedback moderation access.
- QA/TestSprite reviewer reading pending bug reports and auto-error clusters.

Happy paths:
- Log into NK2 as an admin and open `/feedback`.
- Confirm the page lists all pending manual staff reports.
- Fetch `GET /api/Feedback/all` with the same admin session and confirm the manual count matches the visible table.
- Confirm the generated report separates manual staff bugs from auto-detected 401/403 noise, backend 500 clusters, and frontend errors.

Edge cases:
- Expired or missing admin token should redirect to `/login` and not expose feedback data.
- Auto-detected 401/403 threads should be treated as auth/session noise unless tied to a confirmed workflow.
- Backend 500 clusters should preserve endpoint, status, latest timestamp, and occurrence count.
- Manual reports from NK and NK2 URLs should keep the original page URL for reproduction.

Regressions:
- `/feedback` table filtering, status labels, and `View` actions should still work.
- Login should still return to the authorized admin surface after authentication.
- Release notes toast should not block access to the feedback table.

Setup data and login state:
- Use NK2 admin login from `.agents/live-site.env`.
- Latest audit report: `reports/feedback-extract/2026-05-16T12-21-43-239Z-feedback-verification.md`.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` shows the 8 pending manual staff reports.
- [ ] PENDING: Verify `GET /api/Feedback/all` returns 345 pending feedback threads on NK2.
- [ ] PENDING: Verify manual staff reports are prioritized above auto-error clusters.
- [ ] PENDING: Verify auth/permission noise is not mixed into the manual bug list.

## Face Lab auto-capture reliability (2026-05-18)
- URL: `/face`
- API: `POST /api/face/recognize`
- Verify all 4 modules complete auto-capture within ~15s on browsers without native FaceDetector (Safari, Firefox, Chrome with flag off).
- Verify forced-capture safety net fires at 15s using best frame seen.
- Verify adaptive threshold relaxes after 6s and 10s of scanning.
- Verify "Capture now" button immediately triggers capture using best frame.

## Face Lab inline registration (2026-05-18)
- URL: `/face`
- API: `POST /api/face/register` (multipart partnerId + image)
- Verify: activate Burst module, capture face, no_match result shows "Register this face to a customer" button
- Verify: clicking opens search panel; typing 2+ chars calls `GET /api/Partners?search=...`
- Verify: clicking a customer registers the captured blob; success badge shows partner name
- Re-running the lab against same face should now return a match

## Face Lab recognize-failed recovery (2026-05-18)
- URL: `/face` (iPhone Safari especially)
- Verify: if `POST /api/face/recognize` times out or fails, the lab still shows the captured frame and the Register-face panel
- Verify: camera stops as soon as capture completes (LED off before upload)
- Verify: Register-face still works against captured blob after a recognize failure

## Face ID engine swap (2026-05-18)
- Surface: Global Face ID button (top bar), CustomerCameraWidget, AddCustomerForm
- Verify: opening Face ID and holding face captures within 5-15s on Safari, Firefox, iOS
- Verify: 5-frame burst — best of 5 sent to /api/face/recognize (check captured-blob size > 30 KB)
- Verify: profile-mode 3-pose registration on customer profile still works
- Regression: /face URL returns 404 (lab removed)

## External-checkup empty state + Create success notice (2026-05-18, v0.32.31)
- URL: `/customers/<UUID>` for any customer with no Hosoonline patient yet (e.g. `T056483`)
- API: `GET /api/ExternalCheckups/:code`, `POST /api/ExternalCheckups/:code/patient`
- Verify (patient missing): empty gallery shows `checkupEmptyPatientMissing` VN text "Khách hàng chưa có hồ sơ trên Hosoonline. Bấm 'Tạo bệnh nhân HSO' để bắt đầu tải ảnh lên." and the "Tạo bệnh nhân HSO" button is visible (requires `external_checkups.upload` perm)
- Verify (patient exists, no images): empty gallery shows `checkupEmptyNoImages` VN text "Chưa có ảnh khám nào trên Hosoonline. Bấm 'Thêm lịch khám' để tải ảnh lên."
- Verify (auth failed): shows amber `checkupEmptyAuthFailed` warning instead of generic gray text
- Verify (create success): clicking "Tạo bệnh nhân HSO" shows emerald success notice "Đã tạo hồ sơ Hosoonline. Bạn có thể tải ảnh khám lên ngay." and the gallery refreshes so the upload button becomes available
- Verify (i18n): switch language to EN; all 6 empty-state variants render English strings (no hardcoded fallbacks)
- Regression: customer with existing checkups + images still renders the gallery normally (e.g. customer code `T6281` returns 2 checkups with images that load through `/api/ExternalCheckups/images/...`)

---

# TestSprite Plan: SMS/Zalo Appointment Messaging Research

Feature/edit name: SMS/Zalo Appointment Messaging Research

Changed URLs and API routes:
- Research only; no runtime URL or API route changed.
- Future implementation plan covers `/notifications`, `/calendar`, `/customers/:id`, Overview today queue.
- Future API plan covers `GET /api/Notifications/templates`, `POST /api/Notifications/templates`, `PUT /api/Notifications/templates/:id`, `POST /api/Notifications/preview`, `POST /api/Notifications/send`, `GET /api/Notifications/messages`, `GET /api/Notifications/messages/:id`, `POST /api/Notifications/messages/:id/retry`, `GET /api/Notifications/late-appointments`, `POST /api/Notifications/appointments/:id/late-reminder`, and customer contact-preference endpoints.

Affected data flows:
- Appointment lateness detection from appointment schedule fields, appointment state, and `datetimearrived`.
- Customer contact routing through `partners.id`, `phone`, `zaloid`, and `receiverzalonumber`; phone must not be treated as unique.
- Future append-only messaging outbox, attempt log, template, provider-account, and contact-preference tables.
- Provider adapter flow for dry-run, Vietnam SMS Brandname, and later Zalo ZBS/ZNS.

User roles:
- Reception/front desk with appointment view and future `notifications.send`.
- Manager/admin with future `notifications.view`, `notifications.edit`, `notifications.send`, and `notifications.admin`.
- Staff without notification permissions must not see send/retry/admin controls.
- Location-scoped staff must not see or send reminders for another branch/location.

Happy paths:
- Open `/notifications` and verify templates, outbox statuses, provider status, and message detail history render after implementation.
- Open `/calendar` on a day with a late eligible appointment and verify the manual late-reminder action is visible.
- Send one late reminder and verify the message row records queued/sent status, rendered body snapshot, provider response, actor, channel, and appointment/customer links.
- Open customer profile and verify communication preferences and recent message history are visible without assuming phone uniqueness.
- Verify dry-run provider records the full send flow locally without contacting a real provider.

Edge cases:
- Missing phone, invalid phone, opted-out customer, duplicate phone across customers, missing appointment time, timezone boundary around midnight, already arrived, cancelled, done, in-progress, provider outage, provider timeout, rejected template, quiet-hours block, duplicate click, and worker race.
- SMS copy must avoid treatment names, health details, balances, URLs, and phone numbers unless provider/legal approval explicitly allows them.
- Zalo route must use approved template IDs and handle customers who do not have Zalo eligibility.

Regressions:
- `/notifications` existing route guard must continue to require notification permission.
- Calendar appointment load, check-in, cancel, and quick-add flows must not change when the messaging controls are hidden.
- Customer profile contact edits must not change the durable partner identity invariant.
- Existing appointment reminder fields must not be silently repurposed as the only audit trail.
- Provider webhook callbacks must require signature/shared-secret verification or remain internal polling only; unsigned callbacks must not update message status.

Setup data and login state:
- Use authenticated admin/manager and receptionist/staff sessions.
- Seed at least one scheduled/confirmed appointment 15+ minutes late today, one arrived appointment, one cancelled appointment, one other-branch late appointment, one customer with no phone, one duplicate-phone customer pair, one opted-out customer, and one dry-run provider config.
- Collect screenshot evidence for `/notifications`, `/calendar` late appointment state, and customer communication history when browser-visible verification runs.

TestSprite execution items:
- [ ] PENDING: Verify `/notifications` messaging dashboard renders templates, outbox statuses, failed/skipped states, and retry details.
- [ ] PENDING: Verify `/calendar` exposes manual late-reminder action only for eligible late appointments.
- [ ] PENDING: Verify a manual late reminder creates one outbox row and one provider attempt with an idempotency key.
- [ ] PENDING: Verify duplicate send attempts for the same appointment/template/customer do not create duplicate successful messages.
- [ ] PENDING: Verify missing/invalid/opted-out contact cases create skipped or blocked states, not crashes.
- [ ] PENDING: Verify customer profile communication preferences and message history key by `partners.id`, not phone number.
- [ ] PENDING: Verify staff without `notifications.send` cannot send or retry reminders.
- [ ] PENDING: Verify staff without `notifications.edit` cannot create/edit templates or provider settings.
- [ ] PENDING: Verify staff without `notifications.admin` cannot access provider/admin configuration.
- [ ] PENDING: Verify location-scoped staff cannot view or send reminders for another branch/location.
- [ ] PENDING: Verify unsigned or invalid provider webhook callbacks do not update message status.

## 2026-05-19 — Feedback Attachment Persistence / Revenue Proof Restore

Feature/edit name:
- Feedback attachment transaction hardening and NK revenue-resolution proof-image restore.

Changed URLs and API routes:
- Browser-visible: `https://nk.2checkin.com/feedback`, affected thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` on `/reports/revenue`.
- Upload/static route: `/uploads/feedback/:storedName`.
- API routes: `POST /api/Feedback`, `POST /api/Feedback/my/:threadId/reply`, `POST /api/Feedback/all/:threadId/reply`, `DELETE /api/Feedback/all/:threadId`.

Affected data flows:
- User/admin file upload -> `uploads/feedback/*` -> `feedback_messages` -> `feedback_attachments` -> `/uploads/feedback/*` static serving -> `/feedback` image preview.
- Thread deletion -> DB attachment/message/thread delete commit -> physical file cleanup after commit.

User roles:
- Admin/manager viewing all feedback and replying with resolution proof images.
- Staff creating feedback or replying to their own feedback with screenshots.

Happy paths:
- Admin opens `/feedback`, selects the May 17 revenue-report resolved thread, and sees the restored proof image load without a broken image/empty thumbnail.
- Admin reply with text plus image succeeds and the returned attachment URL loads with HTTP 200.
- Staff creates file-only feedback and staff/admin file-only replies succeed with empty message content plus a valid image attachment.
- Admin deletes a feedback thread and attached files disappear only after the DB delete succeeds.

Edge cases:
- Reply with no text and no file returns 400 without creating rows or files.
- Reply with uploaded file to a missing thread returns 404 and removes the uploaded file.
- Attachment DB insert/enrichment failure rolls back message/thread updates and removes the uploaded file.
- Delete-route DB failure before commit must not delete physical files that still have DB rows.

Regressions:
- Existing text-only feedback creation/reply behavior remains unchanged.
- Existing feedback list/detail endpoints still populate messages and attachments.
- `/uploads/feedback/*` continues to serve JPEG/PNG/GIF/WebP files through production nginx/API routing.

Setup data and login state:
- Use an authenticated admin session for `t@clinic.vn` on NK production.
- Use feedback thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` and restored file `c51c44c8-8b39-4fdc-b881-6c70711160ca.jpg` as regression evidence.
- Orphan-row backup for unrecoverable stale attachments: `/opt/tgroup/backups/feedback-orphan-attachments-20260519T0249Z.csv`.
- Capture screenshot evidence of the loaded proof image in `/feedback` after deployment.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` loads the restored revenue proof image.
- [ ] PENDING: Verify new admin reply with image returns a `/uploads/feedback/*` URL that loads HTTP 200.
- [ ] PENDING: Verify file-only staff feedback and file-only staff/admin replies do not crash.
- [ ] PENDING: Verify missing-thread file replies clean up uploaded files and do not create `feedback_attachments` rows.
- [ ] PENDING: Verify delete rollback simulation does not remove physical files before DB commit.

## 2026-05-20 — Calendar Export Date Correctness

Feature/edit name:
- Calendar appointment Excel export local clinic date serialization and phone-filter regression.

Changed URLs and API routes:
- Browser-visible: `/calendar` export controls.
- API route: `POST /api/Exports/appointments/preview`, `POST /api/Exports/appointments/download`.

Affected data flows:
- Calendar appointment list date source (`appointments.date`) -> appointment export row serializer -> Excel `Ngày giờ hẹn`.
- Calendar search/filter state -> appointment export filters -> SQL selected-day and phone search conditions.

User roles:
- Admin/manager/staff users with `appointments.export`.

Happy paths:
- Appointment visible on `/calendar` for `20/05/2026` exports as `20/05/2026` even when legacy `datetimeappointment` is stale.
- Searching/exporting phone `922403152` filters by customer phone.
- One-day export for `2026-05-20` includes only appointments whose clinic calendar date is `2026-05-20`.

Edge cases:
- `datetimeappointment` older than `appointments.date`, null `datetimeappointment`, null `appointments.date`, legacy `time` column present, null `time`, server timezone not equal to Vietnam, and selected-day range passed as bare `YYYY-MM-DD`.

Regressions:
- Existing calendar day/week/month loading remains unchanged.
- Existing timezone export formatter tests remain green.
- Appointment edit modal and backend mutation behavior are outside this Worker B lane.

Setup data and login state:
- Use authenticated admin/manager session with `appointments.export`.
- Safe fixture should include a phone `922403152` or equivalent appointment displayed on `20/05/2026` with stale `datetimeappointment` set to an earlier date.

TestSprite execution items:
- [ ] PENDING: Verify `/calendar` one-day export for `2026-05-20` writes `20/05/2026` for phone `922403152` or safe equivalent.
- [ ] PENDING: Verify `/api/Exports/appointments/preview` row count changes when filtering by phone `922403152`.
- [ ] PENDING: Verify one-day calendar export does not include rows from `2026-05-08` or any date outside `2026-05-20`.

## 2026-05-20 — NK2 Customer Appointment Location Feedback

Feature/edit name:
- Customer-page appointment clinic/location edit persistence for unresolved feedback.

Changed URLs and API routes:
- Browser-visible: `https://nk2.2checkin.com/feedback`, `https://nk2.2checkin.com/customers/ee5881cb-5a08-483b-80d2-aff80048b36b`.
- API route: `PUT /api/Appointments/:id`, verified with appointment `d2f961fd-7384-4d18-bf4e-65cb49688d28`.

Affected data flows:
- Customer page appointment edit modal -> branch selector `companyid` -> `PUT /api/Appointments/:id` -> appointment readback -> reopened edit modal display.

User roles:
- Admin user on NK2 staging with permission to edit appointments.

Happy paths:
- Admin opens customer `TEST` / `T0365`, edits appointment `AP9568610`, changes `CHI NHÁNH`, saves, and the reopened modal shows the saved branch.
- API readback returns the updated `companyid` and `companyname`.

Edge cases:
- Feedback source page references a different customer, but the bug reproduces through any customer-page appointment edit with an existing appointment.
- The verification must restore the original branch after proving persistence because NK2 shares production-backed data.

Regressions:
- Existing appointment date, time, duration, doctor, service tags, status, and note should remain unchanged while only `companyid` changes.
- NK production should not be deployed or modified while verifying NK2.

Setup data and login state:
- Login: authenticated admin session on NK2.
- Safe existing test data: customer `[T0365] TEST`, appointment `AP9568610`, original branch `Tấm Dentist Gò Vấp`.
- Verification evidence path: `/Users/thuanle/Documents/TamTMV/Tgrouptest/output/playwright/nk2-appointment-location-proof-20260520/`.

TestSprite execution items:
- [x] VERIFIED: Feedback page shows one pending item for changing appointment/customer location after appointment creation.
- [x] VERIFIED: Customer `[T0365] TEST` appointment `AP9568610` changed from `Tấm Dentist Gò Vấp` to `Tấm Dentist Quận 3` through the customer-page edit modal.
- [x] VERIFIED: `PUT /api/Appointments/d2f961fd-7384-4d18-bf4e-65cb49688d28` returned 200 and API readback showed `Tấm Dentist Quận 3`.
- [x] VERIFIED: Appointment was restored to `Tấm Dentist Gò Vấp` and final API readback confirmed the original branch.
- [x] VERIFIED: Feedback thread `769230ed-53ac-4f0f-9816-0b9c5c564f5b` was replied to with the verification summary and three proof screenshots, then marked `Resolved`.

## 2026-05-20 — NK2 Clone Payment Allocation Merge

Feature/edit name:
- Targeted VPS database repair for one clone-only payment and payment allocation from `tdental_smoketest` into main `tdental_demo`.

Changed URLs and API routes:
- No code URLs changed.
- Data surfaces to verify after merge: `/customers/67e36450-fc43-4b7a-bdae-b4350079dc96`, `/payment`, and payment reads through `GET /api/Payments`.

Affected data flows:
- `tdental_smoketest.dbo.payments` -> `tdental_demo.dbo.payments`.
- `tdental_smoketest.dbo.payment_allocations` -> `tdental_demo.dbo.payment_allocations`.
- Customer `T163974` payment history and service allocation display.

User roles:
- Admin/manager users with customer/payment view permissions.

Happy paths:
- Customer `T163974` / `[T163974] TRINH - G1` shows bank transfer payment `14,725,000` with reference `06 - ACB - GẮN MCKLTD`.
- Payment allocation `545e7c79-06cb-4b7f-add3-a3d7d67aa8dc` links payment `9e198971-669d-422f-9120-209a856c1f22` to sale order `17dd5dd8-976c-4d60-8b46-c040b4b99351`.

Edge cases:
- Main `tdental_demo` sale order `17dd5dd8-976c-4d60-8b46-c040b4b99351` is currently `isdeleted=true`; verification must confirm whether the UI intentionally hides or still reports the inserted payment.
- Re-running the merge should be idempotent and not duplicate payment or allocation rows.

Regressions:
- No customer, appointment, service order, service line, or product rows should be added from the clone as part of this targeted repair.
- Existing main database appointment/service/payment counts should only change by the inserted payment and allocation.

Setup data and login state:
- Source clone backup: `backups/db-sync/tdental_smoketest-source-before-merge-20260520-154050.dump`.
- VPS source DB: `tdental_smoketest`.
- VPS target DB: `tdental_demo`.

TestSprite execution items:
- [ ] PENDING: Verify target DB contains payment `9e198971-669d-422f-9120-209a856c1f22` exactly once.
- [ ] PENDING: Verify target DB contains allocation `545e7c79-06cb-4b7f-add3-a3d7d67aa8dc` exactly once and linked to invoice `17dd5dd8-976c-4d60-8b46-c040b4b99351`.
- [ ] PENDING: Verify customer `T163974` payment surface after merge.

## 2026-05-20 — NK2 Database Target and Customer Creation Audit

Feature/edit name:
- VPS database target audit for NK2 customer creation claim around phone `0972020908`, followed by cleanup of the unused legacy `tdental-db` container.

Changed URLs and API routes:
- No code URLs changed.
- Checked public routes/logs for `https://nk2.2checkin.com/api/Partners` and `https://nk.2checkin.com/api/Partners`.
- Checked running API database targets for `tgroup-staging-api`, `tgroup-nk3-api`, and `tgroup-api`.
- Removed the unused legacy Docker container `tdental-db` after creating a local backup.

Affected data flows:
- NK2 nginx route `/api` -> `tgroup-staging-api` port `3102` -> `tdental_demo`.
- Smoketest-backed `tgroup-nk3-api` -> `tdental_smoketest`.
- Legacy `tdental-db` container -> `tdental` database, not referenced by current TGroup API containers; container removed after backup.
- Customer lookup in `dbo.partners` by normalized phone `0972020908`.

User roles:
- Staff/admin customer creation and customer search flows.

Happy paths:
- If staff creates a customer through NK2, nginx should show `POST /api/Partners` with `nk2.2checkin.com` referrer and the target DB should receive a new `dbo.partners` row.
- If staff only searches/opens an existing customer, nginx should show `GET /api/Partners?search=0972020908` and no new partner row should appear.

Edge cases:
- The same phone exists on two historical customers: `T6725` and `KH0001`.
- A separate running `tgroup-nk3-api` points to `tdental_smoketest`, but current nginx has no `nk3` server_name route and NK2 does not proxy to that container.
- Before removal, legacy `tdental-db` also contained the same two old phone matches, but it was not a hidden NK2 write target.

Regressions:
- Do not merge or insert any partner/customer row unless a clone-only or alternate-target-only row is found with matching creation evidence.
- Do not treat production `nk.2checkin.com` `POST /api/Partners` lines as NK2 writes.

Setup data and login state:
- VPS host: `76.13.16.68`.
- Primary Postgres container: `tgroup-db`.
- Legacy Postgres container inspected for exclusion and then removed: `tdental-db`.
- Backup before removal: `backups/db-sync/tdental-legacy-before-container-delete-20260520-163907.dump`.
- Preserved rollback volume: `tdental-postgres-data`.
- Audit phone: `0972020908`.

TestSprite execution items:
- [x] VERIFIED: `nk2.2checkin.com/api` proxies to `127.0.0.1:3102`, which is `tgroup-staging-api`.
- [x] VERIFIED: Current `tgroup-staging-api` uses `tdental_demo`; current `tgroup-nk3-api` uses `tdental_smoketest`; `tgroup-api` uses `tdental_demo`.
- [x] VERIFIED: `tgroup-db` databases are `tdental_demo`, `tdental_smoketest`, `tcosmetic_smoketest`, `tgroup_restore_probe_20260507`, and `postgres`.
- [x] VERIFIED: `tdental-db` has database `tdental`, but no current TGroup API container has `DATABASE_URL` pointing to it.
- [x] VERIFIED: `0972020908` resolves to existing old rows `T6725` and `KH0001` in `tdental_demo`, `tdental_smoketest`, and legacy `tdental`.
- [x] VERIFIED: NK2 nginx logs have zero `POST /api/Partners` on May 20, 2026; the phone appears only in GET search/open requests on NK2.
- [x] VERIFIED: Local backup created before deletion with SHA-256 `a5aafd000539625ff9f92f960e6a1e3d7eb737ac10065f819fcd7ce69daa57e3`.
- [x] VERIFIED: `tdental-db` no longer appears in `docker ps -a`; preserved Docker volume `tdental-postgres-data` still exists.
- [x] VERIFIED: Strict post-delete env scan found no running container pointed at `tdental-db` or `/tdental`.

# TestSprite Plan: Defense-in-Depth Anti-Regression 2026-05-20

Feature/edit name: Defense-in-Depth Anti-Regression 2026-05-20

Changed paths:
- New: `scripts/require-clean-tree.sh`, `scripts/deploy-build-args.sh`, `api/src/services/exports/__tests__/allBuilderColumns.lock.test.js`
- Modified: `Dockerfile.web` (ARG GIT_SHA / GIT_BRANCH), `docker-compose.yml` (passes them through), `website/scripts/generate-version.js` (prefers env vars over `git` shell-out).

Affected data flows:
- Build process now refuses dirty trees; `version.json` reports real commit; 6 more Excel export column lists are locked against silent drops.

Execution items:
- [ ] PENDING: `bash scripts/require-clean-tree.sh` exits 1 on dirty tree, exits 0 on clean tree.
- [ ] PENDING: After `GIT_SHA=$(git rev-parse HEAD) docker compose up -d --build web`, `curl <host>/version.json` returns the real short SHA.
- [ ] PENDING: `npx jest src/services/exports/__tests__/allBuilderColumns.lock.test.js` passes 24/24.
- [ ] PENDING: Simulated removal of any one column in any of the 6 builders causes 3+ test failures in allBuilderColumns.lock.test.js.

## 2026-05-21 — NK 2Checkin Login Monitor

Feature/edit name:
- Automation health check for production login and three non-destructive navigation screens.

Changed URLs and API routes:
- Checked target URL: `https://nk.2checkin.com`.
- Intended login API route: `POST /api/Auth/login`.
- No production URLs, routes, or data were changed.

Affected data flows:
- Browser login form -> frontend auth context -> `/api/Auth/login` -> JWT/localStorage session -> read-only navigation screens.

User roles:
- Admin monitor credentials: `t@clinic.vn` / fallback `t@clinic.com`.

Happy paths:
- `t@clinic.vn / 123123` logs in and lands on authenticated navigation.
- If the first account fails, `t@clinic.com / 123123` is attempted.
- Three distinct navigation screens load with visible content and no obvious broken UI, blank content, or page-level error messages.

Edge cases:
- DNS or browser sandbox failure prevents the monitor from reaching the live host.
- Login API returns 4xx/5xx or visible invalid-credential message.
- Auth succeeds but one or more read-only screens show blank content, broken layout, or API error banners.

Regressions:
- Do not create, edit, delete, submit, import, export, or modify production data during this monitor.
- Do not use destructive navigation items such as add, edit, delete, save, payment, import, export, or logout as validation screens.

Setup data and login state:
- Production URL: `https://nk.2checkin.com`.
- Primary credential: `t@clinic.vn / 123123`.
- Fallback credential: `t@clinic.com / 123123`.
- Screenshot evidence required when browser access is available.

TestSprite execution items:
- [ ] PENDING: Re-run from a browser-capable environment because this sandbox reported no DNS configuration and denied desktop browser control.
- [ ] PENDING: Capture authenticated screenshots for three distinct read-only screens after login.
- [ ] PENDING: Record visible login error text if both credentials fail.

## 2026-05-21 — Appointment companyId persistence (PUT /api/Appointments/:id)

Feature/edit name:
- Persist the selected clinic/location (companyid) when editing an appointment.

Changed URLs and API routes:
- `PUT /api/Appointments/:id` — now reads `companyId` (and `companyid` alias) from the body, UUID-validates, FK-checks against `companies`, and writes `appointments.companyid`.

Affected data flows:
- Calendar / Appointments edit form (`appointmentForm.mapper.ts`) → API client `lib/api/appointments.ts` → `PUT /api/Appointments/:id` (`mutationHandlers.updateAppointment`) → `dbo.appointments.companyid` → response includes refreshed `companyid` + `companyname`.

User roles:
- Admin (`appointments.edit` permission).

Happy paths:
- Open an appointment, change Cơ sở to a different location, click Save. After page reload the appointment still shows the new location.
- API response from PUT echoes the new `companyid` + `companyname`.

Edge cases:
- companyId omitted from body → existing companyid is preserved (column not in UPDATE SET).
- companyId present but malformed → `400 INVALID_COMPANY_ID`.
- companyId references a nonexistent companies row → `404 COMPANY_NOT_FOUND`.
- locationId field cleared in the form → mapper sends companyid as the current selection (form keeps locationId required).

Regressions:
- Do not introduce companyId on POST path that previously worked; the create endpoint already accepted companyId/companyid and is unchanged.
- Do not break null-clear semantics for `doctorId`, `assistantId`, or `dentalAideId`; they remain explicit `null`-able.

Setup data and login state:
- Local dev: `http://127.0.0.1:5175`, login `t@clinic.vn / 123123` (Tgrouptest demo DB).
- A valid `companies.id` UUID for the target clinic.

TestSprite execution items:
- [ ] PENDING: Edit any appointment on `/calendar`, change Cơ sở, save, reload, verify location persisted.
- [ ] PENDING: `npx jest api/src/routes/appointments/__tests__/mutationHandlers.test.js` passes (incl. the new companyId valid-UUID / 400 / 404 cases).
- [ ] PENDING: `npx vitest run website/src/components/appointments/unified/__tests__/appointmentForm.mapper.test.ts` passes (incl. the new locationId→companyid case).

## 2026-05-21 — Export feature-catalog YAML/code cross-check

Feature/edit name:
- Lock product-map export YAML specs against builder COLUMNS arrays via a Jest cross-check.

Changed URLs and API routes:
- None. Test-only change.

Affected data flows:
- Build-time guard: `product-map/features/exports/*.yaml` ↔ `api/src/services/exports/builders/*.js` COLUMNS / DATA_COLUMNS / REVENUE_COLUMNS / DEPOSIT_COLUMNS arrays.

User roles:
- Internal/dev only.

Happy paths:
- `npx jest api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` reports 40 passed / 40 total.

Edge cases:
- YAML adds/removes a column without builder change → test fails (key or header mismatch, or count mismatch).
- Builder reorders columns → order-sensitive comparison fails.
- Builder adds/removes a column without YAML change → test fails.

Regressions:
- Test must not touch builder source; if it did, this commit would conflict with the export work shipping on nk3-deploy / nk2.
- Do not weaken assertions to silence drift; update YAML + builder together.

Setup data and login state:
- None. Pure file-parsing Jest run.

TestSprite execution items:
- [ ] PENDING: `npx jest api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` passes 40/40.
- [ ] PENDING: Hand-edit one column header in any builder COLUMNS array and confirm the cross-check fails with a clear key/header mismatch message. Revert the edit.

## 2026-05-21 — Feedback Lark T-Group alerts

Feature/edit name:
- Send TGClinic feedback creation alerts to the Lark `T-Group` chat through a custom bot webhook.

Changed URLs and API routes:
- `POST /api/Feedback` — after a manual feedback thread commits, queue an optional non-blocking Lark alert.
- `POST /api/telemetry/errors` — after a first-seen frontend error creates an auto feedback thread, queue an optional non-blocking Lark alert.
- `/feedback` — target inbox link included in the Lark message; no UI route behavior changed.
- Outbound webhook: `https://open.larksuite.com/open-apis/bot/v2/hook/*` from backend only when `LARK_FEEDBACK_WEBHOOK_URL` is configured.

Affected data flows:
- FeedbackWidget / staff feedback -> `POST /api/Feedback` -> `feedback_threads` + `feedback_messages` commit -> `api/src/services/larkNotifier.js` -> Lark custom bot text message.
- ErrorBoundary / API error telemetry -> `POST /api/telemetry/errors` -> `error_events` + auto `feedback_threads` commit -> `api/src/services/larkNotifier.js` -> Lark custom bot text message.

User roles:
- Any authenticated employee can create manual feedback.
- Admin / manager with feedback inbox access receives the operational benefit by watching Lark and opening `/feedback`.

Happy paths:
- Manual staff feedback with text only sends a Lark alert containing thread id, reporter id/name when available, page path, screen size, zero files, bounded preview, and `/feedback` link.
- Manual staff feedback with attachments sends a Lark alert with the correct file count but does not forward attachment bytes.
- First-seen telemetry error creates an auto feedback thread and sends a Lark alert with route/API context and bounded error preview.

Edge cases:
- `LARK_FEEDBACK_WEBHOOK_URL` missing -> feedback request still succeeds and alert is skipped.
- Invalid/non-Lark webhook host -> feedback request still succeeds and API logs invalid config.
- Lark returns non-2xx or network failure -> feedback request still succeeds and API logs `[Lark]` failure.
- `LARK_FEEDBACK_WEBHOOK_SECRET` configured -> request body includes Lark timestamp/sign fields.

Regressions:
- Feedback DB transaction must still roll back on attachment insert failure and must not be coupled to Lark delivery.
- Telemetry ingestion must remain public/rate-limited and must never fail the browser because Lark is unavailable.
- Webhook secret must stay backend-only in `.env`/VPS env, never in browser bundles or committed real values.

Setup data and login state:
- Local `.env` and `api/.env` now contain `LARK_FEEDBACK_WEBHOOK_URL` from the Lark `T-Group` custom bot.
- Local `.env` and `api/.env` now contain `LARK_FEEDBACK_WEBHOOK_SECRET`; Lark signature verification is enabled for the bot.
- Configure `TGROUP_PUBLIC_URL=https://nk.2checkin.com` in production so the inbox link opens the live site.
- Local dev feedback check can use `http://127.0.0.1:5175`, login `t@clinic.vn / 123123`.

TestSprite execution items:
- [x] DONE 2026-05-21: Sent a signed no-customer-data live webhook smoke test through `api/src/services/larkNotifier.js`; Lark `T-Group` displayed the `TGroup Feedback` bot message with `/feedback` link.
- [ ] PENDING: Submit manual feedback from any authenticated page and confirm a new message appears in Lark `T-Group`.
- [ ] PENDING: Submit manual feedback with an image and confirm Lark shows the file count while the attachment still renders from `/feedback`.
- [ ] PENDING: Trigger a safe frontend telemetry error in a test environment and confirm the auto-detected thread plus Lark alert appear.
- [ ] PENDING: Temporarily unset the webhook env in a local/test environment and confirm `POST /api/Feedback` still returns `201`.
- [x] DONE 2026-05-21: `npm test -- --runInBand tests/feedbackAttachments.test.js tests/telemetryAuth.test.js src/services/__tests__/larkNotifier.test.js tests/envExampleValidation.test.js` passed from `api/` (Jest ran 54 suites, 703 tests).

---

# TestSprite Plan: Feedback Login Hint + Vertical Chart Labels (2026-05-21, v0.32.37)

Feature/edit name: FeedbackWidget login hint + BarChart vertical labels

Changed URLs and resources:
- No API routes changed.
- Frontend: `website/src/components/shared/FeedbackWidget.tsx` (new login-hint bubble), `website/src/contexts/AuthContext.tsx` (clears `sessionStorage.tg_feedback_hint_dismissed` on login), `website/src/components/reports/BarChart.tsx` (new `labelOrientation` prop, auto-vertical when bar count >= 8), `website/src/pages/reports/ReportsRevenue.tsx` (cashFlowTrend explicitly `labelOrientation="vertical"`).
- i18n keys added: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI).

Data flow:
- AuthContext.login → removes `sessionStorage['tg_feedback_hint_dismissed']`.
- FeedbackWidget mount (after `user` becomes truthy) → reads sessionStorage, sets `showLoginHint=true` when key absent.
- User clicks X or clicks the feedback icon → writes `sessionStorage['tg_feedback_hint_dismissed']='1'`, hides hint.
- Next logout → fresh login resets the flag, hint shows again.

Roles affected: all authenticated users (any role with access to the dashboard chrome).

URL paths in scope: `/` (Overview) and any authenticated page that renders the Layout (the header is global). `/reports/revenue` for the chart verification.

Edge cases:
- Reload mid-session must NOT re-show the hint (sessionStorage survives reload).
- Closing the tab + reopening: hint shows again (sessionStorage cleared by tab close).
- Logout + login in same tab: hint shows again (AuthContext.login clears the key).
- BarChart with `data.length < 8` keeps horizontal labels.
- BarChart with `data.length >= 8` rotates labels -90°.
- BarChart with explicit `labelOrientation="vertical"` rotates regardless of data length.

Regressions to monitor:
- FeedbackWidget unread badge still works.
- FeedbackWidget panel still opens on icon click.
- Other BarChart consumers (ReportsAppointments weeklyTrend, ReportsDashboard months, ReportsRevenue trendMonths) render correctly with auto-detection.
- Chart height with vertical labels extends by 56px to reserve the label slot — confirm no card overflow.

Setup data: any account with auth (e.g. `t@clinic.vn / 123123` on local/staging/prod).

TestSprite execution items:
- [x] DONE 2026-05-21: Local browser verified VI hint shows on fresh login (screenshot: feedback-hint-local-vi.png).
- [x] DONE 2026-05-21: Local browser verified Xu hướng dòng tiền chart labels are rotated -90° (computed transform = `matrix(0, -1, 1, 0, 0, 4)`) with full text "22 thg 4" etc.; screenshot: cashflow-chart-verified.png.
- [ ] PENDING: After deploy to NK2 / NK, log in as t@clinic.vn, confirm hint shows in EN locale too.
- [ ] PENDING: After deploy, click X, reload, confirm hint stays dismissed.
- [ ] PENDING: After deploy, logout + log back in, confirm hint reappears.
- [ ] PENDING: After deploy, open /reports/revenue, confirm cash flow chart dates readable on production data (will have ~30 bars there).
- [ ] PENDING: Regression on /reports/appointments weekly trend — confirm labels readable when data spans many weeks.

---

# TestSprite Plan: NK3 Cosmetic LOB Feedback Triage (2026-05-22)

Feature/edit name: NK3 Cosmetic Line-of-Business feedback triage

Changed URLs and API routes:
- Live read-only triage only; no app code or API routes changed in this pass.
- Checked `https://76-13-16-68.sslip.io/reports/revenue`.
- Checked `https://76-13-16-68.sslip.io/feedback`.
- Evidence artifacts: `output/playwright/nk3-revenue-feedback-2026-05-22T08-28-07-446Z/`.
- Relevant live API routes observed: `POST /api/cosmetic/Reports/revenue/*`, `GET /api/Feedback/all?source=manual`, `GET /api/Feedback/all?source=auto`, `GET /api/Feedback/all/:threadId`.

Affected data flows:
- Cosmetic LOB selection via `localStorage.tgclinic_lob=cosmetic` routes report reads to `/api/cosmetic/Reports/revenue/*`.
- Staff feedback for NK3 cosmetic work reports failed writes on employees, customers, appointments, sale orders, and payments.
- Auto-detected feedback confirms related `500` clusters on `/Partners`, `/Payments`, and `/SaleOrders/:id`, plus `Partner with given partnerId does not exist`.

User roles:
- Admin with `lob_scope: ["dental", "cosmetic"]`, feedback moderation access, and report access.
- Cosmetic staff/admin testing customer, appointment, employee, payment, and report workflows.

Happy paths:
- Admin can log into NK3 and switch the header LOB to Cosmetic.
- `/reports/revenue` in Cosmetic should load without console/network/API errors.
- `/feedback` should list current employee reports and open detail modal with attached screenshots.

Edge cases:
- Cosmetic employee create must list only cosmetic branches (`Thẩm mỹ Hà Nội`, `Thẩm mỹ Hồ Chí Minh`) and save against the cosmetic DB.
- Cosmetic customer create must not post a cosmetic `companyid` into the dental DB.
- Cosmetic appointment create must save when the selected customer exists in the cosmetic DB.
- Cosmetic advance/deposit payment must update the "Tạm ứng đã đóng" / remaining deposit summary immediately after confirmation.
- Cosmetic revenue report should reconcile `Tổng đã thu` with posted service payments, while deposits stay in cash-flow-only cards.

Regressions:
- Dental LOB reports and write flows must remain unchanged.
- Resolved revenue/export feedback on `/reports/revenue` must stay resolved.
- CTV/cross-DB feedback noise must not be mixed into manual staff bugs unless tied to a current workflow.

Setup data and login state:
- Live NK3 URL: `https://76-13-16-68.sslip.io`.
- Use admin credentials from `.agents/live-site.env`.
- Browser screenshots captured on 2026-05-22:
  - `03-revenue-report.png` (Dental revenue default)
  - `06-revenue-report-cosmetic-lob.png` (Cosmetic revenue)
  - `04-feedback-list.png` (manual feedback list)
  - `05-feedback-detail.png` (first pending feedback detail)
  - `attachment-41028b7a-d842-4049-b5de-5b9b30f01983.jpg` (employee branch bug)
  - `attachment-d5a65a64-b10b-4aef-83a8-b846b8bc3f25.jpg` (appointment create bug)
  - `attachment-86c1ce96-04dc-4ef0-b39c-5e25d3ce0fe3.jpg` (customer-detail appointment create bug)
  - `attachment-be9ed1b8-0d5e-4ac6-bf4a-329713c9f921.jpg` (deposit summary bug)
  - `attachment-97aca05b-d881-4f5b-a029-502583aae916.jpg` (customer create FK bug)

TestSprite execution items:
- [x] PASS 2026-05-22: Logged into NK3 with `t@clinic.vn`, user payload had `lob_scope: ["dental","cosmetic"]`, and `/feedback` loaded 15 manual reports plus 426 auto-detected reports with no browser console errors, failed requests, or API 4xx/5xx during the checked flow.
- [x] PASS 2026-05-22: Cosmetic `/reports/revenue` loaded through `/api/cosmetic/Reports/revenue/*` with no API 4xx/5xx; screenshot `06-revenue-report-cosmetic-lob.png`.
- [ ] FAIL 2026-05-22: Employee create in Cosmetic shows dental branch options (`Tấm Dentist Quận 3`, `Tấm Dentist Thủ Đức`, etc.) instead of cosmetic branches; feedback `41028b7a-d842-4049-b5de-5b9b30f01983`.
- [ ] FAIL 2026-05-22: Appointment create in Cosmetic fails with `Partner with given partnerId does not exist`; feedback `d5a65a64-b10b-4aef-83a8-b846b8bc3f25` and `86c1ce96-04dc-4ef0-b39c-5e25d3ce0fe3`.
- [ ] FAIL 2026-05-22: Cosmetic customer create fails FK validation because `companyid=5c92246f-a77c-4e8c-a88e-b727757afa68` is not present in the target `companies` table; feedback `97aca05b-d881-4f5b-a029-502583aae916`.
- [ ] FAIL 2026-05-22: Cosmetic deposit/advance payment row shows `+500.000 đ` confirmed, but summary cards still show `Tạm ứng đã đóng 0 đ` and `Tạm ứng còn lại 0 đ`; feedback `be9ed1b8-0d5e-4ac6-bf4a-329713c9f921`.
- [ ] PENDING: Reproduce the failed write flows locally against the two-DB setup before fixing NK3.
- [ ] PENDING: After fixes, rerun the exact NK3 cosmetic flows and attach fresh screenshots for each resolved feedback item.

---

# TestSprite Plan: CTV TBot Feature Board Static Deploy (2026-05-22)

Feature/edit name: CTV TBot Feature Board static page deploy with shared file sync

Changed URLs and API routes:
- Changed live URL: `https://ctv.2checkin.com/tbot`
- Changed live URL alias: `https://ctv.2checkin.com/tbot/`
- Changed live shared state file: `https://ctv.2checkin.com/tbot/state/board.json`
- No app API routes changed; this uses nginx WebDAV `PUT` for one CTV-only JSON file.
- No `nk.2checkin.com`, `nk2.2checkin.com`, `nk3` sslip, or `ctv.thammyvientam.com` route was intentionally changed.
- Screenshot evidence: `output/playwright/ctv-tbot-feature-board-2026-05-22.png`.
- Shared-sync screenshot evidence: `output/playwright/ctv-tbot-shared-sync-2026-05-22.png`.

Affected data flows:
- Static HTML page copied from `/Users/thuanle/Downloads/feature_kanban_2.html`.
- The deploy copy adds browser backup through `localStorage` and primary shared persistence through `/tbot/state/board.json`.
- Each save writes the normalized feature list with `PUT /tbot/state/board.json`; each browser polls the same file every 3 seconds and applies updates when another browser changes it.
- Nginx `ctv.2checkin.com` now serves `/tbot` from `/var/www/ctv.2checkin.com/tbot/`; all other paths still proxy to the existing CTV/NK3 web container on `127.0.0.1:5375`.
- Shared legacy folder `/var/www/tbot/` remains untouched.

User roles:
- Public browser visitor for the static board.
- Internal staff using the board to track backlog, planned, in-progress, and shipped feature cards.

Happy paths:
- Opening `https://ctv.2checkin.com/tbot` returns HTTP 200 and renders the Feature Board.
- Opening `https://ctv.2checkin.com/tbot/` returns HTTP 200 and renders the same board.
- User can add cards, move them across columns, assign people, edit estimates/details, and persist state in the browser.
- A card added by one browser appears in another browser through the shared JSON file.
- Export and import backup controls remain visible.

Edge cases:
- Direct `/tbot` without trailing slash must work.
- Direct `/tbot/` with trailing slash must work.
- Refresh after adding a feature must keep the saved card through the shared JSON file, with `localStorage` as local backup.
- Malformed or unavailable shared JSON must not blank the board; browser falls back to local backup.
- The page must not load the TG Clinic app shell for `/tbot`.
- The CTV root `https://ctv.2checkin.com/` must continue loading the existing TG Clinic app, not the static board.

Regressions:
- `https://nk.2checkin.com/tbot` must continue using the existing shared `/var/www/tbot/` content.
- `ctv.thammyvientam.com` canonical CTV app routing must stay untouched.
- Nginx config test must pass before reload.

Setup data and login state:
- No login required.
- VPS host: `76.13.16.68`.
- CTV-only static target: `/var/www/ctv.2checkin.com/tbot/index.html`.
- CTV-only shared state file: `/var/www/ctv.2checkin.com/tbot/state/board.json`.
- CTV-only nginx vhost: `/etc/nginx/sites-available/ctv.2checkin.com`.
- Deployment backup path: `/var/backups/ctv.2checkin.com/tbot-20260522T091005Z`.
- Shared-sync deployment backup path: `/var/backups/ctv.2checkin.com/tbot-sync-20260522T091828Z`.

TestSprite execution items:
- [x] PASS 2026-05-22: `curl -I https://ctv.2checkin.com/tbot` returned HTTP 200, `content-length: 29324`, and `cache-control: no-store, no-cache, must-revalidate`.
- [x] PASS 2026-05-22: `curl -I https://ctv.2checkin.com/tbot/` returned HTTP 200 with the same deployed Feature Board content.
- [x] PASS 2026-05-22: Live HTML contains `Feature Board`, `feature-board-v1`, and the `localStorage` fallback for `window.storage`.
- [x] PASS 2026-05-22: Playwright interaction added `Persist check`, verified it survived reload through `localStorage`, then cleared the browser test data; no console errors.
- [x] PASS 2026-05-22: Live HTML contains `REMOTE_STATE_URL = '/tbot/state/board.json'`, `SYNC_INTERVAL_MS = 3000`, `Saved live`, and `Live update`.
- [x] PASS 2026-05-22: `curl -I https://ctv.2checkin.com/tbot/state/board.json` returned HTTP 200 and `content-type: application/json`.
- [x] PASS 2026-05-22: Two-browser Playwright sync test: browser A added `Shared sync check`, browser B saw it; browser B added `Second browser card`, browser A saw it through polling; no console errors.
- [x] PASS 2026-05-22: Test cards were cleaned afterward; `board.json` returned `features: []` with no `Shared sync check` or `Second browser card` markers.
- [x] PASS 2026-05-22: `https://ctv.2checkin.com/` still returned the TG Clinic shell (`window.__TG_VERSION__ = '0.32.35'`) instead of the Feature Board.
- [x] PASS 2026-05-22: `https://nk.2checkin.com/tbot/` still returned the previous `Bibo v3 — 20 Soft 3D Mascot Variants` page, not the Feature Board.
- [x] PASS 2026-05-22: `https://ctv.thammyvientam.com/` still returned HTTP 200 from the canonical CTV app and was not routed to `/tbot`.
- [x] PASS 2026-05-22: Shared `/var/www/tbot/index.html` checksum remained `5e7da6bb1412788eb284fd4038bfc5494e658f040cec638e7bc1299a1183dfdb`, confirming the old shared TBot folder was not overwritten.
- [x] PASS 2026-05-22: Playwright screenshot captured `output/playwright/ctv-tbot-feature-board-2026-05-22.png`.
- [x] PASS 2026-05-22: Imported 36 Backlog feature cards from Google Sheet `1wRzN3NN8nUhsS6HDBaiv1EfWyJvmOFBd`; live state now has 36 cards, all in `backlog`.
- [x] PASS 2026-05-22: Screenshot after spreadsheet import captured `output/playwright/ctv-tbot-sheet-features-2026-05-22.png`.
- [x] PASS 2026-05-22: `https://nk.2checkin.com/tbot/` still returned `Bibo v3 — 20 Soft 3D Mascot Variants`, confirming the import did not touch NK.
- [x] PASS 2026-05-22: Header deadline counters deployed on `https://ctv.2checkin.com/tbot`: six-week checkpoint shows 42 days to July 3, 2026 and Oct 15 shows 146 days to October 15, 2026.
- [x] PASS 2026-05-22: Counter screenshot captured `output/playwright/ctv-tbot-deadline-counters-2026-05-22.png`; source snapshot tracked at `docs/live-artifacts/ctv-tbot/index.html`.
- [x] PASS 2026-05-22: Replaced the small header countdown pills on `https://ctv.2checkin.com/tbot` with the Kanban Calendar-style summary block from the provided screenshot.
- [x] PASS 2026-05-22: Live Playwright check confirmed header summary text `39 TASKS · 0 DONE`, `FRI, MAY 22, 2026`, `132 DAYS LEFT`, `APR 1 → OCT 1, 2026`, progress width `27.8689%`, 39 cards, and no console/page errors.
- [x] PASS 2026-05-22: Screenshot captured `output/playwright/ctv-tbot-calendar-summary-2026-05-22.png`; live source checksum now matches `docs/live-artifacts/ctv-tbot/index.html` at `30faa4dabeaabf1e0b21ee24c1ee34019aabae84955dd5aa8949fe21b72af8e6`.
- [x] PASS 2026-05-22: Live backup saved before replacement at `/var/backups/ctv.2checkin.com/tbot-summary-20260522T100902Z/index.html.before`.

---

# TestSprite Plan: CTV TBot Kanban Calendar t2 Static Page (2026-05-22)

Feature/edit name: Additive CTV TBot Kanban Calendar static page deploy as `t2.html`

Changed URLs and API routes:
- Added live URL: `https://ctv.2checkin.com/tbot/t2.html`
- No app API routes changed.
- Existing `https://ctv.2checkin.com/tbot` Feature Board remains in place.
- No `nk.2checkin.com/tbot` route was intentionally changed.
- Screenshot evidence: `output/playwright/ctv-tbot-t2-kanban-calendar-2026-05-22.png`.

Affected data flows:
- Static HTML page copied from `/Users/thuanle/Downloads/kanban_calendar.html`.
- The page uses its own browser storage key `kanban-calendar-sheet-import-v1`.
- No shared JSON file, clinic database table, or backend API was changed for this page.

User roles:
- Public browser visitor for the static Kanban Calendar page.
- Internal staff reviewing the imported 6-week plan and task calendar.

Happy paths:
- Opening `https://ctv.2checkin.com/tbot/t2.html` returns HTTP 200 and renders the Kanban Calendar page.
- The page title is `Kanban Calendar — Sheet Import`.
- The page displays the imported task calendar with 106 task cards and local browser persistence.

Edge cases:
- Refresh should keep edits through the page's local storage.
- Browser storage failure should fall back to the embedded default state.
- Loading `t2.html` must not affect the existing `/tbot` Feature Board or `/tbot/state/board.json`.

Regressions:
- `https://ctv.2checkin.com/tbot` must continue serving the Feature Board.
- `https://nk.2checkin.com/tbot` must continue serving the existing NK TBot content.
- Shared legacy folder `/var/www/tbot/` must remain untouched.

Setup data and login state:
- No login required.
- VPS host: `76.13.16.68`.
- CTV-only static target: `/var/www/ctv.2checkin.com/tbot/t2.html`.
- Source snapshot: `docs/live-artifacts/ctv-tbot/t2.html`.
- Source checksum: `1cf4e62c216c252d96f7c82d7324e1971ccaa9040c06c8c0fe9a1f216f756a01`.

TestSprite execution items:
- [x] PASS 2026-05-22: `scp /Users/thuanle/Downloads/kanban_calendar.html root@76.13.16.68:/var/www/ctv.2checkin.com/tbot/t2.html` completed successfully.
- [x] PASS 2026-05-22: Remote checksum for `/var/www/ctv.2checkin.com/tbot/t2.html` matches the local source checksum `1cf4e62c216c252d96f7c82d7324e1971ccaa9040c06c8c0fe9a1f216f756a01`.
- [x] PASS 2026-05-22: `curl -I https://ctv.2checkin.com/tbot/t2.html` returned HTTP 200 and `content-length: 98872`.
- [x] PASS 2026-05-22: Live HTML contains `Kanban Calendar — Sheet Import`, `kanban calendar`, and `kanban-calendar-sheet-import-v1`.
- [x] PASS 2026-05-22: Playwright browser check confirmed title `Kanban Calendar — Sheet Import`, heading `kanban calendar`, 106 task cards, and no console/page errors.
- [x] PASS 2026-05-22: Screenshot captured `output/playwright/ctv-tbot-t2-kanban-calendar-2026-05-22.png`.

---

# TestSprite Plan: NK 2Checkin Login Monitor Verification (2026-05-23)

Feature/edit name: Recurring production login health monitor run

Changed URLs and API routes:
- Verified live URL: `https://nk.2checkin.com/login`
- Verified post-login pages: `https://nk.2checkin.com/`, `https://nk.2checkin.com/calendar`, `https://nk.2checkin.com/customers`
- No app API routes changed.

Affected data flows:
- Auth login flow using staff credentials.
- Read-only dashboard, calendar, and customer-list API requests.
- No production create, edit, delete, submit, export, or data mutation action was performed.

User roles:
- Staff login account `t@clinic.vn`.
- Fallback staff login account `t@clinic.com` should be tried only if the primary account cannot log in.

Happy paths:
- Primary account `t@clinic.vn / 123123` logs in successfully and lands on the authenticated app shell.
- Dashboard, Calendar, and Customers pages render non-empty content with the expected page labels.
- No visible broken UI, blank content, login errors, console errors, page errors, or failed `/api/` responses appear during the checked flow.

Edge cases:
- If the primary account fails, retry with `t@clinic.com / 123123` and record the visible login error from the primary attempt.
- If both accounts fail, capture the login page state and any failed auth API response.
- If any API error blocks login, diagnose and fix the API before reporting the login monitor as healthy.

Regressions:
- Login page must still render `#email`, `#password`, and `button[type="submit"]`.
- Authenticated navigation must remain available after login.
- Read-only navigation checks must not open save/delete/submit actions.

Setup data and login state:
- Production URL: `https://nk.2checkin.com`
- Browser runtime: Playwright Chromium from `website/node_modules`.
- Screenshot evidence:
  - `output/playwright/nk-login-monitor-2026-05-22T17-04-44-014Z-01-dashboard.png`
  - `output/playwright/nk-login-monitor-2026-05-22T17-04-44-014Z-02-calendar.png`
  - `output/playwright/nk-login-monitor-2026-05-22T17-04-44-014Z-03-customers.png`

TestSprite execution items:
- [x] PASS 2026-05-23: `t@clinic.vn / 123123` logged in successfully; fallback `t@clinic.com / 123123` was not needed.
- [x] PASS 2026-05-23: Dashboard loaded at `https://nk.2checkin.com/` with expected authenticated content and no failed `/api/` responses.
- [x] PASS 2026-05-23: Calendar loaded at `https://nk.2checkin.com/calendar` with expected calendar labels and no failed `/api/` responses.
- [x] PASS 2026-05-23: Customers loaded at `https://nk.2checkin.com/customers` with expected customer-list labels and no failed `/api/` responses.

---

# TestSprite Plan: report.tjbot.vn TBot Report Project Move (2026-05-23)

Feature/edit name: Move both CTV TBot Kanban pages into a dedicated `report.tjbot.vn` static project

Changed URLs and API routes:
- Added live URL: `https://report.tjbot.vn/`
- Added live URL: `https://report.tjbot.vn/t2.html`
- Added live shared state file: `https://report.tjbot.vn/state/board.json`
- Old CTV URL `https://ctv.2checkin.com/tbot` now redirects to `https://report.tjbot.vn/`.
- Old CTV URL `https://ctv.2checkin.com/tbot/t2.html` now redirects to `https://report.tjbot.vn/t2.html`.
- No clinic app API routes changed.
- Screenshot evidence:
  - `output/playwright/report-tjbot-root-2026-05-23.png`
  - `output/playwright/report-tjbot-t2-2026-05-23.png`

Affected data flows:
- Static Feature Board moved from `/var/www/ctv.2checkin.com/tbot/index.html` to `/var/www/report.tjbot.vn/index.html`.
- Static Kanban Calendar moved from `/var/www/ctv.2checkin.com/tbot/t2.html` to `/var/www/report.tjbot.vn/t2.html`.
- Shared Feature Board state copied from `/var/www/ctv.2checkin.com/tbot/state/board.json` to `/var/www/report.tjbot.vn/state/board.json`.
- The moved Feature Board now writes shared state to `/state/board.json` on `report.tjbot.vn`.
- Nginx WebDAV `PUT` remains limited to the single report-domain JSON state file.

User roles:
- Public browser visitor for the report-domain Feature Board and Kanban Calendar.
- Internal staff editing the shared Feature Board state.

Happy paths:
- Opening `https://report.tjbot.vn/` returns HTTP 200 and renders the Feature Board.
- Opening `https://report.tjbot.vn/t2.html` returns HTTP 200 and renders the Kanban Calendar.
- Opening `https://report.tjbot.vn/state/board.json` returns the copied 41-feature shared state.
- Saving the Feature Board can write back to `https://report.tjbot.vn/state/board.json`.
- Old CTV TBot URLs redirect to the matching report-domain URLs.

Edge cases:
- HTTPS must use a certificate whose SAN includes `report.tjbot.vn`.
- HTTP requests should redirect to HTTPS after Certbot installation.
- Old `/tbot/state/board.json` paths on CTV should not keep the moved board active under the CTV domain.
- The existing `ctv.2checkin.com` non-TBot redirect behavior must stay unchanged.

Regressions:
- `ctv.2checkin.com/tbot` must not continue serving the Kanban pages directly.
- `nk.2checkin.com/tbot` and shared legacy `/var/www/tbot/` were not intentionally changed.
- Existing TG Clinic/NK routes must not be modified by the report-domain vhost.

Setup data and login state:
- No login required.
- VPS host: `76.13.16.68`.
- Report static root: `/var/www/report.tjbot.vn`.
- Report nginx vhost: `/etc/nginx/sites-available/report.tjbot.vn`.
- CTV redirect vhost: `/etc/nginx/sites-available/ctv.2checkin.com`.
- CTV config backup: `/var/backups/ctv.2checkin.com/tbot-move-20260523T045132Z/ctv.2checkin.com.before`.
- Report TLS certificate: `/etc/letsencrypt/live/report.tjbot.vn/fullchain.pem`.

TestSprite execution items:
- [x] PASS 2026-05-23: `dig +short report.tjbot.vn A` returned `76.13.16.68`.
- [x] PASS 2026-05-23: Created new VPS project folder `/var/www/report.tjbot.vn` and copied both static pages plus the 41-feature shared state.
- [x] PASS 2026-05-23: `nginx -t` passed before reload after adding `report.tjbot.vn` and the CTV `/tbot` redirect.
- [x] PASS 2026-05-23: Certbot issued and installed a dedicated Let's Encrypt certificate for `report.tjbot.vn`, expiring 2026-08-21.
- [x] PASS 2026-05-23: `curl -I https://report.tjbot.vn/` returned HTTP 200 with `content-length: 32056`.
- [x] PASS 2026-05-23: `curl -I https://report.tjbot.vn/t2.html` returned HTTP 200 with `content-length: 98872`.
- [x] PASS 2026-05-23: `curl https://report.tjbot.vn/state/board.json` returned 41 features with updatedAt `2026-05-23T03:23:23.300Z`.
- [x] PASS 2026-05-23: No-op `PUT https://report.tjbot.vn/state/board.json` succeeded and preserved the 41-feature state.
- [x] PASS 2026-05-23: `https://ctv.2checkin.com/tbot` redirects to `https://report.tjbot.vn/`.
- [x] PASS 2026-05-23: `https://ctv.2checkin.com/tbot/t2.html` redirects to `https://report.tjbot.vn/t2.html`.
- [x] PASS 2026-05-23: Playwright verified `https://report.tjbot.vn/` renders Feature Board with `41 TASKS · 0 DONE`, `SAT, MAY 23, 2026`, `131 DAYS LEFT`, 41 cards, and no console/page errors.
- [x] PASS 2026-05-23: Playwright verified `https://report.tjbot.vn/t2.html` renders Kanban Calendar with `106 TASKS · 0 DONE`, `SAT, MAY 23, 2026`, `131 DAYS LEFT`, 106 cards, and no console/page errors.
