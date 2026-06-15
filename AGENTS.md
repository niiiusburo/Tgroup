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

## 1.2 Prompt-Level Authority Gate

Every prompt that starts or continues project work must run the lightweight authority gate before edits:

```bash
bash scripts/prompt-authority-check.sh
```

For Claude-compatible local agents, `.claude/settings.json` wires this through the `UserPromptSubmit` hook so the guard runs automatically on each user prompt. For agents or tools that do not execute that hook, run `npm run verify:prompt` manually at prompt start.

The prompt gate verifies that the authority files exist, strips accidental generated-memory blocks from `AGENTS.md`, blocks generated-memory leakage into other authority docs, and prints the prompt-matched docs/domains that must be read before changing code. It is a start-of-work guard, not a replacement for the commit/PR governance gates in §16.

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

**Cosmetic LOB v2 extension (feat/cosmetic-line-of-business worktree only):** Always read the four split domains in addition to cosmetic.yaml: `business-unit.yaml`, `cosmetic-clients.yaml`, `ctv.yaml`, `earnings-commissions.yaml`. See `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-governance-delta.md` for the full governance delta. Two-DB topology (tdental_demo additive + tcosmetic_demo) is the core invariant — never write cross-DB SQL; use getDb(lob) factory. "local only, NK2 later" until explicit Phase 4 gate. Every LOB/cosmetic/earnings/ctv change must specify LOB in agent logs and update the relevant domain yaml + schema-map.

Keep the map alive:

- If code drifts from the product-map, update the relevant product-map artifact with the code change.
- After significant changes, verify the affected domain YAML and schema-map entries still match reality.

