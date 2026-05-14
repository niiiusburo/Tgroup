# Permission Domain Repair — Design Spec

**Date:** 2026-05-14  
**Status:** Approved (8 decision cards confirmed)  
**Scope:** Central registry parity, matrix truth, route-guard alignment, backend resolver cleanup, tests, and e2e verification.  
**Affected domains:** Auth & Permissions, Services, Payments, External Checkups, Reports, Customers.

---

## 1. Background

Five parallel teams (product/docs, backend, frontend, QA/tests, independent checker) audited the permission domain and found **registry drift**: docs, backend guards, frontend matrix, tests, and product rules no longer agree on which permission strings exist or which gates they protect.

Key gaps:
- `/api/Permissions/resolve/:employeeId` duplicates the resolver instead of using `permissionService.js`.
- Permission matrix generates strings from labels, showing fake/missing permissions in `MatrixView.tsx`.
- `/services` is wrongly gated by `customers.edit` in `constants/index.ts`.
- Hosoonline patient creation says `external_checkups.create` in docs/UI, but backend checks upload permission.
- Payment patch/proof is split between `payment.add` in code and `payment.edit` in docs/registry.
- `SaleOrders`, `reports.export`, and `IpAccess` are missing or incomplete in the canonical registry.
- Remember Me docs promise 60d, but API signs only 24h.
- Tests do not enforce registry parity, so drift can recur.

---

## 2. Approved Decisions (from 8 decision cards)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `/services` gated by `services.view` / `services.edit` | Key must match the room. `customers.edit` is semantically wrong. |
| 2 | SaleOrders/treatment writes stay under `customers.edit` **only** if treatments are customer-record edits; otherwise introduce `saleorders.edit` | Treatments are currently customer-record edits in the data model, so keep `customers.edit` for now. A future split to `saleorders.edit` can be promoted via a separate change request. |
| 3 | Hosoonline patient creation requires `external_checkups.create`; upload requires `external_checkups.upload` | Two separate doors. Docs and code must agree. |
| 4 | Payment proof upload uses `payment.add`; record patch uses `payment.edit` | Adding a file ≠ mutating a record. Registry and docs must match. |
| 5 | Permission Board shows **only** real registry-backed permissions | Matrix rows must be a direct mirror of the canonical registry. No label-derived fake strings. |
| 6 | Empty `employee_location_scope` means **primary branch only** | Least surprising default. Safer than "all branches." |
| 7 | Block or require strong confirmation before an admin removes their own `permissions.edit` | Safety cover on the master key. Prevents accidental self-lockout. |
| 8 | Remember Me token lifetime = **60 days** | UI already promises 60d. Backend must keep the promise. |

---

## 3. Goals

1. **Single source of truth:** One canonical permission registry file drives backend guards, frontend matrix, route guards, nav guards, and tests.
2. **No label-derived permissions:** The matrix reads from the registry, not from human-readable labels.
3. **Aligned route guards:** Frontend route constants, nav sidebar, and backend middleware all cite the same strings.
4. **Resolver consolidation:** `/api/Permissions/resolve/:employeeId` delegates to `permissionService.js`, not a duplicate inline resolver.
5. **Drift detection:** A test fails if a new permission string is used in code but not registered.
6. **Remember Me parity:** Login checkbox promise matches JWT expiry.

---

## 4. Non-Goals

- Introducing entirely new permission concepts (e.g., `saleorders.edit`, `ipaccess.view`) beyond what is already implied by existing code or docs. These are **noted for follow-up** but out of scope here.
- Refactoring the entire auth middleware architecture.
- Changing the tier/override data model.

---

## 5. Architecture

### 5.1 Canonical Registry

The existing `product-map/contracts/permission-registry.yaml` is the **single source of truth**. During build/test time, a generator script (`website/scripts/generate-permission-enum.ts`) parses the YAML and emits:

- `website/src/types/generated/permissions.ts` — TypeScript string-literal union.
- `api/src/constants/permissions.js` — JS array of all backend permission strings.

All consumers import from these generated files. Hand-typed permission strings outside the generated files are treated as lint errors (enforced by a custom ESLint rule or a simple grep-based CI check).

### 5.2 Registry Parity Test

A new test file (`api/tests/permissionRegistryParity.test.js`) scans:
- Backend `requirePermission(...)` calls.
- Frontend `hasPermission(...)`, `ProtectedRoute`, and nav guard usage.
- `permission-registry.yaml` entries.

