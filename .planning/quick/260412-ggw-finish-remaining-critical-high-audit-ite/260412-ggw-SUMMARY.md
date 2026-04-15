---
quick_id: 260412-ggw
plan: 01
status: complete
completed: 2026-04-12
branch: ai-develop
pushed: false
commits:
  - hash: 3b5b7511
    subject: "fix(security): harden docker-compose + server config (env vars, local port, body limit, CORS)"
  - hash: 8a71af03
    subject: "fix(api): guard write endpoints with requirePermission and stop leaking err.message"
  - hash: e428118d
    subject: "fix(data): persist employee role fields, enforce payment void idempotency, allowlist FK tables"
requirements_completed:
  - AUDIT-CRIT1-CONFIG
  - AUDIT-HIGH1-CORS
  - AUDIT-HIGH7-ERRLEAK
  - AUDIT-HIGH8-DBPORT
  - AUDIT-CRIT2-PERM
  - AUDIT-DATA-INTEGRITY
---

# Quick 260412-ggw: Finish Remaining CRITICAL/HIGH Audit Items — Summary

**One-liner:** Closed 6 CRITICAL/HIGH audit findings in 3 atomic commits — secret hardening + CORS + body limit, requirePermission on 18 write endpoints + err.message leak sweep, employee role persistence + void idempotency + FK allowlist.

## Commits

| # | Hash | Subject | Files |
|---|------|---------|-------|
| 1 | `3b5b7511` | fix(security): harden docker-compose + server config | docker-compose.yml, .env.example, .gitignore, api/src/server.js |
| 2 | `8a71af03` | fix(api): guard write endpoints with requirePermission | 7 route files |
| 3 | `e428118d` | fix(data): persist employee role fields, void idempotency, FK allowlist | migrations/013, 4 route files |

## Verification Results

### Task 1 — Config hardening: PASS
- docker-compose.yml uses `${JWT_SECRET}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}` (no plaintext secrets)
- API port bound to `127.0.0.1:3002:3002` (no public binding)
- `DATABASE_URL` uses env var substitution for postgres creds
- `.env.example` created with 4 documented variables
- `.env` added to `.gitignore`
- `express.json({ limit: '1mb' })` enforced
- CORS allowlist adds `https://tbot.vn` + `https://www.tbot.vn`
- `docker compose config` dry-run succeeds with sample env vars

### Task 2 — Permission guards + error-leak sweep: PASS
- `requirePermission(...)` count per file:
  - permissions.js: 3 (permissions.edit)
  - employees.js: 3 (employees.edit)
  - bankSettings.js: 1 (payment.edit)
  - systemPreferences.js: 4 (settings.edit)
  - websitePages.js: 3 (website.edit)
  - monthlyPlans.js: 4 (payment.edit)
  - **Total: 18 endpoints guarded**
- Zero `res.status(500).json({ error: err.message })` remain in the 5 target files
- Server boots cleanly with all routes registered

### Task 3 — Data-integrity fixes: PASS
- `api/migrations/013_add_employee_role_fields.sql` exists with 4 `ADD COLUMN IF NOT EXISTS` statements
- `employees.js` POST: INSERT now includes isdoctor, isassistant, isreceptionist, startworkdate (22 params)
- `employees.js` PUT: role fields flow through dynamic update builder via `fields` object
- `payments.js` void UPDATE has `AND status = 'posted'` in WHERE clause (idempotent — second call returns 404)
- `appointments.js`: FK_TABLES allowlist `['partners', 'companies', 'employees']` + throw on unknown table
- `dashboardReports.js`: FK_TABLES allowlist `['companies']` + throw on unknown table

### Final End-to-End Verification: PASS
- All 11 modified files pass `node -c` syntax check
- Server boots cleanly with env vars
- `docker compose config` resolves with sample env
- Branch `ai-develop` is ahead by 3 plan commits, NOT pushed

## Deviations from Plan

None of substance. Two minor adjustments:

1. **FK_TABLES error message shortened** — Plan specified a longer message like `"foreignKeyExists: table \"${table}\" is not on the allowlist"`. Shortened to `"foreignKeyExists: \"${table}\" not allowlisted"` to fit under a hook character limit for edit chunks. Functionality is identical (same allowlist enforcement, same throw).

2. **`timeout` command not on macOS** — Verification script's `timeout 5 node ...` calls failed because macOS doesn't ship GNU `timeout`. Ran the boot check directly (Node exits immediately after printing `boot-ok` since `NODE_ENV=test` skips `app.listen`), which achieves the same verification intent.

No Rule 1/2/3 auto-fixes were triggered. No architectural (Rule 4) decisions needed.

## Deferred Items

None. All 3 tasks complete, all gates PASS.

## Known Stubs

None introduced by this plan.

## Threat Flags

None. No new security surface introduced — all changes either tighten existing surface (permission guards, CORS allowlist) or improve data integrity (persisted role fields, idempotent void, FK allowlist).

## Next Steps (out of scope for this plan)

Per AUDIT_REPORT.md Phase 4/5 items remaining (not handled here):
- HTTP-only refresh cookies (HIGH-4)
- Rate limiting on login (HIGH-2) — already present at `api/src/server.js:58`
- Helmet headers (HIGH-3) — already present at `api/src/server.js:53`
- Soft-delete employees
- UUID customer codes
- `toSnakeCase` breaking isDoctor filter (MEDIUM-20)

## Self-Check: PASSED

All three commits present in `git log`:
- FOUND: 3b5b7511
- FOUND: 8a71af03
- FOUND: e428118d

All expected files exist:
- FOUND: api/migrations/013_add_employee_role_fields.sql
- FOUND: .env.example

No push performed — branch `ai-develop` is ahead of `origin/ai-develop`, awaiting user review.
