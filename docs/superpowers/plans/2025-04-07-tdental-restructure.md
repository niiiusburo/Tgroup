# TG Clinic Website Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure TG Clinic dashboard with customer-centric tabs, 3-tier employee organization, Slip concept (doctor + 3 assistants), and proper business logic flows.

**Architecture:** Phase-by-phase incremental restructure: (1) Customer tabs consolidation, (2) Employee tier tabs, (3) Slip data model with assistants, (4) Business logic validation, (5) Route cleanup, (6) Audit documentation. TypeScript compilation as primary test mechanism.

**Tech Stack:** Vite 5.1 + React 18.2 + TypeScript 5.3 + Tailwind 3.4 + React Router DOM 6.22

**Project Root:** `/Users/thuanle/Documents/TamTMV/Tgroup/website`

---

## Phase 1: Customer Tab Consolidation

### Task 1.1: Update Type Definitions — ProfileTab Type

**Files:**
- Modify: `src/components/customer/CustomerProfile.tsx:23-36`

**Context:** The `ProfileTab` type and `TABS` array define the customer profile tabs. Currently has 4 tabs: overview, photos, appointments, treatments.

- [ ] **Step 1: Update ProfileTab type and TABS array**

Change from:
```typescript
type ProfileTab = 'overview' | 'photos' | 'appointments' | 'treatments';

const TABS: readonly { readonly value: ProfileTab; readonly label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'photos', label: 'Photos' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'treatments', label: 'Treatments' },
];
```

To:
```typescript
type ProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

const TABS: readonly { readonly value: ProfileTab; readonly label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'records', label: 'Records' },
  { value: 'payment', label: 'Payment' },
];
```

