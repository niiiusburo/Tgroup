# Authentication / RBAC / Permissions — Reference Library

> For TGClinic's JWT auth, permission groups, effective permissions, location/LOB scope, and React auth context.

## 1. Repositories Downloaded

| # | Folder | Repository | License | Why It Matters |
|---|---|---|---|---|
| 1 | `jwt-refresh-token-node-js` | [bezkoder/jwt-refresh-token-node-js](https://github.com/bezkoder/jwt-refresh-token-node-js) | MIT | JWT access + refresh token flow with DB-tracked refresh tokens and expiry. |
| 2 | `express-rbac` | [SarahAbuirmeileh/Express-RBAC](https://github.com/SarahAbuirmeileh/Express-RBAC) | MIT | Express + TypeORM RBAC with User↔Role↔Permission entities and `authorize(api)` middleware. |
| 3 | `casl` | [stalniy/casl](https://github.com/stalniy/casl) | MIT | Isomorphic permission engine with `Ability.can()`, React `<Can>` component, permission caching patterns. |
| 4 | `multi-tenant-rbac` | [morka17/multi-tenant-user-role-base-app](https://github.com/morka17/multi-tenant-user-role-base-app) | MIT | Fastify + Drizzle + PostgreSQL multi-tenant RBAC with `applicationId`-scoped roles/permissions. |
| 5 | `react-router-permissions` | [TheSoftwareHouse/react-router-permissions](https://github.com/TheSoftwareHouse/react-router-permissions) | MIT | React Router permission-based routing with `PermissionsProvider` + `AuthorizedRoute` + `useAuthorize`. |
| 6 | `react-router-role-authorization` | [burczu/react-router-role-authorization](https://github.com/burczu/react-router-role-authorization) | MIT | React Router role-based guards (legacy class-component pattern). |

## 2. Specific Patterns to Adopt

### 2.1 JWT Verify + Permission Middleware
**From:** `jwt-refresh-token-node-js/app/middleware/authJwt.js` + `express-rbac/middlewares/auth/authorize.ts`

```js
// JWT verify
function verifyToken(req, res, next) {
  const token = req.headers["x-access-token"] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(403).send({ message: "No token provided!" });
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) return res.status(401).send({ message: "Unauthorized!" });
    req.userId = decoded.id;
    next();
  });
}

// RBAC authorize
function authorize(api) {
  return async (req, res, next) => {
    const user = await User.findOne({
      where: { id: req.userId },
      relations: ["roles", "roles.permissions"]
    });
    const permissions = user.roles.flatMap(r => r.permissions);
    if (permissions.some(p => p.name === api)) return next();
    res.status(403).send("No permission");
  };
}
```

**TGClinic adaptation:**
- `api/src/middleware/auth.js` already verifies JWT and resolves permissions.
- Keep the existing promise cache in `permissionService.js` (5s TTL) instead of re-querying per request.
- Add `requireAnyPermission([...])` factory for composite gates.

### 2.2 Refresh Token Rotation
**From:** `jwt-refresh-token-node-js/app/controllers/auth.controller.js`

```js
exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;
  const refreshToken = await RefreshToken.findOne({ where: { token: requestToken } });
  if (!refreshToken) return res.status(403).json({ message: "Refresh token not in database" });
  if (RefreshToken.verifyExpiration(refreshToken)) {
    await RefreshToken.destroy({ where: { id: refreshToken.id } });
    return res.status(403).json({ message: "Refresh token expired" });
  }
  const user = await refreshToken.getUser();
  const newAccessToken = jwt.sign({ id: user.id }, config.secret, { expiresIn: config.jwtExpiration });
  return res.json({ accessToken: newAccessToken, refreshToken: refreshToken.token });
};
```

**TGClinic adaptation:**
- Current TGClinic uses a single long-lived JWT (24h / 30d).
- Adopt short access tokens (15m) + DB-tracked refresh tokens with rotation.
- Extend `partners` auth model with a `refresh_tokens` table (`id`, `partner_id`, `token_hash`, `expires_at`, `revoked_at`, `device_hash`).

### 2.3 CASL Ability Engine
**From:** `casl/packages/casl-ability/src/Ability.ts`

```ts
class Ability {
  can(action: string, subject?: Subject, field?: string): boolean;
  cannot(action: string, subject?: Subject, field?: string): boolean;
}
```

**TGClinic adaptation:**
- TGClinic uses `effectivePermissions: string[]` + `hasPermission(permission)`.
- CASL is best adopted incrementally:
  - Use `<Can permission="payment.view">` React wrapper (ported from `casl-react/src/Can.ts`).
  - For complex conditional permissions (e.g., edit own payment), use `can('edit', 'Payment', { createdBy: user.id })`.
- Do not replace the existing simple permission system wholesale.

### 2.4 Multi-Tenant / Scope-Based Access
**From:** `multi-tenant-rbac/src/db/schema.ts`

```ts
export const users = pgTable('users', {
  email: varchar("email", { length: 256 }).notNull(),
  applicationId: uuid("applicationId").references(() => application.id),
}, (users) => ({
  cpk: primaryKey(users.email, users.applicationId),
}));

export const roles = pgTable('roles', {
  name: varchar("name", { length: 256 }).notNull(),
  applicationId: uuid("applicationId").references(() => application.id),
  permissions: text("permissions").array(),
}, (roles) => ({
  cpk: primaryKey(roles.name, roles.applicationId),
}));
```

**TGClinic adaptation:**
- TGClinic's multi-tenancy is clinic-location based (`LocationContext`) + LOB based (`BusinessUnitContext`).
- Ensure location-scoped queries always include `company_id` / `location_id` filters.
- `requireLobScope(lob)` already provides LOB hard-gating.

### 2.5 React Permission Provider
**From:** `react-router-permissions/src/hooks/useAuthorize.js`

```js
export const useAuthorize = (requires, authorizationStrategy) => {
  const { permissions, authorizationStrategy: defaultStrategy } = usePermissions();
  return authorizationStrategy
    ? authorizationStrategy(permissions, requires)
    : defaultStrategy(permissions, requires);
};
```

**TGClinic adaptation:**
- Add `<Can permission="...">` component that consumes `AuthContext` and uses `hasPermission()`.
- Replace inline `hasPermission('payment.view')` checks in JSX with declarative `<Can>` wrappers.

## 3. Hardening Recommendations for TGClinic

1. **Refresh token rotation** — Short access tokens + DB-tracked refresh tokens.
2. **Permission cache versioning** — Add `permissionsVersion` to `partners`; invalidate cache immediately on permission edits.
3. **Token revocation** — Add `revoked_tokens` table with `jti` claim; check on every `requireAuth`.
4. **Device fingerprinting** — Store device hash on refresh tokens; reject mismatched devices.
5. **httpOnly cookies for refresh tokens** — Move refresh token out of localStorage to mitigate XSS.
6. **Add `<Can>` component** — Declarative permission checks in React.

## 4. Key Files to Study

- `jwt-refresh-token-node-js/app/middleware/authJwt.js`
- `jwt-refresh-token-node-js/app/controllers/auth.controller.js`
- `jwt-refresh-token-node-js/app/models/refreshToken.model.js`
- `express-rbac/middlewares/auth/authorize.ts`
- `express-rbac/db/entities/{User,Role,Permission}.ts`
- `casl/packages/casl-ability/src/Ability.ts`
- `casl/packages/casl-react/src/Can.ts`
- `casl/packages/casl-react/src/hooks/useAbility.ts`
- `multi-tenant-rbac/src/db/schema.ts`
- `multi-tenant-rbac/src/modules/users/users.services.ts`
- `multi-tenant-rbac/src/utils/server.ts`
- `react-router-permissions/src/hooks/useAuthorize.js`
- `react-router-permissions/src/authorized-route/authorized-route.js`

## 5. TGClinic ↔ Reference Mapping

| TGClinic File | Reference Pattern | Study File |
|---|---|---|
| `api/src/middleware/auth.js` | JWT verify + permission middleware | `jwt-refresh-token-node-js/app/middleware/authJwt.js` |
| `api/src/routes/auth.js` | Login / refresh / me | `jwt-refresh-token-node-js/app/controllers/auth.controller.js` |
| `api/src/services/permissionService.js` | Permission resolution + caching | CASL cookbook + `multi-tenant-rbac/src/modules/users/users.services.ts` |
| `website/src/contexts/AuthContext.tsx` | React auth context + hooks | `react-router-permissions/src/permissions-provider/...` |
| `website/src/contexts/LocationContext.tsx` | Multi-tenant scope filtering | `multi-tenant-rbac/src/db/schema.ts` |

## 6. License & Caveats

- All downloaded repos are MIT-licensed and safe for study and pattern reuse.
- `express-rbac` re-queries DB per request — TGClinic should keep its cached `permissionService.js` approach.
- `react-router-role-authorization` is legacy class-component based — port only the `rolesMatched()` logic.
- CASL is powerful but adds abstraction; adopt incrementally.
