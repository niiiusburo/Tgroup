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

# [Tgroup] recent context, 2026-04-25 12:23pm GMT+7

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (21,223t read) | 958,805t work | 98% savings

### Apr 18, 2026
S4362 Fix customer source field being dropped during service create/edit and restore missing label (Apr 18 at 8:33 AM)
S4363 Verify sourceId end-to-end functionality and identify deployment gap between code and running container (Apr 18 at 8:37 AM)
S4364 Generated shareable usage insights report from Claude Code session data (Apr 18 at 8:40 AM)
S4366 Review and refine proposed additions to global CLAUDE.md based on usage insights (Apr 18 at 8:43 AM)
S4367 Fix bug where saved customer source (sourceId) appears blank when reopening Edit Service form from CustomerProfile (Apr 18 at 8:51 AM)
S4382 Investigate Claude hook configuration showing 21 tools loading on every prompt and identify source of verbose context messages (Apr 18 at 9:03 AM)
S4385 Investigate Claude hook configuration showing 21 tools loading and identify source of verbose context messages (Apr 18 at 10:37 AM)
S4387 Investigate and optimize Claude hook configuration showing 21 tools loading and excessive hook execution (Apr 18 at 10:39 AM)
S4394 Documentation refactoring: Split CLAUDE.md into modular context files and clean up unused language rules (Apr 18 at 10:41 AM)
S4397 Commit and deploy CLAUDE.md documentation refactoring with modular context files (Apr 18 at 11:54 AM)
### Apr 24, 2026
10105 6:02p 🔵 Appointments page does not exist despite domain map listing it
10106 6:03p 🔵 Only appointment page file is ReportsAppointments for analytics
10107 " 🔵 Appointment CRUD uses unified modal component across multiple surfaces
10162 10:24p 🔵 TGClinic modal forms use unified FormShell pattern with consistent scroll and dropdown architecture
10163 10:26p 🔵 AppointmentFormShell dropdown scroll conflict - non-portaled absolute menus inside overflow container
10164 " 🔵 TGClinic has three competing modal architectures and inconsistent dropdown z-index layering strategy
10165 " 🔵 AddCustomerForm implements wheel event stopPropagation workaround - not applied to AppointmentFormShell
### Apr 25, 2026
10211 7:54a 🔵 Customer treatment and payment record investigation
10212 " 🔵 Tdental database schema and volume baseline
10213 7:55a 🔵 Schema divergence between tdental_demo and tdental_real databases
10214 " 🔵 Production database scale is 1000x larger than demo environment
10215 " 🔵 Payment tracking inconsistency discovered in demo database
10216 " 🔵 Demo and production databases contain divergent data for same customers
10217 7:56a 🔵 Payment data model divergence between demo and production databases
10218 " 🔵 SQL CTE scope limitation breaks multi-statement queries in single psql invocation
10219 " 🔴 Corrected payment aggregation query eliminating false 6.4M vs 4.7M discrepancy
10220 7:57a 🔵 Migration infrastructure uses PostgreSQL dblink for cross-database data synchronization
10221 " 🔵 customersources table exists in demo but missing from production database
10222 " 🔴 Deposit balance double-counting bug fixed via payment_allocations exclusion guard
10223 7:58a 🔵 PostgreSQL cross-database references not supported blocking direct demo-production comparison queries
10224 " 🔵 Saleorder state divergence confirmed between demo and production for shared customer records
10225 " 🔵 Production contains 6 additional recent dotkhams for customer T8440 missing from demo database
10226 7:59a 🔵 Application uses dual payment tracking architecture for cash flow vs revenue recognition
10227 8:08a 🔵 Production database contains duplicate customer ref T8250 assigned to two different customers
10228 8:10a 🔵 Demo database contains incomplete appointment data for PHAN LÊ MINH
10229 8:12a 🔵 Customer profile appointments filtered by single partnerId, not by name similarity
10230 8:13a 🟣 Added failing test for stale appointment clearing when switching customers
10231 " 🔴 Fixed stale appointment display when switching customers using request ID tracking
10232 8:14a 🟣 Successfully completed TDD cycle for stale appointment bugfix and verified build
10234 8:54a 🔵 TDental to TG Clinic Migration Data Discrepancies Identified
10235 8:55a 🔵 TDental Export RAR5 Archive Cannot Be Extracted with macOS 7z
10236 8:57a 🔵 Fresh TDental Export Contains All Missing T8250 Treatment Records Confirming Local Database Staleness
10237 " 🔵 TDental Uses Legacy AccountPayments Table While Local Database Uses New Payments Schema With No Data
10238 8:58a 🔵 Local Database Has Payments But Missing Treatment Orders Causing Allocation Mismatch
10239 9:09a 🔵 Data Migration Gaps Between TDental and TG Clinic Database
10240 9:10a ✅ Configure Git to Ignore TDental Data Extraction Directory
10241 9:11a 🔵 TDental Export Data Structure Mapped for Migration
10242 9:12a 🔵 Missing Product Reference Data Blocks T8250 Treatment Import
10243 9:13a 🟣 TDD Tests Added for TDental Import and Date Normalization
10244 " 🔵 TDD RED Phase Confirmed - Tests Fail on Missing Implementation Modules
10247 9:17a 🔵 TDental to TG Clinic data sync gaps for customer T8250
10248 " 🟣 TDental CSV import script with incremental sync and payment allocation
10249 " 🔴 Fixed payment allocation UPDATE query parameter mismatch
10250 " 🟣 Sale order line to customer service mapper with timezone normalization
10253 9:19a 🔄 Centralized sale order line mapping and cleaned up timestamp formatting
10254 " 🔵 Jest test fixture missing products and productcategories arrays
10255 9:20a 🔴 Added defensive null-coalescing to source array accesses in selectClientRows
10256 " 🔵 TDental CSV export contains malformed quote escaping at line 37029
10257 " 🔵 Malformed quotes isolated to Partners.csv line 37029 and AccountPayments.csv line 63050
10258 9:21a 🔵 CSV quote parsing fixed by disabling quote handling with quote: false option

Access 959k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>