- [ ] **Step 2: Run TypeScript check (expect errors)**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -50
```

Expected: Errors about `activeTab === 'overview'` and other string literals not matching new type.

- [ ] **Step 3: Commit the type change**

```bash
git add src/components/customer/CustomerProfile.tsx
git commit -m "refactor(customer): update ProfileTab type to new 4-tab structure"
```

---

### Task 1.2: Create Profile Tab Content (Merge Overview + Photos)

**Files:**
- Modify: `src/components/customer/CustomerProfile.tsx:115-175`

**Context:** The tab content rendering section needs to be updated for the new tabs. The 'profile' tab merges 'overview' and 'photos' content.

- [ ] **Step 1: Replace tab content rendering**

Find the tab content section (around line 115) that has:
```tsx
{activeTab === 'overview' && (...)}
{activeTab === 'photos' && (...)}
{activeTab === 'appointments' && (...)}
{activeTab === 'treatments' && (...)}
```

Replace with:
```tsx
{activeTab === 'profile' && (
  <div className="space-y-6">
    {/* Personal Info Card */}
    <div className="bg-white rounded-xl shadow-card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400">Full Name</p>
          <p className="text-sm font-medium text-gray-900">{profile.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Phone</p>
          <p className="text-sm font-medium text-gray-900">{profile.phone}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Email</p>
          <p className="text-sm font-medium text-gray-900">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Date of Birth</p>
          <p className="text-sm font-medium text-gray-900">{profile.dateOfBirth}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Gender</p>
          <p className="text-sm font-medium text-gray-900">{profile.gender === 'male' ? 'Male' : 'Female'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Address</p>
          <p className="text-sm font-medium text-gray-900">{profile.address}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Location</p>
          <p className="text-sm font-medium text-gray-900">{profile.locationName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Member Since</p>
          <p className="text-sm font-medium text-gray-900">{profile.memberSince}</p>
        </div>
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-primary">
        <p className="text-xs text-gray-400">Total Visits</p>
        <p className="text-xl font-bold text-gray-900">{profile.totalVisits}</p>
      </div>
      <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-green-500">
        <p className="text-xs text-gray-400">Deposit Balance</p>
        <p className="text-xl font-bold text-green-600">{formatVND(deposit.balance)}</p>
      </div>
      <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-blue-500">
        <p className="text-xs text-gray-400">Total Spent</p>
        <p className="text-xl font-bold text-blue-600">{formatVND(profile.totalSpent)}</p>
      </div>
      <div className="bg-white rounded-xl shadow-card p-4 border-l-4 border-gray-400">
        <p className="text-xs text-gray-400">Last Visit</p>
        <p className="text-xl font-bold text-gray-700">{profile.lastVisit}</p>
      </div>
    </div>

    {/* Photo Gallery */}
    <PhotoGallery photos={photos} />

    {/* Recent Activity Summary */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AppointmentHistory appointments={appointments.slice(0, 3)} limit={3} />
      <ServiceHistory services={services.slice(0, 3)} limit={3} />
    </div>
  </div>
)}

{activeTab === 'appointments' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">All Appointments</h3>
      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
        + Add Appointment
      </button>
    </div>
    <AppointmentHistory appointments={appointments} />
  </div>
)}

{activeTab === 'records' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">Treatment Records</h3>
      <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
        + Add Service
      </button>
    </div>
    <ServiceHistory services={services} />
  </div>
)}

{activeTab === 'payment' && (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold text-gray-900">Payment & Deposits</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DepositCard deposit={deposit} />
      {/* TODO: Import and add OutstandingBalance, PaymentHistory, MonthlyPlan components */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <p className="text-sm text-gray-500">Outstanding balances and payment history will be integrated here.</p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Update AppointmentHistory and ServiceHistory to accept optional limit prop**

Check if `AppointmentHistory` and `ServiceHistory` components accept a `limit` prop. If not, add it:

In `src/components/customer/AppointmentHistory.tsx`:
```typescript
interface AppointmentHistoryProps {
  readonly appointments: readonly CustomerAppointment[];
  readonly limit?: number;
}
```

And in the component, if `limit` is provided, slice the array before rendering.

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -50
```

Expected: Should pass or show only minor errors.

- [ ] **Step 4: Verify dev server renders correctly**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run dev &
# Open http://localhost:5175
# Navigate to Customers → click a customer
# Verify 4 tabs appear: Profile, Appointments, Records, Payment
# Verify Profile tab shows merged content
```

- [ ] **Step 5: Commit**

```bash
git add src/components/customer/CustomerProfile.tsx
git commit -m "feat(customer): implement new 4-tab profile layout"
```

---

### Task 1.3: Remove Standalone Routes from App.tsx

**Files:**
- Modify: `src/App.tsx:1-65`

**Context:** Remove imports and routes for `/appointments`, `/services`, `/payment` since they are now tabs inside customer detail.

- [ ] **Step 1: Remove imports**

From:
```typescript
import {
  Overview,
  Calendar,
  Customers,
  Appointments,
  Services,
  Payment,
  Employees,
  Locations,
  ServiceCatalog,
  Settings,
  Relationships,
  Commission,
  Reports,
  Notifications,
} from '@/pages';
```

To:
```typescript
import {
  Overview,
  Calendar,
  Customers,
  Employees,
  Locations,
  ServiceCatalog,
  Settings,
  Relationships,
  Commission,
  Reports,
  Notifications,
} from '@/pages';
```

- [ ] **Step 2: Remove route definitions**

Remove these lines from the Routes:
```tsx
{/* @crossref:route[path="/appointments", component=Appointments] */}
<Route path={ROUTES.APPOINTMENTS} element={<Appointments />} />

{/* @crossref:route[path="/services", component=Services] */}
<Route path={ROUTES.SERVICES} element={<Services />} />

{/* @crossref:route[path="/payment", component=Payment] */}
<Route path={ROUTES.PAYMENT} element={<Payment />} />
```

- [ ] **Step 3: Update crossref comments**

Update the @crossref:routes comment at the top to remove the deleted routes.

- [ ] **Step 4: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

Expected: May show errors about unused ROUTES constants — we'll fix that next.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "refactor(routes): remove standalone appointment/service/payment routes"
```

---

### Task 1.4: Update Constants — Remove ROUTES and NAVIGATION_ITEMS

**Files:**
- Modify: `src/constants/index.ts:45-90`

**Context:** Remove the route constants and navigation items that are no longer standalone pages.

- [ ] **Step 1: Remove ROUTES entries**

From ROUTES object, remove:
```typescript
APPOINTMENTS: '/appointments',
SERVICES: '/services',
PAYMENT: '/payment',
```

- [ ] **Step 2: Update NAVIGATION_ITEMS**

From:
```typescript
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: ROUTES.OVERVIEW, label: 'Overview', icon: 'BarChart3' },
  { path: ROUTES.CALENDAR, label: 'Calendar', icon: 'Calendar' },
  {
    path: ROUTES.CUSTOMERS,
    label: 'Customers',
    icon: 'Users',
    children: [
      { path: ROUTES.APPOINTMENTS, label: 'Appointments', icon: 'CalendarCheck' },
      { path: ROUTES.SERVICES, label: 'Record', icon: 'FolderOpen' },
      { path: ROUTES.PAYMENT, label: 'Payment', icon: 'CreditCard' },
    ],
  },
  // ...
];
```

To:
```typescript
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: ROUTES.OVERVIEW, label: 'Overview', icon: 'BarChart3' },
  { path: ROUTES.CALENDAR, label: 'Calendar', icon: 'Calendar' },
  { path: ROUTES.CUSTOMERS, label: 'Customers', icon: 'Users' },
  {
    path: ROUTES.EMPLOYEES,
    label: 'Employees',
    icon: 'UserCog',
    children: [
      { path: ROUTES.COMMISSION, label: 'Commission (P)', icon: 'Percent', isPremium: true },
    ],
  },
  { path: ROUTES.LOCATIONS, label: 'Locations', icon: 'MapPin' },
  { 
    path: ROUTES.WEBSITE, 
    label: 'Service Catalog', 
    icon: 'Stethoscope',
    count: '228',
  },
  { path: ROUTES.SETTINGS, label: 'Settings', icon: 'Settings' },
] as const;
```

- [ ] **Step 3: Run TypeScript and lint checks**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

Expected: Should pass with no errors.

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run lint 2>&1 | head -30
```

Expected: Should pass.

- [ ] **Step 4: Verify sidebar updates**

```bash
# Dev server running at http://localhost:5175
# Verify sidebar shows: Overview, Calendar, Customers, Employees, Locations, Service Catalog, Settings
# Verify Customers has NO submenu
```

- [ ] **Step 5: Commit**

```bash
git add src/constants/index.ts
git commit -m "refactor(navigation): remove standalone route constants and nav items"
```

---

### Task 1.5: Update Barrel Export (pages/index.ts)

**Files:**
- Modify: `src/pages/index.ts`

**Context:** Remove exports for standalone pages that no longer exist as routes.

- [ ] **Step 1: Remove exports**

From:
```typescript
export { Overview } from './Overview';
export { Calendar } from './Calendar';
export { Customers } from './Customers';
export { Appointments } from './Appointments';
export { Services } from './Services/index';
export { Payment } from './Payment';
export { Employees } from './Employees/index';
// ...
```

To:
```typescript
export { Overview } from './Overview';
export { Calendar } from './Calendar';
export { Customers } from './Customers';
export { Employees } from './Employees/index';
export { Locations } from './Locations';
export { ServiceCatalog } from './ServiceCatalog';
export { Settings } from './Settings/index';
export { Relationships } from './Relationships';
export { Commission } from './Commission';
export { Reports } from './Reports';
export { Notifications } from './Notifications';
```

**Note:** We keep the actual page files (Appointments, Services, Payment) in the codebase for now — their components will be reused in the customer tabs. We just remove them from the barrel export.

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.ts
git commit -m "refactor(pages): remove standalone page exports from barrel"
```

---

## Phase 2: Employee 3-Tier Tabs

### Task 2.1: Add Tier Tab State and UI

**Files:**
- Modify: `src/pages/Employees/index.tsx`

**Context:** Replace the TierSelector dropdown with 3 tabs: Admin, Managers, Staff.

- [ ] **Step 1: Add tier tab state**

Add import and state:
```typescript
import { useState } from 'react';
import { UserCog, Search, X } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocationFilter } from '@/contexts/LocationContext';
// Remove: import { TierSelector } from '@/components/employees/TierSelector';
import { RoleMultiSelect } from '@/components/employees/RoleMultiSelect';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';

