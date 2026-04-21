# PRODUCT_MAP_AUDIT.md

> Audit date: 2026-04-18
> Worktree: core-pillars-infra

---

## 1. What's Working

### schema-map.md
- **Core entities are well-documented**: `companies`, `partners`, `appointments`, `products`, `productcategories`, `saleorders`, `saleorderlines`, `payments`, `monthlyplans` + items/installments, `dotkhams` + `dotkhamsteps`.
- **Permission entities are covered**: `permission_groups`, `group_permissions`, `employee_permissions`, `permission_overrides`, `employee_location_scope`.
- **Config/meta entities are covered**: `systempreferences`, `company_bank_settings`, `websitepages`, `feedback_threads/messages/attachments`.
- **Blast radius summary is accurate**: The table at the bottom correctly maps schema changes to downstream files.
- **Risk ratings are realistic**: `partners` and `payments` are flagged Critical; `appointments` and `products` are High.

### system-map.md
- **Architecture diagram is current**: Matches the Docker Compose setup (nginx → web → api → postgres).
- **Sub-module breakdowns are accurate**: Frontend and backend sub-module tables list the correct paths and responsibilities.
- **High-blast-radius modules are correctly identified**: `db.js`, `auth.js` middleware, `api/core.ts`, `AuthContext.tsx`, `LocationContext.tsx`, `constants/index.ts`, `dbo.partners`.
- **Risky coupling areas are real issues**: Permission resolution duplication, camelCase↔snakeCase translation passthrough, frontend routing mismatch (`/website` vs CMS), dead backend route (`services.js`), E2E port coupling.
- **Stale/duplicate/legacy file list is useful**: Includes `services.js`, `web.jsx.backup`, `api/scripts/archive/`, `website/src/data/` mocks.

### unknowns.md
- **Gaps are real and should not be guessed**: 13 documented unknowns covering migrations, permission registry, dead code intent, e-invoice integration, external checkups, payment allocation edge cases, report accuracy, version caching, E2E auth state, mock file usage, commission module data flow, and duplicated constants.

### Domain YAMLs (product-map/domains/)
- **10 domain files exist and are structured**: `appointments-calendar`, `auth`, `customers-partners`, `employees-hr`, `feedback-cms`, `integrations`, `payments-deposits`, `reports-analytics`, `services-catalog`, `settings-system`.
- **Each domain declares**: `owns`, `reads`, `writes`, `tables`, `endpoints`, `ui_surfaces`, `jobs`, `shared_types`, `dependencies`, `affected_by`, `impact_tests`, `risk_level`.

### Contracts (product-map/contracts/)
- **dependency-rules.yaml**: Comprehensive rule set for 8 change types (schema, shared-dto, api-endpoint, permission, ui-design-system, job-worker, deployment-config, i18n, shared-hook) with `must_update`, `should_review`, and `blast_radius_map`.
- **permission-registry.yaml**: Canonical mapping of permission strings to routes, frontend route guards, and nav guards. Claims 21 backend strings, 15 frontend route guards, 13 nav guards.

### change-checklist.md
- Exists and provides per-change-type checklists.

### test-matrix.md
- Exists and maps test coverage to domains.

---

## 2. What's Stale

### schema-map.md vs api/migrations/
- **Missing tables added by recent migrations**:
  - `dbo.ip_access_control` (migration `037_ip_access_control.sql`) — no entry in schema-map.
  - `dbo.version_events` (migration `037_version_events.sql`) — no entry in schema-map.
  - `dbo.accountinvoices` (migration `038_add_accountinvoices_table.sql`) — no entry in schema-map.
- **Stale column references**: `feedback_messages_drop_content_check.sql` (020) removed a constraint; schema-map does not note this evolution.
- **Missing migration 027, 029**: The migration sequence jumps from 026 → 028 → 030. Migrations 027 and 029 are missing from the directory (possibly deleted or never created), which is a red flag for audit trails.

### permission-registry.yaml
- **May under-count**: `reports.js` uses `requirePermission()` 15 times alone, but the registry claims 21 total backend strings. Need spot-check to confirm all unique strings are enumerated.
- **`ipAccess.js` not represented**: The IP access control feature (7 `requirePermission` calls) is not mapped in the permission registry.

### system-map.md
- **E2E port coupling note**: Unified to `5175` across all configs. `playwright.config.ts` and all e2e specs use `5175`.
- **Dead code list is accurate but not actionable**: No deprecation tickets or scheduled removal dates are attached.

### unknowns.md
- **Some unknowns are partially answerable now**:
  - Unknown #1 (ORM/migrations): There is no ORM; migrations are raw SQL files in `api/migrations/`. There is no migration runner in `package.json` scripts.
  - Unknown #10 (Playwright auth state): `playwright.config.ts` likely uses serial workers for auth setup, but this is still unverified.

---

## 3. What's Missing

1. **No FEATURES.md or feature→files map at root level**: `features.json` exists but is a project plan (steps, status, progress) not a reverse index from business feature to exact files. This is required for agent onboarding.
2. **No migration runner or schema diff tool**: Migrations are raw SQL with no Knex/node-pg-migrate/Prisma runner. Fresh environments rely on `website/demo_tdental_updated.sql` which is a snapshot, not an incremental migration chain.
3. **No backend CI coverage**: CI (`ci.yml`) only checks frontend lint, typecheck, build, and E2E. The backend (`api/`) has zero automated checks in CI: no lint, no typecheck (it's JS, not TS), no unit test run, no depcheck.
4. **No dependency-cruiser config**: No module boundary enforcement. Any file can import any other file. The `product-map/contracts/dependency-rules.yaml` exists as documentation but is not enforced by tooling.
5. **No Zod or runtime validation**: The backend is plain Express + `pg` with no request body validation library. The frontend uses TypeScript but has no runtime schema validation for API responses.
6. **No worktree/branch safety protocol for parallel agents**: Multiple agents could work on the same branch or worktree simultaneously with no lock file or merge protocol.
7. **No `depcheck` or unused-dependency scan**: Neither `website/` nor `api/` has dependency auditing.
8. **Missing schema-map entries for recent tables**: `ip_access_control`, `version_events`, `accountinvoices` need schema-map entries.
