# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note. Use this format:

- [ ] PENDING: Check name.
- [x] PASS: Check name - evidence.
- [ ] FAIL: Check name - failure evidence or reproduction.

Do not remove failed checks until the defect is fixed and rerun.

---

# TestSprite Plan: Permission Domain Audit And Matrix Repair

Feature/edit name: Permission Domain Audit, Registry Parity, Permission Matrix Repair, and RBAC Regression Coverage

Changed URLs and API routes:
- `/permissions`
- `/relationships`
- `/services`
- `/service-catalog`
- `/customers/:id`
- `/payment`
- `/settings`
- `POST /api/Auth/login`
- `GET /api/Auth/me`
- `GET /api/Permissions/groups`
- `PUT /api/Permissions/groups/:groupId`
- `GET /api/Permissions/employees`
- `PUT /api/Permissions/employees/:employeeId`
- `GET /api/Permissions/resolve/:employeeId`
- `POST /api/ExternalCheckups/:customerCode/patient`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`
- `POST /api/Exports/:type/preview`
- `POST /api/Exports/:type/download`

Affected data flows:
- Effective permissions resolve from `partners.tier_id`, `group_permissions`, `permission_overrides`, and primary `partners.companyid` plus extra `employee_location_scope` rows.
- Permission Board matrix rows must come from the canonical registry or a generated shared constant, not display-label string derivation.
- Wildcard `*` grants effective access everywhere, including route guards and matrix display.
- Backend `requirePermission()` strings, export registry permissions, frontend route guards, sidebar visibility, matrix rows, i18n descriptions, and `product-map/contracts/permission-registry.yaml` must stay aligned.
- Permission edits should refresh visible state immediately and show controlled pending/error/disabled states.

User roles:
- Super Admin/Admin with wildcard `*`.
- Permission admin with `permissions.view` and `permissions.edit`.
- Permission viewer with `permissions.view` but not `permissions.edit`.
- Limited clinic staff with customer/service/payment permissions but no permission-management mutation access.
- Location-scoped staff with a primary branch and extra scoped branches.

Happy paths:
- Admin opens `/permissions`, sees groups, employees, locations, matrix rows, and effective permissions without loading or error loops.
- Admin wildcard group displays effective access to every matrix row without requiring every permission string to be stored individually.
- Permission viewer opens `/permissions` read-only and cannot toggle matrix cells or save employee assignment changes.
- Updating an employee group or location scope changes `/api/Auth/me`, `/api/Permissions/resolve/:employeeId`, and Permission Board employee card consistently after refresh/re-auth.
- `/services` is accessible to a user with the intended service-view permission and not blocked by unrelated customer-edit permission.
- Ho so Online patient creation and upload enforce the intended split between `external_checkups.create` and `external_checkups.upload`.
- Export buttons and backend export APIs require the matching export permission strings shown in the matrix.

Edge cases:
- Employee with `tier_id = null` should follow the final product rule, either blocked with a clear admin fix state or assigned a safe default, not silently drift between consumers.
- Empty `employee_location_scope` should follow the final product rule consistently across Auth, Permission resolve, filters, and employee cards.
- Revoking a permission from a wildcard group or wildcard user should follow the final product rule and be visible in tests.
- Self-editing permission changes should prevent accidental admin self-lockout or require explicit confirmation.
- Failed permission PUT requests should keep the previous UI state and show a recoverable error.
- System groups should not be editable unless the final product rule explicitly allows it.

Regressions:
- Existing customer, payment, report, service catalog, Ho so Online, and location-scoped workflows must keep their current permission boundaries.
- Route-denied users should see 403-style access denied UI, while expired sessions should go to login.
- Sidebar visibility and direct URL access must agree for every guarded route.
- Permission registry parity tests should fail on new unregistered strings.

Setup data and login state:
- Use an authenticated admin session with wildcard `*`.
- Use one employee with `permissions.view` but without `permissions.edit`.
- Use one employee with primary branch plus at least one extra `employee_location_scope` row.
- Use at least one customer with Ho so Online data and one service/payment/export-capable dataset.

TestSprite execution items:
- [ ] PENDING: Open `/permissions` as wildcard admin and verify all matrix rows show effective access, including export permissions.
- [ ] PENDING: Open `/permissions` as `permissions.view` only and verify toggles are disabled with visible reason text and no save mutations fire.
- [ ] PENDING: Compare `/api/Auth/me` and `/api/Permissions/resolve/:employeeId` for the same user and verify effective permissions and locations match.
- [ ] PENDING: Verify `/services` direct route and sidebar visibility use the intended service permission, not `customers.edit`.
- [ ] PENDING: Verify Ho so Online patient creation requires `external_checkups.create` and upload requires `external_checkups.upload`.
- [ ] PENDING: Verify export preview/download endpoints reject users without the matching export permission and that those permissions appear in the matrix.
- [ ] PENDING: Attempt a failed permission update and verify the UI shows an error without optimistic state corruption.
- [ ] PENDING: Verify a location-scoped employee card shows primary branch plus extra scoped branches and matches location filters.

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
- `/reports/revenue`
- Operational export preview/download route for the employee sales report builder.

Affected data flows:
- Employee sales report/export rows normalize overallocated imported `payment_allocations` rows before splitting payment amount across service lines.
- Report totals should match actual posted payment amounts instead of duplicated imported allocation amounts.
- Revenue report employee Excel export controls are restored above the KPI cards so staff can find the export before scrolling.

User roles:
- Admin or reporting staff with report/export permission.

Happy paths:
- Open `/reports/revenue` and confirm `Xuất Excel doanh thu theo nhân viên` appears above the KPI cards with the export dropdown visible.
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
