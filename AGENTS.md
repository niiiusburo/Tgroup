## Local-First Development Rule

**ALL changes MUST be made and verified locally BEFORE pushing to the VPS.**

- Inspect local data, local code, and local behavior first.
- Fix, test, and validate on the local environment.
- Only deploy to the VPS once the local work is complete and verified.
- Never modify VPS files directly without first confirming the fix locally.

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

## Version Policy

**ALWAYS bump the version in `website/package.json` after making code changes.**

Version format: `major.minor.patch` (e.g., 0.4.5)
- **Patch** (0.4.x): Bug fixes, small improvements
- **Minor** (0.x.0): New features, significant changes
- **Major** (x.0.0): Breaking changes

After updating code, increment the appropriate version number in `website/package.json`.
The build timestamp and git info are auto-generated from this version.

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
