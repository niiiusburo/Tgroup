---
phase: 03-architecture-shifts
plan: 01
subsystem: api
tags: [postgres, express, junction-table, crud, transactions]

requires:
  - phase: 02-quick-features-validations
    provides: stable demo DB and working employee endpoints

provides:
  - employee_location_scope junction table in PostgreSQL
  - Scope-aware GET list and detail for Employees API
  - Transactional POST and PUT with locationScopeIds support

affects:
  - 03-02-PLAN.md (EmployeeForm multi-branch UI)
  - 03-03-PLAN.md (customer delete)
  - 03-04-PLAN.md (payment allocations)

tech-stack:
  added: []
  patterns:
    - "Junction table with CASCADE deletes for multi-branch assignment"
    - "pg pool client transactions for atomic CRUD across two tables"
    - "Skip primary ID in secondary scope inserts to avoid logical duplicates"

key-files:
  created:
    - api/migrations/005_employee_location_scope.sql
  modified:
    - api/src/routes/employees.js

key-decisions:
  - "Use pool.connect() with explicit BEGIN/COMMIT/ROLLBACK for transactional scope updates"
  - "Exclude primary companyid from junction inserts to maintain a single source of truth"

patterns-established:
  - "Batch-scope fetch with ANY($1) on the list endpoint to avoid N+1 queries"
  - "Atomic replace pattern for PUT: DELETE all scopes then INSERT new set within a transaction"

requirements-completed:
  - REQ-12

# Metrics
duration: 18min
completed: 2026-04-11
---

# Phase 3 Plan 1: Employee Multi-Branch Scope Backend Summary

**PostgreSQL junction table plus transactional Express CRUD exposing locationScopeIds across list, detail, create, and update endpoints**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-11T10:45:00Z
- **Completed:** 2026-04-11T11:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `employee_location_scope` junction table with FKs to `partners` and `companies`, unique constraint, and indexes
- Extended `GET /api/Employees` to batch-fetch and attach `locationScopeIds` via `ANY($1)`
- Extended `GET /api/Employees/:id` to attach `locationScopeIds`
- Rewrote `POST /api/Employees` to accept `locationScopeIds` and wrap partner insert + scope inserts in a transaction
- Rewrote `PUT /api/Employees/:id` to replace junction records transactionally and return refreshed `locationScopeIds`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create employee_location_scope migration** - `7129a601` (chore)
2. **Task 2: Extend employees.js API for scope CRUD** - `3ae77523` (feat)

**Plan metadata:** `TBD` (docs: complete plan)

## Files Created/Modified
- `api/migrations/005_employee_location_scope.sql` - Junction table DDL with indexes and CASCADE deletes
- `api/src/routes/employees.js` - List/detail scope attachment, transactional POST/PUT with `locationScopeIds`

## Decisions Made
- Used `pool.connect()` with explicit `BEGIN`/`COMMIT`/`ROLLBACK` for atomic scope updates
- Chose to skip the primary `companyid` when inserting scope records to avoid logical duplication; the DB unique constraint enforces this at the data layer as well

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The running API server was being served from `TamDental/tdental-api` instead of `Tgroup/api`. Restarted the server from the correct `Tgroup/api` directory so the modified routes were active for verification.
- During a linter pass, `$${paramIdx}` placeholders in the PUT dynamic query were stripped to `${paramIdx}`. Fixed immediately to restore correct PostgreSQL parameterized query syntax.

## Known Stubs
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend is ready for `03-02` EmployeeForm UI to consume `locationScopeIds`
- No blockers

---
*Phase: 03-architecture-shifts*
*Completed: 2026-04-11*

## Self-Check: PASSED
- SUMMARY.md exists
- Commit 7129a601 (migration) exists
- Commit 3ae77523 (API extension) exists
