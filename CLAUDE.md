# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

TGroup is a clinic-management dashboard. The repo is a three-package workspace glued together by file-protocol deps:

- `website/` — Vite + React 18 + TypeScript SPA (`@tgclinic/website`), Tailwind, React Router, i18next. Lazy-loads pages from `website/src/pages/` and composes them from `website/src/components/` (shared, modules, domain folders).
- `api/` — Node 20 + Express 5 + Postgres (`pg`) backend (`tgclinic-api`). Entry `api/src/server.js`; routes in `api/src/routes/*.js`; JWT auth via `api/src/middleware/auth.js`; IP access enforcement via `api/src/middleware/ipAccess.js`; SQL migrations in `api/migrations/`.
- `contracts/` — Zod schemas (`@tgroup/contracts`, published via `file:../contracts`) shared by both packages. MUST stay dependency-free beyond `zod` + `typescript`.

Other first-class directories: `product-map/` (domain/schema governance), `scripts/` (e2e + version + deploy helpers), `notes/` (Obsidian brain), `.claude/CONTEXT/` (on-demand context docs), `blueprint/`, `hermes/`, `tools/`.

## Session Start

1. Read `.claude/memory.md` for the latest shared context (synced from `claude-mem`).
2. Load the relevant domain YAML from `product-map/domains/<domain>.yaml` before touching feature code (see **Product-Map Governance** below).
3. If the task intersects an entry in `product-map/unknowns.md`, stop and ask — do not guess.
4. Optional: skim the matching note under `notes/` (Architecture, Features Status, Deployment Guide, Database Schema).

## Common Commands

### Frontend (`cd website`)
```bash
npm run dev              # Vite on port 5175 (strictPort), host=true
npm run build            # Runs generate-version → tsc → vite build
npm run build:prod       # Production mode build
npm run lint             # eslint --ext ts,tsx (max-warnings 99)
npx tsc --noEmit         # Typecheck only
npm test                 # Vitest run
npm run test:watch       # Vitest watch
npx vitest run path/to/file.test.ts   # Single unit test
```

### Backend (`cd api`)
```bash
npm start                # node src/server.js (uses api/.env, binds :3002)
npm test                 # jest tests/
npx jest tests/faceRecognition.test.js   # Single backend test
```

### E2E (Playwright, run from `website/`)
```bash
../scripts/dev-e2e.sh          # Boot DB (55433) + API (3002) + Vite (5174)
../scripts/dev-e2e.sh stop     # Tear down
../scripts/dev-e2e.sh status   # Show running pieces
npm run test:e2e               # Boot + run full suite
npx playwright test e2e/<spec>.spec.ts   # Single spec (needs dev-e2e.sh running)
npx playwright test --ui       # UI mode
```
Playwright runs serially (`workers: 1`) with an `auth-setup` project that logs in once and caches cookies in `.auth/admin.json`.

### Architecture Checks (run from repo root)
```bash
npx depcruise --output-type err website/src   # Enforce layer rules
node scripts/bump-version.mjs patch "Highlight" # Bump + prepend CHANGELOG entry
bash scripts/sync-claude-mem.sh                # Refresh .claude/memory.md
```

## Architecture — What Requires Reading Multiple Files

### Contract-First Shape Flow
Zod schemas in `contracts/` are the single source of truth for `Partner`, `Appointment`, `Payment`. Backend validates `req.body` against them via `api/src/middleware/validate.js` before DB writes; frontend imports the same schemas and should validate responses inside `website/src/lib/api/`. Changing a schema changes both sides — never define parallel types in `website/src/types/` for contracted entities.

### Frontend Layering (enforced by `.dependency-cruiser.js`)
- `website/src/components/shared/` — reusable, prop-driven; may NOT import from `pages/` or any domain folder (`customer`, `payment`, `appointments`, …) and MUST NOT fetch data internally. Exported via `shared/index.ts`.
- `website/src/components/modules/` — page-specific composites; still prop-driven.
- `website/src/hooks/` and `website/src/contexts/` — may NOT import from `pages/`.
- `website/src/lib/api/` — network layer; may NOT import from `components/`.
- `contracts/` — MUST NOT import from `website/` or `api/`.
- Circular deps are banned.

