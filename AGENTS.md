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


<claude-mem-context>
# Memory Context

# [Tgrouptest] recent context, 2026-05-04 10:19pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (23,039t read) | 1,000,942t work | 98% savings

### May 4, 2026
11882 12:07a 🔵 Live Production Authentication Test Confirms User Profile and Permission Set
11883 " 🔵 Live Production Permission Groups Structure and Hierarchy
11885 12:12a 🔵 Employee creation endpoint broken - missing dateUtils module
11887 12:13a 🔵 TestSprite tunnel configuration and versioning system
11888 12:17a 🟣 Comprehensive frontend test plan created with 18 test cases
11889 12:18a 🔵 TestSprite MCP server misconfiguration - checks localhost:443 for remote production target
11890 12:21a 🔵 Direct live QA automation blocked by authentication failure
11891 " 🔵 Production login rate limiting blocks automated QA - 10 attempts per 15 minutes
11892 12:22a 🔵 Direct token minting approach also fails - likely local DATABASE_URL issue
11893 12:23a 🔵 Production database rejects SSL connections - blocks direct token minting strategy
11894 " 🔵 Local DATABASE_URL points to schema-less database - partners table does not exist
11895 12:24a 🔵 Production VPS stack confirmed - PostgreSQL on port 55433, admin employee in dbo schema
11896 12:25a 🔵 Production token minting succeeds but fails due to non-ASCII character in JWT payload
12151 6:22p 🔵 Appointment clearance preparation with safety guardrails active
12152 " 🔵 Customer update spreadsheet contains 511 rows with customer code, name, phone, and branch
12153 " 🔵 Appointment clearance scope: 6,082 future appointments with no dependent records
12154 6:23p 🔵 Production database verified: 6,088 future appointments with CASCADE delete constraints
12155 " 🔵 Customer update spreadsheet contains 510 new customers with no existing database matches
12156 6:24p 🔵 Sample of 10 production appointments scheduled for clearance starting May 4, 2026
12157 " 🔵 Customer update analysis reveals 70% new customers and 30% potential duplicates requiring manual review
12158 6:25p 🟣 Bulk customer import dry-run transaction successfully tested 359 new customer inserts with rollback
12159 6:28p 🔵 Appointment clearance scope and VPS database infrastructure mapped
12160 " 🔵 Appointment data distribution across three VPS databases quantified
12161 6:29p 🔵 VPS tdental-db contains 862 orphaned future appointments with zero linked treatment or payment data
12162 6:30p 🔵 Cross-database comparison reveals 5,287 stale appointments in production tgroup-db requiring clearance
12163 6:31p 🔵 VPS runs three independent calendar systems: TG Clinic production, TDental source, and standalone static calendar UI
12164 6:32p ✅ Production tgroup-db cleared of all 6,088 future appointments from 2026-05-04 onward with full backup
12165 " 🔵 Customer data import matching logic discovered
12166 6:33p 🔵 Customer merge logic compares database state with field-level diff analysis
12167 6:36p ✅ Complete clearance executed: all 216,512 remaining appointments deleted from production tgroup-db
12168 6:37p 🔵 Post-clearance database verified intact with zero appointments and 35k+ preserved partners; new 7-row appointment source file identified
12169 6:42p 🔵 Database configuration verified for tdental_demo
12170 " ✅ Customer data migration committed to tdental_demo database
12171 " 🔵 API server port mismatch discovered during verification
12172 6:43p 🔵 Admin authentication credentials and API server port verified
12174 6:44p 🔴 PostgreSQL COPY CSV Import Fixed with LF-Only Line Endings
12175 " 🟣 Appointment Import System with Dry-Run Validation
12176 " 🟣 Production Appointment Table Populated After Full Clearance
12173 " 🔵 Customer data migration verified through API endpoint queries
12177 6:45p 🔵 Production API Confirmed Serving Imported Appointments
12196 9:45p 🟣 iPad responsive layout system implemented
12197 " 🟣 DataTable component made horizontally scrollable for tablets
12198 " 🟣 Form modals and complex layouts made tablet-responsive
12199 " 🔵 TGroup clinic frontend uses Vite with React and real PostgreSQL API
12200 9:47p 🟣 Automated iPad screenshot testing system implemented with Playwright
12201 9:48p 🔵 iPad responsive design verified with zero horizontal overflow across all routes
12202 " ✅ iPad responsive design changes staged for commit
12214 10:08p 🔵 Employee Location Scope Selection Bug - Frontend State Not Persisted
12215 " 🔴 Fixed Employee Primary Location Missing from Permission Response
12216 10:09p ✅ Updated Auth Domain Documentation with Location Resolution Behavior

Access 1001k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>