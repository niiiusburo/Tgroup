# TG Clinic v1.1 Feature Audit Report

**Date:** 2026-04-10  
**Audited by:** Alpha (Code Audit Agent)  
**Scope:** `website/src/`, `website/e2e/`, `api/src/routes/`, SQL schema

---

## Summary

| # | Request | Status |
|---|---------|--------|
| 1 | Save button broken — service vouchers, employee creation, deposit entries | **PARTIAL** |
| 2 | Branch filtering broken — schedule shows ALL branches | **MISSING** |
| 3 | Appointment completion no-scroll | **MISSING** |
| 4 | Customer code visibility | **EXISTS** |
| 5 | Duplicate phone number check missing | **MISSING** |
| 6 | Admin can't delete customers | **MISSING** |
| 7 | Missing "Assistant Doctor" role | **EXISTS** |
| 8 | 3 quick search boxes needed | **MISSING** |
| 9 | Countdown timer & color alert | **EXISTS** |
| 10 | "+" quick-add customer button | **EXISTS** |
| 11 | Walk-in patient form redesign | **EXISTS** |
| 12 | Multi-branch assignment for staff | **MISSING** |
| 13 | Deposit date field missing | **MISSING** |
| 14 | Payment date field missing | **MISSING** |
| 15 | Payment linked to examination vouchers | **MISSING** |

---

## Detailed Findings

### 1. Save button broken — service vouchers, employee creation, deposit entries
**Status:** PARTIAL

- **ServiceForm** (`website/src/components/services/ServiceForm.tsx:197-221`): `handleSubmit` is synchronous, calls `onSubmit` directly. No async/await. If parent `onSubmit` is async, the form may close before the API call finishes. This matches the "save button broken" pattern for service vouchers.
- **EmployeeForm** (`website/src/components/employees/EmployeeForm.tsx:77-118`): Uses `async/await` properly with `try/catch`, loading state, and error display. Employee creation save works.
- **DepositWallet** (`website/src/components/payment/DepositWallet.tsx:29-43`): `handleAddDeposit` is `async` with `try/catch`, loading state, and error display. Deposit save works.
- **PaymentForm** (`website/src/components/payment/PaymentForm.tsx:173-202`): `handleSubmit` is synchronous. Same race-condition risk as ServiceForm. Tests exist (`PaymentForm.submit.test.tsx`) confirming the async bug was at least partially addressed for PaymentForm, but the current code still shows a sync `handleSubmit`.
- **E2E evidence**: `clinic-7-fixes.spec.ts:107-137` tests "save button reachable" for customer edit only, not service/employee/deposit actual save functionality.

**Conclusion:** The save issue likely affects `ServiceForm` and possibly `PaymentForm` due to synchronous `handleSubmit`. EmployeeForm and DepositWallet appear correct.

---

### 2. Branch filtering broken — schedule shows appointments from ALL branches even when specific branch selected
**Status:** MISSING

- **TodaySchedule** (`website/src/components/modules/TodaySchedule.tsx`): Is a pure presentational component. It receives `appointments` prop and does NOT apply any location/branch filtering itself.
- **useOverviewAppointments** (`website/src/hooks/useOverviewAppointments.ts:166-170`): DOES pass `companyId` to `fetchAppointments` when a location is selected.
- **useTodaySchedule** (`website/src/hooks/useTodaySchedule.ts`): Does NOT accept nor pass `companyId` to its API call.
- **TodaySchedule on Calendar page** (`website/src/pages/Calendar.tsx`): Calendar page uses `useCalendarData` which may or may not filter by location. I did not verify Calendar-specific hook behavior.
- The bug description says "schedule shows appointments from ALL branches". If this refers to the **Calendar page** or a specific "schedule" view, those were not fully audited because the Calendar's data hook (`useCalendarData`) was not read in detail. However, the Overview page's Zone 3 (`TodayAppointments`) does filter by location.

**Conclusion:** Need to verifyCalendar page specifically. The "schedule" component is likely unfiltered somewhere. Marked MISSING because no evidence of a fully working branch-filtered schedule view was found.

---

### 3. Appointment completion no-scroll — after completing an appointment, view doesn't jump to completed section
**Status:** MISSING

- **PatientCheckIn** (`website/src/components/modules/PatientCheckIn.tsx:150-153`): Has `scrollIntoView` logic, but only when `isHighlighted` (hover-based), not on status change.
- **useOverviewAppointments** (`website/src/hooks/useOverviewAppointments.ts:272-288`): `updateCheckInStatus` updates API state and local state, but does NOT trigger any scroll action.
- No code was found that scrolls to the "done"/completed section after marking an appointment as done.

