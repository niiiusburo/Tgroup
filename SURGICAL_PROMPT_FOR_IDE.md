# SURGICAL PROMPT — TDental Website Restructure

> **Give this entire file to Claude IDE.** It contains every detail needed to restructure the main website codebase to match the blueprint spec.

---

## BLUEPRINT SPEC (read this first)

**Absolute path to the master wireframe/logic spec:**
```
/Users/.../TamTMV/Tgroup/blueprint/CustomerDetailPreview.jsx
```
> This is a self-contained React artifact containing all wireframe UI, all pages, and the full business logic flow. Read the ENTIRE file before making any changes. It is the single source of truth.

**Blueprint project root:**
```
/Users/.../TamTMV/Tgroup/blueprint/
```

**Main website project root (the codebase you will modify):**
```
/Users/.../TamTMV/Tgroup/website/
```

---

## CONTEXT: What This System Is

TDental is a dental clinic management system. The tech stack is:
- Vite 5.1 + React 18.2 + TypeScript 5.3 + Tailwind 3.4
- React Router DOM 6.22 + Framer Motion
- PostgreSQL backend API at `localhost:3002` (API client in `src/lib/api.ts`)

---

## MISSION

You have **5 surgical tasks** to complete. Do them in order. After all 5 are done, create the audit file (Task 6).

---

## TASK 1: Consolidate Customer Tabs (Profile, Appointments, Records, Payment)

### Current State
- `src/components/customer/CustomerProfile.tsx` has 4 tabs: `overview | photos | appointments | treatments`
- `src/pages/Appointments/index.tsx` is a standalone page at route `/appointments`
- `src/pages/Services/index.tsx` is a standalone page at route `/services`
- `src/pages/Payment.tsx` is a standalone page at route `/payment`
- `src/App.tsx` has separate `<Route>` entries for `/appointments`, `/services`, `/payment`

### Target State
The customer detail view should have **exactly 4 tabs**:

| Tab | Content |
|-----|---------|
| **Profile** | Personal info, contact, tags, notes, photos, deposit summary (current `overview` + `photos` merged) |
| **Appointments** | All appointment slips for this customer (pulled from Appointments page logic, filtered to this customer) |
| **Records** | All service/treatment records for this customer (pulled from Services page logic, filtered to this customer) |
| **Payment** | Full payment view: deposit wallet, outstanding balances, payment history, installment plans (pulled from Payment page logic, filtered to this customer) |

### Files to Modify

**`src/components/customer/CustomerProfile.tsx`**
- Change `ProfileTab` type from `'overview' | 'photos' | 'appointments' | 'treatments'` → `'profile' | 'appointments' | 'records' | 'payment'`
- Update the `TABS` array to match the 4 new tabs
- **Profile tab**: Merge current `overview` content (deposit card, appointment summary, service summary) with `photos` content. Show personal info, photo gallery, deposit summary card.
- **Appointments tab**: Render a customer-scoped version of the appointment list. Include "Add Appointment" button. Each appointment is a **slip card** (see Task 3).
- **Records tab**: Render a customer-scoped version of the service/treatment list. Include "Add Service" button. Each service is a **slip card** (see Task 3).
- **Payment tab**: Embed the full payment system (deposit wallet, payment form, outstanding balances, payment history, installment plan creator/viewer). Import and reuse components from `src/components/payment/`.

**`src/App.tsx`**
- **Remove** standalone routes for `/appointments`, `/services`, `/payment`
- Keep the route for `/customers` — the customer detail view (with its 4 tabs) is accessed by clicking a customer
- The Appointments, Services, and Payment pages should NO LONGER be standalone routes. Their content lives inside the customer detail tabs.
- Remove imports: `Appointments`, `Services`, `Payment` from `@/pages`
- Remove `<Route path={ROUTES.APPOINTMENTS} ... />`, `<Route path={ROUTES.SERVICES} ... />`, `<Route path={ROUTES.PAYMENT} ... />`

**`src/pages/index.ts`** (barrel export file)
- Remove exports for `Appointments`, `Services`, `Payment` as standalone pages

**`src/constants/index.ts`**
- Remove `APPOINTMENTS`, `SERVICES`, `PAYMENT` from the `ROUTES` object
- Remove them from `NAVIGATION_ITEMS` (they are now sub-tabs of Customers, not sidebar items)
- Update the `Customers` navigation item: remove the `children` array (Appointments, Record, Payment are no longer sidebar children — they are internal tabs)