### Cosmetic LOB v2 / Two-DB Discipline (mandatory for any touch)
- Always read the 5 split domains: business-unit.yaml, cosmetic.yaml, cosmetic-clients.yaml, ctv.yaml, earnings-commissions.yaml + schema-map.md before any LOB or earnings change.
- Cosmetic routes and handlers MUST use `requireLobScope(lob)` + `attachCosmeticDb` + `getQuery(req)` (or explicit `getDb(lob)`) — never bare dental pool.
- CTV paths and commissionEngine are the only surfaces allowed to read BOTH pools (getDb('dental') + getDb('cosmetic')).
- partners table (in both DBs) is the canonical identity/auth source for lob_scope, is_ctv, referred_by_ctv_id. Never assume a `users` table for LOB decisions.
- earnings table (append-only, both DBs) is the transactional attribution log (D13); distinct from legacy commissions/* rules tables.
- When editing, also update the corresponding domain YAML(s), schema-map, permission-registry, and this AGENTS.md if coordination rules change.
- Feature flag COSMETIC_LOB_ENABLED + per-route LOB gates are non-negotiable for safety.
- See governance-delta-cosmetic-lob-v2.md, MIGRATIONS.md §047, and DECISIONS.md for D1–D16 + deviations from early spec.

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

## 5.1 CTV / Identity Domain SSOT Enforcement

**The shared `website/src/components/shared/CtvCreationForm/` (CtvCreationForm presentational component + useCtvCreationForm config-driven hook + types + barrel) is the *single source of truth* (SSOT) for *any and all* CTV account creation UI or flows.**

- **Mandatory use:** Any UI, page, modal, sheet, drawer, form, or flow that creates CTV accounts — whether admin ("Add CTV"), logged-in CTV portal recruit/refer, public unauthenticated self-signup/join (with or without `?ref=` or manual upline), future variants, or embedded surfaces — **MUST** import and delegate to `CtvCreationForm` (strictly prop-driven via `hookResult`) + `useCtvCreationForm` (pass `config: { mode: 'admin' | 'portal-recruit' | 'public-join' }` + `onSubmit` that wraps the appropriate `createCtv`/`joinCtv` + page-specific extras like upline). Never inline duplicate form fields, validation, LOB checkboxes, error UI (red borders + `border-red-500`), payload building, or state. Before adding a *new* create-CTV form or modal anywhere: import from the shared (direct or via `@/components/shared` barrel) and extend the hook config (new mode or `requireEmail`) if the context differs. Do not duplicate.

- **`@crossref` required (non-negotiable):** The SSOT module itself *and every call site* **MUST** carry (and keep updated on every edit) accurate `@crossref:used-in[...]`, `@crossref:uses[...]`, and `@crossref:domain[ctv-creation ...]` comments tracing the SSOT + the three canonical consumers + backend. See current examples in `CtvCreationForm.tsx`, `CtvManagementTab.tsx`, `CtvRecruitModal.tsx`, and `JoinCtv.tsx`.

- **Atomic co-update on *any* domain change (non-negotiable):** On *any* change to the CTV creation domain (hook validation/payload/LOB/email logic, error messages, i18n `forms.createCtv.*` keys, form UI/Field/slot behavior, types/config/modes, success/reset handling, or related contracts), **all of the following must be updated in the exact same commit**:
  - All 3+ consumers/call sites (current canonical set: `website/src/components/commission/CtvManagementTab.tsx` (AddCtvModal, mode 'admin'), `website/src/components/ctv/CtvRecruitModal.tsx` (mode 'portal-recruit'), `website/src/pages/CTV/JoinCtv.tsx` (mode 'public-join' + page-specific upline/beforeLobs/rootSignup gate); plus any future ones).
  - Backend validation, auth, LOB normalization, duplicate guards (phone always; email only if supplied), cross-DB all-or-nothing writes + rollback, and error codes in `api/src/routes/ctv.js` (POST /ctv) *and* `api/src/routes/ctvPublic.js` (POST /join).
  - `product-map/domains/ctv.yaml` (the "creation" subsection + any impacted writes/endpoints/impact_tests).
  - Affected tests (hook/form unit tests + surface integration tests for the consumers).
  - `website/src/lib/api/ctv.ts` (CreateCtvInput / CtvJoinInput / callers) if shapes or docs shift.
  - `docs/CHANGELOG.md` (with version bump in `website/package.json` per §8) + any other authority per the Documentation Enforcement Rule (§16).
  This is an explicit extension of §16: the task is **incomplete** (and treated as failed/rollback-required) without the full co-update in one commit.

- **Violation = task failed:** Introducing, leaving, or editing around duplicated CTV creation logic (files containing `createCtv|joinCtv|AddCtv|RecruitCtv|JoinCtv` (or equivalent new-form patterns) but *not* importing/using the shared `CtvCreationForm` + hook) is a hard violation of this SSOT. The prompt gate (`scripts/prompt-authority-check.sh`), pre-commit, and CI will block. Per §16, such a commit "is treated as failed and rolled back." The authority gate runs on *every* prompt (via hook or `npm run verify:prompt`).

- **Invariants to preserve (client + server):** Email optional (default; clean payload omits if falsy/blank; backend skips dup query + stores NULL; UI shows "(không bắt buộc)" note via labels). `lob_scope` *always* forces `'dental'` (hook initial values + toggle guard + `normalizeLobs`; backend always prepends for the auth row + dental DB write). Core required: name + phone + password (>=6 chars). Per-field + form errors for live red borders + disabled submit. Specific error codes: `VALIDATION`, `U_DUPLICATE_PHONE`, `U_DUPLICATE_EMAIL`, `U_WEAK_PASSWORD`, `U_UPLINE_REQUIRED` (public, unless root enabled), `S_CTV_CREATE_FORBIDDEN`, `E_CTV_CREATE_FAILED` (cross-DB). Payloads are trimmed + normalized with dental. Success/reset orchestration is caller-driven.

- **Rationale + cross-links:** CTV creation is high-blast (public/portal/admin + two-DB partners/earnings + auth login + LOB). Duplication has caused repeated drift (email, LOB, errors, writes). See `website/agents.md` (frontend rules + "before adding..."), the `README.md` inside `CtvCreationForm/`, `product-map/domains/ctv.yaml` (creation subsection), current `@crossref` comments, backend routes, `docs/INVARIANTS.md` / `USE-CASES.md` as applicable, and §16 (doc + CHANGELOG enforcement). Update *this* subsection on any governance delta.

CTV/LOB changes must also continue to follow §3 (product-map + two-DB + LOB discipline) + read the 5 split domains.

## 5.2 Site-Wide Crossref Breadcrumb Effect

NK3 source files that act as pages, modules, API clients, Express routes, backend services, middleware, or migrations must carry source breadcrumbs:

- `@crossref:domain[...]` points to the product-map domain.
- `@crossref:used-in[...]` names the NK3 surface or caller category.
- `@crossref:uses[...]` points to the relevant product-map/doc/test authority.

High-blast route/function files must also include `@crossref:route[...]`, `@crossref:endpoint[...]`, or `@crossref:function[...]`. The gate is `npm run verify:crossrefs`, and it is included in `npm run verify:governance`. Update breadcrumbs in the same change whenever moving routes, changing domain ownership, adding pages/modules/API clients/routes/services/migrations, or changing CTV/LOB/commission/payment/service-card behavior. See `docs/CROSSREF-BREADCRUMBS.md`.

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
- **Cosmetic LOB v2:** When touching db, auth, payments, or any new /cosmetic or /ctv path, also read the LOB governance delta + business-unit.yaml + earnings-commissions.yaml. Use dual-pool db factory; enforce lob_scope + requireLobScope on every cosmetic/ctv route. Specify LOB ('dental' or 'cosmetic') explicitly in all logs and coordination.
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
| `product-map/domains/{business-unit,cosmetic,cosmetic-clients,ctv,earnings-commissions}.yaml` | LOB v2 split domains | Before any cosmetic/earnings/CTV/LOB work |
| `product-map/schema-map.md` | Table blast radius (incl. two-DB + partners/earnings) | Before schema/data changes |
| `product-map/contracts/dependency-rules.yaml` | Change checklists | Before API/UI/schema/permission changes |
| `.claude/memory.md` | Shared session memory | At session start |
| `docs/runbooks/*.md` | Operational playbooks | Before deploy/infra/verification/money work |
| `docs/GLOSSARY.md` | Domain terms and disambiguations | Any code change in an unfamiliar domain |
| `docs/CONTRACTS.md` | Frozen API schemas and integration contracts | Any API, frontend client, or integration change |
| `docs/DATA-MODEL.md` | Full schema + ERD + invariant rules | Schema, migration, or query changes |
| `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-governance-delta.md` | Cosmetic LOB v2 governance, product-map, authority delta | Every session touching LOB/cosmetic/ctv/earnings |
| `product-map/domains/business-unit.yaml` + `cosmetic-clients.yaml` + `ctv.yaml` + `earnings-commissions.yaml` | Split LOB sub-domains (earnings table naming, two-DB) | Before any LOB code or docs change (in addition to cosmetic.yaml) |
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

### Enforcement paths
The documentation gate is enforced in:
- `scripts/verify-docs.sh`
- `npm run verify:docs`
- `npm run verify:governance`
- `.husky/pre-commit`
- `.github/workflows/pr-checks.yml` documentation-governance job

Bypassing these gates with `--no-verify`, direct VPS edits, or direct pushes outside PR review is outside the normal project workflow and must be called out explicitly in the final recap.

### MANDATORY EDIT PROTOCOL
BEFORE any edit:
1. graphify query the target — what is it, what connects to it
2. CRG blast_radius — list ALL affected files/functions/tests
3. LSP/find-references — every call site
→ You must OUTPUT the blast-radius list before touching code.
→ Acquire lock/ownership on every file in the radius, not just the target.
DURING:
4. Contracts/types first; let the type checker enumerate breakage.
AFTER (all blocking, in order):
5. Diagnostics clean → type check passes → affected tests + golden
   fixtures pass. Pre-commit hook enforces this; never bypass with
   --no-verify.
ON SCHEMA CHANGE:
6. Re-run DB introspection into the graph + blast_radius on affected
   tables before merge.
AFTER MERGE:
7. Graph rebuilds via git hook; write decision + gotchas to DECISIONS.md
   (or Mem0 if no Luffy files).
CONFLICT RULE: graph/CRG = navigation truth for current code state;
docs/memory = rationale. On contradiction, current code wins.