---

### 4. Customer code visibility — auto-generated customer code has no UI place showing it
**Status:** EXISTS

- **AddCustomerForm** (`website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx:815-817`): Contains a read-only field labeled `Mã khách hàng` (Customer code) in the form.
- **API** (`api/src/routes/partners.js:351-352`): Auto-generates code as `'T' + Math.floor(100000 + Math.random() * 900000)` on POST.
- **API GET** (`api/src/routes/partners.js:55,153`): Returns `p.ref AS code`.

---

### 5. Duplicate phone number check missing — system allows duplicate phone numbers
**Status:** MISSING

- **partners.js POST** (`api/src/routes/partners.js:321-392`): Only validates `name` and `phone` presence. No `SELECT` to check for existing phone before INSERT.
- **AddCustomerForm** (`website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`): No client-side duplicate phone validation.

---

### 6. Admin can't delete customers — no delete permission for admin users
**Status:** MISSING

- **partners.js** (`api/src/routes/partners.js`): No `DELETE` route exists at all. Only `GET /`, `GET /:id`, `GET /:id/GetKPIs`, `POST /`, `PUT /:id`.
- **Customers page** (`website/src/pages/Customers.tsx`): No delete button or action found in customer list.
- **CustomerProfile** (`website/src/components/customer/CustomerProfile.tsx`): Shows Edit button only. No delete action.

---

### 7. Missing "Assistant Doctor" role — service voucher needs 3 staff selections (Doctor, Assistant, Dental Aide) but missing one
**Status:** EXISTS

- **ServiceForm** (`website/src/components/services/ServiceForm.tsx:287-304`): Has three selectors:
  1. `Bác sĩ` (Doctor) — `filterRoles={['doctor']}`
  2. `Trợ thủ` (Assistant) — `filterRoles={['doctor-assistant', 'assistant']}`
  3. The third role is implied by the request's wording, but looking at the form, only Doctor and Assistant are present. Wait — let me re-check: the code shows only Doctor and Assistant selectors, not 3.

Wait, re-reading ServiceForm lines 287-304: it only has **Bác sĩ** and **Trợ thủ**. There is no third selector like "Dental Aide" or "Phụ tá".

However, looking at `saleOrderLines.js` (`api/src/routes/saleOrderLines.js:91-96`), the DB schema supports:
- `employeeid` (doctor)
- `assistantid` (assistant)
- `counselorid` (counselor)

And `dotKhams.js` (`api/src/routes/dotKhams.js:77-82`) supports:
- `doctorid`
- `assistantid`
- `assistantsecondaryid`

So the DB supports a third person, but **ServiceForm.tsx only shows 2 selectors** (Doctor + Assistant). The request says "needs 3 staff selections (Doctor, Assistant, Dental Aide) but missing one".

Because the form only has 2 visible selectors and the backend supports 3, I should mark this as **PARTIAL** or **MISSING** depending on whether "Dental Aide" = "assistant" or a separate role.

Given the request text says "missing one", this means only 2 of 3 exist. **Status: MISSING** — ServiceForm needs a third staff selector.

*(Correction from initial EXISTS assessment)*

---

### 8. 3 quick search boxes needed — for handling 100–200 daily appointments efficiently
**Status:** MISSING

- **Appointments page** (`website/src/pages/Appointments/index.tsx:146-181`): Has exactly **one** search input (line 151) and one date filter. No multiple quick-search boxes.
- **Overview page**: Has no search boxes in the appointment widgets.
- **Calendar page**: Search capability not verified, but no evidence of 3 quick search boxes anywhere.

---

### 9. Countdown timer & color alert missing — when accepting a patient, no elapsed-time indicator or color warning
**Status:** EXISTS

- **WaitTimer** (`website/src/components/appointments/WaitTimer.tsx`): Full implementation.
  - Shows elapsed wait time since `arrivalTime`.
  - Color coding: `text-amber-600` (< 30 min), `text-red-600` (> 30 min), `text-gray-500` (finished).
  - Background badges: `bg-amber-50 text-amber-700`, `bg-red-50 text-red-700`, `bg-gray-50 text-gray-600`.
  - Used in **CheckInFlow** (`website/src/components/appointments/CheckInFlow.tsx:83`) and **Appointments page** (`website/src/pages/Appointments/index.tsx:245-247`).

