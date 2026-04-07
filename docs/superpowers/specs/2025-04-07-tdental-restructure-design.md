# TDental Website Restructure — Design Document

**Date:** 2025-04-07  
**Approach:** Option A (Incremental) + TDD Flow  
**Phases:** 5 phases, each with Red-Green-Refactor verification

---

## Executive Summary

Restructure the TDental dashboard from standalone pages to a customer-centric tabbed interface, implement the "Slip" concept (doctor + 3 assistants per service/appointment), and establish proper business logic flows for the payment/deposit banking system.

---

## Core Concepts

### The "Slip" Concept
Every appointment and service is a **slip** — an independent, stackable card attached to a customer:
- **1 Doctor** (optional) — primary doctor for this slip
- **Up to 3 Assistants** (optional) — support staff
- Doctors are linked at **slip level**, NOT customer level
- Different slips can have different doctors

### Deposit/Payment Banking System
Think of it like a bank account:
- **Deposits** = Wallet top-ups (floating credit, not tied to anything)
- **Payments** = Always tied to a specific service
- Customer can pay for services using wallet balance
- Outstanding balances can be split into installment plans

### Location Flexibility
- Services have a "home" location (where opened)
- Appointments can be at any location
- Appointments optionally reference a service, but don't have to
- Default location = service's location, but can override

---

## Phase 1: Customer Tab Consolidation (Tasks 1)

### Current → Target

| Current | Target |
|---------|--------|
| Tabs: `overview \| photos \| appointments \| treatments` | Tabs: `profile \| appointments \| records \| payment` |
| Standalone `/appointments` route | Moved into customer tab |
| Standalone `/services` route | Moved into customer tab (as "records") |
| Standalone `/payment` route | Moved into customer tab |

### Profile Tab Content
Merge `overview` + `photos`:
- Personal info (name, phone, email, DOB, gender, address)
- Photo gallery
- Deposit summary card
- **NO primary doctor display** (removed per requirements)
- Tags, notes, member stats

### Appointments Tab Content
- Customer-scoped appointment list
- "Add Appointment" button
- Each appointment = slip card (date, time, doctor, assistants, service, status)
- Uses `AppointmentForm` with assistant fields (Phase 2)

### Records Tab Content
- Customer-scoped service/treatment list
- "Add Service" button
- Each service = slip card (date, service name, doctor, assistants, cost, status)

### Payment Tab Content
- Full payment system embed:
  - `DepositWallet` component
  - `PaymentForm` component
  - Outstanding balances
  - Payment history
  - Monthly plan creator

### Files Modified
1. `src/components/customer/CustomerProfile.tsx` — restructure tabs
2. `src/App.tsx` — remove standalone routes
3. `src/constants/index.ts` — update ROUTES, NAVIGATION_ITEMS
4. `src/pages/index.ts` — remove standalone page exports

---

## Phase 2: Employee 3-Tier Tabs (Task 2)

### Current → Target

| Current | Target |
|---------|--------|
| Tier filter dropdown | 3 tabs: `Admin \| Managers \| Staff` |
| Filter by tier within list | Pre-filtered by tier per tab |

### Tier Definitions
- **Admin** — Full system access, all locations
- **Managers** — Location-scoped access
- **Staff** — Own data only

### Implementation
- Add `useState<'admin' | 'managers' | 'staff'>`
- 3 tab buttons at top of page
- Each tab shows `EmployeeTable` pre-filtered to that tier
- Keep Role filter, Status filter, Search within each tab
- Remove `TierSelector` dropdown import

### Files Modified
1. `src/pages/Employees/index.tsx` — add tier tabs

---

## Phase 3: Slip Concept — Assistant Fields (Task 3)

### Data Model Changes

#### `src/data/mockCustomerProfile.ts`
Add to `CustomerAppointment`:
```typescript
readonly assistantId1?: string;
readonly assistantName1?: string;
readonly assistantId2?: string;
readonly assistantName2?: string;
readonly assistantId3?: string;
readonly assistantName3?: string;
```

Same fields added to `CustomerService`.

#### `src/lib/api.ts`
Add to `ApiAppointment`:
```typescript
assistantid1: string | null;
assistantname1: string | null;
assistantid2: string | null;
assistantname2: string | null;
assistantid3: string | null;
assistantname3: string | null;
```

Same fields added to `ApiSaleOrder`.

#### `src/components/appointments/AppointmentForm.tsx`
- Add 3 assistant selector fields below Doctor
- Label: "Assistant 1", "Assistant 2", "Assistant 3"
- Use `DoctorSelector` with `filterRoles=['assistant']`
- Add to `AppointmentFormData` interface
- **Doctor is optional** — remove validation requiring doctor

#### `AppointmentFormData` Interface
```typescript
readonly assistantId1?: string;
readonly assistantName1?: string;
readonly assistantId2?: string;
readonly assistantName2?: string;
readonly assistantId3?: string;
readonly assistantName3?: string;
```

### UI Display Pattern
When displaying slips:
- Doctor with stethoscope icon
- Assistants below (smaller text): show name or "--" if empty
- Always show all 3 assistant slots for uniformity

### Files Modified
1. `src/data/mockCustomerProfile.ts` — add assistant fields to interfaces + mock data
2. `src/lib/api.ts` — add assistant fields to API interfaces
3. `src/components/appointments/AppointmentForm.tsx` — add 3 assistant selectors
4. `src/components/customer/AppointmentHistory.tsx` — display assistants
5. `src/components/customer/ServiceHistory.tsx` — display assistants

---

## Phase 4: Business Logic Validation (Task 4)

### Rule 1: Customer Creation
**Requirement:** Collect name, phone, email, DOB, gender, address, location. NO doctor at customer level.

