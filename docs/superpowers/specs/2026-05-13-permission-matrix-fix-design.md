# Permission Matrix Fix — Design Spec

## Status
Approved by user (Approach C selected: Full Refactor with separate hooks)

## Context

The Permission Matrix UI (`PermissionGroupConfig`) updates React state locally but never persists changes to the backend. Every toggle, add, remove, and location scope change is a no-op that disappears on refresh. The user (`t@clinic.vn`, admin) sees changes but they don't actually work.

## Problem Statement

| Surface | Current Behavior | Expected Behavior |
|---|---|---|
| Toggle permission checkbox | Updates `setGroups()` local state | Calls `PUT /api/Permissions/groups/:id` |
| Add new permission group | `// TODO: Call API` | Calls `POST /api/Permissions/groups` |
| Delete permission group | Filters local array | Calls `DELETE /api/Permissions/groups/:id` |
| Assign employee to group | Calls `updateEmployeePermission()` (works) | Keep working |
| Remove employee from group | Filters local array | Calls `PUT /api/Permissions/employees/:id` with `groupId: null` |
| Toggle location scope | Updates `setAssignments()` local state | Calls `PUT /api/Permissions/employees/:id` |
| Permission override toggle | Updates `setAssignments()` local state | Calls `PUT /api/Permissions/employees/:id` |

## Design

### Architecture: Two-Hook Split

```
PermissionGroupConfig.tsx
├── usePermissionGroups   (group CRUD: fetch, create, update, delete)
└── useGroupMembers       (assignment CRUD: assign, remove, location, overrides)
```

Why split:
- Each hook has a single responsibility
- Group mutations don't need employee data; member mutations don't need full group list
- Easier to test independently
- Prevents the 500-line god-object hook

### Hook 1: usePermissionGroups

```ts
function usePermissionGroups() {
  // Data
  groups: PermissionGroup[]
  isLoading: boolean
  error: string | null
  
  // Selection
  selectedGroupId: string | null
  setSelectedGroupId(id)
  selectedGroup: PermissionGroup | null
  
  // Mutations
  createGroup(name, color, description): Promise<PermissionGroup>
  updateGroup(groupId, { name?, color?, description?, permissions? }): Promise<PermissionGroup>
  deleteGroup(groupId): Promise<void>
  toggleGroupPermission(groupId, permissionId): Promise<void>  // calls updateGroup
  
  // Derived
  permissionsByModule: Record<string, Permission[]>
  groupMemberCounts: Record<string, number>
}
```

### Hook 2: useGroupMembers

```ts
function useGroupMembers(groupId: string | null) {
  // Data
  assignments: EmployeePermissionAssignment[]
  isLoading: boolean
  error: string | null
  
  // Mutations
  assignEmployee(employeeId): Promise<void>
  removeEmployee(employeeId): Promise<void>
  toggleLocation(employeeId, locationId): Promise<void>
  setAllLocations(employeeId, boolean): Promise<void>
  toggleOverrideGrant(employeeId, permissionId): Promise<void>
  toggleOverrideRevoke(employeeId, permissionId): Promise<void>
}
```

### Backend Changes

**Add DELETE endpoint:**
```
DELETE /api/Permissions/groups/:groupId
  - Requires: permissions.edit
  - Rejects if is_system=true
  - Deletes group_permissions rows (CASCADE)
  - Sets employees' tier_id to NULL (or moves to default group)
```

**Add unassignment support to PUT /api/Permissions/employees/:id:**
```
PUT /api/Permissions/employees/:employeeId
  Body: { groupId: null }  // unassigns employee
  - Sets partners.tier_id = NULL
  - Removes employee_permissions row
  - Removes employee_location_scope rows
  - Removes permission_overrides rows
```

### Component Changes

`PermissionGroupConfig.tsx`:
- Import both hooks
- Use `usePermissionGroups` for top-level group cards + permission matrix
- Use `useGroupMembers(selectedGroupId)` for member assignments panel
- Show loading spinner per-mutation
- Show error toast on mutation failure
- Optimistic updates with rollback

### Loading & Error States

| Action | UI Feedback |
|---|---|
| Toggle permission | Checkbox shows spinner, reverts on error |
| Create group | Button shows "Creating...", disables |
| Delete group | Confirmation modal, then spinner on card |
| Assign employee | Dropdown closes, member row appears |
| Remove employee | Row fades, reappears on error |
| Toggle location | Checkbox shows spinner |
| Toggle override | Tag shows spinner |

### Optimistic Updates

All mutations use optimistic UI:
1. Update local state immediately
2. Fire API call
3. On success: keep optimistic state
4. On error: revert to pre-mutation state, show error toast

## Test Plan

### Phase 1: Create Test Accounts

Create 4 employees via `POST /api/Partners` (employee=true):

| # | Name | Email | Group | Expected Role |
|---|---|---|---|---|
| T1 | TestAdmin | testadmin@tgroup.local | Admin group | Full access |
| T2 | TestManager | testmanager@tgroup.local | Manager group | View + reports, limited edit |
| T3 | TestDentist | testdentist@tgroup.local | Doctor group | Clinical workflows only |
| T4 | TestReception | testreception@tgroup.local | Receptionist group | Front desk only |

### Phase 2: Permission Edit Tests

For each test account:
1. Log in via browser
2. Verify visible sidebar items match group permissions
3. Verify protected routes redirect or show 403
4. Verify add/edit/delete buttons appear/disappear per permission

### Phase 3: Mutation Tests

Test these mutations and verify persistence:
1. Add permission to group → login as member → verify new access
2. Remove permission from group → login as member → verify access gone
3. Change member's location scope → verify filtered data
4. Add override grant → verify extra permission
5. Add override revoke → verify permission removed
6. Remove member from group → verify no permissions

### Phase 4: Cleanup

Delete test accounts via `DELETE /api/Partners/:id/hard-delete`.

## Files to Modify

| File | Change |
|---|---|
| `api/src/routes/permissions.js` | Add DELETE /groups/:id, support groupId=null in PUT /employees/:id |
| `website/src/hooks/usePermissionGroups.ts` | Full rewrite: group CRUD only, real API calls |
| `website/src/hooks/useGroupMembers.ts` | **New**: member assignment/locations/overrides |
| `website/src/components/settings/PermissionGroupConfig.tsx` | Use both hooks, add loading/error states |
| `website/src/lib/api/permissions.ts` | Add `deletePermissionGroup`, maybe `unassignEmployeePermission` |

## Success Criteria

- [ ] Admin can create, edit, delete permission groups and changes persist after refresh
- [ ] Admin can toggle permissions on/off and changes persist after refresh
- [ ] Admin can assign/unassign employees and changes persist after refresh
- [ ] Admin can change location scope and changes persist after refresh
- [ ] Admin can add/remove overrides and changes persist after refresh
- [ ] TestAdmin account sees all modules
- [ ] TestManager sees reports, limited edit
- [ ] TestDentist sees calendar, services, no payments
- [ ] TestReception sees customers, appointments, payments view only
- [ ] All test accounts deleted after verification
