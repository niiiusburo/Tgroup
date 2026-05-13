# TGroup Clinic — Ownership & Edit Allowlists

> Who may edit what. Roles are task scopes, not permanent people. A task should declare the owned role before editing.

## Role Definitions

| Role | Owns | Must Read |
|---|---|---|
| **Architecture** | Root authority docs, product-map shape, module boundaries | `ARCHITECTURE.md`, `DECISIONS.md`, product-map |
| **Product/Behavior** | User behavior, accepted product rules, copy semantics | `BEHAVIOR.md`, `IDEA.md`, domain YAML |
| **Design** | Visual system, layout, interaction polish | `DESIGN.md`, `website/design.md`, `BEHAVIOR.md` |
| **Frontend** | React routes, components, hooks, API clients, i18n | `website/agents.md`, `website/design.md`, affected domain YAML |
| **Backend** | Express routes, middleware, services, API behavior | `ARCHITECTURE.md`, affected domain YAML, schema-map |
| **Data/Money** | Schema, migrations, imports, payments, deposits | `docs/runbooks/MONEY_FLOW.md`, schema-map, payment domain |
| **Infra/Release** | Docker, nginx, env, deploy scripts, VPS verification | `docs/runbooks/DEPLOYMENT.md`, `docs/runbooks/INFRASTRUCTURE.md` |
| **QA/Verification** | Tests, browser checks, release proof | `docs/runbooks/VERIFICATION.md`, affected domain YAML |

## File/Directory Ownership Matrix

### Root Authority Docs (Restricted)

| File | Owner | Edit Rule |
|---|---|---|
| `AGENTS.md` | Architecture | Any agent may propose edits via PR; Architecture role approves. |
| `ARCHITECTURE.md` | Architecture | Same as above. |
| `DESIGN.md` | Design + Architecture | Design proposes; Architecture approves structural implications. |
| `BEHAVIOR.md` | Product/Behavior + Architecture | Product proposes; Architecture approves if API/contracts affected. |
| `DECISIONS.md` | Architecture | Append-only. New decisions added; superseded marked, never deleted. |
| `COORDINATION_REQUESTS.md` | All roles | Anyone may append a coordination row. |

### `/docs/` Stack (This Directory)

| File | Owner | Edit Rule |
|---|---|---|
| `GLOSSARY.md` | Architecture | Append terms; disambiguations require cross-check with domain owners. |
| `CONTRACTS.md` | Architecture + Backend + Frontend | Any contract change requires all three roles to sign off. |
| `DATA-MODEL.md` | Data/Money + Architecture | Schema changes must update this doc in the same commit. |
| `USE-CASES.md` | Product/Behavior | Append use cases; modify flows when product behavior changes. |
| `WORKFLOWS.md` | Architecture + Product/Behavior | Sequence diagrams must match both code and product truth. |
| `INVARIANTS.md` | Architecture | Append-only. New invariants added; superseded marked with ADR reference. |
| `DEPENDENCY-MAP.md` | Architecture | Update when module graph changes significantly. |
| `OWNERSHIP.md` | Architecture | Updates when new directories/modules are created. |
| `TEST-MATRIX.md` | QA/Verification | Update when tests are added, removed, or scope changes. |
| `RUNBOOK.md` | Infra/Release | Operational changes only. |
| `FAILURE-MODES.md` | Infra/Release + QA | Append war stories; never delete historical entries. |
| `OBSERVABILITY.md` | Infra/Release + Backend | Update when logging/metrics conventions change. |
| `SECURITY.md` | Architecture + Infra/Release | Security changes require both roles. |
| `CHANGELOG.md` | All roles | Everyone appends entries. No one rewrites history. |
| `MIGRATIONS.md` | Data/Money | Migration log; append only. |
| `ROADMAP.md` | Product/Behavior + Architecture | Phase planning; mark current phase clearly. |

### `/website/` Frontend

