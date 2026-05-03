---
name: testing-auth-permissions
description: Test Tgroup auth, permission hydration, location scope, and protected route access end-to-end in the browser.
---

# Testing Auth & Permissions

Use this skill when verifying login, permission resolution, location scoping, route guards, or auth/API changes in the Tgroup website.

## Devin Secrets Needed

- None for local browser testing. The admin test account is documented in `CLAUDE.md`; reference that file instead of duplicating credentials here.

## Local Environment

- Start the local E2E stack from repo root when needed:
  ```bash
  POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres JWT_SECRET=tdental-secret-key-2024 ./scripts/dev-e2e.sh start
  ```
- Frontend URL for browser testing: `http://127.0.0.1:5175`
- API URL: `http://127.0.0.1:3002/api`
- Docker Postgres is commonly exposed on `127.0.0.1:55433` as container `tgroup-db`.
- Use `127.0.0.1`, not `localhost`, for browser verification because stale containers or IPv6 binding can otherwise mask the code under test.

## Pre-Test Checks

1. Confirm the frontend, API, and DB ports are listening:
   ```bash
   ss -ltnp '( sport = :3002 or sport = :5175 or sport = :55433 )'
   docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
   ```
2. Confirm PR CI is green before runtime testing.
3. Read the relevant code path before planning:
   - Login UI: `website/src/pages/Login.tsx`
   - Auth state: `website/src/contexts/AuthContext.tsx`
   - Location state: `website/src/contexts/LocationContext.tsx`
   - Route permissions: `website/src/App.tsx`
   - Location dropdown: `website/src/components/shared/FilterByLocation.tsx`
   - Backend auth: `api/src/routes/auth.js`
   - Permission resolver: `api/src/services/permissionService.js`

## Browser Test Flow

Record the browser test when possible.

1. Start from `http://127.0.0.1:5175/login` with a fresh unauthenticated state.
2. Log in using the admin test account documented in `CLAUDE.md`.
3. Verify the dashboard loads and no red login error banner appears.
4. Expand the sidebar and verify the group label reads `Admin`.
5. Open the header location dropdown and verify it contains `All Locations` plus the expected clinic list.
6. Navigate directly to `http://127.0.0.1:5175/service-catalog`.
7. Verify the service catalog renders and `Access Denied` is not shown.
8. Check the browser console. Existing Vite/React Router/i18n warnings might appear; distinguish warnings from actual `error` entries.

## Reporting

- Post one PR comment with concise pass/fail assertions and the recording link.
- Include screenshots for: dashboard Admin state, location dropdown contents, and protected route access.
- Write and attach a `test-report.md` with inline screenshot links and any caveats.
