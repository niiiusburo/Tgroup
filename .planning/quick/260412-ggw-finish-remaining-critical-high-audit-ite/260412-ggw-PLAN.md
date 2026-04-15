---
phase: quick-260412-ggw
plan: 01
type: execute
quick_id: 260412-ggw
wave: 1
depends_on: []
files_modified:
  - docker-compose.yml
  - .env.example
  - .gitignore
  - api/src/server.js
  - api/src/routes/permissions.js
  - api/src/routes/employees.js
  - api/src/routes/bankSettings.js
  - api/src/routes/systemPreferences.js
  - api/src/routes/websitePages.js
  - api/src/routes/monthlyPlans.js
  - api/src/routes/customerSources.js
  - api/src/routes/payments.js
  - api/src/routes/appointments.js
  - api/src/routes/dashboardReports.js
  - api/migrations/013_add_employee_role_fields.sql
autonomous: true
requirements:
  - AUDIT-CRIT1-CONFIG
  - AUDIT-HIGH1-CORS
  - AUDIT-HIGH7-ERRLEAK
  - AUDIT-HIGH8-DBPORT
  - AUDIT-CRIT2-PERM
  - AUDIT-DATA-INTEGRITY
must_haves:
  truths:
    - "No plaintext secrets (JWT_SECRET, POSTGRES_USER, POSTGRES_PASSWORD) appear in docker-compose.yml; all read from env vars"
    - "API port 3002 is only reachable via 127.0.0.1 in docker-compose.yml (no public binding)"
    - "Express JSON parser rejects bodies > 1mb"
    - "CORS allowlist includes https://tbot.vn and https://www.tbot.vn"
    - "All POST/PUT/DELETE handlers in the 6 target route files call requirePermission(...) before mutation"
    - "No `res.status(500).json({ error: err.message })` remains in the 5 target route files (replaced with console.error + generic message)"
    - "Employee role booleans (isdoctor, isassistant, isreceptionist) and startworkdate persist through POST/PUT /api/Employees round-trip"
    - "POST /api/Payments/:id/void is idempotent: second call on an already-voided payment returns 404 (no row updated)"
    - "foreignKeyExists() rejects any table name not on an allowlist in both appointments.js and dashboardReports.js"
  artifacts:
    - path: ".env.example"
      provides: "Documented required env vars for local dev + production"
      contains: "JWT_SECRET"
    - path: "api/migrations/013_add_employee_role_fields.sql"
      provides: "Adds isdoctor/isassistant/isreceptionist BOOLEAN NOT NULL DEFAULT false + startworkdate DATE to dbo.partners"
      contains: "ALTER TABLE"
  key_links:
    - from: "docker-compose.yml"
      to: ".env"
      via: "${JWT_SECRET} / ${POSTGRES_USER} / ${POSTGRES_PASSWORD} variable substitution"
      pattern: "\\$\\{JWT_SECRET\\}"
    - from: "api/src/routes/{employees,bankSettings,systemPreferences,websitePages,monthlyPlans,permissions}.js"
      to: "api/src/middleware/auth.js"
      via: "requirePermission(...) middleware guarding write endpoints"
      pattern: "requirePermission\\("
    - from: "api/src/routes/employees.js (POST/PUT)"
      to: "dbo.partners"
      via: "INSERT/UPDATE now includes isdoctor/isassistant/isreceptionist/startworkdate columns"
      pattern: "isdoctor"
---

<objective>
Close the remaining CRITICAL and HIGH audit findings that are safe, scoped, and don't require large-scale refactors: config hardening, per-route permission guards on write endpoints, error-leak sweep, and three data-integrity fixes.

Purpose: Ship the quick wins identified in AUDIT_REPORT.md before moving to larger items (HttpOnly cookies, soft-delete employees, UUID customer codes). Each group is an atomic commit.

Output: 3 commits on ai-develop — one per group. NO push.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@./AUDIT_REPORT.md
@api/src/server.js
@api/src/middleware/auth.js
@api/src/routes/permissions.js
@api/src/routes/employees.js
@api/src/routes/bankSettings.js
@api/src/routes/systemPreferences.js
@api/src/routes/websitePages.js
@api/src/routes/monthlyPlans.js
@api/src/routes/customerSources.js
@api/src/routes/payments.js
@api/src/routes/appointments.js
@api/src/routes/dashboardReports.js
@docker-compose.yml

