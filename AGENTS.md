# AGENTS.md

> Root orchestration authority for TGClinic / TGroup. This file governs how
> agents and humans coordinate work across frontend, backend, data, deployment,
> product-map governance, and reporting.

## 1. Authority Stack

Every non-trivial session starts by reading the relevant authority files:

1. `AGENTS.md` for workflow, ownership, coordination, reporting, and escalation.
2. `ARCHITECTURE.md` for repo structure, dependency direction, domain boundaries, and forbidden patterns.
3. `DESIGN.md` for visual design routing and system-level design constraints.
4. `BEHAVIOR.md` for interaction behavior, errors, disabled states, confirmations, and UX messaging.
5. `DECISIONS.md` for accepted durable decisions.
6. `product-map/` for domain maps, schema blast radius, dependency rules, permissions, tests, and unknowns.
7. `docs/runbooks/` for deployment, infrastructure, ports, verification, tech stack, and money-flow playbooks.

Supporting context:

- `website/agents.md` is the frontend build and component-architecture reference.
- `website/design.md` is the detailed frontend visual-token reference.
- `notes/` is historical/operational reference, not higher authority than the root stack.
- `.claude/memory.md` is shared session memory, not policy.
- `IDEA.md` is a non-authority inbox until an idea is promoted into authority docs.

If an ad hoc prompt conflicts with the authority stack, follow the authority stack unless the user explicitly says they are changing policy.

## 1.1 Global Session Rules

- All project search bars must be accent-insensitive. Vietnamese names or labels with diacritics must still match when staff type the same words without accents; frontend code should use the shared `normalizeText()` helper or an equivalent canonical normalizer, and backend search should compare against accent-stripped text where the route owns filtering.

## 2. Local-First Development

All changes must be made and verified locally before pushing to the VPS.

- Inspect local data, local code, and local behavior first.
- Fix, test, and validate locally.
- Deploy to the VPS only after local work is complete.
- Do not modify VPS files directly without first confirming the fix locally.

## 3. Product-Map Governance

Before touching code for a feature or bugfix:

1. Read the affected `product-map/domains/<domain>.yaml`.
2. Read `product-map/schema-map.md` for table blast radius.
3. Read `product-map/contracts/dependency-rules.yaml` for the change-type checklist.
4. Check `product-map/unknowns.md`.
5. If the task intersects an unknown, stop and ask for clarification or open a coordination request.

For multi-domain work, split by domain ownership and merge only after each domain's map and tests are checked.

Keep the map alive:

- If code drifts from the product-map, update the relevant product-map artifact with the code change.
- After significant changes, verify the affected domain YAML and schema-map entries still match reality.

## 4. Roles

Roles are task scopes, not permanent people. A task should declare the owned role before editing.

| Role | Owns | Must read |
|---|---|---|
| Architecture | root authority docs, product-map shape, module boundaries | `ARCHITECTURE.md`, `DECISIONS.md`, product-map |
| Product/Behavior | user behavior, accepted product rules, copy semantics, idea triage | `BEHAVIOR.md`, `IDEA.md`, domain YAML |
| Design | visual system, layout, interaction polish | `DESIGN.md`, `website/design.md`, `BEHAVIOR.md` |
| Frontend | React routes, components, hooks, API clients, i18n | `website/agents.md`, `website/design.md`, affected domain YAML |
| Backend | Express routes, middleware, services, API behavior | `ARCHITECTURE.md`, affected domain YAML, schema-map |
| Data/Money | schema, migrations, imports, payments, deposits, allocations | `docs/runbooks/MONEY_FLOW.md`, schema-map, payment domain |
| Infra/Release | Docker, nginx, env, deploy scripts, VPS verification | `docs/runbooks/DEPLOYMENT.md`, `docs/runbooks/INFRASTRUCTURE.md` |
| QA/Verification | tests, browser checks, release proof | `docs/runbooks/VERIFICATION.md`, affected domain YAML |

## 5. Module Size Rule

No single source file should exceed about 500 lines or 10,000 characters.

Before editing a source file, check line count or character count. If a file is already too large, do not add more feature code to it. Extract sub-components, hooks, services, or utilities first.

Allowed exceptions:

- Auto-generated files where splitting harms maintainability.
- Translation JSON files and static data files.

## 6. Frontend Rules

