---
phase: 03-architecture-shifts
plan: 02
subsystem: frontend-employees
tags: [react, typescript, multi-branch, ui]

requires:
  - phase: 03-architecture-shifts
    plan: 03-01
    provides: employee_location_scope backend with locationScopeIds

provides:
  - Employee type with locationScopeIds
  - EmployeeForm dual-selector branch assignment UI
  - EmployeeTable multi-branch display
  - EmployeeProfile additional branches display

affects:
  - 03-03-PLAN.md
  - 03-04-PLAN.md

tech-stack:
  added: []
  patterns:
    - "Employee type extends with optional readonly locationScopeIds"
    - "Hook-based columns factory in DataTable consumers for dynamic props"
    - "Chip toggle pattern reused from RoleMultiSelect for branch scope selection"

key-files:
  created: []
  modified:
    - website/src/types/employee.ts
    - website/src/lib/api.ts
    - website/src/hooks/useEmployees.ts
    - website/src/components/employees/EmployeeForm.tsx
    - website/src/components/employees/EmployeeTable.tsx
    - website/src/components/employees/EmployeeProfile.tsx
    - website/src/pages/Employees/index.tsx

key-decisions:
  - "Use useColumns hook to close over locationNameMap since DataTable Column render only receives row"
  - "Filter out primary companyid from scope chips to avoid duplicate selection"
  - "Keep LocationContext filter untouched; page-level changes are additive only"

requirements-completed:
  - REQ-12

# Metrics
duration: 35min
completed: 2026-04-11
---

# Phase 3 Plan 2: Employee Multi-Branch Frontend Summary

**React frontend dual-selector branch assignment: types, API client, form chips, table/profile rendering**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-11T04:22:08Z
- **Completed:** 2026-04-11T04:57:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

1. **Types and API client (Task 1)**
   - Added `locationScopeIds?: readonly string[]` to `Employee` interface
   - Added `locationScopeIds?: string[]` to `CreateEmployeeData` and `ApiEmployee` in `lib/api.ts`
   - Mapped `locationScopeIds` through `useEmployees` hook

2. **EmployeeForm multi-branch selector (Task 2)**
   - Added `locationScopeIds` state initialized from the employee prop
   - Added "Chi nhánh phụ" toggle chip list using `Building2` icon
   - Selected chips use `bg-orange-100 text-orange-700 border-orange-200`
   - Primary `companyid` is excluded from chip list
   - `handleSubmit` sends `locationScopeIds` in create/update payloads

3. **Table and Profile display (Task 3)**
   - Converted `EmployeeTable` from static `columns` array to `useColumns(locationNameMap)` hook so the column renderer can access the location map
   - Location column now renders all assigned branch names (primary + scopes)
   - `Employees/index.tsx` builds `locationNameMap` from `useLocations()` and passes it to `EmployeeTable`
   - `EmployeeProfile` shows primary branch under `MapPin` and additional branches under `Building2`
   - Profile shows "Không có chi nhánh phụ" when no additional branches exist

## Task Commits

1. **feat(03-02): add locationScopeIds to useEmployees hook** — `71f51fad`
2. **feat(03-02): add locationScopeIds to employee types and API client** — `24b4c47f`
3. **feat(03-02): add multi-branch selector to EmployeeForm** — `ec328761`
4. **feat(03-02): display all assigned branches in EmployeeTable and EmployeeProfile** — `2957753e`

## Decisions Made

- Used a `useColumns` hook in `EmployeeTable` instead of a static array because `DataTable`'s `Column.render` only receives the row. Closing over `locationNameMap` keeps the component clean and type-safe.
- Excluded the primary `companyid` from the "Chi nhánh phụ" chip list to prevent logical duplication, matching the backend constraint from 03-01.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `EmployeeTable` initially tried to pass extra props (`locationNameMap`, `selectedRowId`) through `DataTable`, which does not accept them. Fixed by converting `columns` to a `useColumns` hook.
- `readonly string[]` from `Employee.locationScopeIds` caused a minor TypeScript mismatch when initializing `useState<string[]>`. Fixed by spreading into a new mutable array.

## Known Stubs

None.

## User Setup Required

None.

## Next Phase Readiness

- Frontend is ready for multi-branch employee assignment
- No blockers for 03-03 or 03-04

---
*Phase: 03-architecture-shifts*
*Completed: 2026-04-11*

## Self-Check: PASSED
- SUMMARY.md exists
- Commit 71f51fad exists
- Commit 24b4c47f exists
- Commit ec328761 exists
- Commit 2957753e exists
- TypeScript build passes (`npm run build` succeeded)
