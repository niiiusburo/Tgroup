# TGroup Change Checklists

> Reusable checklists for safe, consistent changes across the full stack.

---

## Schema Changes

- [ ] Write migration script (if altering existing tables)
- [ ] Update `notes/💾 Database Schema.md` if columns/FKs change
- [ ] Update backend queries in affected route files (`api/src/routes/*.js`)
- [ ] Update frontend types in `website/src/types/*.ts`
- [ ] Update API client DTOs in `website/src/lib/api/*.ts`
- [ ] Check `CAMEL_CASE_PASSTHROUGH` in `website/src/lib/api/core.ts` if new query params added
- [ ] Add or update delete guards if FK relationships changed
- [ ] Verify `NOT NULL` constraints have defaults or are handled in all INSERT paths
- [ ] Run backend unit tests (`cd api && npm test`)
- [ ] Run frontend unit tests (`cd website && npm test`)
- [ ] Run E2E tests covering affected domains
- [ ] Update `product-map/schema-map.md` and relevant `product-map/domains/*.yaml`

---

## API Changes

- [ ] Update route handler in `api/src/routes/*.js`
- [ ] Update or add `requirePermission` guard if needed
- [ ] Update `api/src/server.js` mount path if new route introduced
- [ ] Update frontend API client in `website/src/lib/api/*.ts`
- [ ] Update frontend types / DTOs if response shape changes
- [ ] Update mock data in `website/src/data/` if still used (prefer removing stale mocks)
- [ ] Update `ROUTES` or `ROUTE_PERMISSIONS` in `website/src/constants/index.ts` if new page route added
- [ ] Add/update E2E test for the endpoint flow
- [ ] Document in `notes/🏗️ Architecture.md` if architectural
- [ ] Bump `website/package.json` version per version policy
- [ ] If Docker/nginx changes required, update `scripts/deploy-tbot.sh` and run `bash -n`

---

## Shared Type / DTO Changes

- [ ] Identify all consumers via grep / code-review-graph
- [ ] Update the canonical type definition in `website/src/types/*.ts`
- [ ] Update the API client in `website/src/lib/api/*.ts`
- [ ] Update backend route serialization if column names differ
- [ ] Update component props and hooks consuming the type
- [ ] Update test fixtures and mock data
- [ ] Check for stale barrel exports (`website/src/lib/api.ts`) that may re-export old shapes
- [ ] Verify no implicit `any` regressions (`cd website && npm run lint`)

---

## Permission / Auth Changes

- [ ] Update `api/src/middleware/auth.js` `requirePermission` logic if effective-permission algorithm changes
- [ ] Update `api/src/routes/auth.js` `resolvePermissions` to match middleware logic exactly
- [ ] Update `website/src/constants/index.ts` `ROUTE_PERMISSIONS` if new page guard added
- [ ] Update `website/src/contexts/AuthContext.tsx` if permission payload shape changes
- [ ] Update PermissionBoard UI components if new override types or scopes introduced
- [ ] Update Settings RoleConfig / PermissionGroupConfig if group fields change
- [ ] Run E2E permission tests (`website/e2e/permissions-*.spec.ts`)
- [ ] Update `product-map/domains/auth.yaml`

---

## UI Changes

- [ ] Identify all hooks reading the affected entity
- [ ] Update domain components in `website/src/components/<domain>/`
- [ ] Update shared components if design-system tokens change (`website/src/components/shared/`, `website/src/components/ui/`)
- [ ] Update `website/src/constants/index.ts` if colors, status options, or time slots change
- [ ] Update i18n keys in `website/src/i18n/locales/{en,vi}/` if labels change
- [ ] Check `DataTable` column definitions for type compatibility
- [ ] Add/update unit tests for components
- [ ] Add/update E2E tests for user flows
- [ ] Verify responsive behavior and Tailwind class changes

---

## Job / Worker / Script Changes

- [ ] Document the script purpose and schedule in `notes/🚀 Deployment Guide.md`
- [ ] Ensure the script uses the same DB connection config as the API (`api/src/db.js` pattern)
- [ ] Add idempotency checks (can be re-run safely)
- [ ] Log output to stdout for Docker log capture
- [ ] If scheduled, verify cron expression and timezone alignment
- [ ] Add script to `scripts/` (not inline in `api/src/routes/`)
- [ ] Update `docker-compose.yml` if new service or volume required
- [ ] Update `scripts/deploy-tbot.sh` if deployment steps change

---

## Deployment / Config Changes

- [ ] Update `.env.example` if new env vars introduced
- [ ] Update `docker-compose.yml` if services, ports, volumes, or env vars change
- [ ] Update `Dockerfile.api` or `Dockerfile.web` if build steps or copy paths change
- [ ] Update `nginx.conf` and `nginx.docker.conf` if routes or uploads paths change
- [ ] Update `scripts/deploy-tbot.sh` FIRST, then verify with `bash -n scripts/deploy-tbot.sh`
- [ ] Update `notes/🚀 Deployment Guide.md`
- [ ] Run a local Docker smoke test (`docker-compose up -d` & healthcheck)
- [ ] Ensure `api/src/server.js` `ALLOWED_ORIGINS` includes any new frontend hosts
