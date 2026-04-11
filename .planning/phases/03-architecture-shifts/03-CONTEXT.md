# Phase 3: Architecture Shifts - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement multi-branch staff assignment, admin customer delete, and payment linkage to examination vouchers:
1. `employee_location_scope` junction table is active with API CRUD
2. `EmployeeForm` supports checkbox-style multi-branch assignment
3. Admin can soft-delete customers with FK-safe confirmation
4. `PaymentForm` lists open examination vouchers (dotkhams) with residual amounts
5. Multiple payments can be recorded against a single voucher
6. Full E2E suite passes, CHANGELOG.json updated, version bumped

</domain>

<decisions>
## Implementation Decisions

### Multi-Branch Employee Assignment
- **D-01:** Use a **dual-selector pattern** in `EmployeeForm`:
  - **Primary branch**: keep existing `LocationSelector` for `companyid` (single branch)
  - **Additional branches**: add a new multi-select/checkbox component using the `employee_location_scope` junction table
- **D-02:** `EmployeeTable` should display all assigned branch names, not just a single location
- **D-03:** Maintain the global `LocationContext` filter at the top of the page as the primary location filter across all pages

### Customer Delete Behavior
- **D-04:** Implement **two-tier delete** in `CustomerProfile` / customer list:
  - **Soft delete** (`isdeleted = true`) — available to users with `customer:delete` permission
  - **Hard delete** (actual `DELETE` from `partners`) — **admin-only**, gated by `customer:hard_delete` permission
- **D-05:** The confirmation dialog must warn about linked records (appointments, saleorders, dotkhams) before proceeding
- **D-06:** Update `partners.js` GET routes to ensure they already filter `isdeleted = false` (currently true); add a DELETE/soft-delete PATCH endpoint

### Payment Allocation Targets
- **D-07:** `PaymentForm` allocation section must support **both targets simultaneously** via tabs/toggle:
  - **Dotkhams tab** — open examination vouchers with `amountresidual > 0`
  - **Invoices tab** — existing `saleorders` with `residual > 0`
- **D-08:** Reuse existing allocation logic pattern (auto/manual, selected items, allocationMap)
- **D-09:** The backend payments API must be able to accept allocations pointing to either `dotkhams` or `saleorders`

### Testing
- **D-10:** Every feature must include a Playwright E2E test with screenshots (`tg@clinic.vn` / `123456`)
- **D-11:** Bump `website/package.json` version and update `website/public/CHANGELOG.json` on completion

### Claude's Discretion
- Specific UI styling for the additional-branches multi-select (chip list vs checkboxes vs modal picker)
- Exact copy for delete confirmation dialogs
- Whether to add a separate `payment_allocations` column for target_type or use separate tables

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend
- `website/src/components/employees/EmployeeForm.tsx` — existing single-branch employee form
- `website/src/components/employees/EmployeeTable.tsx` — employee listing
- `website/src/components/employees/RoleMultiSelect.tsx` — multi-select pattern reference
- `website/src/components/payment/PaymentForm.tsx` — existing payment + allocation UI
- `website/src/hooks/useEmployees.ts` — employee data hook
- `website/src/hooks/usePayment.ts` — payment data hook
- `website/src/lib/api.ts` — API client functions
- `website/src/contexts/LocationContext.tsx` — global location filter

### Backend
- `api/src/routes/employees.js` — employee API routes
- `api/src/routes/partners.js` — partner/customer CRUD (missing delete/soft-delete)
- `api/src/routes/payments.js` — payment creation + allocation routes
- `api/src/routes/dotKhams.js` — examination voucher API (already has totalamount, amountresidual)
- `api/migrations/` — existing migrations (001–004); add new migration for `employee_location_scope`

### Database
- `api/src/db.js` — query helper

### Testing
- `website/e2e/` — Playwright test suite location
- `website/playwright.config.ts` — E2E configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LocationSelector` component — used across forms for single-branch selection
- `DataTable` component — can render multi-value cells (e.g., branch list)
- `PaymentForm` allocation UI — checkbox list, auto/manual mode, allocation math — can be cloned for dotkhams
- `RoleMultiSelect` — shows a toggle-chip pattern that could inspire branch multi-select

### Established Patterns
- Forms use async `handleSubmit` with `await onSubmit(formData)` and loading states
- API routes use parameterized PostgreSQL queries
- Junction tables (e.g., `payment_allocations`) already exist and follow `id, parent_id, child_id` pattern
- `dotkhams` table has `isdeleted`, `partnerid`, `totalamount`, `amountresidual`, `paymentstate` fields

### Integration Points
- `EmployeeForm` props (`onSave`, `onClose`) and API (`createEmployee`, `updateEmployee`) need extension for scope data
- `employees.js` GET/PUT endpoints need to join or fetch from `employee_location_scope`
- `payments.js` POST needs to handle allocations that reference `dotkhams` in addition to `saleorders`
- `partners.js` needs new DELETE/PATCH endpoints for soft/hard delete

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants the existing **global location filter at the top** to remain the global filter for all pages; multi-branch assignment in EmployeeForm is independent of that global filter
- PaymentForm should keep **both dotkhams and invoices tabs** side-by-side rather than replacing one with the other
- Customer delete should be a **two-tier permission model**: soft delete for regular staff, hard delete strictly for admin

</specifics>

<deferred>
## Deferred Ideas

### Patient Finance Redesign (future phase)
- Full 4-tab finance section (Overview / Invoices / Payment Plans / Payments) for `CustomerProfile`
- Payment plan object spanning multiple invoices
- Expandable payment rows showing per-invoice allocations
- Overpayment → credit/deposit logic
- This is out of scope for Phase 3 and should be planned as Phase 5 or a dedicated billing milestone

### Reviewed Todos (not folded)
- None — no matching todos were found for Phase 3 scope

</deferred>