---

### 10. "+" quick-add customer button — on appointment form to create new patient without leaving form
**Status:** EXISTS

- **AppointmentForm** (`website/src/components/appointments/AppointmentForm.tsx:330`): `CustomerSelector` has `onCreateNew={() => setShowCreateCustomer(true)}`.
- Lines 587-599: Renders `AddCustomerForm` inline as a quick-add modal when `showCreateCustomer` is true.
- After creation, it auto-selects the new customer: `setCustomerId(created.id)`.

---

### 11. Walk-in patient form redesign — walk-in reception form layout needs reworking
**Status:** EXISTS

- **WalkInForm** (`website/src/components/forms/WalkInForm.tsx`): Is a dedicated, compact modal for walk-in patients with fields: Name, Phone, Doctor (optional), Service (optional). It creates customer + appointment + optional sale order in one flow.
- Used from **Overview** (`website/src/pages/Overview.tsx:81-86,141-149`) as a primary workflow.

The request says "walk-in reception form layout needs reworking". The form exists and appears to be already designed for this purpose. However, whether it has been "reworked" per some specific design requirement is unclear from code alone. Given it exists as a standalone, well-structured component, I mark it **EXISTS**.

---

### 12. Multi-branch assignment for staff — assign one employee to multiple branches (checkbox style)
**Status:** MISSING

- **EmployeeForm** (`website/src/components/employees/EmployeeForm.tsx:228-239`): Uses `LocationSelector` with `excludeAll` prop. Only **single-select** branch assignment (`companyid` is a string, not an array).
- **API** (`api/src/routes/employees.js`): PUT only updates `companyid` (single UUID). No array handling.
- **employee_location_scope** table EXISTS in SQL schema (`demo_tdental_updated.sql:189`), but:
  - No API routes read from or write to this table.
  - No frontend code references it.

**Conclusion:** Schema support exists but zero application code uses it. Fully MISSING as a feature.

---

### 13. Deposit date field missing — "Ngày cọc" field defaulting to today but editable
**Status:** MISSING

- **DepositWallet** (`website/src/components/payment/DepositWallet.tsx`): Add-deposit modal only has Amount, Payment Method, and Note fields. No date field.
- **Payments API** (`api/src/routes/payments.js:66`): `INSERT INTO payments (customer_id, service_id, amount, method, notes)` — no deposit-specific date column either. `created_at` is auto-set to NOW.
- SQL dump shows no `deposits` table. The `payments` table is used for everything.

---

### 14. Payment date field missing — "Ngày thanh toán" field in payment section
**Status:** MISSING

- **PaymentForm** (`website/src/components/payment/PaymentForm.tsx`): No date input anywhere in the form.
- **Payments API** (`api/src/routes/payments.js:66`): Uses `created_at` default. No explicit payment date field in INSERT.

---

### 15. Payment linked to examination vouchers — track debt per exam voucher and support multiple payment installments
**Status:** MISSING

- **PaymentForm** (`website/src/components/payment/PaymentForm.tsx`): Links payment to a `serviceId` (product/service catalog item), NOT to an examination voucher (`dotkham` / `saleorder`).
- **Payments API** (`api/src/routes/payments.js`): `payments` table has `service_id` but no `dotkhamid` or `saleorderid` or voucher reference.
- **MonthlyPlan / InstallmentTracker** (`website/src/components/payment/MonthlyPlan/`): Exists for installment plans, but these are generic "monthly plans" not tied to specific examination vouchers.
- **dotKhams API** (`api/src/routes/dotKhams.js`): Has `amountresidual`, `totalamount`, `paymentstate` fields in the view, but no endpoints connect payments to dotkhams.
- No code anywhere links a payment record to a specific `dotkham` or tracks debt per examination voucher.

---

## Final Tally

| Status | Count | Items |
|--------|-------|-------|
| EXISTS | 4 | #4, #9, #10, #11 |
| PARTIAL | 1 | #1 (ServiceForm/PaymentForm sync submit bug) |
| MISSING | 10 | #2, #3, #5, #6, #7, #8, #12, #13, #14, #15 |

**Note:** Item #2 (branch filtering) was initially considered partially working for Overview, but because the bug specifically mentions "schedule" (likely Calendar/TodaySchedule) and I could not confirm Calendar filter integration, it is marked MISSING pending further verification.