### Global Location Filter
`website/src/contexts/LocationContext.tsx` drives the "All Locations" dropdown shared across Overview, Customers, Calendar, Appointments, Employees, Services, Payment. Pages read the selected location from context and pass it into hooks (`useOverviewData`, `useCalendarData`, …). Never fetch location lists inside a page component — use `LocationProvider`.

### Backend Route Wiring
All routes are required at the top of `api/src/server.js` and mounted under `/api/*`. `requireAuth` wraps protected routes; `enforceIpAccess` gates by allow-list (see `api/migrations/037_ip_access_control.sql`). Frontend reaches them through `website/src/lib/api/core.ts` — watch `CAMEL_CASE_PASSTHROUGH` when adding query params.

### Two Postgres Instances
- **Homebrew native** on `127.0.0.1:5433` → what the local `node src/server.js` API uses (via `api/.env`).
- **Docker** on `127.0.0.1:55433` → `tgroup-db` container, used by `docker-compose.yml` and `scripts/dev-e2e.sh`. Different data.

Only one process can bind `:3002` at a time. If a local fix "should work" but doesn't, run `lsof -i :3002` and `docker ps` — stale `tgroup-api` or `tgroup-web` containers are the usual culprit. `docker stop tgroup-api` / `docker stop tgroup-web` before retesting locally.

### Auto-Update / Versioning
`website/vite.config.ts` injects `__APP_VERSION__` / `__APP_GIT_COMMIT__` at build time and writes `dist/version.json`. The running app polls `version.json` and prompts users to refresh on mismatch. Any frontend change requires a version bump — see **Release Notes** below.

## Release Notes (MANDATORY)

Every frontend version bump or deploy MUST:

1. Prepend a new entry to `website/public/CHANGELOG.json` with keys `version`, `date` (YYYY-MM-DD), `commit` (short SHA), `highlights`, and `sections: [{ title, items[] }]` (titles like "New Features", "Bug Fixes", "Removed", "Testing").
2. Bump `version` in `website/package.json` (semver: patch = fix, minor = feature, major = breaking).
3. The `VersionDisplay` tooltip in dev exposes a "Release Notes" link that reads `/CHANGELOG.json`.

Prefer `node scripts/bump-version.mjs <patch|minor|major|x.y.z> "Highlight"` — it edits both files atomically.

## Verification Rule (MANDATORY)

Before declaring a frontend / auth / API / CORS / env-var / deploy fix complete, perform the affected user action end-to-end in a real browser via Playwright MCP or computer-use. `curl` / OPTIONS probes / server logs are NOT sufficient proof.

Minimum check for auth/API/deploy changes:
1. Navigate to `http://127.0.0.1:5175` (not `localhost:5175` — Docker may still bind `::1:5175` with a stale bundle).
2. Log in with `tg@clinic.vn` / `123456` (the only admin account; do not use older emails).
3. Wait for the dashboard to render.
4. Capture a screenshot as evidence.
5. Check the browser console for JS errors.

## Product-Map Governance (MANDATORY)

Before editing feature code:
1. Read `product-map/domains/<domain>.yaml` for the affected domain.
2. Read `product-map/schema-map.md` for table blast radius.
3. Read `product-map/contracts/dependency-rules.yaml` for the change-type checklist.
4. Check `product-map/unknowns.md` — stop and ask if the task intersects one.
5. For multi-domain changes, spawn parallel sub-agents per domain file and merge.

If you find drift between the product-map and the code, update the relevant `product-map/` artifact alongside your code change. `product-map/change-checklist.md` lists the required steps for schema, API, permission, and UI changes.

## Agent Safety Protocol

See `AGENT_SAFETY_PROTOCOL.md`. Summary:
- Create `.agent-lock` (yaml with `agent_id`, `affected_domains`, `branch`, `worktree`) before starting. If one exists and domains overlap, stop and report the conflict.
- Use ephemeral branches off `ai-develop`: `ai-develop-feat/<domain>-<seq>`.
- Never edit `main` or `ai-develop` directly — always work in a worktree or ephemeral branch.
- No agent merges its own branch. The orchestrator verifies CI, product-map updates, and deploy-script lint (`bash -n scripts/deploy-tbot.sh`) before fast-forwarding to `ai-develop`.
- Run `bash scripts/sync-claude-mem.sh` after finishing.

