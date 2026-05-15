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

- **Internet search from the terminal must use the DuckDuckGo HTML scraper.** Other methods (GitHub API search, jina.ai, direct Google scraping) are unreliable or blocked in this environment. The canonical working flow is:

  ```bash
  curl -sL "https://html.duckduckgo.com/html/?q=QUERY+GOES+HERE" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
    -H "Accept: text/html,application/xhtml+xml" | python3 -c "
  import sys, re
  html = sys.stdin.read()
  links = re.findall(r'class=\"result__a\"[^>]*href=\"([^\"]+)\"', html)
  for link in links[:15]:
      print(link)
  "
  ```

  Results are DuckDuckGo redirect URLs (`//duckduckgo.com/l/?uddg=...`). URL-decode the `uddg` parameter to get the real destination URL, then fetch content directly (e.g., `curl -sL https://raw.githubusercontent.com/...`). **Do not attempt GitHub API search, jina.ai, or direct Google scraping as a first step.**

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

## 16. Proactive Context Handoff Rule

When a session approaches context limits, auto-compaction destroys fidelity and causes errors. The fix is to **proactively write a handoff and start fresh** before the model drops context.

### When to handoff

- Auto-compaction fires ("Context overflow detected, Auto-compacting...")
- 40+ tool calls in the session
- User says "handoff", "new session", "reload", "continue in fresh"
- Multi-step task is >50% complete and has involved 5+ file reads
- You catch yourself re-reading files or repeating explanations

### Session identification

Every handoff MUST identify which session produced it, because the user runs multiple sessions (Pi, Claude, Codex) in parallel. Include:
- `**Session Tool:**` — `Pi`, `Claude`, `Codex`, `Gemini`, etc.
- `**Session ID:**` — The actual session identifier
- `**Handoff ID:**` — Unique ID (`<tool>-<timestamp>-<random>`)

A session resuming work MUST verify the handoff's `Session Tool` matches itself before reading it. If it doesn't match, the handoff belongs to a different parallel session.

### Handoff artifact location (GLOBAL — all projects)

This handoff system applies to **all projects** the user works in. Handoffs must be session-scoped and stored in one of two locations:

**1. Project-local (preferred for project work):**
```
<project-root>/.pi/handoffs/<handoff-id>.md
<project-root>/.pi/handoffs/INDEX.md
```

**2. Global (for non-project work or when no project cwd is active):**
```
~/.pi/handoffs/<handoff-id>.md
~/.pi/handoffs/INDEX.md
```

**Rule:** Always prefer the project-local `.pi/handoffs/` if a project working directory is active. Only fall back to `~/.pi/handoffs/` when there is no project context.

Example: `.pi/handoffs/pi-20260514-161530-a7f3.md`

**Registry file:** `.pi/handoffs/INDEX.md` — append a line for each handoff:
```markdown
| Handoff ID | Session Tool | Session ID | Date | Task | Status |
|---|---|---|---|---|---|
| pi-20260514-161530-a7f3 | Pi | abc123 | 2026-05-14 | Fix login bug | active |
```

### Handoff template

```markdown
# Handoff: <brief task name>

**Handoff ID:** <tool>-<timestamp>-<random>
**Date:** <ISO timestamp>
**Session Tool:** <Pi / Claude / Codex / Gemini / etc.>
**Session ID:** <actual session uuid or identifier>
**Branch:** <git branch>
**Worktree:** <path>

## What we were doing
<2-3 sentences>

## Decisions made
- <Decision 1>

## Files changed
- `<path>` — <what changed>

## Current state
<working / broken / partial>

## Verification results
- <command> → <result>

## Blockers / open questions
- <blocker>

## Next steps
1. <concrete step>
2. <concrete step>
3. <concrete step>

## Context to preserve
- <env vars, flags, ports, credentials>
```

### After writing the handoff

1. Tell the user: "I've hit context pressure. Handoff written to `.pi/handoffs/<handoff-id>.md` (Session: <Tool> <SessionID>). Start a fresh session and say: `Continue from handoff <handoff-id> in .pi/handoffs/`"
2. Do NOT continue in the same session after compaction fires.
3. Delete the handoff file once the task is fully complete. Update `INDEX.md` status to `complete`.

