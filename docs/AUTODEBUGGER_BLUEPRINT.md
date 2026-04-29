# AutoDebugger Pipeline — Full System Blueprint

## Overview

The **AutoDebugger** is a closed-loop bug detection → fix → deploy pipeline that catches production errors, routes them to the development environment, and auto-fixes them using AI agents (Ralph Loop + code-review-graph).

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION (https://nk.2checkin.com)           │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ ErrorBoundary│  │ window.onerror│  │ API Client (core.ts)   │  │
│  │ (React)      │  │ unhandledrej.│  │ apiFetch error hook    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬─────────────┘  │
│         │                 │                       │               │
│         └─────────────────┼───────────────────────┘               │
│                           ▼                                       │
│              ┌────────────────────────┐                           │
│              │   errorReporter.ts     │                           │
│              │   (batch + dedup)      │                           │
│              └───────────┬────────────┘                           │
└──────────────────────────┼────────────────────────────────────────┘
                           │ POST /api/telemetry/errors
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  telemetry.js                                                 │ │
│  │  ├─ POST /errors   → Upsert into error_events (fingerprint)   │ │
│  │  ├─ GET /errors    → List unresolved for auto-fixer           │ │
│  │  ├─ PUT /errors/:id → Update status (fix_verified, deployed)  │ │
│  │  ├─ POST /errors/:id/fix-attempts → Log fix attempts          │ │
│  │  └─ GET /stats     → Dashboard aggregation                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│              ┌────────────▼──────────────┐                        │
│              │   errorHandler.js          │                        │
│              │   (server-side crash       │                        │
│              │    capture middleware)      │                        │
│              └────────────────────────────┘                        │
│                           │                                       │
│                           ▼                                       │
│              ┌────────────────────────────────┐                   │
│              │   PostgreSQL: error_events      │                   │
│              │   + error_fix_attempts          │                   │
│              └────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ GET /api/telemetry/errors?status=new
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   AUTO-FIXER PIPELINE                              │
│                   (scripts/auto-fixer.js)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. FETCH unresolved errors                                   │ │
│  │    └─ Filter by occurrence_count >= 2 (avoid noise)         │ │
│  │    └─ Score by: frequency + recency + type + source info    │ │
│  │                                                              │ │
│  │ 2. TRACE to source                                          │ │
│  │    └─ Extract file:line from stack trace                    │ │
│  │    └─ Look up component/route via code-review-graph         │ │
│  │    └─ Build source clue list                                │ │
│  │                                                              │ │
│  │ 3. GENERATE fix plan                                        │ │
│  │    └─ Write .omc/fix-plans/fix-<id>/prd.json                │ │
│  │    └─ Stories: Investigate → Fix → Test → Verify            │ │
│  │    └─ Write summary.md with full context                    │ │
│  │                                                              │ │
│  │ 4. INVOKE Ralph Loop                                        │ │
│  │    └─ Ralph Loop reads prd.json                             │ │
│  │    └─ Traces error via code-review-graph                    │ │
│  │    └─ Implements fix, runs tests, verifies                  │ │
│  │    └─ Shows "Ready to deploy" when all stories pass         │ │
│  │                                                              │ │
│  │ 5. VERIFY + DEPLOY                                          │ │
│  │    └─ Run full test suite                                   │ │
│  │    └─ Build production bundle                               │ │
│  │    └─ Deploy to VPS                                        │ │
│  │    └─ Update error status → deployed                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Manifest

| File | Purpose |
|------|---------|
| `api/migrations/018_error_events.sql` | Database schema (error_events + error_fix_attempts) |
| `api/src/routes/telemetry.js` | Backend API: collect, list, update errors |
| `api/src/middleware/errorHandler.js` | Server-side global error capture |
| `api/src/server.js` | Wired errorHandler middleware |
| `website/src/lib/errorReporter.ts` | Frontend error capture + batch send |
| `website/src/lib/logger.ts` | Enhanced: logger.error() → reports to backend |
| `website/src/lib/api/core.ts` | Enhanced: apiFetch errors → reports to backend |
| `website/src/components/shared/ErrorBoundary.tsx` | Enhanced: componentDidCatch → reports |
| `website/src/main.tsx` | Global window.onerror + unhandledrejection handlers |
| `scripts/auto-fixer.js` | Auto-fixer orchestrator (CLI tool) |
| `docs/AUTODEBUGGER_BLUEPRINT.md` | This document |

---

## Setup & Deployment

### 1. Run Migration

```bash
# On local DB
psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo < api/migrations/018_error_events.sql

# On VPS
ssh root@<vps-ip> docker exec -i tgroup-db psql -U postgres -d tdental_demo < api/migrations/018_error_events.sql
```

### 2. Rebuild & Deploy

```bash
# Local verification
cd website && npm run build
cd ..

# Deploy to VPS
# Build both API + web containers
docker compose up -d --build api web
```

### 3. Verify Error Collection

```bash
# Send a test error
curl -X POST http://localhost:3002/api/telemetry/errors \
  -H "Content-Type: application/json" \
  -d '{"error_type":"React","message":"Test error: button not found","stack":"Error: button not found\n    at MyComponent (MyComponent.tsx:42:15)","route":"/customers","component_stack":"at MyComponent\nat Page"}'

# List errors
curl http://localhost:3002/api/telemetry/errors?status=new
```

---

## Running the Auto-Fixer

### CLI Modes

```bash
# One-shot: fix the top priority error
node scripts/auto-fixer.js --once

# Fix a specific error by ID
node scripts/auto-fixer.js --error <uuid>

# Dry-run: see what would be fixed (no changes)
node scripts/auto-fixer.js --dry-run

# Daemon: continuous monitoring (every 5 min)
node scripts/auto-fixer.js --daemon
```

### Manual Ralph Loop Invocation

The auto-fixer generates a fix plan in `.omc/fix-plans/`. To run a fix manually:

```bash
pi "Ralph Loop: fix production error. Read .omc/fix-plans/fix-<id>/task.md and follow the plan in prd.json"
```

---

## Error Lifecycle

```
new → investigating → fix_in_progress → fix_verified → deployed
  ↓         ↓                                    ↓
duplicate  manual_review                     won't_fix
```

| Status | Meaning |
|--------|---------|
| `new` | Unresolved, waiting for auto-fixer |
| `investigating` | Auto-fixer is analyzing the error |
| `fix_in_progress` | Ralph Loop is implementing the fix |
| `fix_verified` | Fix is ready, tests pass, pending deploy |
| `deployed` | Fix is live in production |
| `duplicate` | Merged into another error (same fingerprint) |
| `won't_fix` | Determined to be expected behavior |
| `manual_review` | Needs human review (auto-fixer couldn't fix) |

---

## Fingerprinting (Deduplication)

Errors are deduplicated by **fingerprint** — a SHA-256 hash of:

```
error_type + normalized_message + top_stack_frame
```

Normalization strips dynamic data:
- UUIDs → `<UUID>`
- Dates → `<DATE>`
- Numbers → `<N>`

This means: `"Failed to fetch customer a1b2c3d4-..."` and `"Failed to fetch customer e5f6g7h8-..."` get the same fingerprint.

---

## Priority Scoring

Errors are scored for fix-priority ordering:

```
score = (occurrence_count × 10)
      + type_weight (React=8, Global=10, Server=9, API=6, ...)
      + recency_bonus (last hour: +20, last 24h: +10)
      + source_bonus (+5 if source_file available)
      + endpoint_bonus (+3 if api_endpoint available)
      + stack_bonus (+2 if stack trace available)
```

---

## Integration with Code-Review-Graph

When tracing errors, the auto-fixer queries the knowledge graph to find:

1. **semantic_search_nodes(error_message)** — Find related functions/components
2. **query_graph(callers_of, source_function)** — Find what calls the broken code
3. **query_graph(tests_for, source_function)** — Find related tests
4. **get_impact_radius(source_file)** — Understand blast radius of changes

This provides much deeper context than grep alone.

---

## Safety Guards

1. **Min occurrence threshold**: Only auto-fix errors seen ≥ 2 times (avoids flukes)
2. **Max attempts**: Errors get max 3 auto-fix attempts before `manual_review`
3. **Test verification**: All fixes must pass `npm run test` before deploy
4. **Build verification**: All fixes must pass `npm run build` before deploy
5. **Dry-run mode**: Preview changes without modifying anything
6. **Version bump**: Every fix bumps `package.json` version
7. **Error recurrence detection**: If a "fixed" error recurs, it's automatically re-opened as `new`

---

## Monitoring Dashboard

Check error stats:

```bash
curl http://localhost:3002/api/telemetry/stats | jq .
```

Response:
```json
{
  "by_type": [
    {"error_type": "React", "count": "12"},
    {"error_type": "API", "count": "8"}
  ],
  "by_status": [
    {"status": "new", "count": "5"},
    {"status": "deployed", "count": "15"}
  ],
  "total": 20,
  "last_24h": 3
}
```

---

## Extension Points

### Adding a new error source

1. Import `reportError` or `reportApiError` from `@/lib/errorReporter`
2. Call it with appropriate error_type and context
3. The rest of the pipeline handles it automatically

### Custom fix verification hooks

Add scripts in `scripts/fix-verification/` that run after a fix:
- `scripts/fix-verification/smoke-test.sh` — Browser smoke tests
- `scripts/fix-verification/perf-check.sh` — Performance regression check
- `scripts/fix-verification/security-scan.sh` — Security audit

### CI/CD integration

Add to GitHub Actions:
```yaml
name: AutoFixer Check
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
jobs:
  auto-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run AutoFixer
        run: node scripts/auto-fixer.js --once
        env:
          API_URL: ${{ secrets.PROD_API_URL }}
```

---

## Troubleshooting

### Error collection not working
```bash
# Check telemetry endpoint
curl -X POST https://nk.2checkin.com/api/telemetry/errors \
  -H "Content-Type: application/json" \
  -d '{"error_type":"Test","message":"Test","stack":""}'
```

### Error events table doesn't exist
```bash
# Run the migration
psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo < api/migrations/018_error_events.sql
```

### Auto-fixer can't connect to API
```bash
# Set the correct API URL
export API_URL=http://localhost:3002/api
# Or for production
export API_URL=https://nk.2checkin.com/api
```

---

*Blueprint version: 1.0 — 2026-04-29*
*For related docs, see: `docs/`, `notes/🚀 Deployment Guide.md`, `website/agents.md`*
