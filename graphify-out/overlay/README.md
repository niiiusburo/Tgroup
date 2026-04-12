# Business Overlay — TGroup Knowledge Graph

## What Is This?

The business overlay merges the raw code-graph (`graph.json`, 1014 nodes) with
human-authored domain/journey annotations from three sibling files:

| File | Scope | Annotated |
|------|-------|-----------|
| `taxonomy.json` | 12 domains, 14 entities, 16 journeys | Reference taxonomy |
| `backend.json` | 53 backend files | Explicit annotations |
| `frontend.json` | 202 frontend files | Explicit annotations |

The merged result is `../business-overlay.json`. Each node gets:
- `domain` — which business domain owns the file (auth, customers, payments, …)
- `tier` — architectural tier (route, hook, component, middleware, migration, …)
- `intent` — one-line description of what the file does
- `entities` — which data entities the file touches
- `journeys` — which user flows the file participates in
- `keyExports` — primary exports
- `notes` — edge cases and implementation notes

**Coverage:** 1011 of 1014 nodes annotated (99.7%).
- 594 explicit (matched to backend.json / frontend.json by `source_file`)
- 417 heuristic (e2e tests, blueprint references, migration scripts, build config)
- 3 unannotated (nodes without a recognisable source_file pattern)

---

## Querying

```bash
# From the project root:
node graphify-out/overlay/query.js <command> [args]
```

### Commands

| Command | Description |
|---------|-------------|
| `domains` | List all domains with node and file counts |
| `domain <id>` | List all nodes in a domain |
| `journey <id>` | Show journey steps + participating files |
| `entity <id>` | List all files touching an entity |
| `file <path>` | Show full annotation for a file path |
| `flow <journey-id>` | Pretty-print journey definition + ordered participants |
| `unannotated` | List nodes with no annotation |
| `stats` | Coverage summary: annotated/total, per-domain, per-tier |
| `search <keyword>` | Search intents, notes, and labels for a keyword |

### Examples

```bash
# What domains exist?
node graphify-out/overlay/query.js domains

# All files in the payments domain
node graphify-out/overlay/query.js domain payments

# What files participate in the payment-create journey?
node graphify-out/overlay/query.js journey payment-create

# Full flow view with steps
node graphify-out/overlay/query.js flow login

# All files touching the customer entity
node graphify-out/overlay/query.js entity customer

# Annotation for a specific file
node graphify-out/overlay/query.js file api/src/routes/payments.js

# Search for "void" across intents and notes
node graphify-out/overlay/query.js search void

# Coverage statistics
node graphify-out/overlay/query.js stats
```

---

## How to Regenerate

The overlay is built from three annotation passes (run independently) followed
by a merge step:

1. **Taxonomy agent** — updates `overlay/taxonomy.json` (domains, entities, journeys)
2. **Backend annotation agent** — updates `overlay/backend.json` (53 API files)
3. **Frontend annotation agent** — updates `overlay/frontend.json` (202 UI files)
4. **Merge script** — run the Node.js script that reads `graph.json` +
   `backend.json` + `frontend.json` and writes `business-overlay.json`

The merge script is embedded in the project session history. Re-run it whenever
the source annotations change.

---

---

## Code-Level Flow Sequences (`flows.json`)

`flows.json` adds function/line-level execution traces for the top 5 critical
journeys. Unlike the file-level overlay, each flow records an ordered sequence
of exact code locations — the actual call path a request follows from UI trigger
to database write and back.

### Structure

```json
{
  "version": "1.0",
  "generatedAt": "YYYY-MM-DD",
  "flows": {
    "<journey-id>": {
      "journey": "login",
      "label": "User Login",
      "entryPoint": "website/src/pages/Login.tsx:54",
      "steps": [
        { "order": 1, "file": "...", "line": 54, "label": "...", "kind": "ui-event" }
      ],
      "filesInvolved": ["..."],
      "crossesBoundary": true,
      "criticality": "critical"
    }
  }
}
```

### Step `kind` values

| Kind | Description |
|------|-------------|
| `ui-event` | User interaction (click, form submit) |
| `hook-call` | Call into a React hook |
| `hook-init` | Hook instantiation in a page component |
| `hook-method` | Method returned by a hook |
| `hook-effect` | useEffect re-run triggered by dependency change |
| `context-method` | Function provided by a React context |
| `context-consumer` | Component consuming context state |
| `api-call` | HTTP request via `apiFetch` / `api.ts` helper |
| `route-handler` | Express route handler on the backend |
| `middleware` | Express middleware (auth, permission check) |
| `business-logic` | Core logic within a route (validation, DB query) |
| `db-write` | SQL INSERT / UPDATE / DELETE |
| `db-read` | SQL SELECT (re-fetch after write) |
| `state-update` | React `setState` call updating local component state |
| `side-effect` | Secondary effect after main operation (refetch, localStorage) |
| `event-dispatch` | `window.dispatchEvent` custom event |
| `event-listener` | `window.addEventListener` handler |
| `routing` | React Router navigation / redirect |
| `fan-out` | One state change propagates to multiple independent consumers |

### Covered journeys

| ID | Label | Steps |
|----|-------|-------|
| `login` | User Login | 12 |
| `customer-checkin` | Patient Check-in at Reception | 9 |
| `appointment-create` | Create Appointment | 10 |
| `payment-create` | Record Payment | 11 |
| `location-filter` | Global Location Filter | 8 |

### Querying flows

```bash
# Pretty-print code-level steps with file:line for a journey
node graphify-out/overlay/query.js flow-detail login
node graphify-out/overlay/query.js flow-detail payment-create
node graphify-out/overlay/query.js flow-detail location-filter

# Original flow command (file-level participants from business-overlay.json) still works
node graphify-out/overlay/query.js flow login
```

## Known Limitations

- **File-level granularity only.** The overlay annotates files, not individual
  functions or symbols. All nodes sharing a `source_file` get the same annotation.
- **Heuristic annotations are shallow.** e2e test files, blueprint reference
  components, and migration scripts are tagged by path pattern (e.g. `/e2e/` →
  `domain: testing`), not by reading their contents.
- **Annotations drift.** If source files are added, renamed, or refactored
  without re-running the annotation agents, `business-overlay.json` will be
  stale. Rebuild after significant codebase changes.
- **Journey coverage is partial.** Only journeys explicitly listed in a file's
  `journeys` array are tracked. Indirect participation (e.g. a utility called
  by a journey participant) is not captured.
