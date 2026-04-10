# TG Clinic v1.1 Contradictions & Conflicts Report

**Date:** 2026-04-10  
**Based on:** Alpha's code audit report + architecture review

---

## TOP 5 Conflicts / Risks

### 1. Multi-Branch Staff Assignment vs Single `companyid` Schema
**Risk: HIGH**

- **Conflict:** Request #12 wants checkbox-style multi-branch assignment for employees, but `EmployeeForm.tsx:228-239` uses a single-select `LocationSelector` and the API updates only `companyid` (one UUID).
- **Schema gap:** `employee_location_scope` table exists in SQL but has **zero** API routes or frontend references.
- **Cascade impact:** All LocationContext filters across 7 pages assume `companyid` is a single string. Changing to multi-branch requires:
  - DB migration or activating the unused junction table
  - Updating `GET /api/Employees` filter logic
  - Updating all dashboard widgets that count/filter staff by branch
- **Resolution:** Implement using the existing `employee_location_scope` table. Add `GET/POST/PUT` junction endpoints. Keep `companyid` as "primary branch" for backward compatibility, add a separate multi-select for "assigned branches".

---

### 2. Payment Linked to Examination Vouchers vs Current Generic Payment Model
**Risk: HIGH**

- **Conflict:** Request #15 wants debt tracking per exam voucher with multiple installments. Current `payments` table links to `service_id` only (generic catalog item), not to `dotkham` or `saleorder`.
- **Schema gap:** `dotKhams` view has `amountresidual` and `totalamount` fields, but no API connects payments to dotkhams.
- **Cascade impact:** Requires either:
  - A new `dotkham_payments` junction table, OR
  - Adding `dotkham_id` to the existing `payments` table
  - Updating `PaymentForm` to show voucher list with residual amounts
  - Updating `MonthlyPlan` / installment logic to be voucher-aware
- **Resolution:** Add `dotkham_id` to `payments` table. Update `GET /api/payments` to join with `dotKhams` and return `amountresidual`. Redesign `PaymentForm` to let users select an unpaid voucher instead of a generic service.

---

### 3. Deposit Date + Payment Date Fields vs No Date Columns in Schema
**Risk: MEDIUM**

- **Conflict:** Requests #13 and #14 want explicit "Ngày cọc" and "Ngày thanh toán" fields. The `payments` table only has an auto-generated `created_at`.
- **Schema gap:** No `deposit_date` or `payment_date` columns in `payments.js` INSERT (line 66).
- **Resolution:** Add `transaction_date` column to `payments` table (default `NOW()`). Use this for both deposits and payments. Update `DepositWallet.tsx` and `PaymentForm.tsx` with date pickers defaulting to today.

---

### 4. Service Voucher 3rd Staff Selector ("Dental Aide") vs Existing Role System
**Risk: MEDIUM**

- **Conflict:** Request #7 wants Doctor + Assistant + Dental Aide in `ServiceForm`. Currently only 2 selectors exist (Bác sĩ, Trợ thủ).
- **Role mapping issue:** The audit found Vietnamese roles include `Phụ tá` (in `clinic-7-fixes.spec.ts` — 9 roles verified). So `Phụ tá` = Dental Aide already exists in the system.
- **Backend support:** `saleOrderLines.js` supports `counselorid`; `dotKhams.js` supports `assistantsecondaryid`.
- **Resolution:** Add a third `DoctorSelector` to `ServiceForm.tsx` with `filterRoles={['phu-ta', 'dental-aide', 'assistant']}` (verify exact role slug in DB). Map it to `assistantsecondaryid` or `counselorid` depending on the target table.

---

### 5. Quick-Add Customer + Walk-In Redesign vs Existing Compact Forms
**Risk: LOW**

- **Conflict:** Request #10 wants a "+" quick-add customer on the appointment form. Request #11 wants walk-in form redesign.
- **Current state:** `AppointmentForm.tsx:330` already has `onCreateNew` triggering `AddCustomerForm` inline. `WalkInForm.tsx` already exists as a compact modal.
- **Risk:** The walk-in redesign might clash with the quick-add placement if both try to occupy the same modal space or use different customer-creation patterns.
- **Resolution:** Keep the existing `AppointmentForm` quick-add pattern (it's already working). For walk-in redesign, ensure it reuses `AddCustomerForm` sub-components rather than creating a second customer-creation code path.

---

## Additional Architecture Risks

| Request | Risk | Why |
|---------|------|-----|
| #5 Duplicate phone check | LOW-MEDIUM | `Partners` table has no unique constraint on phone. Can be enforced in API only, but race conditions possible. Consider adding partial unique index on `phone` where `isdeleted=false`. |
| #6 Admin delete customers | MEDIUM | No soft-delete pattern exists. Appointments have FK to `partners`. Need either cascade soft-delete or block deletion if appointments exist. |
| #8 3 quick search boxes | LOW | Appointments page has one search bar. Adding 3 boxes is a UX change, not a schema risk. Ensure they fit within the `CardSection` scrolling pattern. |
| #2 Branch filtering | LOW | `useOverviewAppointments` already passes `companyId`. Calendar page may just need the same filter parameter wired to `useCalendarData`. |
| #3 Appointment completion scroll | LOW | Purely frontend — add `scrollIntoView({ behavior: 'smooth' })` after `updateCheckInStatus` succeeds. |

---

## Execution Priority Recommendation

**Wave 1 (Bugs + Quick Wins):**
1. Fix sync `handleSubmit` in `ServiceForm` and `PaymentForm` (#1)
2. Add branch filter to Calendar/TodaySchedule (#2)
3. Add scroll-to-completed after status update (#3)
4. Add `transaction_date` to payments UI (#13, #14)

**Wave 2 (Schema Changes):**
5. Add 3rd staff selector to `ServiceForm` (#7)
6. Implement duplicate phone check (#5)
7. Add admin customer delete with FK guards (#6)

**Wave 3 (Architecture Shifts):**
8. Multi-branch staff assignment (#12)
9. Payment linked to examination vouchers with installments (#15)
10. 3 quick search boxes + walk-in redesign (#8, #11)
