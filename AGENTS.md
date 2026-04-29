# TGClinic Project Orchestration

> This is the **root-level orchestration guide**. It governs cross-cutting concerns that span the entire project (frontend, backend, infrastructure).
>
> For **frontend build rules** (React, Vite, Tailwind, component architecture): see `website/agents.md`
> For **visual design system** (colors, typography, spacing, motion): see `website/design.md`
>
> **Crucial Rule**: Keep these concerns separate. `agents.md` dictates *how the project is built*. `design.md` dictates *how it looks and feels*. Never mix build logic and visual design into a single prompt.

---

## Local-First Development Rule

**ALL changes MUST be made and verified locally BEFORE pushing to the VPS.**

- Inspect local data, local code, and local behavior first.
- Fix, test, and validate on the local environment.
- Only deploy to the VPS once the local work is complete and verified.
- Never modify VPS files directly without first confirming the fix locally.

---

## Module Size Rule

**No single source file should exceed ~500 lines or ~10,000 characters.**

If a file approaches this limit, it MUST be split into smaller, focused modules before new features are added.

### Enforcement
- Before editing any file, check its line count (`wc -l`) or character count.
- If a file is >500 lines or >10,000 chars, **refuse to add more code to it** and instead:
  1. Extract sub-components, hooks, or utilities into separate files.
  2. Use barrel exports (`index.ts`) to keep import paths clean.
  3. Update cross-reference comments (`@crossref:uses[...]`) in the parent file.

### Good exceptions
- Auto-generated files (e.g., `api.ts` with many endpoint definitions) may exceed this limit if splitting them harms maintainability.
- Translation JSON files and static data files are exempt.

---

## Bounded Dense-List UI Rule

Dashboard cards and side panels that can receive many rows (appointments, services, payments, notifications, reports, etc.) MUST stay bounded instead of stretching the page indefinitely.

- Keep the panel/header visible and put the repeated rows in an internal scroll region.
- Use `min-h-0` on flex/grid parents and the scroll body so `overflow-y-auto` can actually shrink.
- Add a viewport-aware `max-height` or a parent-constrained `h-full` for dense lists.
- Verify with an oversized dataset before calling the UI done; "Lịch hẹn hôm nay" must remain a fixed-height panel even when hundreds of appointments are returned.

---

## Version Policy

**ALWAYS bump the version in `website/package.json` after making code changes.**