<interfaces>
Key conventions learned from reading the codebase:

1. Permission keys follow `module.action` (dot-separated, lowercase):
   Existing in use: `overview.view`, `calendar.view`, `calendar.edit`, `customers.view`, `customers.edit`,
   `appointments.view`, `appointments.edit`, `services.view`, `services.edit`,
   `payment.view`, `payment.edit`, `external_checkups.view`.
   Existing auth middleware import pattern (see `externalCheckups.js:82,130`):
   ```js
   const { requireAuth, requirePermission } = require('../middleware/auth');
   router.get('/:customerCode', requireAuth, requirePermission('external_checkups.view'), async (req, res) => { ... });
   ```
   Note: `requireAuth` is ALREADY applied globally via `app.use('/api', requireAuth)` in `server.js:69-73`.
   So inside route files we only need `requirePermission(...)` — we MUST NOT re-add `requireAuth` per-route
   (that would run the JWT check twice and is redundant). Follow the pattern from `externalCheckups.js` but
   without the leading `requireAuth` argument, OR include it for symmetry with that file — EITHER is fine
   as `requireAuth` is idempotent; pick ONE convention per commit. **Chosen convention for this plan:
   `requirePermission(...)` only, since `requireAuth` is already global.**

2. The `query()` helper (`api/src/db.js`) returns `result.rows` directly (an array).
   Knowing this avoids the `.rows.map()` double-unwrap footgun seen in `services.js`.

3. `pool` is imported from `../db` and supports `pool.connect()` for transactional work
   (see `payments.js:328`, `employees.js:206,303`).