It fails if any string appears in code but not in the YAML, or vice versa, with an auto-generated diff.

### 5.3 Backend Resolver Consolidation

`api/src/routes/permissions.js` route `GET /api/Permissions/resolve/:employeeId` currently inlines its own resolver. It will be changed to:

```js
const { resolveEffectivePermissions } = require('../services/permissionService');
// ...
router.get('/resolve/:employeeId', requirePermission('permissions.view'), async (req, res) => {
  const result = await resolveEffectivePermissions(req.params.employeeId);
  res.json(result);
});
```

`permissionService.js` already resolves tiers, groups, overrides, and location scopes. The inline duplicate is removed.

### 5.4 Frontend Matrix Source

`MatrixView.tsx` (and related permission-board components) will import the generated permission enum. Matrix rows are rendered by iterating the enum categories (inferred from string prefixes: `appointments.*`, `customers.*`, `services.*`, etc.) rather than deriving keys from i18n labels.

i18n descriptions remain for human-readable labels, but they are **lookups keyed by the real permission string**, not the source of the string.

### 5.5 Route Guard Alignment

`website/src/constants/index.ts` (or wherever `ROUTE_PERMISSIONS` lives) is updated:
- `/services` → `services.view`
- `/service-catalog` → `services.view`

Nav sidebar `NAV_PERMISSION` mapping is verified against the same registry.

### 5.6 Backend Gate Fixes

- `POST /api/ExternalCheckups/:customerCode/patient` → require `external_checkups.create`
- `POST /api/ExternalCheckups/:customerCode/health-checkups` → require `external_checkups.upload`
- `PATCH /api/Payments/:id` → require `payment.edit`
- `POST /api/Payments/:id/proof` → require `payment.add`
- `POST /api/Exports/:type/preview` and `/download` → map each `type` to the correct export permission string (`appointments.export`, `customers.export`, `payments.export`, `products.export`, `services.export`)

### 5.7 Self-Lockout Guard

On `PUT /api/Permissions/employees/:employeeId` and `PUT /api/Permissions/groups/:groupId`, if the target employee matches the requesting admin **and** the change would revoke `permissions.edit`, the backend returns:

```json
{ "error": "SELF_LOCKOUT_RISK", "message": "Removing your own permission-management access requires explicit confirmation." }
```

The frontend shows a confirmation modal. If the user confirms, the frontend sends `?confirm=true` and the backend permits the change.

### 5.8 Remember Me Token Lifetime

In `api/src/routes/auth.js` (or the JWT signing helper):
- When `rememberMe: true` is present in the login payload, sign the access token with `expiresIn: '60d'` instead of the default `24h`.
- The refresh token lifetime already matches the access token; ensure both are 60d.

---

## 6. Data Flow

```
permission-registry.yaml
        │
        ├────► generate-permission-enum.ts
        │            │
        │            ├────► website/src/types/generated/permissions.ts
        │            └────► api/src/constants/permissions.js
        │
        ├────► api/tests/permissionRegistryParity.test.js  (validate alignment)
        │
        ├────► backend requirePermission() guards
        │
        ├────► frontend MatrixView.tsx rows
        │
        ├────► frontend ROUTE_PERMISSIONS / NAV_PERMISSION
        │
        └────► i18n permission description keys
```

---

## 7. Components & File Changes

### Backend

| File | Change |
|------|--------|
| `api/src/services/permissionService.js` | Export `resolveEffectivePermissions`; ensure it handles wildcard `*`, empty location scope → primary branch, and override logic. |
| `api/src/routes/permissions.js` | Replace inline resolver on `/resolve/:employeeId` with call to `permissionService.resolveEffectivePermissions`. |
| `api/src/routes/externalCheckups.js` | Update `patient` route guard to `external_checkups.create`; `health-checkups` guard to `external_checkups.upload`. |
| `api/src/routes/payments.js` | Ensure `PATCH /:id` uses `payment.edit`; `POST /:id/proof` uses `payment.add`. |
| `api/src/routes/exports.js` | Map each export type to its correct permission string via a lookup table derived from the registry. |
| `api/src/routes/auth.js` | Sign JWT with 60d expiry when `rememberMe` is true. |
| `api/src/constants/permissions.js` | Replace hand-maintained list with generated file (or import from generated output). |
| `api/tests/permissionRegistryParity.test.js` | **New.** Scans code and YAML; fails on drift. |

### Frontend