type TierTab = 'admin' | 'managers' | 'staff';
```

Add state:
```typescript
export function Employees() {
  const { selectedLocationId } = useLocationFilter();
  const [activeTierTab, setActiveTierTab] = useState<TierTab>('admin');
  
  const {
    employees: allEmployees,
    // ... rest of hook
  } = useEmployees(selectedLocationId);
  
  // Filter employees by tier tab
  const employees = useMemo(() => {
    return allEmployees.filter((emp) => {
      switch (activeTierTab) {
        case 'admin':
          return emp.tier === 'director' || emp.roles.includes('manager');
        case 'managers':
          return emp.tier === 'lead' || emp.tier === 'senior';
        case 'staff':
          return emp.tier === 'mid' || emp.tier === 'junior';
        default:
          return true;
      }
    });
  }, [allEmployees, activeTierTab]);
  
  // ... rest of component
}
```

Add `useMemo` import if not present:
```typescript
import { useMemo } from 'react';
```

- [ ] **Step 2: Add tier tabs UI**

Replace the tier filter section with tab buttons. Find:
```tsx
{/* Tier filter */}
<div className="flex items-center gap-2">
  <span className="text-xs font-medium text-gray-500 w-14 shrink-0">Tier:</span>
  <TierSelector value={tierFilter} onChange={setTierFilter} />