| Directory/File | Owner | Edit Rule |
|---|---|---|
| `website/src/pages/*.tsx` | Frontend | Pages compose behavior; do not embed durable business policy. |
| `website/src/components/**/*.tsx` | Frontend | Components do not call `fetch` directly. Use `lib/api/`. |
| `website/src/hooks/*.ts` | Frontend | Shared hooks must not contain hidden domain policy. |
| `website/src/contexts/*.tsx` | Frontend | Auth and Location contexts are high blast radius; flag changes. |
| `website/src/lib/api/*.ts` | Frontend | API client modules; must stay aligned with backend routes. |
| `website/src/lib/api/core.ts` | Frontend + Architecture | Edit requires Architecture review (single bridge). |
| `website/src/constants/index.ts` | Frontend | Permission/route changes require backend alignment. |
| `website/src/types/*.ts` | Frontend + Backend (shared) | Must match `contracts/` and backend SQL shapes. |
| `website/src/i18n/*.json` | Frontend + Product/Behavior | Both EN and VI keys required for new text. |
| `website/e2e/*.spec.ts` | QA/Verification | E2E tests; may touch any domain. |
| `website/src/**/*.test.*` | QA/Verification | Unit/component tests. |
| `website/package.json` | Frontend + Infra/Release | Version bump required for runtime changes. |
| `website/agents.md` | Frontend | Frontend build/component rules. |
| `website/design.md` | Design | Detailed visual tokens. |

### `/api/` Backend

| Directory/File | Owner | Edit Rule |
|---|---|---|
| `api/src/server.js` | Backend + Architecture | Route registration; high blast radius. |
| `api/src/db.js` | Data/Money + Architecture | Shared pool; any change affects all routes. |
| `api/src/middleware/*.js` | Backend + Architecture | Auth middleware is critical infrastructure. |
| `api/src/routes/*.js` | Backend | Route handlers; new complex behavior → extract to service. |
| `api/src/services/*.js` | Backend | Shared business logic. |
| `api/src/domains/*/` | Backend | Enterprise clean-architecture routes. Preferred for new features. |
| `api/migrations/*.sql` | Data/Money | Manual migrations; must be idempotent (`IF NOT EXISTS`). |
| `api/tests/*.test.js` | QA/Verification + Backend | API tests. |
| `api/package.json` | Backend + Infra/Release | Dependency changes. |

### `/contracts/` Shared

| File | Owner | Edit Rule |
|---|---|---|
| `contracts/*.ts` | Architecture + Backend + Frontend | All three roles must agree on shape changes. |
| `contracts/package.json` | Architecture | Build config. |

### `/scripts/` and Infra

| File | Owner | Edit Rule |
|---|---|---|
| `scripts/deploy-tbot.sh` | Infra/Release | Must pass `bash -n` before commit. |
| `docker-compose.yml` | Infra/Release | Service changes require local smoke test. |
| `nginx.conf`, `nginx.docker.conf` | Infra/Release | Keep both files aligned. |
| `Dockerfile.api`, `Dockerfile.web` | Infra/Release | Build changes. |
| `.env.example` | Infra/Release | Env shape documentation. |

### `/product-map/`

| File | Owner | Edit Rule |
|---|---|---|
| `product-map/domains/*.yaml` | Domain owner (see AGENTS.md §5) | Mandatory read before code changes. |
| `product-map/schema-map.md` | Data/Money + Architecture | Update when schema changes. |
| `product-map/contracts/dependency-rules.yaml` | Architecture | Change-type checklists. |
| `product-map/unknowns.md` | Architecture + Product/Behavior | Anyone may append unknowns. Do not guess. |
| `product-map/test-matrix.md` | QA/Verification | Test coverage map. |

## Forbidden Patterns (Ownership Violations)

1. **Frontend role editing `api/src/db.js` or migration SQL** without Data/Money or Architecture review.
2. **Backend role editing `website/design.md`** without Design review.
3. **Infra role editing `contracts/*.ts`** without Architecture + Frontend + Backend alignment.
4. **Any role editing root authority docs** (`AGENTS.md`, `ARCHITECTURE.md`) without Architecture approval.
5. **Any role rewriting `CHANGELOG.md`, `INVARIANTS.md`, or `FAILURE-MODES.md`** instead of appending.

## Coordination Escalation

If two roles need to edit the same file simultaneously:

1. Both parties read `COORDINATION_REQUESTS.md`.
2. Append a coordination row describing the conflict.
3. Agree on merge order or split the file into smaller modules.
4. If unresolved within one session, escalate to Architecture role.
