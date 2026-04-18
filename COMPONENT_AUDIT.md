# Component Audit — SSOT Violations & Duplication Report

> Audit Date: 2026-04-18  
> Worktree: core-pillars-infra  
> Rule: Shared components MUST NOT fetch data directly. Data flows top-down via props or hooks consumed at page level.

---

## 1. Components That Fetch Data Directly (SSOT Violations)

These components violate the Single Source of Truth boundary by making API calls inside their own implementation instead of receiving data via props.

### Critical — Shared Components

| # | Component | Location | API Calls / Imports | Impact |
|---|-----------|----------|---------------------|--------|
| 1 | **FeedbackWidget** | `shared/FeedbackWidget.tsx` | `fetchMyFeedback`, `fetchMyFeedbackThread`, `createFeedback`, `replyToMyFeedbackThread` | Embedded globally in Layout; tightly couples UI to feedback API schema |
| 2 | **QuickAddAppointmentButton** | `shared/QuickAddAppointmentButton.tsx` | Lazy-imports `createAppointment` from `@/lib/api` | Should receive `onSubmit` callback only; currently hard-wires API endpoint |
| 3 | **QuickActionsBar** | `shared/QuickActionsBar.tsx` | Imports `QUICK_ACTIONS` from `@/data/mockDashboard` | Not an API call, but violates SSOT by embedding static data source instead of receiving actions via props |
| 4 | **AddressAutocomplete** | `shared/AddressAutocomplete.tsx` | `apiFetch` to `/Places/autocomplete` and `/Places/details` | Borderline — this is a thin Google Places proxy wrapper; acceptable if documented as "infrastructure component" |

### Critical — Module Components

| # | Component | Location | API Calls / Imports | Impact |
|---|-----------|----------|---------------------|--------|
| 5 | **EditAppointmentModal** | `modules/EditAppointmentModal.tsx` | `fetchProducts`, `updateAppointment` | Used by Overview + Calendar; fetching products inside modal breaks caching / loading orchestration at page level |

### Secondary — Domain-Specific Components

| # | Component | Location | API Calls / Imports | Impact |
|---|-----------|----------|---------------------|--------|
| 6 | **EmployeeForm** | `employees/EmployeeForm.tsx` | `fetchCompanies`, `fetchPermissionGroups` | Form fetches its own dropdown data; should receive `locations` and `tiers` via props |
| 7 | **EmployeeProfile** | `employees/EmployeeProfile.tsx` | `fetchCompanies` | Fetches companies just for name lookup; should receive a `locationNameMap` prop (like EmployeeTable does) |
| 8 | **HealthCheckupGallery** | `customer/HealthCheckupGallery.tsx` | `createExternalCheckup` | Creates checkup directly; acceptable if considered a "smart" domain widget, but worth noting |

---

## 2. Duplicated UI Patterns Across Pages

These patterns are re-implemented inline in multiple pages instead of being extracted into shared/modules.

### Pattern A: Stat / KPI Card

| Location | Implementation | Lines |
|----------|---------------|-------|
| `pages/Appointments/index.tsx` | Inline `StatCard` function (lines 341–357) | ~17 |
| `pages/Services/index.tsx` | Inline `StatCard` function (lines 221–239) | ~19 |
| `components/modules/StatCardModule.tsx` | **Shared module exists** but is not used by Appointments or Services | ~67 |
| `components/reports/KPICard.tsx` | Very similar visual pattern (icon + value + label + change) | ~83 |

**Finding:** 3 different stat-card implementations exist. Appointments and Services pages re-invent the wheel instead of using `StatCardModule` or `KPICard`.

### Pattern B: Page Header (Icon + Title + Subtitle + Action Button)

| Pages with identical header structure |
|---------------------------------------|
| Customers, Employees, Appointments, Services, Calendar, Reports, Locations, Settings |

**Structure:**
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    <div className="p-2 bg-primary/10 rounded-lg"><Icon /></div>
    <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-gray-500">{subtitle}</p></div>
  </div>
  <button className="px-4 py-2 bg-primary text-white rounded-lg">Add X</button>
</div>
```

**Finding:** Zero reuse. Every page copy-pastes this exact layout.

### Pattern C: Search Input with Icon

| Pages | Implementation |
|-------|---------------|
| Employees, Appointments, Calendar | Inline `<div className="relative"><Search className="absolute left-3 ..." /><input ... /></div>` |
| Customers, Services | Uses `SearchBar` shared component |

**Finding:** Inconsistent adoption. Some pages use `SearchBar`, others inline the same markup.

### Pattern D: Status Filter Tabs / Chips

| Pages | Implementation |
|-------|---------------|
| Customers | Inline status chip buttons (`active`, `inactive`, `pending`) |
| Appointments | Inline status tab buttons (`scheduled`, `confirmed`, `in-progress`, `completed`, `cancelled`) |
| Employees | Inline status chip buttons (`active`, `on-leave`, `inactive`) |

**Finding:** Same UI pattern (clickable filter chips) implemented 3 times with different styling and logic.

### Pattern E: Inline Calendar / Date Picker Popup

| Pages | Implementation |
|-------|---------------|
| Calendar | Full inline mini-calendar popup (lines 288–309) |
| DateRangePicker (shared) | Standalone shared component with similar grid logic |

**Finding:** Calendar page duplicates month-grid generation logic that already exists in `DateRangePicker`.

---

## 3. Top 5 Candidates for Extraction into Shared/Modules

| Rank | Candidate | Current Problem | Proposed Home | Effort |
|------|-----------|-----------------|---------------|--------|
| 1 | **PageHeader** | Copy-pasted in 9+ pages | `shared/PageHeader.tsx` | Low — pure component |
| 2 | **StatCard (unified)** | 3+ implementations (Appointments, Services, StatCardModule, KPICard) | Consolidate into `modules/StatCardModule.tsx` or `shared/StatCard.tsx` | Low — pure component |
| 3 | **StatusFilterChips** | Re-implemented in Customers, Appointments, Employees | `shared/StatusFilterChips.tsx` | Low — pure component |
| 4 | **SearchInput (enforce usage)** | Some pages inline search instead of using `SearchBar` | Update pages to use `shared/SearchBar.tsx` | Low — refactor only |
| 5 | **FeedbackWidget (container/presenter split)** | Fetches API directly inside shared component | Split into `shared/FeedbackWidget.tsx` (pure) + `containers/FeedbackWidgetContainer.tsx` | Medium — requires hook extraction |

---

## Summary Metrics

| Metric | Count |
|--------|-------|
| Total shared components | 27 |
| Shared components exported from barrel (`index.ts`) | 1 |
| Shared components with prop interfaces | 20 |
| Shared components fetching data directly | 3 (FeedbackWidget, QuickAddAppointmentButton, AddressAutocomplete) |
| Module components fetching data directly | 1 (EditAppointmentModal) |
| Pages with duplicated header pattern | 9+ |
| Pages with duplicated stat card pattern | 3 |
| Pages with duplicated status filter pattern | 3 |
