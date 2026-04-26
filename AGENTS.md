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

# [Tgrouptest] recent context, 2026-04-27 12:03am GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (19,417t read) | 633,602t work | 97% savings

### Apr 26, 2026
10501 10:20p 🟣 Version 0.25.25 successfully deployed to production at nk.2checkin.com
10502 10:23p 🔵 Playwright test failed due to ambiguous Payment tab selector
10503 " 🔵 Refined Payment tab selector still matches 2 elements causing test failure
10504 10:25p 🟣 Deployment verification successful: local and production data and UI match perfectly
10506 10:26p ✅ Development session completed with successful deployment and verification
10507 10:28p 🔵 Appointments table contains TimeExpected duration field
10509 " 🔵 TimeExpected field populated in 99.5% of appointments with standard duration values
10513 10:33p 🔵 Appointment Time Model: Duration-Based, Not End-Time-Based
10515 " 🔵 EndTime Field in AppointmentFormCore Is Display-Only, Not Persisted
10516 10:34p 🔵 EndTime Field Surface Area Spans 48 References Across 8 Component Categories
10517 10:35p 🔵 EndTime Field Used Only in Local State Updates, Not API Calls
10519 " ✅ TDD Test Added for EndTime-Free Appointment Submission
10520 10:36p 🔵 Guard Test Fails as Expected - EndTime Currently Required
10522 " 🔵 OverviewAppointment Interface Has No EndTime Field - Only Displays StartTime
10526 10:37p 🟣 Duration Utilities and Dedicated Form Field Component Created
10527 10:42p 🔄 Removed endTime from appointment form data model
10528 " 🟣 Created centralized appointment duration utilities
10529 " 🔄 Updated appointment mappers to use duration-based approach
10530 " 🔄 Updated form guard to remove endTime validation requirement
10531 " 🟣 Added timeexpected field to OverviewAppointment interface
10532 " 🔄 Updated Calendar page to use duration-based appointment creation
10533 10:44p 🔄 Updated all calendar display components to use duration-based time formatting
10534 " 🔄 Extracted DayAppointmentCard component from DayView into separate file
10535 10:45p 🔄 Extracted AppointmentAppearanceFields component from AppointmentFormCore
10537 10:47p 🔄 Extracted AppointmentStaffFields component from AppointmentFormCore
10547 10:55p 🔵 Tgrouptest local dev environment inactive
10548 " 🔵 Tgrouptest Docker Compose environment not started
10555 10:59p 🔵 Tgrouptest API started on port 3002 using tv2codex database on port 5433
10556 11:00p 🔴 API configured to use port 5433 database and started persistently via tmux
10557 " 🟣 Tgrouptest local dev environment fully operational with successful e2e login
10572 11:13p 🔵 Appointment duration field uses datalist, not dropdown
10574 " 🔵 Appointment duration distribution in production database
10575 11:14p 🔵 Historical appointment data reveals 15min is most common duration
10576 " 🟣 Appointment duration field converted to dropdown with preset options
10578 11:15p 🟣 Added unit test for dropdown appointment duration field
10579 11:16p 🟣 Duration dropdown verified working in production build
10580 11:17p 🔄 Appointment form refactored into modular field components
10584 11:38p 🔵 Past TamDentistExport3 timezone bug caused missing April 2026 treatments
10585 " 🔵 Appointments TimeExpected column already fully populated, no backfill needed
10586 11:39p 🔵 Database contains only 289 of 246,215 appointments from CSV source
10587 " 🟣 Added appointment duration field component and utility library
10588 11:40p 🔵 286 of 289 appointments missing time field, but time data exists in date column
10589 11:41p 🔴 Backfilled missing time values for 286 appointments by extracting from date column
10590 11:42p 🔵 Time backfill successful but revealed 5 appointments with timezone-shifted values
10591 " 🔴 Corrected 5 appointments with incorrect date and time values using CSV source data
10592 11:43p 🔵 One appointment remains with incorrect date, time, and duration after correction attempt
10593 11:44p 🔵 AP210661 update failed - database shows wrong date, time, and duration despite recent update timestamp
10594 11:45p 🔴 Manually corrected AP210661 completing full CSV reconciliation of all 289 appointments
10604 11:52p 🔄 Moved tooth badge from dedicated column into quantity cell in ServiceHistory table
10605 11:53p ✅ Verified tooth badge consolidation in live browser - appears correctly in quantity column

Access 634k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>