### Important
- Do NOT delete the actual page files or component files yet — their logic/components should be **reused** inside the customer tabs
- The components in `src/components/appointments/`, `src/components/payment/`, and `src/components/services/` remain as reusable building blocks. Import them into CustomerProfile tabs.

---

## TASK 2: Employee Page — 3 Tier Tabs (Admin, Managers, Staff)

### Current State
- `src/pages/Employees/index.tsx` has a flat employee list with filter dropdowns (Tier, Role, Status)
- `src/components/employees/TierSelector.tsx` exists for filtering
- No tab-based separation by tier

### Target State
The Employees page should have **3 tabs at the top**:

| Tab | Content |
|-----|---------|
| **Admin** | List of employees with admin tier — full system access |
| **Managers** | List of employees with manager tier — location-scoped access |
| **Staff** | List of employees with staff tier — own data only |

### How to Implement
- Add a `useState<'admin' | 'managers' | 'staff'>` for the active tier tab
- Render 3 tab buttons at the top of the page (styled like the existing tab patterns in the codebase)
- Each tab shows the same `EmployeeTable` component, but pre-filtered to that tier
- **Keep** the existing Role filter, Status filter, and Search within each tab (they filter within the selected tier)
- Remove the standalone Tier filter dropdown (the tabs replace it)
- Keep the EmployeeProfile side panel as-is

### Files to Modify
- `src/pages/Employees/index.tsx` — add tier tabs, remove TierSelector import, pre-filter by tier
- `src/components/employees/TierSelector.tsx` — can be kept for reference but is no longer imported in the main page

### Permission Model (for reference, not UI)
- **Admin**: Can see/edit everything across all locations
- **Manager**: Can see/edit only their assigned location(s)
- **Staff**: Can see/edit only their own records

This is informational context for later backend work. For now, just implement the 3-tab UI separation.

---

## TASK 3: Implement the "Slip" Concept (Doctor + 3 Assistants per Slip)

### Core Concept
Appointments and Services are **"slips"** — independent, stackable cards attached to a customer. Each slip has:
- **1 Doctor** (optional) — the primary doctor for this slip
- **Up to 3 Doctor's Assistants** (optional) — support staff for this slip

Doctors are linked at the **slip level**, NOT at the customer level. Different appointments/services can have different doctors.

### Current State
- `AppointmentFormData` in `src/components/appointments/AppointmentForm.tsx` has `doctorId` and `doctorName` but **NO assistant fields**
- `CustomerAppointment` interface in `src/data/mockCustomerProfile.ts` has `doctor: string` but **NO assistants**
- `CustomerService` interface in `src/data/mockCustomerProfile.ts` has `doctor: string` but **NO assistants**
- `ApiAppointment` in `src/lib/api.ts` has `doctorid` and `doctorname` but **NO assistant fields**

### Changes Required

**`src/data/mockCustomerProfile.ts`**
- Add to `CustomerAppointment`:
  ```typescript
  readonly assistantId1?: string;
  readonly assistantName1?: string;
  readonly assistantId2?: string;
  readonly assistantName2?: string;
  readonly assistantId3?: string;
  readonly assistantName3?: string;
  ```
- Add identical fields to `CustomerService`
- Update mock data arrays to include sample assistant data

**`src/components/appointments/AppointmentForm.tsx`**
- Add 3 assistant selector fields below the Doctor field
- Label them: "Assistant 1", "Assistant 2", "Assistant 3"
- Use the existing `DoctorSelector` component but filter for `isassistant: true` roles
- Add to `AppointmentFormData`:
  ```typescript
  readonly assistantId1?: string;
  readonly assistantName1?: string;
  readonly assistantId2?: string;
  readonly assistantName2?: string;
  readonly assistantId3?: string;
  readonly assistantName3?: string;
  ```
- Make doctor and all 3 assistants **optional** (remove the validation that requires a doctor)

**`src/lib/api.ts`**
- Add to `ApiAppointment`:
  ```typescript
  assistantid1: string | null;
  assistantname1: string | null;
  assistantid2: string | null;
  assistantname2: string | null;
  assistantid3: string | null;
  assistantname3: string | null;
  ```
- Add identical fields to `ApiSaleOrder` (which represents services/treatments)

