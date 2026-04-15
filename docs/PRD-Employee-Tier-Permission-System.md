# PRD: Employee Tier-Based Permission System

## Objective
Replace the separate `employee_permissions` mapping table with a **tier column directly on the employee (`partners`) record**. This scales permission management from 300+ individual rows down to 5 tiers × 37 permissions.

## Background
- **Current:** 5 permission groups (Admin, Clinic Manager, Dentist, Receptionist, Dental Assistant) live in `permission_groups`. Employees are mapped to groups via `employee_permissions` (20+ rows today, but 300 employees = 300 rows).
- **Problem:** We have 37 permissions and 300 employees. Maintaining 300 mappings is unsustainable.
- **Solution:** Give every employee a `tier_id` that references `permission_groups.id`. Their tier **is** their permission set.

## Goals
1. Add `tier_id` to the `partners` table.
2. Resolve permissions directly from `partners.tier_id` (no `employee_permissions` lookup required).
3. Let admins select/edit an employee’s tier in the Employee form and profile.
4. Keep `employee_permissions` table temporarily for safety, but auth reads from `partners.tier_id`.
5. Update the Permission Board UI to label groups as "Tiers" so the mental model is clear.

## Non-Goals
- Deleting the `employee_permissions` table entirely (will be deprecated in a follow-up).
- Changing the 37 permissions or the 5 tier definitions.
- Creating new tiers beyond the existing 5 groups.

## Database Changes
```sql
-- Add tier reference to partners
ALTER TABLE partners ADD COLUMN tier_id UUID REFERENCES permission_groups(id);

-- Migrate existing assignments
UPDATE partners p
SET tier_id = (
  SELECT group_id FROM employee_permissions ep WHERE ep.employee_id = p.id
)
WHERE EXISTS (
  SELECT 1 FROM employee_permissions ep2 WHERE ep2.employee_id = p.id
);
```

## Backend Changes
1. **Auth (`api/src/routes/auth.js`)** — `resolvePermissions()` reads `partners.tier_id` instead of joining `employee_permissions`.
2. **Middleware (`api/src/middleware/auth.js`)** — `requirePermission` reads `partners.tier_id` directly.
3. **Employees API (`api/src/routes/employees.js`)** — Accept `tierId` in POST/PUT payload, write it to `partners.tier_id` (and mirror to `employee_permissions` for backward compat).
4. **Permissions API (`api/src/routes/permissions.js`)** — Read employee tier from `partners.tier_id`; write updates to both `partners.tier_id` and `employee_permissions`.

## Frontend Changes
1. **Types** — Add `tierId?: string` and `tierName?: string` to employee/partner types.
2. **EmployeeForm** — Add a "Tier / Cấp bậc quyền" dropdown populated from `/Permissions/groups`. Pass `tierId` on create/update.
3. **EmployeeProfile / EmployeeTable** — Show the tier name as a colored badge.
4. **PermissionBoard** — Rename labels: "Permission Group" → "Tier", "Group" → "Tier".

## Acceptance Criteria
- [ ] Employee create/update API accepts and persists `tierId`.
- [ ] Auth login returns permissions resolved from `partners.tier_id`.
- [ ] Admin can select a tier when creating/editing an employee.
- [ ] Employee profile shows their tier badge.
- [ ] Existing E2E auth test still passes.
- [ ] Permission Board uses "Tier" terminology.
