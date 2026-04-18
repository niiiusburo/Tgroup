# GAPS.md

> The 5 biggest gaps between the current codebase and the 4-pillar target state.
> Audit date: 2026-04-18

---

## Pillar Definitions

| # | Pillar | Meaning |
|---|--------|---------|
| 1 | **Product-Map Governance** | Schema, domain, and contract documentation are accurate, complete, and drift-free. |
| 2 | **Type Safety & Runtime Validation** | TypeScript + Zod enforce contracts at compile time and runtime. |
| 3 | **Dependency & Module Boundaries** | Tooling enforces architectural layer rules; no circular imports or cross-layer leaks. |
| 4 | **CI/CD Safety & Parallel Agent Protocol** | Every code change passes automated gates (lint, typecheck, test, depcheck) before merge. Parallel agents cannot collide. |

---

## Gap 1: Backend Has Zero Automated Safety Gates (Pillar 4)

**Severity:** Critical

**Evidence:**
- `ci.yml` runs frontend lint, typecheck, build, and E2E. It does **not** run any backend checks.
- `api/package.json` has no `lint` script. The backend is plain JavaScript (not TypeScript), so there is no typecheck possible without migration.
- `api/tests/` contains only **one** test file: `faceRecognition.test.js`. It is not executed in CI.
- `api/package.json` has `"test": "jest tests/"` but CI never invokes it.
- There is no `depcheck` or `npm audit` for backend dependencies.

**Impact:**
- 39 Express route modules can be merged with no automated verification.
- Recent production breakages (`password_hash` NOT NULL constraint, missing column defaults) would not have been caught by CI.
- Permission string typos, SQL injection risks, and logic errors are unguarded.

**Target state:**
- Backend lint (ESLint) runs in CI.
- Backend unit tests run in CI and block merge on failure.
- Backend dependency audit runs in CI.

---

## Gap 2: No Runtime Validation / Zod in Main Packages (Pillar 2)

**Severity:** Critical

**Evidence:**
- Zod is **not** in `website/package.json` dependencies or devDependencies.
- Zod is **not** in `api/package.json`.
- The only `package.json` containing Zod is `frontend-truth/app/package.json` (a separate blueprint artifact, not the production app).
- Backend routes parse `req.body` directly into SQL queries with no shape validation. Example: `api/src/routes/partners.js` inserts `req.body` fields into `dbo.partners` without checking required fields.
- Frontend hooks trust API response shapes. `ApiPartner` mixes read aliases (`city`) with write columns (`cityname`), but no runtime guard catches a server response that omits expected keys.

**Impact:**
- Schema changes (e.g., adding a NOT NULL column) break INSERT paths silently until runtime.
- API contract mismatches between frontend and backend are only discovered during manual testing or in production.
- `unknowns.md` explicitly documents payment allocation edge cases and report accuracy concerns that validation could mitigate.

**Target state:**
- Every POST/PUT/PATCH body in `api/src/routes/` is validated by Zod before touching the database.
- Every `apiFetch` call in `website/src/lib/api/` validates the response shape against a Zod schema.
- Shared Zod schemas live in a `shared/` or `contracts/` directory and are imported by both frontend and backend.

---

## Gap 3: Module Boundaries Are Documentation-Only (Pillar 3)

**Severity:** High

**Evidence:**
- `product-map/contracts/dependency-rules.yaml` exists and is excellent documentation, but **nothing enforces it**.
- No `.dependency-cruiser.js` config exists anywhere in the repo.
- `dependency-cruiser` is not installed in any `package.json`.
- Frontend shared components (`website/src/components/shared/`) currently have no tooling guard against importing page-level or domain-specific components.
- Backend routes (`api/src/routes/`) can import each other freely; the `dependency-rules.yaml` flags this as a risk, but the build does not.

**Impact:**
- High-blast-radius files (`api/src/db.js`, `website/src/lib/api/core.ts`) can be imported by anything with no warning.
- Refactors that move files often break imports in unexpected places because there is no architectural layer contract enforced by the build.
- Circular dependencies are only discovered via manual code review or runtime errors.

**Target state:**
- `dependency-cruiser` runs in CI and fails the build on layer violations.
- The blast-radius map in `dependency-rules.yaml` is synchronized with the actual `depcruise` config.

---

## Gap 4: Schema-Map Drift from Latest Migrations (Pillar 1)

**Severity:** High

**Evidence:**
- `api/migrations/` contains 40+ SQL files, with the latest being:
  - `037_ip_access_control.sql`
  - `037_version_events.sql`
  - `038_add_accountinvoices_table.sql`
- `product-map/schema-map.md` has **zero mentions** of:
  - `ip_access_control`
  - `version_events`
  - `accountinvoices`
- Migration numbers 027 and 029 are missing from the sequence (026 → 028 → 030), indicating possible deleted or skipped migrations with no audit trail.
- `schema-map.md` does not document the `ipAccess.js` route (7 `requirePermission` calls) or its middleware.

**Impact:**
- Agents following the "Product-Map Governance Rule" in `AGENTS.md` will not know these tables exist, leading to incomplete blast-radius analysis.
- Schema changes to `accountinvoices` or `version_events` will not trigger the required downstream updates because they are not in the map.

**Target state:**
- Every table created by a migration in `api/migrations/` has a corresponding entry in `schema-map.md`.
- A CI script diffs migration filenames against `schema-map.md` and fails if new tables are undocumented.

---

## Gap 5: No Parallel Agent Safety Protocol (Pillar 4)

**Severity:** High

**Evidence:**
- `AGENTS.md` dispatches agents to `ai-develop` branch with no branch isolation strategy.
- `AGENT_1_DISPATCHED` zero-byte file exists in the worktree root, but there is no lock semantics or conflict resolution.
- No `.agent-lock` or worktree lock file convention exists.
- Multiple agents could edit the same high-blast-radius file (e.g., `api/src/routes/partners.js`, `website/src/constants/index.ts`) simultaneously.
- No ephemeral branch naming convention exists for agent work.

**Impact:**
- Merge conflicts on `ai-develop` are likely when two agents touch overlapping domains.
- Race conditions on shared resources (e.g., `website/package.json` version bump, `CHANGELOG.json`) can cause CI version-bump checks to fail.
- The `pre-commit` hook relies on `origin/main` for version comparison; in a worktree with multiple agents, this reference may be stale or incorrect.

**Target state:**
- `.agent-lock` YAML convention is adopted and enforced by the orchestrator.
- Agents create ephemeral branches (`ai-develop-feat/<domain>-<seq>`) instead of pushing directly to `ai-develop`.
- An orchestrator merges branches only after CI passes and domain YAMLs are verified.
- `scripts/sync-claude-mem.sh` is run after every agent session to keep shared memory current.

---

## Honorable Mentions (Not in Top 5)

| Gap | Pillar | Why not top 5 |
|-----|--------|---------------|
| E2E tests use `continue-on-error: true` | 4 | Easy fix; just remove the flag. |
| Pre-commit hook does not run lint/typecheck | 4 | Easy fix; hook logic is already in place. |
| `website/src/data/` mock files may be stale | 1 | Documented in `unknowns.md` and `stale-mock-report.md`; lower blast radius. |
| Commission module has no auto-calculation trigger | 1 | Documented in `unknowns.md`; feature is not in active use. |
| `services.js` dead route still mounted | 1 | Documented in `system-map.md`; low runtime risk. |
