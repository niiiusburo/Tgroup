# ARCHITECTURE.md

> Structural authority for TGClinic / TGroup. This file governs repo shape,
> dependency direction, source-of-truth boundaries, and high-risk change rules.

## 1. Source Of Truth

The root authority stack is:

1. `AGENTS.md` for workflow, ownership, coordination, reporting, and escalation.
2. `ARCHITECTURE.md` for repo structure, dependency direction, domain boundaries, and forbidden patterns.
3. `DESIGN.md` for visual system routing and design constraints.
4. `BEHAVIOR.md` for user interaction, forms, errors, loading, permissions, and UX contracts.
5. `DECISIONS.md` for accepted project decisions and historical rationale.
6. `product-map/` for domain ownership, schema blast radius, API contracts, permissions, and unknowns.
7. `docs/runbooks/` for operational playbooks.

Supporting material:

- `notes/` is project history and operational reference. It does not override the root authority stack.
- `.claude/memory.md` is shared session memory. It is useful context, not policy.
- `IDEA.md` is a non-authority inbox. Ideas must be promoted into authority docs before implementation.

When docs conflict, use the most specific current authority file. For schema, API, permission, and UI dependency rules, `product-map/contracts/dependency-rules.yaml` is mandatory.

## 1.1 TestSprite Task Ledger For Features

Every structural feature, feature addition, backend data-flow change, or user-facing feature edit must update the project-root `testbright.md` in the same change. The entry must name the feature/edit, list changed URLs or API routes, affected data flows, user roles, happy paths, edge cases, regressions, and setup/login data.

`testbright.md` is the executable TestSprite task ledger, not a passive note file. When TestSprite is run, agents must read `testbright.md`, convert the relevant entry into checklist work, execute the listed checks, and mark each executed item as `PASS` or `FAIL` with short evidence. Testing expectations must not live only in chat summaries.

## 2. Current System Shape

TGClinic is a local-first clinic operations dashboard with a React frontend, Express API, PostgreSQL database, Docker/VPS deployment, and optional external integrations.

```text
Tgrouptest/
  website/                 # React 18 + Vite 5 frontend
  api/                     # Express 5 API, commonjs, raw pg queries
  contracts/               # Zod/shared contracts package
  scripts/                 # Deploy, E2E orchestration, migration helpers
  product-map/             # Domain, schema, contract, and unknowns map
  notes/                   # Obsidian/reference docs
  docs/runbooks/           # Operational authority
```

Runtime topology:

```text
browser -> nginx/web container -> /api proxy -> Express API -> PostgreSQL dbo schema
                                      |
                                      +-> optional Compreface / Hosoonline integrations
```

## 3. Accepted Stack

Frontend:

- React 18, Vite 5, TypeScript 5, Tailwind 3.
- React Router DOM 6.
- React Context and hooks for app state.
- Zod for validation where contracts/forms need runtime checks.
- react-i18next with English and Vietnamese locale namespaces.
- Vitest, React Testing Library, and Playwright for verification.

Backend:

- Node.js, Express 5, CommonJS.
- PostgreSQL through `pg` and `api/src/db.js`.
- JWT authentication and route-level permission middleware.
- `@tgroup/contracts` for shared contract work where used.
- Jest, Supertest, and targeted scripts for API verification.

Infrastructure:

- Docker Compose for local and VPS runtime.
- Nginx for TLS/static hosting/API proxy.
- PostgreSQL 16 using `dbo` schema.
- Optional Compreface containers for face recognition.
- Hosoonline as an external health-checkup image integration.

## 4. Layer Direction

Imports and data flow should move from user-facing composition toward lower-level contracts and runtime utilities.

```text
Layer 5: Pages, routes, app entry points
Layer 4: Domain UI and route handlers
Layer 3: Hooks, contexts, middleware, focused services
Layer 2: API clients, adapters, db access, shared utilities
Layer 1: Contracts, types, schema maps, constants, product-map rules
Layer 0: Runtime platform and third-party libraries
```

Rules:

- Pages compose behavior; they should not own durable business policy.
- Components do not call `fetch` directly. Use `website/src/lib/api/` clients or hooks that wrap them.
- Backend route files may contain SQL today, but new complex behavior should be extracted into focused helpers/services before route files grow further.
- Shared utilities must not contain hidden domain policy.
- Repeated product concepts must be centralized at the smallest correct boundary before more call sites are added.

## 5. Domain Boundaries

Root domain files live in `product-map/domains/` and are mandatory before code changes.

Core domains:

- `auth`: JWT auth, effective permissions, groups, overrides, location scope.
- `customers-partners`: customer records, partner table use, profile surfaces, face registration.
- `appointments-calendar`: appointments, calendar views, date/time behavior.
- `services-catalog`: `dbo.products` service catalog and service selection.
- `payments-deposits`: payments, deposits, residuals, allocations, receipts.
- `employees-hr`: employees, roles, schedule visibility, staff assignment.
- `settings-system`: system preferences, role/permission UI, operational settings.
- `feedback-cms`: website/content feedback and uploaded evidence.
- `reports-analytics`: report aggregation, exports, analytics surfaces.
- `integrations`: Compreface, Hosoonline, and any external vendor boundary.

If a change touches multiple domains, treat it as orchestrated work. Each domain owner must verify its product-map file and blast radius.

## 6. High-Blast-Radius Areas

Treat these as shared infrastructure:

- `api/src/db.js`: shared PostgreSQL pool.
- `api/src/middleware/auth.js`: protected route auth and permission checks.
- `api/src/routes/auth.js`: login/me permission resolution.
- `website/src/lib/api/core.ts`: all frontend API calls and query conversion.
- `website/src/contexts/AuthContext.tsx`: auth state and session lifecycle.
- `website/src/contexts/LocationContext.tsx`: location filtering across list views.
- `website/src/constants/index.ts`: routes, permission mapping, status/options.
- `dbo.partners`: customers and employees share this table.
- `dbo.products`: user-facing service catalog is stored in products.
- `dbo.saleorders`, `dbo.saleorderlines`, `dbo.accountpayments`, `dbo.payments`: service and money flows.

Before editing any of these, read `product-map/schema-map.md`, the affected domain YAML, and `product-map/contracts/dependency-rules.yaml`.

## 7. Legacy And Unknowns

Some code is intentionally preserved until usage is proven:

- Legacy account/session routes must not be deleted without checking `product-map/unknowns.md`.
- Mock data in `website/src/data/` may mask API failures; remove only after import search and tests.
- TDental migration scripts and archived data are reconstruction tools, not runtime truth.
- Generated artifacts, local env files, build output, screenshots, and browser logs must stay out of source control.

Unknowns are not implementation freedom. If a task intersects `product-map/unknowns.md`, stop and clarify or add a coordination request.