For frontend work:

- Read `website/agents.md` before code changes.
- Read `website/design.md` before UI/visual changes.
- Use `website/src/lib/api/` clients or hooks for API calls; do not call `fetch` directly in components.
- Keep user-visible copy in i18n when adding or changing UI text.
- Bounded dense-list panels must keep headers/actions visible and scroll internally.
- Use current design tokens and component patterns unless a design decision changes them.

## 7. Backend And Data Rules

For backend/data work:

- Read `ARCHITECTURE.md`, `product-map/schema-map.md`, and the affected domain YAML.
- Treat `api/src/db.js`, auth middleware, permission resolution, and high-blast-radius tables as shared infrastructure.
- Keep route, frontend client, type/DTO, permission, tests, and product-map updates aligned.
- Do not delete legacy routes or mock/data files that intersect `product-map/unknowns.md` without clarification.
- Migration/import work must preserve source anomalies in notes/audit output rather than silently dropping unsupported rows.

## 8. Version Policy

Always bump `website/package.json` after website/runtime code changes.

- Patch: bug fixes and small improvements.
- Minor: new features or significant changes.
- Major: breaking changes.

Docs-only governance changes do not require a website version bump.

## 9. Shared Memory

At session start, read:

- `.claude/memory.md`

After code changes, run:

```bash
bash scripts/sync-claude-mem.sh
```

Do not embed generated memory blocks inside authority docs. Keep memory in `.claude/memory.md`.

## 10. Code-Review Graph

When the code-review-graph MCP tools are available, use them before grep/glob/read for code exploration:

- `semantic_search_nodes`
- `query_graph`
- `get_impact_radius`
- `detect_changes`
- `get_review_context`
- `get_affected_flows`

If the graph tools are unavailable in the current session, state that and fall back to shell search with `rg`.

## 11. Coordination Protocol

Use `COORDINATION_REQUESTS.md` for cross-domain or cross-role blockers.

Create or update a row when work touches:

- Multiple product-map domains.
- Shared schema or high-blast-radius tables.
- Permission strings or auth payloads.
- Docker, nginx, deploy scripts, or env vars.
- External integrations.
- Money/payment allocation, deposits, refunds, receipts, or residuals.
- Any item in `product-map/unknowns.md`.

## 12. Worktree Discipline

Prefer one task per branch/worktree for feature, fix, or infra work. Do not mix infrastructure changes with unrelated app changes.

Do not delete or prune worktrees unless:

- `git worktree list --porcelain` proves the worktree is stale or merged.
- The branch has no unmerged work.
- Any dirty detached worktree has been classified and preserved.

## 13. Reporting Protocol

Every final recap should be short and specific.

Include:

- The product-facing name of each created or edited feature/surface.
- Files or docs changed.
- URLs changed or verified, if any.
- Verification commands and results.
- What was not run or what remains risky.

For substantial work, lead with the most important one- or two-sentence recap, then include supporting details. If no URLs changed, say that clearly.

## 14. OpenCode Workflow Reference

This project can use OpenCode Plan and Build phases:

- Plan mode is read-only and should reference `website/.agents/skills/`, `ARCHITECTURE.md`, `DESIGN.md`, `BEHAVIOR.md`, and product-map files.
- Build mode implements the approved plan and grounds frontend work in `website/agents.md` and `website/design.md`.

## 15. File Reference Map