## Module Size Rule

No source file should exceed ~500 lines or ~10,000 characters. Before editing a file, check its length; if at or above the limit, extract sub-components/hooks/utilities into new files and use barrel exports (`index.ts`) rather than adding more code. Exempt: auto-generated API clients, translation JSON, static data.

## `@crossref` Comments

Components carry `@crossref:used-in[...]` / `@crossref:uses[...]` annotations that track where they're consumed. When moving or renaming a component, update the annotations on both sides.

## Environment Config

Vite priority: `.env.{mode}.local` > `.env.{mode}` > `.env.local` > `.env`.

| File | Purpose | Committed |
|------|---------|-----------|
| `website/.env` | Shared keys (e.g., Google Places API key) | Yes |
| `website/.env.development` | Local: `VITE_API_URL=http://localhost:3002/api` | Yes |
| `website/.env.production` | Build: `VITE_API_URL=/api` (nginx proxies) | Yes |
| `website/.env.local` | Personal overrides | No (gitignored) |

Never hardcode VPS IPs in committed env files — override through the `VITE_API_URL` build arg in `docker-compose.yml`. Root `.env.example` documents required server-side vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET` (>=32 hex chars), `GOOGLE_PLACES_API_KEY`, `COMPREFACE_URL`, `COMPREFACE_API_KEY`.

## Local-First Rule

All changes MUST be made and verified locally before touching the VPS. Fix → test → validate locally; only deploy once verified. Never modify VPS files directly before confirming the fix works locally.

## GitHub / CI

- Repo: `niiiusburo/Tgroup`, default development branch `ai-develop`.
- `.github/workflows/ci.yml` runs frontend lint + typecheck + build + Playwright E2E on push/PR to `main`, `master`, `ai-develop`.
- `ai-code-review.yml` posts an AI review on each PR; `pr-checks.yml` and `release-tag.yml` handle gating and release tags.
- Husky is installed at repo root (`package.json` `prepare: husky`) — commit hooks live in `.husky/`.

## code-review-graph MCP

This repo has a knowledge graph. Prefer graph tools over Grep/Glob/Read for exploration — they're cheaper and carry structural context (callers, dependents, tests).

| Tool | Use when |
|------|----------|
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `query_graph` | Tracing callers_of / callees_of / imports_of / tests_for |
| `get_impact_radius` | Blast radius of a change |
| `get_affected_flows` | Which execution paths a change touches |
| `detect_changes` + `get_review_context` | Code review (token-efficient) |
| `get_architecture_overview` + `list_communities` | High-level structure |
| `refactor_tool` | Rename planning, dead code |

The graph auto-updates via hooks. Fall back to Grep/Glob/Read only when the graph doesn't cover your need.

## Extended Context (load on demand, not auto-loaded)

- `.claude/CONTEXT/project-map.md` — full directory tree
- `.claude/CONTEXT/database.md` — two Postgres instances, demo data, 19-doctor roster, locations, migrations, restore commands
- `.claude/CONTEXT/version-system.md` — version bump mandate, build process, auto-update flow
- `.claude/CONTEXT/layout-lock.md` — `⚠️ LAYOUT LOCK` convention
- `.claude/CONTEXT/modular-card-scrolling.md` — independent card scrolling pattern + migration TODO
- `.claude/CONTEXT/feature-status.md` — real DB vs mock
- `.claude/CONTEXT/mcp-code-review-graph.md` — when to prefer graph tools
- `.claude/CONTEXT/reference-sites.md` — legacy/local/VPS URLs, full API endpoint table

Obsidian notes to consult for deep context: `notes/📋 TGroup Project Overview.md`, `notes/🏗️ Architecture.md`, `notes/📊 Features Status.md`, `notes/🚀 Deployment Guide.md`, `notes/💾 Database Schema.md`, `notes/🗓️ YYYY-MM-DD.md` (daily log).
