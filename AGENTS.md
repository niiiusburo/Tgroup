## Version Policy

**ALWAYS bump the version in `website/package.json` after making code changes.**

Version format: `major.minor.patch` (e.g., 0.4.5)
- **Patch** (0.4.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, significant changes
- **Major** (x.0.0): Breaking changes

After updating code, increment the appropriate version number in `website/package.json`.
The build timestamp and git info are auto-generated from this version.

## i18n Rules (MANDATORY)

**ALL user-facing text MUST use react-i18next `t()` function.**

- ✅ `t('common.save')` — correct
- ✅ `t('appointments.status.scheduled')` — correct
- ✅ `t('title')` (within a namespaced component) — correct
- ❌ `"Save"` — FORBIDDEN in JSX/TSX
- ❌ `"Scheduled"` — FORBIDDEN in JSX/TSX
- ❌ `"Đang hẹn"` — FORBIDDEN in JSX/TSX

### Exceptions (may remain hardcoded)
- Database/API data values (customer names, service names, notes, addresses)
- CSS class names, HTML attributes, technical identifiers
- Console.log / debug messages (not user-facing)
- Placeholder strings like `'you@tgclinic.vn'` that are example values

### Translation File Locations
- English: `website/src/i18n/locales/en/*.json`
- Vietnamese: `website/src/i18n/locales/vi/*.json`
- 14 namespaces: common, nav, overview, calendar, customers, appointments, services, payment, employees, locations, reports, settings, auth, website

### How to Add a New UI String
1. Add the key to BOTH the `en` and `vi` JSON files in the appropriate namespace
2. Use `t('keyName')` in the component
3. Use `{ t } = useTranslation('namespace')` at the top of the component

### Constants Migration
- `NAVIGATION_ITEMS[].label` → i18n keys (e.g., `'overview'`, `'calendar'`)
- `APPOINTMENT_STATUS_OPTIONS[].label` → i18n keys (e.g., `'appointments.status.scheduled'`)
- `APPOINTMENT_TYPE_LABELS` → i18n keys (e.g., `'calendar.appointmentTypes.cleaning'`)
- `APPOINTMENT_CARD_COLORS[].label` → i18n keys (e.g., `'common.colors.blue'`)
- Use `APPOINTMENT_STATUS_I18N_KEYS` instead of deprecated `APPOINTMENT_STATUS_LABELS_VI`

## Obsidian Brain

At session start, read project context from local Obsidian notes:
- `./notes/📋 TGroup Project Overview.md` — Architecture, pages, tech stack
- `./notes/🏗️ Architecture.md` — Detailed component architecture
- `./notes/📊 Features Status.md` — All features tracker
- `./notes/🚀 Deployment Guide.md` — VPS deploy workflow, Docker setup
- `./notes/💾 Database Schema.md` — Database tables and relationships

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