**Verification:**
- Check `AddCustomerForm` collects all fields
- Verify `createPartner` API call structure
- Confirm no `doctorId` in customer data

### Rule 2: Three Parallel Paths (No Forced Sequence)
**Requirement:** After customer creation, any of these can happen in ANY order:
- Path A: Create appointment (no service required)
- Path B: Create service directly (walk-in, no appointment required)
- Path C: Deposit money (no service required)

**Verification:**
- Appointment form doesn't require service selection
- Service form doesn't require appointment
- Deposit form doesn't require service
- No sequence enforcement in UI

### Rule 3: Deposit = Floating Credit
**Requirement:** Deposits go to wallet, NOT tied to service. Payments can use wallet.

**Verification:**
- `DepositWallet` handles top-ups independently
- Payment form has "pay from wallet" option
- Wallet balance shows in Profile tab

### Rule 4: Payment Requires Service
**Requirement:** Payments always link to a service. Only deposits can exist without service.

**Verification:**
- `PaymentForm` requires service selection
- Can't create payment without selecting service
- Deposits don't require service

### Rule 5: Payment Plans
**Requirement:** After service recorded, remaining balance can split into installments.

**Verification:**
- `MonthlyPlanCreator` links to specific service
- `PaymentSchedule` tracks installments
- Only available when service has outstanding balance

### Rule 6: Doctor at Slip Level
**Requirement:** Different slips can have different doctors. No customer-level doctor.

**Verification:**
- Customer profile shows NO primary doctor
- Each appointment slip has its own doctor field
- Each service slip has its own doctor field
- Doctor selectors are per-slip, not per-customer

### Files to Verify
1. `src/components/forms/AddCustomerForm/AddCustomerForm.tsx`
2. `src/components/appointments/AppointmentForm.tsx`
3. `src/components/payment/DepositWallet.tsx`
4. `src/components/payment/PaymentForm.tsx`
5. `src/components/payment/MonthlyPlan/MonthlyPlanCreator.tsx`
6. `src/components/customer/CustomerProfile.tsx`

---

## Phase 5: Route & Navigation Cleanup (Task 5)

### Routes to Remove
- `/appointments`
- `/services`
- `/payment`

### Final Route Structure
```
/              → Overview
/calendar      → Calendar
/customers     → Customers (internal tabs: Profile, Appointments, Records, Payment)
/employees     → Employees (internal tabs: Admin, Managers, Staff)
/locations     → Locations
/website       → ServiceCatalog
/settings      → Settings
```

### Navigation Changes
- Sidebar shows: Overview, Calendar, Customers, Employees, Locations, Service Catalog, Settings
- Customers has NO children (Appointments, Record, Payment are internal tabs)
- Employees has NO commission child (can re-add later if needed)

### Files Modified
1. `src/App.tsx` — remove routes
2. `src/constants/index.ts` — update ROUTES, NAVIGATION_ITEMS
3. `src/components/Layout.tsx` — verify sidebar uses NAVIGATION_ITEMS

---

## Phase 6: Audit File Creation (Task 6)

Create `AUDIT_GAPS.md` with sections:

### Section 1: Missing API Endpoints
List backend endpoints needed but not implemented.

### Section 2: Missing Database Fields
List columns needed based on interface changes.

### Section 3: Placeholder Data Still in Use
List components using mock data instead of API.

### Section 4: Broken Business Logic
Document any Rule 1-6 that isn't properly implemented.

### Section 5: UI Components Missing/Incomplete
List blueprint-specified components that don't exist.

### Section 6: Type Safety Issues
List `any` types, missing interfaces, TS errors.

---

## TDD Verification Strategy

Since no test framework exists, use:

1. **TypeScript Compilation** = "Test Suite"
   - `npm run build` must pass with zero errors
   - Any type error = failing test

2. **Dev Server Runtime** = "Integration Tests"
   - `npm run dev` → manually verify each feature
   - Checklist for each phase

3. **Lint** = "Static Analysis"
   - `npm run lint` must pass

### Red-Green-Refactor per Phase

**RED:**
- Make type/interface changes
- Run `npm run build` — expect errors (RED)

**GREEN:**
- Implement minimal code to fix errors
- Run `npm run build` — pass (GREEN)
- Run `npm run dev` — verify UI works

**REFACTOR:**
- Clean up code
- Ensure all tests still pass

---

## Success Criteria

- [ ] Customer profile has 4 tabs: Profile, Appointments, Records, Payment
- [ ] Appointments/Services/Payment standalone pages removed from routes
- [ ] Employee page has 3 tier tabs: Admin, Managers, Staff
- [ ] Appointment form has Doctor + 3 Assistant fields
- [ ] Service form has Doctor + 3 Assistant fields
- [ ] API interfaces include assistant fields
- [ ] No customer-level doctor display
- [ ] All 6 business rules verified working
- [ ] Sidebar navigation updated
- [ ] AUDIT_GAPS.md created
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Incremental phases, verify after each |
| Type errors cascading | Fix TS errors immediately, don't defer |
| UI state management complexity | Keep existing hooks, just restructure presentation |
| API not ready for new fields | Add to interfaces, mark as TODO in audit |

---

## Dependencies Between Phases

```
Phase 1 (Customer Tabs)
    ↓
Phase 2 (Employee Tabs) — independent, can parallel
    ↓
Phase 3 (Slip Concept) — needs Phase 1 for tab placement
    ↓
Phase 4 (Business Logic) — needs Phase 3 for complete data model
    ↓
Phase 5 (Cleanup) — needs Phase 1-4 complete
    ↓
Phase 6 (Audit) — needs all previous phases
```

---

**Approved for Implementation** ✓