| File | Change |
|------|--------|
| `website/src/types/generated/permissions.ts` | **New.** Generated enum from YAML. |
| `website/src/types/permissions.ts` | Re-export from generated file; add any runtime helper types. |
| `website/src/components/permissions/MatrixView.tsx` | Iterate generated permission categories instead of label-derived strings. |
| `website/src/components/permissions/PermissionBoard.tsx` | Add self-lockout confirmation modal before sending admin self-revoke. |
| `website/src/constants/index.ts` (or `ROUTE_PERMISSIONS`) | `/services` → `services.view`; `/service-catalog` → `services.view`. |
| `website/src/components/layout/Layout.tsx` | Verify `NAV_PERMISSION` entries match generated registry. |
| `website/src/contexts/AuthContext.tsx` | Ensure `rememberMe` flag is persisted and sent on login. |
| `website/src/pages/Login.tsx` | Ensure `rememberMe` checkbox sends the flag. |
| `website/scripts/generate-permission-enum.ts` | **New.** Reads YAML, emits TS and JS constants. |

### Product / Docs

| File | Change |
|------|--------|
| `product-map/contracts/permission-registry.yaml` | Update to reflect all confirmed decisions; add `payment.void`, `external_checkups.create`, `external_checkups.upload`, and missing export mappings. |
| `docs/CHANGELOG.md` | Append entry for permission-domain repair. |

---

## 8. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Employee with `tier_id = null` | Return `[]` effective permissions with a `warning: 'NO_TIER_ASSIGNED'` flag. UI shows a banner prompting admin to assign a tier. |
| Empty `employee_location_scope` | Resolver returns primary branch (`partners.companyid`) only. |
| Wildcard `*` user | Resolver returns all permission strings + wildcard flag. Matrix shows all rows as enabled without enumerating every string individually. |
| Self-lockout attempt | Backend rejects with `SELF_LOCKOUT_RISK`. Frontend shows confirmation modal. If confirmed, retry with `?confirm=true`. |
| Failed permission PUT | UI keeps previous state, shows toast error. No optimistic state corruption. |
| Registry parity test fails in CI | Build is blocked. Developer must run `npm run generate:permissions` and commit updated files, or add the missing string to YAML. |

---

## 9. Testing Strategy

### Unit / Integration

- `api/tests/permissionRegistryParity.test.js` — fails on drift between YAML and code.
- `api/tests/permissionResolve.test.js` — asserts wildcard, empty scope, primary branch, overrides.
- `api/tests/selfLockout.test.js` — asserts block and confirmation bypass.
- `api/tests/authTokenLifetime.test.js` — asserts 60d expiry when `rememberMe` is true.

### E2E (Playwright)

- `website/e2e/permissions-matrix.spec.ts` — matrix rows match registry; no fake strings.
- `website/e2e/permissions-self-lockout.spec.ts` — admin tries to revoke own `permissions.edit`, sees confirmation.
- `website/e2e/services-route-guard.spec.ts` — `/services` accessible with `services.view`, not blocked by `customers.edit`.
- `website/e2e/external-checkups-gate.spec.ts` — patient create vs upload require separate permissions.
- `website/e2e/payment-gate.spec.ts` — proof upload vs patch require separate permissions.
- `website/e2e/remember-me.spec.ts` — token cookie expiry is 60 days.

### Regression

- Existing permissions-check, permissions-tooltips, and auth-setup specs must still pass.
- All guarded routes must still show 403 for unauthorized users and redirect to login for 401.

---

## 10. Rollback Plan

1. Revert the commit containing this change.
2. If the generated constants cause build issues, fallback to the previous hand-maintained files.
3. The YAML itself is additive-only for this repair; no strings are removed, only corrected/mapped.

---

## 11. Checklist

- [ ] `permission-registry.yaml` updated with confirmed decisions.
- [ ] `generate-permission-enum.ts` script created and wired into build.
- [ ] Backend resolver consolidated into `permissionService.js`.
- [ ] Backend route guards aligned (`services`, `external_checkups`, `payments`, `exports`).
- [ ] Frontend matrix reads from generated enum.
- [ ] Frontend route/nav guards aligned.
- [ ] Self-lockout confirmation implemented.
- [ ] Remember Me 60d token lifetime implemented.
- [ ] Registry parity test created and passing.
- [ ] E2E tests added for new behavior.
- [ ] `docs/CHANGELOG.md` updated.
- [ ] `website/package.json` version bumped (minor).

---

*Design approved by user on 2026-05-14 after review of 8 decision cards.*
