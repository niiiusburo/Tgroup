# Agent 3 Finish Check: Route / LOB Safety

Date: 2026-05-19
Worktree: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`
Scope: read-only audit of backend/frontend LOB gating safety. Production code was not modified.

## Authority Gate

- Required command attempted: `bash scripts/prompt-authority-check.sh`
- Result: `FAIL` because `scripts/prompt-authority-check.sh` does not exist in this worktree. Nearby authority scripts include `scripts/verify-docs.sh` and `scripts/sync-claude-mem.sh`.

## Documents Read

- `AGENTS.md`
- `ARCHITECTURE.md`
- `BEHAVIOR.md`
- `.claude/memory.md`
- `product-map/domains/business-unit.yaml`
- `product-map/domains/cosmetic.yaml`
- `product-map/domains/ctv.yaml`
- `product-map/domains/earnings-commissions.yaml`
- `product-map/schema-map.md`
- `product-map/contracts/permission-registry.yaml`

## Verdict

Not route-safe for finish/merge. Cosmetic mirror routes have a mostly correct hard gate on `/api/cosmetic/*`, but the current server still permits cross-LOB dental API access for cosmetic-scoped users, exposes CTV APIs through unguarded mounts, and does not protect the frontend `/ctv` route with an auth/CTV-only guard.

## Blockers

### P0 - Legacy dental APIs are not hard-gated by `lob_scope` / `dental.access`

Authority says `lob_scope` is the hard gate, `dental.access` / `cosmetic.access` are soft gates, and LOB isolation tests must prove cosmetic-scoped users cannot call dental routes. The current server mounts all legacy dental routes directly after global `requireAuth`, with no `requireLobScope('dental')` and no `requirePermission('dental.access')`.

Evidence:

- `api/src/server.js:215-219` applies only global auth to `/api`.
- `api/src/server.js:226-249` mounts legacy dental routes such as `/api/Partners`, `/api/Appointments`, `/api/Employees`, `/api/Products`, `/api/Payments` without a dental LOB hard gate.
- `api/src/middleware/auth.js:66-89` defines `requireLobScope(lob)`, but it is only used on cosmetic routes in `api/src/server.js:336-342` and `api/src/server.js:381`.
- `product-map/domains/business-unit.yaml` and `product-map/domains/cosmetic.yaml` require `lob_scope` to be the hard gate and list LOB isolation as an impact test.

Impact: a cosmetic-only employee who has standard route permissions could call dental legacy APIs directly and read/write dental DB data because those routes default to the dental pool.

### P0 - `/api/ctv` is mounted without CTV permission or `is_ctv` checks

The CTV route file only calls `requireAuth` inside handlers. It does not enforce `is_ctv`, `ctv.dashboard.view`, `ctv.commission.view.self`, or `ctv.referrals.view.self` internally. The server mounts that route in unguarded paths before and after the intended permission-gated mount.

Evidence:

- `api/src/server.js:240` mounts `app.use('/api/Ctv', require('./routes/ctv'))` with no `requirePermission`. Express routing is case-insensitive by default in this app, so this can match `/api/ctv` before the later gated mount.
- `api/src/server.js:344` mounts `/api/ctv` with `requirePermission('ctv.dashboard.view')`, but this is preceded by the unguarded mount at line 240.
- `api/src/server.js:431` mounts `app.use('/api/ctv', ctvRoutes)` again with no permission gate.
- `api/src/routes/ctv.js:37`, `api/src/routes/ctv.js:131`, and `api/src/routes/ctv.js:200` use only `requireAuth` or no extra gate in the route handlers.
- `api/src/routes/ctv.js:38-41` and `api/src/routes/ctv.js:132-134` trust `req.user.employeeId` as the CTV id without checking `req.user.is_ctv`.
- `product-map/domains/ctv.yaml` requires CTV users only and says CTVs are 403'd on admin routes while `/api/ctv/*` is self-only.

Impact: any authenticated user can reach `/api/ctv/*` through at least one unguarded mount. Admins are also granted `ctv.*` permissions by the seed script, so permission-only gating is insufficient unless `is_ctv` is enforced.

### P0 - `COSMETIC_LOB_ENABLED=false` does not reliably disable CTV APIs

Authority says the feature flag gates the entire surface. The first flag block adds a 503 handler for `/api/ctv` when disabled, but the later unconditional CTV mount reopens the same route.

Evidence:

- `api/src/server.js:334-350` defines `COSMETIC_ENABLED`; when false it mounts a disabled handler for `/api/ctv`.
- `api/src/server.js:430-431` later mounts `app.use('/api/ctv', ctvRoutes)` unconditionally.
- `product-map/domains/business-unit.yaml` says the feature flag gates the entire surface and cosmetic routes return 503 when disabled.
- `product-map/domains/cosmetic.yaml` says `COSMETIC_LOB_ENABLED` gates the entire surface until rollout.

Impact: flag-off verification can falsely pass cosmetic disablement while CTV data APIs remain reachable.

### P1 - Frontend `/ctv` is public/unprotected by route guard

The CTV page bypasses admin layout as intended, but it is not wrapped in an auth/CTV-only route guard. It renders the CTV shell for unauthenticated or non-CTV users and relies on API failures for protection.

Evidence:

- `website/src/App.tsx:160-161` registers `<Route path="/ctv" element={<CtvDashboard />} />` outside `ProtectedRoute`.
- `website/src/App.tsx:97-115` blocks CTV users from admin routes, but there is no equivalent guard that blocks non-CTV users from `/ctv`.
- `website/src/pages/CtvDashboard.tsx:18-30` consumes `useAuth()` but does not redirect unauthenticated or non-CTV users.
- `website/src/pages/CtvDashboard.tsx:30-54` loads CTV APIs immediately and treats failures as page errors.
- `product-map/contracts/permission-registry.yaml:252-258` lists `/ctv` under `ctv.dashboard.view`, but `App.tsx` does not enforce that route permission.

Impact: users can directly navigate to `/ctv`; if backend CTV gating is fixed, this becomes mostly a UX/defense-in-depth issue, but with the backend blocker above it exposes real CTV API access.

### P1 - CTV endpoint-level permissions are registered but not enforced per endpoint

The registry distinguishes `ctv.dashboard.view`, `ctv.commission.view.self`, and `ctv.referrals.view.self`, but route handlers do not enforce the narrower self permissions.

Evidence:

- `product-map/contracts/permission-registry.yaml:180-188` maps `ctv.commission.view.self` to `/api/ctv/commission-summary` and `ctv.referrals.view.self` to `/api/ctv/referrals`.
- `api/src/routes/ctv.js:37` does not require `ctv.commission.view.self`.
- `api/src/routes/ctv.js:131` does not require `ctv.referrals.view.self`.
- `api/src/routes/ctv.js:200` does not require `ctv.dashboard.view` or `is_ctv`.

Impact: the permission registry coverage exists on paper, but the backend route contract does not match it.

## Passing / Partial Findings

- `/api/cosmetic/*` has a correct second router-level gate sequence: `requireLobScope('cosmetic')`, `attachCosmeticDb`, `runWithLob`, and `requirePermission('cosmetic.access')` at `api/src/server.js:376-416`.
- `attachCosmeticDb` sets `req.lob`, `req.db`, and ALS context for bare `query()` calls at `api/src/middleware/lob.js:24-44`.
- `getDb`, `getQuery`, and dynamic `query()` support the two-pool model at `api/src/db/index.js:77-145`.
- Auth login and `/me` include `lob_scope` and `is_ctv` in the JWT/user payload at `api/src/routes/auth.js:72-99` and `api/src/routes/auth.js:132-145`.
- Non-admin LOB scope is reduced to a single visible scope in backend auth at `api/src/routes/auth.js:18-22`, `api/src/routes/auth.js:69`, and `api/src/routes/auth.js:132`.
- Header LOB selector visibility is admin + multi-scope only at `website/src/contexts/BusinessUnitContext.tsx:40-64`, `website/src/contexts/BusinessUnitContext.tsx:112`, and `website/src/components/Layout.tsx:436-446`.
- The current permission registry includes the 9 expected LOB/CTV/commission keys at `product-map/contracts/permission-registry.yaml:173-201`, and the seed script contains the same 9 admin keys at `api/scripts/seed-cosmetic-lob.js:239-252`.

## Required Fix Direction

1. Remove duplicate/uncontrolled CTV mounts and keep one `/api/ctv` mount behind feature flag, `requireAuth`, `is_ctv` hard gate, and the appropriate `ctv.*` permissions.
2. Add hard LOB enforcement for dental legacy routes, or introduce an explicit `/api/dental/*` gate while preventing cosmetic-only users from using legacy dental routes.
3. Wrap frontend `/ctv` in a CTV-only authenticated route guard that redirects unauthenticated users to login and non-CTV users to the admin dashboard or AccessDenied.
4. Re-run route-level API tests proving:
   - dental-only user gets `S_LOB_FORBIDDEN` on `/api/cosmetic/*`;
   - cosmetic-only user cannot call legacy dental APIs;
   - non-CTV authenticated user cannot call `/api/ctv/*`;
   - flag-off returns 503 for cosmetic and CTV surfaces.
