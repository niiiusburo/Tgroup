# Business Logic: Auth & Permission Resolution

> How JWT auth and effective permissions are resolved.

## 1. JWT Flow

### Login (`POST /api/Auth/login`)
1. Query `partners` where `employee = true`, `isdeleted = false`, `active = true`, and `email = $1`.
2. Compare password with `bcrypt.compare(password, password_hash)`.
3. Update `partners.last_login = NOW()`.
4. Call `resolvePermissions(employee.id)`.
5. Sign JWT payload:
   ```js
   { employeeId, name, email, companyId }
   ```
6. Return `{ token, user, permissions }`.

### Token Validation (`requireAuth` middleware)
- Reads `Authorization: Bearer <token>`.
- Verifies with `jwt.verify(token, process.env.JWT_SECRET)`.
- Sets `req.user = decoded`.

## 2. Permission Resolution

Permission resolution happens in **two places** that must stay identical:
- `api/src/middleware/auth.js` → `requirePermission(permission)`
- `api/src/routes/auth.js` → `resolvePermissions(employeeId)`

### Algorithm (both implementations)

1. **Tier lookup**
   - Read `partners.tier_id` for the employee.
   - If missing, return 403 (`requirePermission`) or empty permissions (`resolvePermissions`).

2. **Base permissions**
   - `SELECT permission FROM group_permissions WHERE group_id = tier_id`

3. **Overrides**
   - `SELECT permission, override_type FROM permission_overrides WHERE employee_id = $1`
   - `grant` → add to set
   - `revoke` → remove from set

4. **Wildcard check**
   - If effective set contains `'*'`, all permissions are granted.

### Difference Between the Two

| Aspect | `requirePermission` (middleware) | `resolvePermissions` (auth route) |
|--------|----------------------------------|-----------------------------------|
| Entry point | Reads `partners.tier_id` directly | Reads `employee_permissions` table |
| Fallback if no tier | 403 | Empty permissions array |
| Returns | Next() or 403 | `{ groupId, groupName, effectivePermissions, locations }` |
| Locations | Not checked | Read from `employee_location_scope` |

> **Critical risk:** If `partners.tier_id` and `employee_permissions.group_id` drift (e.g., one updated, the other not), the user will see different permissions after login vs. on guarded routes.

## 3. Location Scoping

Location scoping is **only** returned during login (`/api/Auth/login`) and `/api/Auth/me`.

- Query `employee_location_scope` joined to `companies`.
- Return array of `{ id, name }` objects.

### Frontend behavior
- `AuthContext` dispatches `tgclinic:auth-change` with the locations array.
- `LocationContext` receives it:
  - If exactly 1 location → auto-lock `selectedLocationId` to that location and hide the dropdown.
  - If 0 or >1 locations → default to `'all'` and show the dropdown with allowed locations.

> **Risk:** An empty `locations` array in the auth payload currently means "show all locations" in the UI (because `useLocations` falls back to `allApiLocations`). This could be a security gap if the intent was "show none."

## 4. Permission Strings in Practice

### Frontend route guards (`App.tsx`)
`ProtectedRoute` checks `hasPermission(ROUTE_PERMISSIONS[path])`.

### Nav sidebar guards (`Layout.tsx`)
`isNavItemVisible` checks `hasPermission(NAV_PERMISSION[item.path])`.

### Inline action guards
Components like `CustomerProfile`, `Customers.tsx`, and `PermissionGroupConfig` call `hasPermission('customers.edit')`, `hasPermission('customers.add')`, etc. to show/hide buttons.

## 5. Change Checklist for Auth Logic

- [ ] Update `api/src/middleware/auth.js` if effective-permission algorithm changes
- [ ] Update `api/src/routes/auth.js` `resolvePermissions` to match exactly
- [ ] Update `website/src/contexts/AuthContext.tsx` if payload shape changes
- [ ] Update `website/src/constants/index.ts` `ROUTE_PERMISSIONS` if new pages added
- [ ] Update `website/src/components/Layout.tsx` `NAV_PERMISSION` if new nav items added
- [ ] Run `website/e2e/permissions-check.spec.ts` and related tests