Version format: `major.minor.patch` (e.g., 0.4.5)
- **Patch** (0.4.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, significant changes
- **Major** (x.0.0): Breaking changes

After updating code, increment the appropriate version number in `website/package.json`.
The build timestamp and git info are auto-generated from this version.

---

## Obsidian Brain

At session start, read project context from local Obsidian notes:
- `./notes/📋 TGroup Project Overview.md` — Architecture, pages, tech stack
- `./notes/🏗️ Architecture.md` — Detailed component architecture
- `./notes/📊 Features Status.md` — All features tracker
- `./notes/🚀 Deployment Guide.md` — VPS deploy workflow, Docker setup
- `./notes/💾 Database Schema.md` — Database tables and relationships

## Shared Session Memory (Claude-Mem Bridge)

This project shares session memory with Claude IDE via `claude-mem`.

**At session start, read:**
- `.claude/memory.md` — Latest shared context synced from `~/.claude-mem/claude-mem.db`

**After making code changes, run:**
```bash
bash scripts/sync-claude-mem.sh
```
This refreshes `.claude/memory.md` with the latest observations from the shared claude-mem database so both Claude IDE and this agent stay in sync.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Product-Map Governance Rule (MANDATORY)

**Before any agent touches code for a feature or bugfix, it MUST:**

1. **Read `product-map/domains/<domain>.yaml`** for the affected domain.
2. **Read `product-map/schema-map.md`** for table blast radius.
3. **Read `product-map/contracts/dependency-rules.yaml`** for the exact checklist matching the change type (schema, API, permission, UI, etc.).
4. **Check `product-map/unknowns.md`** — if the task intersects an unknown, **stop and ask for clarification** rather than guessing.
5. **For multi-domain changes, treat the task as an Orchestrator job** and spawn parallel sub-agents per domain file, then merge.

### Keep the map alive
- If you discover a drift between the product-map and the actual codebase, update the relevant `product-map/` artifact before or alongside your code change.
- After completing a significant change, add a follow-up task to verify the corresponding domain YAML and schema-map entries are still accurate.

---

## OpenCode Workflow Reference

This project follows the OpenCode structured workflow. Agents must adhere to the **Plan and Build** phases:

### Phase 1: Plan Mode (Read-Only)
- Switch to Plan mode before writing any code.
- Reference specific skills from `website/.agents/skills/` to outline the implementation.
- Output a planning document covering: component hierarchy, folder structure, state management, API contracts, and testing approach.
- **Do NOT write code in Plan mode.**

### Phase 2: Build Mode
- Switch to Build mode to implement the approved plan.
- Always reference `website/design.md` for all visual/styling decisions.
- Always reference `website/agents.md` for all architectural/build decisions.
- Use `@design.md` or `@agents.md` syntax to explicitly ground the agent.

### Skill Library
Expert skills are installed in `website/.agents/skills/`. Available skill categories include:
- `frontend-design` — Production-grade UI creation
- `animate` — Motion and animation patterns
- `arrange` — Layout and composition
- `audit` — Code review and quality checks
- `distill` — Refactoring and simplification
- `extract` — Component extraction
- `harden` — Error handling and resilience
- `normalize` — Data transformation
- `optimize` — Performance optimization
- `polish` — Final quality pass
- `teach-impeccable` — Design context gathering
- And more — run `/skills` in OpenCode to list all available skills.

---

## File Reference Map

| File | Purpose | When to Read |
|------|---------|-------------|
| `website/agents.md` | Build rules, tech stack, architecture | Before any code change |
| `website/design.md` | Visual design system, colors, typography, motion | Before any UI work |
| `product-map/domains/*.yaml` | Domain specifications and requirements | Before feature work |
| `product-map/schema-map.md` | Database table blast radius | Before schema changes |
| `product-map/contracts/dependency-rules.yaml` | Change-type checklists | Before API/UI/schema changes |
| `.claude/memory.md` | Shared session memory | At session start |
| `notes/*.md` | Obsidian project docs | At session start |


<claude-mem-context>
# Memory Context

# [Tgrouptest] recent context, 2026-04-29 5:11pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (21,946t read) | 2,328,439t work | 99% savings

### Apr 27, 2026
10692 10:01a 🔵 Migration on 2026-04-07 seeded duplicate product categories instead of reusing existing ones
10693 10:02a 🔵 TDental migration imported 253 products correctly; duplicate categories came from separate seed script
10696 10:04a ✅ Fixed service catalog display by grouping duplicate product categories at query time
10697 10:05a ✅ Service catalog fix validated via tests and production build
10703 10:07a 🔴 Service catalog table display fix
10710 10:51a ⚖️ Loading state audit initiated for Tgrouptest website
10711 10:52a 🔵 Missing loading UI in Customers page main list
10712 " 🔵 Missing loading UI in Payment page for payments and outstanding balances
10713 " 🔵 ServiceCatalog and ServiceForm have proper loading UI
10714 " 🔵 CustomerProfile tabs have complete loading coverage
10715 10:54a 🔵 Loading State Architecture Audit Findings
10716 11:08a ⚖️ Multi-agent code review workflow before VPS deployment
10717 11:09a 🔴 Service catalog category deduplication for migrated legacy data
10718 " 🟣 Service catalog dedups migrated category UUIDs by display name
10719 11:10a 🔵 Version bump incomplete: CHANGELOG.json not updated to match package.json 0.25.33
10720 " ✅ CHANGELOG.json updated to version 0.25.33 for service-catalog deploy
10721 11:11a 🔵 Service catalog deduplication ready but blocked by version mismatch
10722 11:13a 🟣 Loading state UI added to TGClinic frontend data pages
10726 11:30a 🔵 Service catalog migration state verified in production
10731 11:35a 🔄 Calendar page refactored with paginated appointment fetching
10738 11:40a 🔵 Local development database has 431 appointments for today with null time values
10744 11:58a 🔵 Project has 43 modified files and 43 untracked files pending commit
10745 11:59a 🔵 Untracked files total 20MB from TDental migration artifacts and QA automation
10746 12:00p 🔵 Gitignore missing patterns for generated artifacts causing dirty git tree
10748 " 🔴 Fixed gitignore to exclude generated QA and migration artifacts
10750 12:01p 🟣 Version 0.25.35 deployed with TDental migration tooling and paginated data surfaces
10751 12:02p 🟣 Committed version 0.25.35 with TDental sync tooling to main branch
10754 12:05p 🟣 Pushed version 0.25.35 to GitHub with clean working tree
10756 " 🟣 Deployed version 0.25.35 to production VPS with database sync preparation
10757 12:06p 🟣 Synchronized production database with local data completing full deployment
10758 " 🟣 Production API verified functional with all endpoints returning data
10759 12:07p 🔵 Production frontend timeout on customers page during browser smoke test
10761 12:08p 🔵 Production frontend smoke test passed with SaleOrders endpoint showing aborted requests
### Apr 28, 2026
10869 10:31p 🟣 Field-level edit/display audit E2E test for QA records
10870 " 🔵 Tgroup E2E and unit test coverage audit for customer notes and service doctor-assistant bugs
10871 10:34p 🟣 E2E module edit-display audit suite for regression detection
10872 " 🔴 Customer note/comment/medicalhistory clearing now works
10873 " 🔴 Service history now displays doctor-assistant (Trợ lý BS) staff assignments
10874 10:35p ✅ Regression test coverage for customer note clearing
10875 10:39p 🔴 Customer note and assignment field persistence fix
10876 " 🔴 Service staff display in customer records
10877 " 🟣 E2E module edit-display audit testing infrastructure
### Apr 29, 2026
11008 11:32a 🔵 Service record doctor/assistant/aide UI investigation initiated
11009 11:34a 🔵 Customer phone search bug traced to two-stage filtering mechanism
11010 11:35a 🔵 Customer source (sourceid) field missing from partner validation schema
11011 11:36a 🔵 Service record doctor/assistant fields split across order and line tables
11012 12:11p 🔵 Test infrastructure incompatibility issues blocking hotfix verification
11013 " 🔵 Customer source update path uses conditional payload assembly
11014 " 🔵 Service customer search implements debounced remote API calls
11015 12:12p 🔵 Historical customer-record fix patterns consulted from project memory

Access 2328k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