**Service Form** (create if it doesn't exist as a form component)
- Should mirror AppointmentForm structure but for services
- Fields: Service Type, Linked Appointment (optional), Location, Doctor (1), Assistant 1-3, Price, Prescription/Notes, Number of Sessions
- Each field for doctor/assistants uses the same selector pattern

### Slip Card Display
When displaying appointment or service slips in the customer tabs:
- Show a card with: date, type/service name, status
- Show doctor name with a stethoscope icon
- Show assistant names (if any) with smaller text below the doctor
- Each card is independently clickable to expand details

---

## TASK 4: Business Logic Flow Validation

Read the "Logic Flow Customer" page in the blueprint spec file (`CustomerDetailPreview.jsx`). Verify that the following business rules are actually implemented (not just placeholder UI):

### Rule 1: Customer Creation
- When creating a customer (`src/components/customer/` or wherever the create form is), the form must collect: name, phone, email, DOB, gender, address, location
- Location is attached at customer level
- Doctor is **NOT** attached at customer level (only at slip level)
- Verify the `createPartner` API call in `src/lib/api.ts` sends all required fields

### Rule 2: Three Parallel Paths (No Forced Sequence)
After customer creation, these 3 paths can happen in ANY order:
- **Path A — Appointment**: Customer books an appointment (creates an appointment slip)
- **Path B — Walk-in/Direct Service**: Customer walks in, service is created directly (no appointment needed)
- **Path C — Deposit Only**: Customer deposits money into their wallet (no service required)

Verify that:
- Appointments can be created without a prior service
- Services can be created without a prior appointment (walk-in)
- Deposits can be made without any service or appointment
- None of these paths force a sequence on the others

### Rule 3: Deposit = Floating Credit
- Deposits go into a customer wallet
- Deposits are NOT tied to any specific service
- When paying for a service, the customer can choose to apply wallet balance
- Verify `DepositWallet` component handles top-ups correctly
- Verify payment flow allows selecting "pay from wallet" as a payment method

### Rule 4: Payment Requires a Service
- You can only create a payment against a service/treatment record
- The only way to add money without a service is via deposit (wallet top-up)
- Verify the payment form requires linking to a service

### Rule 5: Payment Plans
- After a service is recorded, if there's a remaining balance, the system can split it into monthly/weekly installments
- Verify `MonthlyPlanCreator` component works and links to a specific service
- Verify `PaymentSchedule` tracks individual installments

### Rule 6: Doctor Linked at Slip Level
- Different appointments can have different doctors
- Different services can have different doctors
- The customer profile does NOT have a "primary doctor" field
- Verify no part of the code assigns a doctor at the customer level

### What to Do If a Rule Fails
If any of these rules is NOT properly implemented (placeholder data, hardcoded values, missing API calls, broken logic), document it in the audit file (Task 6).

---

## TASK 5: Clean Up Routing and Navigation

After Tasks 1-4 are done:

### `src/App.tsx`
Verify final route structure is:
```
/              → Overview
/calendar      → Calendar
/customers     → Customers (with internal tabs: Profile, Appointments, Records, Payment)
/employees     → Employees (with internal tabs: Admin, Managers, Staff)
/locations     → Locations
/website       → ServiceCatalog
/settings      → Settings
```

Routes that should be **REMOVED**:
- `/appointments` (now a tab inside customer detail)
- `/services` (now a tab inside customer detail)
- `/payment` (now a tab inside customer detail)
- `/relationships` (if not used)
- `/commission` (if not used, or keep if actively developed)

### `src/constants/index.ts`
- Update `ROUTES` to remove deleted routes
- Update `NAVIGATION_ITEMS` to reflect the new sidebar structure
- The sidebar should show: Overview, Calendar, Customers, Employees, Locations, Service Catalog, Settings
- Customers should NOT have sidebar children anymore (Appointments, Record, Payment are internal tabs)

### Sidebar Component
- Find and update the sidebar/navigation component to match the new `NAVIGATION_ITEMS`
- Ensure clicking "Customers" goes to the customer list, and clicking a customer opens the detail view with tabs

---

## TASK 6: Create the Audit File

After completing Tasks 1-5, create a file at:
```
/Users/.../TamTMV/Tgroup/website/AUDIT_GAPS.md
```

This file should list EVERY gap, issue, or missing piece you found. Organize it into sections:

### Section 1: Missing API Endpoints
List any backend endpoints that need to exist but don't. For example:
- `POST /api/Appointments` — does it accept `assistantid1`, `assistantid2`, `assistantid3`?
- `GET /api/Appointments?partnerId=X` — does filtering by customer work?
- `POST /api/Deposits` or `POST /api/WalletTopUp` — does this endpoint exist?
- `GET /api/SaleOrders?partnerId=X` — does filtering by customer work?
- Any CRUD operations needed for the new data model

### Section 2: Missing Database Fields
Based on the `ApiAppointment`, `ApiSaleOrder`, `ApiEmployee`, `ApiPartner` interfaces in `src/lib/api.ts`, list fields that need to be added to the database:
- `assistantid1`, `assistantname1`, `assistantid2`, `assistantname2`, `assistantid3`, `assistantname3` on appointments table
- Same fields on sale_orders/services table
- `tier` field on employees table (admin | manager | staff)
- Any other missing columns

### Section 3: Placeholder Data Still in Use
List any component that still uses mock data (`MOCK_*` imports from `src/data/mock*.ts`) instead of real API calls. Each entry should note:
- File path
- What mock is being used
- What API endpoint should replace it

### Section 4: Broken Business Logic
Any rule from Task 4 that is not properly implemented. Be specific about:
- What the rule is
- What the current behavior is
- What needs to change

### Section 5: UI Components Missing or Incomplete
List any UI component that the blueprint spec describes but doesn't exist in the codebase yet, or exists but is incomplete.

### Section 6: Type Safety Issues
List any `any` types, missing interfaces, or TypeScript errors introduced by the changes.

---

## IMPORTANT RULES FOR THE IDE

1. **Read the blueprint spec file FIRST** before touching any code
2. **Do NOT delete** existing page files — refactor their content into the customer tabs
3. **Preserve all existing functionality** — this is a restructure, not a rewrite
4. **Use existing components** — `DoctorSelector`, `LocationSelector`, `CustomerSelector`, `StatusBadge`, etc. are already built
5. **Follow existing code patterns** — look at how current components use hooks, API calls, and state management
6. **TypeScript strict** — no `any` types, proper interfaces for all new data
7. **Keep Tailwind classes consistent** with the existing design system (see `src/constants/index.ts` for colors)
8. **Test after each task** — run `npm run dev` and verify the changes work before moving to the next task

---

## FILE INDEX (Quick Reference)

### Routes & Navigation
- `src/App.tsx` — route definitions
- `src/constants/index.ts` — ROUTES, NAVIGATION_ITEMS, colors
- `src/components/Layout.tsx` — main layout with sidebar

### Customer System
- `src/pages/Customers.tsx` — customer list + profile view
- `src/components/customer/CustomerProfile.tsx` — **MAIN FILE TO RESTRUCTURE** (4 new tabs)
- `src/components/customer/PhotoGallery.tsx` — photo gallery (moves into Profile tab)
- `src/components/customer/DepositCard.tsx` — deposit summary (moves into Profile tab)
- `src/components/customer/AppointmentHistory.tsx` — appointment list (used in Appointments tab)
- `src/components/customer/ServiceHistory.tsx` — service list (used in Records tab)
- `src/data/mockCustomerProfile.ts` — interfaces + mock data (add assistant fields)

### Appointments
- `src/pages/Appointments/index.tsx` — standalone page (content moves into customer tab)
- `src/components/appointments/AppointmentForm.tsx` — form (add 3 assistant fields)
- `src/components/appointments/CheckInFlow.tsx` — check-in workflow
- `src/components/appointments/WaitTimer.tsx` — wait time tracking
- `src/components/appointments/ConvertToService.tsx` — convert appointment to service

### Services
- `src/pages/Services/index.tsx` — standalone page (content moves into customer tab)

### Payment
- `src/pages/Payment.tsx` — standalone page (content moves into customer tab)
- `src/components/payment/DepositWallet.tsx` — wallet component
- `src/components/payment/PaymentForm.tsx` — payment form
- `src/components/payment/OutstandingBalance.tsx` — outstanding balances
- `src/components/payment/PaymentHistory.tsx` — payment history
- `src/components/payment/MonthlyPlan/` — installment plan creator + schedule

### Employees
- `src/pages/Employees/index.tsx` — **ADD 3 TIER TABS**
- `src/components/employees/TierSelector.tsx` — tier filter (replaced by tabs)
- `src/components/employees/RoleMultiSelect.tsx` — role filter (keep)
- `src/components/employees/EmployeeTable.tsx` — employee table (reuse per tab)
- `src/components/employees/EmployeeProfile.tsx` — employee detail panel (keep)

### API & Data
- `src/lib/api.ts` — API client (add assistant fields to interfaces)
- `src/hooks/useAppointments.ts` — appointment data hook
- `src/hooks/usePayment.ts` — payment data hook
- `src/hooks/useMonthlyPlans.ts` — installment plan hook
- `src/hooks/useEmployees.ts` — employee data hook
- `src/contexts/LocationContext.tsx` — location filter context

---

## END OF PROMPT

Complete Tasks 1-6 in order. After each task, verify the app still compiles and renders. Document ALL gaps in `AUDIT_GAPS.md`.
