# PRD - Operational Website View Excel Exports

- **Date:** 2026-04-30
- **Owner:** TGroup product / operations
- **Status:** Draft - awaiting review
- **Scope:** Customers, calendar appointments, service/treatment records, payments, and service catalog
- **Out of scope:** Reports exports, because report accuracy and contracts are not solid enough yet

---

## 1. Problem

Clinic staff need to export operational data directly from the website in a way that feels similar to the original TDental exports, without database access or engineering help. Today the app only has a one-off Calendar XLSX export and a small report CSV helper. Other high-use pages either cannot export or would need to invent separate behavior.

The export should reflect the operational view staff are using: search text, branch, status, date range, category, active tab, and other page filters. The old TDental files in `/Users/thuanle/Downloads/TamDentistExport3` are useful as column references, but they include raw DB fields and data TGClinic does not store. V1 should be similar in operational value, not a byte-for-byte clone.

---

## 2. Goals / Non-Goals

### Goals

- Add Excel export actions to `/customers`, `/calendar`, `/services`, `/payment`, and `/website` service catalog.
- Export **all rows matching the current website filters**, not just visible pagination rows.
- Produce staff-readable `.xlsx` workbooks with `Data`, `Summary`, and `Filters` sheets.
- Match the spirit of TDental exports: customer refs, appointment codes, treatment/order numbers, payment references, branch/source/staff context, and monetary fields where available.
- Centralize export contracts in one backend export system so pages do not drift from each other.
- Use a dropdown UX with direct export plus preview: `Xuất Excel` and `Xem trước số dòng / bộ lọc`.
- Keep permissions explicit because exports include PII and financial data.

### Non-Goals

- Reports exports in V1.
- Raw TDental/Odoo column parity.
- Exporting fields TGClinic does not store yet.
- Excel import, scheduled export jobs, email exports, or PDF exports.

---

## 3. Source Export References

| Source file | Rows | Useful reference |
|---|---:|---|
| `dbo.Partners.csv` | 20,478 | Customer identity, ref, phone, gender, birthday, source, branch, notes |
| `dbo.Appointments.csv` | 248,671 | Appointment code, date/time, customer, doctor, branch, status, reason |
| `dbo.SaleOrders.csv` | 61,455 | Treatment/order number, customer, totals, paid/residual, doctor, state |
| `dbo.SaleOrderLines.csv` | 66,672 | Service line, quantity, price, tooth info, assistant/aide, payment state |
| `dbo.AccountPayments.csv` | 40,664 | Payment date, amount, method/journal, state, customer, receipt code |
| `dbo.SaleOrderPayments.csv` | 37,821 | Payment allocation to sale order / visit |
| `dbo.Products.csv` | 443 | Service catalog code, name, category, list price, sale price, active |
| `dữ liệu khách hàng.xlsx` | 5 sheets | Human-friendly customer fields as simple two-column exports |
| `Phiếu điều trị.xlsx` | 4 sheets | Doctor, aide, assistant, and source by treatment code |

V1 should prefer clean website labels over raw database labels.

---

## 4. UX

Each page gets an export dropdown in the page header or filter toolbar:

```text
Xuất dữ liệu
  - Xuất Excel
  - Xem trước số dòng / bộ lọc
```

`Xuất Excel` directly downloads an `.xlsx` file using the current page filters. It shows a loading state, disables duplicate clicks, and shows a toast on failure.

`Xem trước số dòng / bộ lọc` opens a modal showing export type, active filters in Vietnamese, estimated row count, useful totals, and a final `Tải Excel` button. If a filter returns zero rows, preview shows `0 dòng`; direct export should show a no-data message instead of downloading a blank workbook.

---

## 5. Export Semantics

Exports use current website filters. The backend must re-run the page query using the submitted filters and must not trust rows sent from the browser.

| Page | Filters included |
|---|---|
| `/customers` | Search text, status, permission-limited customer scope, optional branch if applied later |
| `/calendar` | Current view date range or explicit date range, branch, customer search, doctors, statuses, colors |
| `/services` | Branch, search, category, status tab |
| `/payment` | Branch, active tab, search, payment status or plan status |
| `/website` service catalog | Branch, search, category, active/inactive display filters |

---

## 6. Workbook Contract

Every workbook has three sheets:

| Sheet | Requirements |
|---|---|
| `Data` | Main table, frozen bold header, auto-filter, sensible widths, wrapped notes, VND number formats |
| `Summary` | Counts/totals relevant to the export type |
| `Filters` | Export type, exported at, exported by, branch/date/search/status filters, final row count |