| File | Purpose | When to read |
|---|---|---|
| `AGENTS.md` | Workflow, coordination, reporting | Every non-trivial session |
| `ARCHITECTURE.md` | Repo structure and dependency rules | Before structural/code changes |
| `DESIGN.md` | Root design routing | Before UI/design work |
| `BEHAVIOR.md` | Product interaction rules | Before behavior changes |
| `DECISIONS.md` | Durable decisions | Before changing established rules |
| `COORDINATION_REQUESTS.md` | Cross-domain blockers | When work depends on another owner |
| `IDEA.md` | Raw non-authority ideas | Before feature/product shaping |
| `website/agents.md` | Frontend build/component rules | Before frontend code changes |
| `website/design.md` | Detailed visual system | Before UI styling changes |
| `product-map/domains/*.yaml` | Domain specs | Before feature or bugfix work |
| `product-map/schema-map.md` | Table blast radius | Before schema/data changes |
| `product-map/contracts/dependency-rules.yaml` | Change checklists | Before API/UI/schema/permission changes |
| `.claude/memory.md` | Shared session memory | At session start |
| `docs/runbooks/*.md` | Operational playbooks | Before deploy/infra/verification/money work |
| `docs/GLOSSARY.md` | Domain terms and disambiguations | Any code change in an unfamiliar domain |
| `docs/CONTRACTS.md` | Frozen API schemas and integration contracts | Any API, frontend client, or integration change |
| `docs/DATA-MODEL.md` | Full schema + ERD + invariant rules | Schema, migration, or query changes |
| `docs/USE-CASES.md` | Actor-trigger-flow-postcondition catalog | Feature work, UX changes, bugfix root-cause |
| `docs/WORKFLOWS.md` | End-to-end sequence diagrams | Cross-domain changes or integration work |
| `docs/INVARIANTS.md` | Global truths that must never break | Any commit touching money, auth, or data consistency |
| `docs/DEPENDENCY-MAP.md` | Module import graph and blast radius | Refactors, extractions, shared-code changes |
| `docs/OWNERSHIP.md` | File/directory edit allowlists per role | Any edit outside your normal scope |
| `docs/TEST-MATRIX.md` | Module → regression test mapping | Any code change |
| `docs/ADR/` | Architectural Decision Records | Before challenging an established pattern |
| `docs/RUNBOOK.md` | Deploy, rollback, health checks, incidents | Any deployment or infra change |
| `docs/FAILURE-MODES.md` | Known broken patterns and war stories | Debugging production issues |
| `docs/OBSERVABILITY.md` | Logs, metrics, traces, alerts | Adding telemetry or debugging runtime |
| `docs/SECURITY.md` | Auth flow, RBAC, secrets, token structure | Auth, permission, or secret changes |
| `docs/CHANGELOG.md` | Append-only semver change log | Planning releases or investigating regressions |
| `docs/MIGRATIONS.md` | Schema migration log with rollback notes | Schema changes and deploy timing |
| `docs/ROADMAP.md` | Phases, scope, dependencies, current marker | Planning new features or scheduling releases |

---

## 16. Documentation Enforcement Rule

**Every task that touches a contract, invariant, data-model, or workflow MUST update the relevant doc and append a CHANGELOG entry in the same commit.**

### What qualifies as a "touch"
- Changing an API request/response shape → update `CONTRACTS.md`.
- Adding/removing a database column or table → update `DATA-MODEL.md` and `MIGRATIONS.md`.
- Changing a business rule that affects money, auth, or data consistency → update `INVARIANTS.md` (append new invariant or mark superseded).
- Adding or removing a use case → update `USE-CASES.md`.
- Changing an end-to-end flow → update `WORKFLOWS.md`.
- Adding a new module or changing import boundaries → update `DEPENDENCY-MAP.md`.
- Changing test coverage or test mapping → update `TEST-MATRIX.md`.
- Making an architectural decision → add an ADR.
- Encountering a new known-failure pattern → append `FAILURE-MODES.md`.

### What happens if code ships without doc updates
**The task is treated as failed and rolled back.** The commit must be reverted or amended to include the doc update before it can be considered complete.

### Change log requirement
Every runtime code change (frontend, backend, contracts, migrations) MUST append an entry to `docs/CHANGELOG.md` with:
- Version bump in `website/package.json` (patch/minor/major per `AGENTS.md` §8).
- Date.
- Author (human or agent identifier).
- One-line reason referencing an invariant, ADR, failure mode, or use case ID where applicable.

Docs-only governance changes do not require a version bump, but they still require a CHANGELOG entry under the `Docs` category.

### Cross-linking requirement
Wherever possible, cross-link related docs:
- Use-cases should cite invariant IDs (e.g., "Invariants touched: INV-003").
- Workflows should cite use-case IDs and invariant IDs.
- Failure modes should cite invariant IDs and ADR references.
- ADRs should cite the decisions they supersede.

### Verification command
Before claiming a task complete, run:
```bash
# Check that docs were modified in the same commit
git diff --name-only HEAD | grep -E "^docs/"
# Check that CHANGELOG has a new entry
git diff HEAD -- docs/CHANGELOG.md | grep "^+" | head -5
```
If no docs changes appear, the commit is incomplete.