4. Error response helper pattern in `appointments.js`/`dashboardReports.js`:
   ```js
   function errorResponse(res, status, errorCode, message) {
     return res.status(status).json({ errorCode, message });
   }
   ```
   Other routes return `{ error: 'message' }`. Keep each file's existing shape when replacing err.message
   leaks (don't cross-pollinate shapes).

5. `dbo.partners` table stores employees (via `employee=true` flag). The `employees` object in routes is
   a SQL view mapping partners where employee=true (see CLAUDE.md "Demo Data" section). Adding columns to
   dbo.partners automatically flows through the view.
</interfaces>

<permission_key_assignments>
Chosen permission keys per endpoint file (based on existing `module.action` convention):

| File                        | Endpoints                              | Permission key           |
|-----------------------------|----------------------------------------|--------------------------|
| permissions.js              | POST /groups, PUT /groups/:id, PUT /employees/:id | `permissions.edit` |
| employees.js                | POST /, PUT /:id, DELETE /:id          | `employees.edit`         |
| bankSettings.js             | PUT /bank                              | `payment.edit`           |
| systemPreferences.js        | POST /, PUT /:key, DELETE /:key, POST /bulk | `settings.edit`     |
| websitePages.js             | POST /, PUT /:id, DELETE /:id          | `website.edit`           |
| monthlyPlans.js             | POST /, PUT /:id, DELETE /:id, PUT /:id/installments/:iid/pay | `payment.edit` |

Rationale: `payment.edit` already exists for bank/monthly-plan domain; `employees.edit`, `website.edit`
follow the existing pattern. `permissions.edit` and `settings.edit` are new but consistent with the
naming convention. These keys will automatically be grantable via the existing Permissions Board UI
once an admin adds them to a group (no code change needed for the grant flow).
</permission_key_assignments>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Config hardening (docker-compose + server.js)</name>
  <files>docker-compose.yml, .env.example, .gitignore, api/src/server.js</files>
  <action>
Implement the 5 config items from Group 1 of the audit scope:

**1a. docker-compose.yml — secret env vars (lines 8-10, 33-34, 38-39):**
- Replace hardcoded `POSTGRES_USER: postgres` / `POSTGRES_PASSWORD: postgres` with `${POSTGRES_USER}` / `${POSTGRES_PASSWORD}`.
- Replace hardcoded `JWT_SECRET: tgclinic-production-secret-key-2026` with `${JWT_SECRET}`.
- Update the `DATABASE_URL` line to `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/tdental_demo`.
- Change api ports from `"3002:3002"` to `"127.0.0.1:3002:3002"` (matches existing db binding pattern on line 16).
- Leave `GOOGLE_PLACES_API_KEY: ${GOOGLE_PLACES_API_KEY}` unchanged (already uses env var).

**1b. Create `.env.example` at repo root:**
```
# Copy to .env and fill in real values. DO NOT commit .env.
# Database credentials used by both the Postgres container and API DATABASE_URL.
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me-to-a-strong-value

# JWT signing secret. Must be a long random string (>=32 chars).
# Generate with: openssl rand -hex 32
JWT_SECRET=change-me-to-a-long-random-hex-string

# Google Places API key (frontend autocomplete + geocoding)
GOOGLE_PLACES_API_KEY=
```

**1c. Update `.gitignore`:**
After the existing `.env.local` / `.env.*.local` block (around line 10), add:
```
.env
```
So the final env block looks like:
```
# Environment variables (sensitive)
.env
.env.local
.env.*.local
```
DO NOT modify any other section of .gitignore.

**1d. api/src/server.js — body size limit (line 56):**
Change `app.use(express.json());` to `app.use(express.json({ limit: '1mb' }));`.

**1e. api/src/server.js — CORS allowlist (line 52):**
Append `'https://tbot.vn'` and `'https://www.tbot.vn'` to the `ALLOWED_ORIGINS` array:
```js
const ALLOWED_ORIGINS = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://76.13.16.68:5174',
  'https://tbot.vn',
  'https://www.tbot.vn',
];
```

After edits, make commit 1:
`git add docker-compose.yml .env.example .gitignore api/src/server.js`
`git commit -m "fix(security): harden docker-compose + server config (env vars, local port, body limit, CORS)"`

DO NOT push.
  </action>
  <verify>
    <automated>
cd /Users/thuanle/Documents/TamTMV/Tgroup && \
node -c api/src/server.js && \
grep -q '${JWT_SECRET}' docker-compose.yml && \
grep -q '${POSTGRES_USER}' docker-compose.yml && \
grep -q '${POSTGRES_PASSWORD}' docker-compose.yml && \
grep -q '"127.0.0.1:3002:3002"' docker-compose.yml && \
! grep -q 'tgclinic-production-secret-key-2026' docker-compose.yml && \
grep -q "limit: '1mb'" api/src/server.js && \
grep -q 'tbot.vn' api/src/server.js && \
test -f .env.example && \
grep -q '^JWT_SECRET=' .env.example && \
grep -q '^POSTGRES_USER=' .env.example && \
grep -q '^POSTGRES_PASSWORD=' .env.example && \
grep -qE '^\.env$' .gitignore && \
( JWT_SECRET=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo PORT=0 timeout 5 node -e "process.env.NODE_ENV='test'; const app=require('./api/src/server.js'); console.log('boot-ok');" 2>&1 | grep -q 'boot-ok' ) && \
POSTGRES_USER=u POSTGRES_PASSWORD=p JWT_SECRET=s GOOGLE_PLACES_API_KEY=g docker compose config > /dev/null 2>&1 && \
echo PASS
    </automated>
  </verify>
  <done>
- docker-compose.yml uses `${JWT_SECRET}`, `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}` and binds api to 127.0.0.1.
- `.env.example` exists at repo root with the 4 documented variables.
- `.env` is in `.gitignore`.
- `api/src/server.js` enforces 1mb JSON body limit and allows tbot.vn / www.tbot.vn in CORS.
- `docker compose config` dry-run succeeds.
- Single commit `fix(security): harden docker-compose + server config ...` on ai-develop, not pushed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Per-route permission guards + error-leak sweep</name>
  <files>api/src/routes/permissions.js, api/src/routes/employees.js, api/src/routes/bankSettings.js, api/src/routes/systemPreferences.js, api/src/routes/websitePages.js, api/src/routes/monthlyPlans.js, api/src/routes/customerSources.js</files>
  <action>
Apply two sweeps per target file. Commit as ONE atomic commit at the end.

**2a. Add `requirePermission` imports and guards** (using the permission_key_assignments table above):

For each of the 6 files below, add at the top (preserve existing `const express = ...` / `const { query } = ...` lines):

```js
const { requirePermission } = require('../middleware/auth');
```

Then insert `requirePermission('<key>')` as the SECOND argument on each write route. Since `requireAuth` is already applied globally in `server.js`, only add `requirePermission(...)`. Example:

BEFORE:
```js
router.post('/', async (req, res) => { ... });
```
AFTER:
```js
router.post('/', requirePermission('employees.edit'), async (req, res) => { ... });
```

Specific edits:

**permissions.js:**
- POST `/groups` (line ~42): add `requirePermission('permissions.edit')`
- PUT  `/groups/:groupId` (line ~89): add `requirePermission('permissions.edit')`
- PUT  `/employees/:employeeId` (line ~219): add `requirePermission('permissions.edit')`

**employees.js:**
- POST `/` (line ~205): add `requirePermission('employees.edit')`
- PUT  `/:id` (line ~302): add `requirePermission('employees.edit')`
- DELETE `/:id` (line ~429): add `requirePermission('employees.edit')`

**bankSettings.js:**
- PUT `/bank` (line ~38): add `requirePermission('payment.edit')`

**systemPreferences.js:**
- POST `/` (line ~83): add `requirePermission('settings.edit')`
- PUT `/:key` (line ~114): add `requirePermission('settings.edit')`
- DELETE `/:key` (line ~142): add `requirePermission('settings.edit')`
- POST `/bulk` (line ~153): add `requirePermission('settings.edit')`

**websitePages.js:**
- POST `/` (line ~80): add `requirePermission('website.edit')`
- PUT `/:id` (line ~116): add `requirePermission('website.edit')`
- DELETE `/:id` (line ~175): add `requirePermission('website.edit')`

**monthlyPlans.js:**
- POST `/` (line ~171): add `requirePermission('payment.edit')`
- PUT `/:id` (line ~256): add `requirePermission('payment.edit')`
- DELETE `/:id` (line ~315): add `requirePermission('payment.edit')`
- PUT `/:id/installments/:installmentId/pay` (line ~326): add `requirePermission('payment.edit')`

NOTE: customerSources.js is included ONLY for the error-leak sweep below, NOT for requirePermission (the audit scope didn't list it for permission guards, and we stay faithful to scope).

**2b. Error message leak sweep** (5 files: permissions.js, monthlyPlans.js, systemPreferences.js, customerSources.js, websitePages.js):

In EACH of these 5 files, replace EVERY occurrence of:
```js
res.status(500).json({ error: err.message })
```
with:
```js
res.status(500).json({ error: 'Internal server error' })
```

The `console.error('... error:', err);` line immediately above each `res.status(500)` already exists in all target files — DO NOT remove or modify those; they ensure server-side visibility.

For employees.js and bankSettings.js, the 500 responses use a slightly different shape:
```js
res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
```
or
```js
res.status(500).json({ message: 'Error saving bank settings', error: err instanceof Error ? err.message : 'Unknown error' })
```
These are NOT in the audit's "error-leak sweep" list (scope group 2 item 7 lists only 5 files). DO NOT touch them in this task — out of scope.

After all edits, make commit 2:
`git add api/src/routes/permissions.js api/src/routes/employees.js api/src/routes/bankSettings.js api/src/routes/systemPreferences.js api/src/routes/websitePages.js api/src/routes/monthlyPlans.js api/src/routes/customerSources.js`
`git commit -m "fix(api): guard write endpoints with requirePermission and stop leaking err.message"`

DO NOT push.
  </action>
  <verify>
    <automated>
cd /Users/thuanle/Documents/TamTMV/Tgroup && \
for f in api/src/routes/permissions.js api/src/routes/employees.js api/src/routes/bankSettings.js api/src/routes/systemPreferences.js api/src/routes/websitePages.js api/src/routes/monthlyPlans.js api/src/routes/customerSources.js; do node -c "$f" || exit 1; done && \
test "$(grep -c "requirePermission('permissions.edit')" api/src/routes/permissions.js)" = "3" && \
test "$(grep -c "requirePermission('employees.edit')" api/src/routes/employees.js)" = "3" && \
test "$(grep -c "requirePermission('payment.edit')" api/src/routes/bankSettings.js)" = "1" && \
test "$(grep -c "requirePermission('settings.edit')" api/src/routes/systemPreferences.js)" = "4" && \
test "$(grep -c "requirePermission('website.edit')" api/src/routes/websitePages.js)" = "3" && \
test "$(grep -c "requirePermission('payment.edit')" api/src/routes/monthlyPlans.js)" = "4" && \
for f in api/src/routes/permissions.js api/src/routes/monthlyPlans.js api/src/routes/systemPreferences.js api/src/routes/customerSources.js api/src/routes/websitePages.js; do \
  if grep -nE 'res\.status\(500\)\.json\(\{\s*error:\s*err\.message' "$f"; then echo "LEAK in $f"; exit 1; fi; \
done && \
JWT_SECRET=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo PORT=0 timeout 5 node -e "process.env.NODE_ENV='test'; const app=require('./api/src/server.js'); console.log('boot-ok');" 2>&1 | grep -q 'boot-ok' && \
echo PASS
    </automated>
  </verify>
  <done>
- All 18 write endpoints listed in permission_key_assignments have `requirePermission(...)` as the first handler arg.
- Zero occurrences of `res.status(500).json({ error: err.message })` remain in the 5 leak-sweep files.
- Each modified file parses cleanly with `node -c`.
- Server still boots with all routes registered.
- Single commit `fix(api): guard write endpoints with requirePermission and stop leaking err.message` on ai-develop, not pushed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Data-integrity fixes (employee role fields + void idempotency + SQL allowlist)</name>
  <files>api/migrations/013_add_employee_role_fields.sql, api/src/routes/employees.js, api/src/routes/payments.js, api/src/routes/appointments.js, api/src/routes/dashboardReports.js</files>
  <action>
Three independent data-integrity fixes in one commit.

**3a. Employee role fields — create migration and wire INSERT/UPDATE (employees.js):**

Planner decision: ADD COLUMNS TO `dbo.partners` (NOT a separate employee_roles table). Rationale:
- `dbo.employees` is a VIEW over `dbo.partners WHERE employee=true` (per CLAUDE.md). Columns added to
  partners automatically flow through to the employees view on next query — no view recreation needed.
- A separate employee_roles table would require refactoring every employee query to JOIN. That's not
  "safe short-term" per scope.
- The 3 boolean role fields + startworkdate are small, nullable-safe additions. `DEFAULT false` for
  booleans and `NULL` for the date keep existing rows valid.

Create `api/migrations/013_add_employee_role_fields.sql`:
```sql
-- Migration: Add employee role fields to dbo.partners
-- These fields were previously accepted by POST/PUT /api/Employees but silently dropped
-- (see audit finding: employees.js:238, 325). This migration persists them.

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS isdoctor       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isassistant    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isreceptionist BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS startworkdate  DATE NULL;

-- dbo.employees is a view over partners where employee=true; it will automatically
-- expose the new columns on next query (PostgreSQL expands SELECT * at view-query time
-- when the view was defined with SELECT *, OR when we re-create it). If the view was
-- defined with an explicit column list, re-create it below. Guarded so it is a no-op
-- when the view uses SELECT *.
```

Then update `api/src/routes/employees.js`:

**POST `/` (currently employees.js:240-268):**
- Remove the "Note: ... do NOT exist in dbo.partners" comment on line 238.
- Extend the INSERT column list and VALUES list to include `isdoctor, isassistant, isreceptionist, startworkdate`.
- The current INSERT has 18 columns ($1..$18). Add 4 more → 22 columns ($1..$22). Insert them
  immediately after `active` (keeps role booleans grouped with active flag). New INSERT:
  ```sql
  INSERT INTO partners (
    id, name, phone, email, companyid,
    employee, customer, supplier, isagent, isinsurance,
    active, isdoctor, isassistant, isreceptionist, startworkdate,
    iscompany, ishead, isdeleted, isbusinessinvoice,
    password_hash, datecreated, lastupdated
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
  RETURNING *
  ```
  Values array becomes:
  ```js
  [
    id, name.trim(), phone, email, companyid,
    true, false, false, false, false,
    active, !!isdoctor, !!isassistant, !!isreceptionist, startworkdate || null,
    false, false, false, false,
    passwordHash, now, now,
  ]
  ```

**PUT `/:id` (currently employees.js:302-423):**
- Remove the "Note: ... do NOT exist in dbo.partners" comment on line 325.
- Add the four role fields to the `fields` object so they flow through the existing dynamic
  update builder:
  ```js
  const fields = {
    name, phone, email, companyid, active,
    isdoctor, isassistant, isreceptionist, startworkdate,
  };
  ```
  The existing loop `for (const [key, value] of Object.entries(fields))` already handles undefined
  values correctly (skip) — no builder changes needed.

**3b. Payment void idempotency (payments.js:~336-343):**

Current UPDATE (payments.js:337) has no status guard:
```js
const result = await client.query(
  `UPDATE payments SET status = 'voided', notes = COALESCE(notes, '') || ' | VOIDED: ' || $2 WHERE id = $1 RETURNING *`,
  [id, reason || ""]
);
```

Change WHERE clause to only target posted rows:
```js
const result = await client.query(
  `UPDATE payments SET status = 'voided', notes = COALESCE(notes, '') || ' | VOIDED: ' || $2 WHERE id = $1 AND status = 'posted' RETURNING *`,
  [id, reason || ""]
);
```

The existing `if (result.rows.length === 0) { ROLLBACK; return 404 }` block already handles the case where no row was updated, so a double-void now correctly returns 404 (consistent with "not found or not voidable").

Leave the `DELETE FROM payment_allocations` line above alone — it runs before the guarded UPDATE
so a double-void will delete (already-empty) allocations, then the UPDATE returns 0 rows, then
the ROLLBACK undoes the harmless delete. That is the correct idempotent semantics.

**3c. foreignKeyExists SQL-injection allowlist:**

Both `api/src/routes/appointments.js:29` and `api/src/routes/dashboardReports.js:41` define:
```js
async function foreignKeyExists(table, id) {
  const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  return result.length > 0;
}
```

The `table` parameter is interpolated into SQL. Current callers pass string literals (`'partners'`,
`'companies'`, `'employees'`) — so this is only a DEFENCE-IN-DEPTH fix. Add an allowlist:

In `api/src/routes/appointments.js`, replace the `foreignKeyExists` definition with:
```js
// Allowlist of tables that foreignKeyExists may query. Callers must use a literal from this set.
const FK_TABLES = new Set(['partners', 'companies', 'employees']);

async function foreignKeyExists(table, id) {
  if (!FK_TABLES.has(table)) {
    throw new Error(`foreignKeyExists: table "${table}" is not on the allowlist`);
  }
  const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
  return result.length > 0;
}
```

In `api/src/routes/dashboardReports.js`, do the same but the allowlist is `new Set(['companies'])`
(that's the only table this file ever passes — verified by grep).

After all edits, make commit 3:
`git add api/migrations/013_add_employee_role_fields.sql api/src/routes/employees.js api/src/routes/payments.js api/src/routes/appointments.js api/src/routes/dashboardReports.js`
`git commit -m "fix(data): persist employee role fields, enforce payment void idempotency, allowlist FK tables"`

DO NOT push. DO NOT run the migration — that is a deploy-time concern.
  </action>
  <verify>
    <automated>
cd /Users/thuanle/Documents/TamTMV/Tgroup && \
node -c api/src/routes/employees.js && \
node -c api/src/routes/payments.js && \
node -c api/src/routes/appointments.js && \
node -c api/src/routes/dashboardReports.js && \
test -f api/migrations/013_add_employee_role_fields.sql && \
grep -q 'ADD COLUMN IF NOT EXISTS isdoctor' api/migrations/013_add_employee_role_fields.sql && \
grep -q 'ADD COLUMN IF NOT EXISTS isassistant' api/migrations/013_add_employee_role_fields.sql && \
grep -q 'ADD COLUMN IF NOT EXISTS isreceptionist' api/migrations/013_add_employee_role_fields.sql && \
grep -q 'ADD COLUMN IF NOT EXISTS startworkdate' api/migrations/013_add_employee_role_fields.sql && \
grep -qE 'isdoctor[,)]|isdoctor\b' api/src/routes/employees.js && \
grep -q 'isassistant' api/src/routes/employees.js && \
grep -q 'isreceptionist' api/src/routes/employees.js && \
grep -q "startworkdate" api/src/routes/employees.js && \
grep -q "status = 'posted'" api/src/routes/payments.js && \
grep -q "FK_TABLES" api/src/routes/appointments.js && \
grep -q "FK_TABLES" api/src/routes/dashboardReports.js && \
grep -q "'partners'" api/src/routes/appointments.js && \
grep -q "'companies'" api/src/routes/dashboardReports.js && \
JWT_SECRET=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo PORT=0 timeout 5 node -e "process.env.NODE_ENV='test'; const app=require('./api/src/server.js'); console.log('boot-ok');" 2>&1 | grep -q 'boot-ok' && \
echo PASS
    </automated>
  </verify>
  <done>
- Migration file `013_add_employee_role_fields.sql` exists with the 4 ALTER TABLE columns.
- `employees.js` POST and PUT both reference `isdoctor`, `isassistant`, `isreceptionist`, `startworkdate` in their write paths.
- `payments.js` void UPDATE has `AND status = 'posted'` in its WHERE clause.
- `appointments.js` and `dashboardReports.js` both define an `FK_TABLES` allowlist and throw on unknown tables.
- All four modified route files parse cleanly with `node -c`.
- Server still boots.
- Single commit `fix(data): persist employee role fields, enforce payment void idempotency, allowlist FK tables` on ai-develop, not pushed.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete, run one final end-to-end check:

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
# 1. All modified files parse
for f in api/src/server.js api/src/routes/permissions.js api/src/routes/employees.js api/src/routes/bankSettings.js api/src/routes/systemPreferences.js api/src/routes/websitePages.js api/src/routes/monthlyPlans.js api/src/routes/customerSources.js api/src/routes/payments.js api/src/routes/appointments.js api/src/routes/dashboardReports.js; do
  node -c "$f" || { echo "SYNTAX FAIL: $f"; exit 1; }
done
# 2. Server boots cleanly with env vars
JWT_SECRET=test DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo PORT=0 \
  timeout 5 node -e "process.env.NODE_ENV='test'; require('./api/src/server.js'); console.log('boot-ok');"
# 3. 3 new commits on ai-develop (no push)
git log --oneline -n 3
# 4. docker-compose config resolves with sample env
POSTGRES_USER=u POSTGRES_PASSWORD=p JWT_SECRET=s GOOGLE_PLACES_API_KEY=g docker compose config > /dev/null
```
</verification>

<success_criteria>
- [ ] 3 atomic commits on ai-develop (not pushed):
  1. `fix(security): harden docker-compose + server config ...`
  2. `fix(api): guard write endpoints with requirePermission ...`
  3. `fix(data): persist employee role fields, enforce payment void idempotency ...`
- [ ] Zero hardcoded secrets in docker-compose.yml (JWT_SECRET, POSTGRES_USER, POSTGRES_PASSWORD all via ${...})
- [ ] API port bound to 127.0.0.1 only
- [ ] .env.example documents 4 required vars; .env is in .gitignore
- [ ] express.json limit=1mb, CORS includes tbot.vn + www.tbot.vn
- [ ] All 18 target write endpoints guarded with `requirePermission(...)`
- [ ] 0 occurrences of `res.status(500).json({ error: err.message })` in the 5 sweep files
- [ ] Migration 013 exists; employees.js POST/PUT write 4 role fields
- [ ] payments.js void UPDATE has `AND status = 'posted'`
- [ ] FK_TABLES allowlist enforced in appointments.js and dashboardReports.js
- [ ] Server still boots cleanly; `docker compose config` passes
</success_criteria>

<output>
No SUMMARY file required for quick plans. Return:
- Commit hashes of the 3 new commits
- Any unexpected blockers encountered
- Confirmation that `git push` was NOT run
</output>