Date formats:

- Date: `dd/mm/yyyy`
- Datetime: `dd/mm/yyyy hh:mm`
- Currency: numeric VND format, not text

Summary examples:

| Export | Summary |
|---|---|
| Customers | total, active, inactive, with phone, with birthday |
| Appointments | total by status, repeat vs new if available |
| Services | total orders, active/completed/cancelled, total amount, paid, residual |
| Payments | total payments, total amount, posted/cancelled/refunded counts |
| Catalog | total services, active/inactive, category count |

---

## 7. V1 Export Columns

### Customers

- **Route:** `/customers`
- **Permission:** `customers.export`
- **Filename:** `KhachHang_<YYYYMMDD_HHmm>.xlsx`
- **Columns:** `Mã KH`, `Tên khách hàng`, `SĐT`, `Giới tính`, `Ngày sinh`, `Nguồn`, `Sale`, `CSKH`, `Chi nhánh`, `Địa chỉ`, `Ghi chú`, `Ngày tạo`, `Trạng thái`

### Calendar / Appointments

- **Route:** `/calendar`
- **Permission:** `appointments.export`
- **Filename:** `LichHen_<date-or-range>_<YYYYMMDD_HHmm>.xlsx`
- **Columns:** `Mã lịch hẹn`, `Ngày giờ hẹn`, `Mã KH`, `Khách hàng`, `SĐT`, `Dịch vụ`, `Bác sĩ`, `Chi nhánh`, `Loại hẹn`, `Trạng thái`, `Nội dung`, `Ghi chú`
- **Migration note:** current Calendar XLSX export should move into this shared export system instead of staying as a one-off frontend utility.

### Services / Treatment Records

- **Route:** `/services`
- **Permission:** `services.export`
- **Filename:** `PhieuDieuTri_<YYYYMMDD_HHmm>.xlsx`
- **Columns:** `Số phiếu`, `Ngày tạo`, `Mã KH`, `Khách hàng`, `Dịch vụ`, `Số lượng`, `Răng`, `Bác sĩ`, `Phụ tá`, `Trợ lý BS`, `Nguồn`, `Tổng tiền`, `Đã thu`, `Còn lại`, `Trạng thái`, `Chi nhánh`, `Ghi chú`

### Payments

- **Route:** `/payment`
- **Permission:** `payments.export`
- **Filename:** `ThanhToan_<YYYYMMDD_HHmm>.xlsx`
- **Behavior:** export the active payment tab. Payments/wallets exports payment history and outstanding balances; installment-plan tab exports plans and installments.
- **Payment columns:** `Mã phiếu thu`, `Ngày thanh toán`, `Mã KH`, `Khách hàng`, `SĐT`, `Số tiền`, `Phương thức`, `Trạng thái`, `Số phiếu điều trị`, `Nội dung`, `Chi nhánh`, `Người tạo`
- **Plan sheets:** `Plans` with plan totals/status; `Installments` with installment due date, amount, paid date, and status.

### Service Catalog

- **Route:** `/website` service catalog
- **Permission:** `products.export`
- **Filename:** `DichVu_<YYYYMMDD_HHmm>.xlsx`
- **Columns:** `Mã dịch vụ`, `Tên dịch vụ`, `Nhóm dịch vụ`, `Đơn vị`, `Giá niêm yết`, `Giá bán`, `Giá labo`, `Chi nhánh`, `Trạng thái`, `Ngày tạo`, `Cập nhật lần cuối`

---

## 8. Backend Architecture

Add one route family:

```text
POST /api/Exports/:type/preview
POST /api/Exports/:type/download
```

Valid `:type` values:

```text
customers
appointments
services
payments
payment-plans
service-catalog
```

Request body:

```json
{
  "scope": "current-view",
  "filters": {
    "search": "",
    "companyId": "all",
    "status": "all",
    "dateFrom": "2026-04-01",
    "dateTo": "2026-04-30"
  }
}
```

Preview response:

```json
{
  "type": "services",
  "label": "Phiếu điều trị",
  "rowCount": 248,
  "filename": "PhieuDieuTri_20260430_1830.xlsx",
  "filters": [
    { "label": "Chi nhánh", "value": "Tấm Dentist Gò Vấp" },
    { "label": "Trạng thái", "value": "Tất cả" }
  ],
  "summary": [
    { "label": "Tổng tiền", "value": 123000000 },
    { "label": "Đã thu", "value": 90000000 },
    { "label": "Còn lại", "value": 33000000 }
  ]
}
```

Download response:

```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="<generated>.xlsx"
```

Proposed backend modules:

```text
api/src/routes/exports.js
api/src/services/exports/exportRegistry.js
api/src/services/exports/exportWorkbook.js
api/src/services/exports/builders/customersExport.js
api/src/services/exports/builders/appointmentsExport.js
api/src/services/exports/builders/servicesExport.js
api/src/services/exports/builders/paymentsExport.js
api/src/services/exports/builders/serviceCatalogExport.js
```

`exportRegistry` owns type key, label, required permission, filter schema, filename builder, and builder function. Each builder owns SQL, row mapping, summary calculation, and column definitions. `exportWorkbook` owns shared XLSX formatting.

---

## 9. Frontend Architecture

Add reusable frontend pieces:

```text
website/src/components/shared/ExportMenu.tsx
website/src/components/shared/ExportPreviewModal.tsx
website/src/lib/api/exports.ts
website/src/hooks/useExportPreview.ts
```

Each page passes:

```ts
{
  type: 'customers' | 'appointments' | 'services' | 'payments' | 'payment-plans' | 'service-catalog',
  filters: currentPageFilters,
  disabled?: boolean
}
```

Placement:

| Page | Placement |
|---|---|
| Customers | `PageHeader.actions`, beside Add Customer |
| Calendar | Existing export area in `CalendarToolbar` |
| Services | `PageHeader.actions`, beside New Service |
| Payment | `PageHeader.actions`, tied to active tab |
| Service Catalog | Header/filter toolbar, beside add service/category actions |

Use a `lucide-react` download icon. Pages do not own workbook columns or formatting.

---

## 10. Permissions

Add explicit export permissions:

```text
customers.export
appointments.export
services.export
payments.export
products.export
```

Frontend only shows controls when the user has the matching permission. Backend enforces permission on both preview and download. Admin receives all export permissions by default; manager/staff access remains configurable in the permission board.

---

## 11. Limits and Safety

- Default max export row count: `100,000`.
- If preview exceeds max, require narrower filters and do not generate a giant workbook.
- All SQL must use parameterized inputs.
- Export only registry-defined columns; no arbitrary column selection in V1.
- Sanitize worksheet values starting with `=`, `+`, `-`, or `@` to prevent formula injection.
- Audit every download with user, type, filters, row count, and timestamp.
- Preview should use count/aggregate SQL, not generate the full workbook.

---

## 12. Testing

Backend:

- Unit test each builder's filter parsing and row mapping.
- Integration test preview/download endpoints for each export type.
- Verify download returns XLSX MIME type and non-empty body.
- Permission tests: allowed export user succeeds, view-only user fails, admin succeeds.

Frontend:

- `ExportMenu` component test: dropdown opens, preview opens modal, direct export triggers download.
- Page tests: export controls appear only with permission.
- Calendar regression: existing appointment export behavior is preserved through the shared path.

Manual QA:

- Customers: search a known ref and export one-row workbook.
- Calendar: export current week with branch filter.
- Services: export branch/status/category and confirm totals.
- Payments: export payments tab and plans tab separately.
- Service catalog: export active catalog and confirm prices/categories.
- VPS: login, preview each export, download at least one workbook from each V1 page.

---

## 13. Rollout Plan

| Phase | Scope | Reason |
|---|---|---|
| 1 | Infrastructure, permissions, `ExportMenu`, service catalog export | Lowest-risk data shape and small row count |
| 2 | Customers and Calendar | Core operations, Calendar already has export behavior to migrate |
| 3 | Services and Payments | Highest join/financial risk, needs careful verification |
| 4 | VPS verification | Preview/download all V1 pages and save sample workbooks |

Reports remain deferred until the report module is trusted.

---

## 14. Success Criteria

- Staff can export customers, appointments, services, payments, and service catalog from the website.
- Exported row count matches preview row count.
- Exported filters match visible page filters.
- XLSX files open cleanly in Excel and Numbers.
- Direct export and preview export produce the same workbook for the same filters.
- Unauthorized users cannot see export buttons or call export endpoints directly.
- No page-specific export code duplicates workbook formatting logic.

---

## 15. Decisions

Resolved during brainstorming:

- V1 excludes Reports.
- Export scope is all rows matching current filters.
- UX uses dropdown with direct `Xuất Excel` and `Xem trước số dòng / bộ lọc`.
- Exports should be similar to TDental files, but cleaned and limited to TGClinic data.

Implementation recommendation:

- Use backend XLSX generation with `exceljs`, preferably through shared workbook helpers so large exports can be streamed and formatted consistently.