</div>
```

Replace with:
```tsx
{/* Tier Tabs */}
<div className="flex gap-1 border-b border-gray-200 mb-4">
  {(['admin', 'managers', 'staff'] as const).map((tier) => (
    <button
      key={tier}
      onClick={() => setActiveTierTab(tier)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        activeTierTab === tier
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tier === 'admin' ? 'Admin' : tier === 'managers' ? 'Managers' : 'Staff'}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Remove tierFilter from hook usage**

Update the destructuring from `useEmployees`:
```typescript
const {
  employees: allEmployees,
  selectedEmployee,
  selectedEmployeeId,
  setSelectedEmployeeId,
  searchQuery,
  setSearchQuery,
  // Remove: tierFilter,
  // Remove: setTierFilter,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  getLinkedEmployees,
  clearFilters,
} = useEmployees(selectedLocationId);
```

Update the hasFilters check:
```typescript
const hasFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 5: Verify in browser**

```bash
# Navigate to http://localhost:5175/employees
# Verify 3 tabs appear: Admin, Managers, Staff
# Verify clicking each tab filters the employee list
# Verify Role and Status filters still work within each tab
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/Employees/index.tsx
git commit -m "feat(employees): replace tier filter with 3-tier tab navigation"
```

---

## Phase 3: Slip Concept — Assistant Fields

### Task 3.1: Add Assistant Fields to Data Interfaces

**Files:**
- Modify: `src/data/mockCustomerProfile.ts`

**Context:** Add assistant fields to CustomerAppointment and CustomerService interfaces.

- [ ] **Step 1: Update CustomerAppointment interface**

Find:
```typescript
export interface CustomerAppointment {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly doctor: string;
  readonly service: string;
  readonly status: 'completed' | 'cancelled' | 'no-show';
  readonly location: string;
  readonly notes: string;
}
```

Replace with:
```typescript
export interface CustomerAppointment {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly doctor: string;
  readonly assistantName1?: string;
  readonly assistantName2?: string;
  readonly assistantName3?: string;
  readonly service: string;
  readonly status: 'completed' | 'cancelled' | 'no-show';
  readonly location: string;
  readonly notes: string;
}
```

- [ ] **Step 2: Update CustomerService interface**

Find:
```typescript
export interface CustomerService {
  readonly id: string;
  readonly date: string;
  readonly service: string;
  readonly doctor: string;
  readonly cost: number;
  readonly status: 'completed' | 'in-progress' | 'planned';
  readonly tooth: string;
  readonly notes: string;
}
```

Replace with:
```typescript
export interface CustomerService {
  readonly id: string;
  readonly date: string;
  readonly service: string;
  readonly doctor: string;
  readonly assistantName1?: string;
  readonly assistantName2?: string;
  readonly assistantName3?: string;
  readonly cost: number;
  readonly status: 'completed' | 'in-progress' | 'planned';
  readonly tooth: string;
  readonly notes: string;
}
```

- [ ] **Step 3: Update mock data**

Update `MOCK_APPOINTMENT_HISTORY` entries to include assistant names:
```typescript
export const MOCK_APPOINTMENT_HISTORY: readonly CustomerAppointment[] = [
  { id: 'apt-1', date: '2026-03-28', time: '09:00', doctor: 'Dr. Tran Minh', assistantName1: 'Khanh Do', assistantName2: 'Linh Pham', service: 'Cleaning & Checkup', status: 'completed', location: 'TG Clinic District 1', notes: 'Regular cleaning, no issues found' },
  { id: 'apt-2', date: '2026-03-15', time: '10:30', doctor: 'Dr. Le Hoang', assistantName1: 'Mai Tran', service: 'Orthodontic Adjustment', status: 'completed', location: 'TG Clinic District 1', notes: 'Wire tightened, next visit in 4 weeks' },
  // ... add assistant names to other entries or leave undefined
];
```

Similarly update `MOCK_SERVICE_HISTORY`.

- [ ] **Step 4: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/data/mockCustomerProfile.ts
git commit -m "feat(data): add assistant fields to CustomerAppointment and CustomerService"
```

---

### Task 3.2: Add Assistant Fields to API Interfaces

**Files:**
- Modify: `src/lib/api.ts`

**Context:** Add assistant fields to ApiAppointment and ApiSaleOrder interfaces.

- [ ] **Step 1: Update ApiAppointment interface**

Find:
```typescript
export interface ApiAppointment {
  id: string;
  name: string | null;
  date: string;
  time: string | null;
  datetimeappointment: string | null;
  timeexpected: number | null;
  note: string | null;
  state: string | null;
  reason: string | null;
  partnerid: string | null;
  partnername: string | null;
  partnerdisplayname: string | null;
  partnerphone: string | null;
  doctorid: string | null;
  doctorname: string | null;
  companyid: string | null;
  companyname: string | null;
  datecreated: string | null;
  lastupdated: string | null;
}
```

Replace with:
```typescript
export interface ApiAppointment {
  id: string;
  name: string | null;
  date: string;
  time: string | null;
  datetimeappointment: string | null;
  timeexpected: number | null;
  note: string | null;
  state: string | null;
  reason: string | null;
  partnerid: string | null;
  partnername: string | null;
  partnerdisplayname: string | null;
  partnerphone: string | null;
  doctorid: string | null;
  doctorname: string | null;
  assistantid1: string | null;
  assistantname1: string | null;
  assistantid2: string | null;
  assistantname2: string | null;
  assistantid3: string | null;
  assistantname3: string | null;
  companyid: string | null;
  companyname: string | null;
  datecreated: string | null;
  lastupdated: string | null;
}
```

- [ ] **Step 2: Update ApiSaleOrder interface**

Find:
```typescript
export interface ApiSaleOrder {
  id: string;
  name: string | null;
  datecreated: string | null;
  state: string | null;
  partnerid: string | null;
  partnername: string | null;
  companyid: string | null;
  companyname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  amounttotal: string | null;
  residual: string | null;
  totalpaid: string | null;
  lastupdated: string | null;
}
```

Replace with:
```typescript
export interface ApiSaleOrder {
  id: string;
  name: string | null;
  datecreated: string | null;
  state: string | null;
  partnerid: string | null;
  partnername: string | null;
  companyid: string | null;
  companyname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  assistantid1: string | null;
  assistantname1: string | null;
  assistantid2: string | null;
  assistantname2: string | null;
  assistantid3: string | null;
  assistantname3: string | null;
  amounttotal: string | null;
  residual: string | null;
  totalpaid: string | null;
  lastupdated: string | null;
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(api): add assistant fields to ApiAppointment and ApiSaleOrder"
```

---

### Task 3.3: Add Assistant Selectors to AppointmentForm

**Files:**
- Modify: `src/components/appointments/AppointmentForm.tsx`

**Context:** Add 3 assistant selector fields below Doctor. Make doctor optional.

- [ ] **Step 1: Update AppointmentFormData interface**

Find:
```typescript
export interface AppointmentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly notes: string;
}
```

Replace with:
```typescript
export interface AppointmentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId?: string;
  readonly doctorName?: string;
  readonly assistantId1?: string;
  readonly assistantName1?: string;
  readonly assistantId2?: string;
  readonly assistantName2?: string;
  readonly assistantId3?: string;
  readonly assistantName3?: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly notes: string;
}
```

- [ ] **Step 2: Add assistant state variables**

After the existing state declarations, add:
```typescript
const [assistantId1, setAssistantId1] = useState<string | null>(null);
const [assistantId2, setAssistantId2] = useState<string | null>(null);
const [assistantId3, setAssistantId3] = useState<string | null>(null);
```

- [ ] **Step 3: Update validation — make doctor optional**

Change validate function:
```typescript
function validate(): boolean {
  const newErrors: Record<string, string> = {};
  if (!customerId) newErrors.customer = 'Customer is required';
  // Doctor is now optional — removed validation
  if (!locationId) newErrors.location = 'Location is required';
  if (!date) newErrors.date = 'Date is required';
  if (!startTime) newErrors.startTime = 'Start time is required';
  if (!endTime) newErrors.endTime = 'End time is required';
  if (!serviceName.trim()) newErrors.serviceName = 'Service name is required';
  if (startTime && endTime && startTime >= endTime) {
    newErrors.endTime = 'End time must be after start time';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}
```

- [ ] **Step 4: Update handleSubmit to include assistants**

Update the onSubmit call:
```typescript
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!validate()) return;

  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  const doctor = doctorId ? MOCK_EMPLOYEES.find((emp) => emp.id === doctorId) : null;
  const assistant1 = assistantId1 ? MOCK_EMPLOYEES.find((emp) => emp.id === assistantId1) : null;
  const assistant2 = assistantId2 ? MOCK_EMPLOYEES.find((emp) => emp.id === assistantId2) : null;
  const assistant3 = assistantId3 ? MOCK_EMPLOYEES.find((emp) => emp.id === assistantId3) : null;
  const location = MOCK_LOCATIONS.find((l) => l.id === locationId);

  if (!customer || !location) return;

  onSubmit({
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    doctorId: doctor?.id,
    doctorName: doctor?.name,
    assistantId1: assistant1?.id,
    assistantName1: assistant1?.name,
    assistantId2: assistant2?.id,
    assistantName2: assistant2?.name,
    assistantId3: assistant3?.id,
    assistantName3: assistant3?.name,
    locationId: location.id,
    locationName: location.name,
    appointmentType,
    serviceName: serviceName.trim(),
    date,
    startTime,
    endTime,
    notes: notes.trim(),
  });
}
```

- [ ] **Step 5: Add assistant selector fields in JSX**

After the Doctor selector div, add:
```tsx
{/* Assistant 1 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Assistant 1</label>
  <DoctorSelector
    employees={MOCK_EMPLOYEES}
    selectedId={assistantId1}
    onChange={setAssistantId1}
    filterRoles={['assistant']}
    placeholder="Select assistant (optional)..."
  />
</div>

{/* Assistant 2 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Assistant 2</label>
  <DoctorSelector
    employees={MOCK_EMPLOYEES}
    selectedId={assistantId2}
    onChange={setAssistantId2}
    filterRoles={['assistant']}
    placeholder="Select assistant (optional)..."
  />
</div>

{/* Assistant 3 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Assistant 3</label>
  <DoctorSelector
    employees={MOCK_EMPLOYEES}
    selectedId={assistantId3}
    onChange={setAssistantId3}
    filterRoles={['assistant']}
    placeholder="Select assistant (optional)..."
  />
</div>
```

- [ ] **Step 6: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -40
```

- [ ] **Step 7: Verify in browser**

```bash
# Navigate to Customers → select customer → Appointments tab → Add Appointment
# Verify Doctor field is no longer required (no error if empty)
# Verify 3 Assistant fields appear below Doctor
# Verify each Assistant field filters to assistants only
```

- [ ] **Step 8: Commit**

```bash
git add src/components/appointments/AppointmentForm.tsx
git commit -m "feat(appointments): add 3 assistant selectors, make doctor optional"
```

---

### Task 3.4: Display Assistants in AppointmentHistory

**Files:**
- Modify: `src/components/customer/AppointmentHistory.tsx`

**Context:** Show doctor + 3 assistants in appointment cards. Show "--" if empty.

- [ ] **Step 1: Update appointment card display**

Find the appointment card rendering. Add doctor and assistant display:

```tsx
{/* Doctor and Assistants */}
<div className="mt-2 space-y-1">
  <div className="flex items-center gap-2 text-sm">
    <Stethoscope className="w-4 h-4 text-gray-400" />
    <span className="text-gray-600">Doctor:</span>
    <span className="font-medium text-gray-900">{appointment.doctor || '--'}</span>
  </div>
  <div className="flex items-center gap-2 text-sm">
    <Users className="w-4 h-4 text-gray-400" />
    <span className="text-gray-600">Assistants:</span>
    <span className="font-medium text-gray-900">
      {[
        appointment.assistantName1,
        appointment.assistantName2,
        appointment.assistantName3,
      ]
        .filter(Boolean)
        .join(', ') || '--'}
    </span>
  </div>
</div>
```

Add imports if needed:
```typescript
import { Stethoscope, Users } from 'lucide-react';
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/customer/AppointmentHistory.tsx
git commit -m "feat(appointments): display doctor and assistants in appointment cards"
```

---

### Task 3.5: Display Assistants in ServiceHistory

**Files:**
- Modify: `src/components/customer/ServiceHistory.tsx`

**Context:** Show doctor + 3 assistants in service cards. Show "--" if empty.

- [ ] **Step 1: Update service card display**

Similar to Task 3.4, add doctor and assistant display to service cards:

```tsx
{/* Doctor and Assistants */}
<div className="mt-2 space-y-1">
  <div className="flex items-center gap-2 text-sm">
    <Stethoscope className="w-4 h-4 text-gray-400" />
    <span className="text-gray-600">Doctor:</span>
    <span className="font-medium text-gray-900">{service.doctor || '--'}</span>
  </div>
  <div className="flex items-center gap-2 text-sm">
    <Users className="w-4 h-4 text-gray-400" />
    <span className="text-gray-600">Assistants:</span>
    <span className="font-medium text-gray-900">
      {[
        service.assistantName1,
        service.assistantName2,
        service.assistantName3,
      ]
        .filter(Boolean)
        .join(', ') || '--'}
    </span>
  </div>
</div>
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/customer/ServiceHistory.tsx
git commit -m "feat(services): display doctor and assistants in service cards"
```

---

## Phase 4: Business Logic Validation

### Task 4.1: Verify Rule 1 — Customer Creation Fields

**Files:**
- Verify: `src/components/forms/AddCustomerForm/AddCustomerForm.tsx`
- Verify: `src/lib/api.ts` (createPartner)

- [ ] **Step 1: Check AddCustomerForm fields**

```bash
cat src/components/forms/AddCustomerForm/AddCustomerForm.tsx | grep -E "(name|phone|email|birth|gender|address|location)" | head -20
```

Verify it collects: name, phone, email, DOB (birthday), gender, address, location.

- [ ] **Step 2: Verify no doctor field in customer creation**

```bash
grep -n "doctor" src/components/forms/AddCustomerForm/AddCustomerForm.tsx
```

Expected: No matches (or only in comments).

- [ ] **Step 3: Verify createPartner API**

```bash
grep -A 5 "createPartner" src/lib/api.ts
```

Verify it accepts the standard partner fields.

- [ ] **Step 4: Document finding in audit**

Note in `AUDIT_GAPS.md` (Task 6) whether Rule 1 passes or fails.

---

### Task 4.2: Verify Rule 2 — Three Parallel Paths

**Files:**
- Verify: AppointmentForm doesn't require service
- Verify: Service creation path exists (check if there's a service form)
- Verify: Deposit doesn't require service

- [ ] **Step 1: Check AppointmentForm service requirement**

Already done in Task 3.3 — we made doctor optional. Check if there's a service linking field:

```bash
grep -n "service" src/components/appointments/AppointmentForm.tsx | head -10
```

The form has `serviceName` (text input for the type of service), not a link to an existing service record. This satisfies the requirement.

- [ ] **Step 2: Check if ServiceForm exists**

```bash
ls -la src/components/services/
```

If no form exists, note in audit that Path B (walk-in service) needs a form.

- [ ] **Step 3: Check DepositWallet doesn't require service**

```bash
grep -n "service" src/components/payment/DepositWallet.tsx
```

Expected: No service requirement for deposits.

- [ ] **Step 4: Document findings**

Note in `AUDIT_GAPS.md` which paths are implemented and which need work.

---

### Task 4.3: Verify Rule 3 — Deposit = Floating Credit

**Files:**
- Verify: `src/components/payment/DepositWallet.tsx`
- Verify: `src/components/payment/PaymentForm.tsx`

- [ ] **Step 1: Verify deposit is independent**

Check that DepositWallet handles top-ups without requiring service selection.

- [ ] **Step 2: Verify payment can use wallet**

Check PaymentForm for wallet balance display and "pay from wallet" option.

- [ ] **Step 3: Document findings**

Note in `AUDIT_GAPS.md`.

---

### Task 4.4: Verify Rule 4 — Payment Requires Service

**Files:**
- Verify: `src/components/payment/PaymentForm.tsx`

- [ ] **Step 1: Check for service selection requirement**

```bash
grep -n "service" src/components/payment/PaymentForm.tsx | head -20
```

Verify the form requires selecting a service to pay for.

- [ ] **Step 2: Document findings**

Note in `AUDIT_GAPS.md`.

---

### Task 4.5: Verify Rule 5 — Payment Plans

**Files:**
- Verify: `src/components/payment/MonthlyPlan/MonthlyPlanCreator.tsx`

- [ ] **Step 1: Check plan creation links to service**

Verify the monthly plan creator requires a service selection.

- [ ] **Step 2: Document findings**

Note in `AUDIT_GAPS.md`.

---

### Task 4.6: Verify Rule 6 — Doctor at Slip Level

**Files:**
- Verify: `src/components/customer/CustomerProfile.tsx`
- Verify: AppointmentForm, ServiceHistory

- [ ] **Step 1: Confirm no primary doctor in profile**

We removed this in Task 1.2. Verify:

```bash
grep -n "doctor" src/components/customer/CustomerProfile.tsx
```

Expected: Only in comments or within tab content (appointment/service lists), not as a profile field.

- [ ] **Step 2: Confirm doctor in slip forms**

Already done in Tasks 3.3-3.5.

- [ ] **Step 3: Commit business logic validation**

```bash
git add -A
git commit -m "docs: business logic validation complete (Rules 1-6)"
```

---

## Phase 5: Route & Navigation Cleanup (Final Verification)

### Task 5.1: Final Route Verification

- [ ] **Step 1: Verify App.tsx routes**

```bash
grep "Route path" src/App.tsx
```

Expected routes:
- `/` (Overview)
- `/calendar`
- `/customers`
- `/employees`
- `/locations`
- `/website`
- `/settings`
- `/relationships` (optional)
- `/commission` (optional)
- `/reports` (optional)
- `/notifications` (optional)

NOT present:
- `/appointments`
- `/services`
- `/payment`

- [ ] **Step 2: Verify sidebar navigation**

```bash
grep -A 20 "NAVIGATION_ITEMS" src/constants/index.ts
```

Expected: Overview, Calendar, Customers, Employees, Locations, Service Catalog, Settings. Customers has NO children.

- [ ] **Step 3: Full build check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Lint check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run lint
```

Expected: No lint errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: final route and navigation cleanup"
```

---

## Phase 6: Audit File Creation

### Task 6.1: Create AUDIT_GAPS.md

**Files:**
- Create: `src/AUDIT_GAPS.md`

- [ ] **Step 1: Create audit file with all sections**

```markdown
# TG Clinic Implementation Audit — Gaps & Missing Pieces

**Date:** 2025-04-07
**Audited by:** Implementation Agent

---

## Section 1: Missing API Endpoints

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/Appointments` | ⚠️ PARTIAL | Needs to accept assistantid1-3 fields |
| `POST /api/SaleOrders` | ⚠️ PARTIAL | Needs to accept assistantid1-3 fields |
| `POST /api/Deposits` | ❌ MISSING | Wallet top-up endpoint not implemented |
| `GET /api/Appointments?partnerId=X` | ✅ EXISTS | Verify filtering works |
| `GET /api/SaleOrders?partnerId=X` | ✅ EXISTS | Verify filtering works |

---

## Section 2: Missing Database Fields

### Appointments Table
- [ ] `assistantid1` (uuid, nullable)
- [ ] `assistantname1` (varchar, nullable)
- [ ] `assistantid2` (uuid, nullable)
- [ ] `assistantname2` (varchar, nullable)
- [ ] `assistantid3` (uuid, nullable)
- [ ] `assistantname3` (varchar, nullable)

### SaleOrders Table
- [ ] `assistantid1` (uuid, nullable)
- [ ] `assistantname1` (varchar, nullable)
- [ ] `assistantid2` (uuid, nullable)
- [ ] `assistantname2` (varchar, nullable)
- [ ] `assistantid3` (uuid, nullable)
- [ ] `assistantname3` (varchar, nullable)

### Partners Table
- [ ] `tier` field on employee records — currently derived from hrjobname

---

## Section 3: Placeholder Data Still in Use

| File | Mock Data Used | Should Use API |
|------|----------------|----------------|
| `src/components/customer/PhotoGallery.tsx` | MOCK_CUSTOMER_PHOTOS | GET /api/PartnerPhotos/:id |
| `src/components/customer/DepositCard.tsx` | MOCK_CUSTOMER_DEPOSIT | GET /api/Wallet/:partnerId |
| `src/components/payment/PaymentHistory.tsx` | Mock payments | GET /api/Payments?partnerId=X |
| `src/components/payment/OutstandingBalance.tsx` | Mock balances | GET /api/SaleOrders?partnerId=X&state=open |

---

## Section 4: Business Logic Validation Results

### Rule 1: Customer Creation ✅ PASS
- Form collects all required fields
- No doctor at customer level

### Rule 2: Three Parallel Paths ⚠️ PARTIAL
- Path A (Appointment): ✅ Implemented
- Path B (Walk-in Service): ❌ Needs ServiceForm component
- Path C (Deposit): ✅ Implemented

### Rule 3: Deposit = Floating Credit ⚠️ PARTIAL
- Deposit wallet exists but uses mock data
- Need real API integration

### Rule 4: Payment Requires Service ⚠️ PARTIAL
- Form exists but needs service selector integration

### Rule 5: Payment Plans ⚠️ PARTIAL
- UI exists but needs service linking

### Rule 6: Doctor at Slip Level ✅ PASS
- Doctor removed from profile
- Doctor in appointment/service forms
- Doctor display in history lists

---

## Section 5: UI Components Missing/Incomplete

| Component | Status | Notes |
|-----------|--------|-------|
| ServiceForm | ❌ MISSING | Form to create services (walk-in path) |
| PaymentForm Service Selector | ⚠️ INCOMPLETE | Needs dropdown of customer's services |
| MonthlyPlan Service Link | ⚠️ INCOMPLETE | Needs to require service selection |

---

## Section 6: Type Safety Issues

| File | Issue | Severity |
|------|-------|----------|
| None found | — | — |

---

## Summary

**Completed:**
- ✅ Customer tab consolidation (4 tabs)
- ✅ Employee 3-tier tabs
- ✅ Slip concept data model (assistant fields)
- ✅ Assistant selectors in appointment form
- ✅ Doctor/assistant display in history lists
- ✅ Route cleanup
- ✅ Navigation update

**Next Priority:**
1. Create ServiceForm component for walk-in services
2. Add real API integration for deposits/payments
3. Add database fields for assistants
4. Update backend endpoints to accept assistant fields
```

- [ ] **Step 2: Commit audit file**

```bash
git add src/AUDIT_GAPS.md
git commit -m "docs: add comprehensive audit file documenting gaps and next steps"
```

---

## Final Verification Checklist

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no warnings
- [ ] Dev server starts successfully
- [ ] Customer profile shows 4 tabs: Profile, Appointments, Records, Payment
- [ ] Employee page shows 3 tabs: Admin, Managers, Staff
- [ ] Appointment form has Doctor + 3 Assistant fields
- [ ] Doctor is optional in appointment form
- [ ] No standalone routes for /appointments, /services, /payment
- [ ] Sidebar navigation updated
- [ ] AUDIT_GAPS.md created and populated
- [ ] All changes committed to git

---

**End of Implementation Plan**
