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

# [Tgrouptest] recent context, 2026-05-02 11:54am GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (19,071t read) | 305,312t work | 94% savings

### May 1, 2026
11366 12:55p 🟣 Calendar export date range selector deployment preparation
11367 12:56p 🔴 Changelog version sync to pass Tgroup release gate
11368 " ✅ Excel export hardening committed and pushed to main
11369 12:57p 🔵 VPS pre-deploy state at nk.2checkin.com
11370 12:58p ✅ VPS git pull completed - deploying full export feature stack
11371 1:06p ✅ VPS API container build completed successfully
11372 1:09p 🔵 VPS web container build in progress - npm install running 7+ minutes
11373 1:11p 🔵 VPS npm install progress check - actively processing with 10 worker threads
11374 1:17p 🔵 VPS npm install actively writing lucide-react icons - near completion
11375 1:19p ✅ VPS web frontend npm install completed successfully after 17 minutes
11376 1:23p ✅ VPS web container Vite production build started, version 0.27.6 metadata generated
11377 1:27p 🔵 VPS TypeScript compilation actively running for 4m20s at 145% CPU
11378 1:29p ✅ VPS TypeScript compilation completed, Vite production bundling started
11379 1:37p ✅ Tgroup application successfully rebuilt and deployed
11380 1:38p 🔵 Production deployment verified running version 0.27.6
11381 1:39p 🔵 Production server containers verified running after deployment
11382 " 🔵 Production API endpoints verified functional after deployment
11383 1:40p 🔵 Production export endpoints failing with 403 Forbidden despite valid authentication
11384 " 🔵 Export permission strings identified from 403 error responses
11385 1:41p 🔵 Export permissions migration exists but may not be applied to production database
11386 " 🔵 Production database missing exports_audit table - migration 043 not applied
11387 1:42p 🔵 Root cause confirmed: Admin group lacks export permissions, migration 042 not applied
11388 1:43p 🔵 Export feature just deployed in v0.27.6 without running database migrations
11389 " 🔴 Export migrations fixed and applied locally for v0.27.7 deployment
11390 1:44p ✅ Export migration fix committed as v0.27.7 with production database verification
11391 " ✅ Export migration fix pushed to GitHub repository
11392 1:45p ✅ Production deployment in progress: migrations successfully applied to production database
11393 1:56p ✅ Production web container build in progress: npm install completed after 7 minutes
11394 1:59p ✅ Production vite build transforming modules: 2215 modules completed
11395 2:00p ✅ Production deployment completed successfully: version 0.27.7 deployed with export fix
11396 " ✅ Production deployment verified: version 0.27.7 running with all export permissions granted
11397 2:03p 🔵 Export API processing customer download request without permission errors
11400 2:07p 🔵 Excel export E2E test reveals timeout failures on large datasets
11401 " 🔵 Production nginx at nk.2checkin.com lacks timeout configuration for API proxy
11402 2:09p 🔴 Nginx timeout configuration updated on production to fix export failures
11405 2:13p 🔵 Services export running beyond previous 60s timeout limit after nginx fix
11407 2:15p 🔴 Services export now completes successfully after nginx timeout fix
11408 2:16p 🔴 Payments export now completes successfully after nginx timeout fix
11409 2:17p 🟣 Excel export E2E validation confirms proper formatting across all 5 endpoints
11410 2:18p 🔵 E2E validation confirms file integrity and database audit trail for all exports
11415 2:46p 🔵 Excel export E2E tests not configured for live site verification
11416 2:47p 🟣 Live site Excel export verification script launched
11417 2:57p 🔵 Live site Excel exports verified with production data volumes
11418 2:58p 🔵 Complete live site Excel export validation successful across all 5 routes
11419 3:10p 🔵 Live site service catalog export verified
### May 2, 2026
11484 9:49a 🔵 Hosoonline health checkup integration config and implementation state mapped
11485 9:50a 🔵 Hosoonline health-checkup image integration code path traced
11486 " 🔵 Hosoonline integration test suite passed with 5 passing tests
11487 " 🔵 VPS deployment has Hosoonline credentials configured but Docker stack is not running
11488 9:51a 🔵 VPS production stack is running with Hosoonline integration active and recent T8250 query logged

Access 305k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