### Resuming from a handoff

When a user says "continue from handoff":
1. List `.pi/handoffs/` directory
2. If multiple exist, ask: "Which handoff? Available: [list from INDEX.md]"
3. Read the specified handoff ONLY after verifying `Session Tool` matches this session. If the handoff says `Session Tool: Pi` but this is a Claude session, STOP and ask the user which session should handle it.

---

## 17. Documentation Enforcement Rule

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


<claude-mem-context>
# Memory Context

# [Tgrouptest] recent context, 2026-05-15 9:27am GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 36 obs (14,449t read) | 460,661t work | 97% savings

### May 13, 2026
12799 8:28p 🔵 Đóng Đa appointment spreadsheet import planning initiated
12800 8:29p 🔵 Spreadsheet download produced invalid or empty Excel file
12801 8:30p 🔵 Đống Đa appointment spreadsheet parsed successfully with 581 rows but normalizer failed date/time extraction
12803 8:34p 🔵 Database validation confirmed prerequisites for Đống Đa appointment import
12819 9:54p 🔵 Customer profile "Paid" amount displays negative values incorrectly
12822 9:59p 🔵 Revenue export column E (Phiếu khám) not displaying "SO" sale order names
12826 10:10p 🔴 Revenue collected KPI now includes paid-only order states
12827 10:11p 🔴 Hosoonline Health Checkup Images Now Use Authenticated Blob URLs
12828 " 🟣 HealthCheckupLightbox Test Coverage for Authenticated Image Opening
12829 " ✅ TestSprite Plan Created for Hosoonline Authenticated Image Viewer
12851 11:15p 🔵 Staging server missing cash-flow fix deployment
12852 " ✅ Staging API container rebuilt with cash-flow and revenue fixes
12853 11:16p 🔵 Staging revenue and cash-flow endpoints verified working with corrected totals
12854 11:17p 🔵 Staging logs show clean revenue endpoint requests with no SQL errors
### May 14, 2026
12860 12:05a 🔵 NK 2Checkin Login Monitor Blocked by Sandbox Network Restrictions
12861 12:06a 🔵 Đống Đa appointment spreadsheet import infrastructure validated
12871 12:22a 🔵 Production database state before Đống Đa appointment import
12872 12:23a ✅ Production database backup completed before Đống Đa import
12883 12:38a 🔵 Production Database Environment Confirmed
12884 " ✅ SSH Tunnel Established for Remote Database Access
12885 " 🔵 Missing ExcelJS Dependency Blocks Import Analysis
12886 " 🔵 Appointment Import Dry-Run Analysis Complete
12887 12:39a 🔵 Live Appointment Import Analysis Shows Clean 540-Row Import Window
12888 " 🔵 Customer T3544 Exists on Live But Missing From Local Database
12897 12:58a 🔵 Batch appointment import validated against tdental_demo database
12898 1:01a 🟣 Batch imported 540 Đống Đa appointments to tdental_demo production database
12899 " 🔵 Live site verification requires .agents/live-site.env credentials file
12900 1:02a 🟣 Verified imported appointments are live and accessible on production calendar
12902 1:03a 🔵 Production appointment search confirmed accent-insensitive for Vietnamese text
12904 1:05a 🔴 Fixed timezone shifts and added header aliases in xlsx batch import
12905 1:06a ✅ Completed end-to-end verification of Đống Đa appointment batch import
12906 " ✅ Committed and pushed timezone fixes for appointment import script
### May 15, 2026
13099 12:02a 🔵 NK 2Checkin Login Monitor Network Failure
13100 12:03a 🔵 Automation Executor Environment Has No DNS Configuration and Browser Permission Lockdown
13102 12:04a 🔵 Complete Network and System Isolation Confirmed for NK 2Checkin Production VPS
13103 " 🔵 Outbound HTTPS Connections Completely Blocked Including DNS-over-HTTPS Services

Access 461k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>