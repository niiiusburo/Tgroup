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
