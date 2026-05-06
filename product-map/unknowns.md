# TGroup Unknowns

> Things that are unclear from code inspection and should not be guessed.

## 1. Database Ownership & Migrations

- **Unknown:** Is there an ORM or migration runner (e.g., Knex, Sequelize, node-pg-migrate) or are schema changes applied via raw SQL scripts only?
  - Evidence: `api/src/db.js` uses raw `pg` queries. No `migrations/` folder found at repo root.
  - One-off scripts exist in `scripts/` and `api/scripts/archive/`.
- **Unknown:** What is the source of truth for the production schema? The `.sql` file mounted in `docker-compose.yml` (`website/demo_tdental_updated.sql`) suggests a snapshot-based approach, but its freshness is unverified.

## 2. Permission String Registry

- **Unknown:** Is there a canonical list of all permission strings (e.g., `customers.view`, `appointments.edit`) stored anywhere other than scattered across `ROUTE_PERMISSIONS`, route middleware calls, and the database?
  - Evidence: `ROUTE_PERMISSIONS` in `App.tsx` maps routes to strings. Backend uses `requirePermission('...')` inline. No central enum or registry file exists.
- **Risk:** Adding a new permission feature requires manually keeping frontend route guards, backend middleware, and DB seed data in sync.

## 3. `services.js` Dead Code Intent

- **Unknown:** Is `api/src/routes/services.js` intentionally kept for a future `public.services` table migration, or is it safe to delete?
  - Evidence: File contains a large comment declaring it dead, but it is still mounted in `api/src/server.js` at `/api/Services`.
- **Unknown:** Are there any external clients (mobile apps, third-party integrations) hitting `/api/Services`?

## 4. Account Routes Legacy Status

- **Unknown:** Is `api/src/routes/account.js` used by anything other than potential legacy clients?
  - Evidence: It defines `/api/Account/Login` and `/api/Account/Logout`. The frontend uses `/api/Auth/login`.
- **Unknown:** Does the `Web/Session` path (`api/src/routes/session.js`) serve an active integration or is it obsolete?

## 5. E-Invoice Integration (`isbusinessinvoice`)

- **Unknown:** What downstream system consumes the e-invoice fields (`unitname`, `unitaddress`, `taxcode`, `personalname`, `personalidentitycard`, `personaltaxcode`, `personaladdress`) on `dbo.partners`?
  - Evidence: These fields appear in `AddCustomerForm` and `ApiPartner` but no API route or external webhook references them.

## 6. External Checkups (Hosoonline)

- **Resolved for current image reads:** When `HOSOONLINE_USERNAME` and `HOSOONLINE_PASSWORD` are configured, TGClinic logs in through `POST /api/auth/login`, searches records through `GET /api/appointments/search?q=<customerCode>&page=<page>`, and reads image bytes from `GET /api/appointments/image/:imageName`.
- **Resolved for v2 patient management:** Hosoonline API-key patient create/search uses `POST /api/patients/_create` and `GET /api/patients/_search`; TGClinic avoids bare `/api/patients` so Caddy keeps staff UI patient search routed to v1.
- **Resolved for legacy fallback:** If login credentials are absent, TGClinic still falls back to the older `HOSOONLINE_API_KEY` / `X-API-Key` contract for patient health-checkup endpoints where upstream still supports it.
- **Unknown:** Whether upload should now create/update appointment media instead of posting to the older `/api/patients/:code/health-checkups` endpoint.

## 7. Payment Allocation Logic Edge Cases

- **Unknown:** How does the backend handle over-allocation when a payment amount exceeds the sum of outstanding invoice residuals?
  - Evidence: `api/src/routes/payments.js` has allocation logic, but the invariant comments and actual SQL are dense and not fully verified.
- **Unknown:** Are `deposit_type` values (`deposit`, `refund`, `usage`) fully enumerated and enforced at the DB level?

## 8. Report Aggregation Accuracy

- **Unknown:** Several report endpoints in `api/src/routes/reports.js` perform complex SQL aggregations. Are these results validated against the legacy Odoo reports or financial audits?
  - Evidence: No dedicated report-accuracy unit tests exist in the repo.

## 9. Version Check & Force Update

- **Unknown:** Is `version.json` served from the production domain expected to be cache-busted by nginx or by query params?
  - Evidence: `useVersionCheck` polls `version.json`; nginx config sets long cache headers for static assets, but `version.json` is not explicitly excluded from caching.

## 10. Playwright E2E Auth State

- **Unknown:** Are E2E tests expected to run serially (shared `.auth/admin.json`) or can they run in parallel safely?
  - Evidence: `auth-setup.spec.ts` writes to `.auth/admin.json`; many specs likely reuse it, but no `playwright.config.ts` fully describes the worker strategy.

## 11. `website/src/data/` Mock Files

- **Unknown:** Which components still fall back to `website/src/data/` mocks when the API is unavailable?
  - Evidence: Many mock files exist (`mockCustomers.ts`, `mockAppointments.ts`, etc.) but grep results are needed to confirm active imports.

## 12. Commission Module Data Flow

- **Unknown:** The commission module has backend routes and a frontend page, but where is the auto-calculation trigger?
  - Evidence: `api/src/routes/commissions.js` reads `commissions` and `commissionhistories`, but no job or trigger script is visible in the repo that populates these tables.

## 13. Duplicated Constants / i18n Keys

- **Unknown:** Are `APPOINTMENT_STATUS_LABELS_VI` (deprecated) and `APPOINTMENT_STATUS_I18N_KEYS` both still referenced in production code?
  - Evidence: `APPOINTMENT_STATUS_LABELS_VI` is marked `@deprecated` but may still be imported in untested components.
