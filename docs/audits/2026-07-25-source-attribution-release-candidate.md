# Source-attribution incident — v0.33.0 release candidate

**Status:** local candidate PASS; PR/CI and all production actions remain gated.

**Scope:** Tasks 10–13 integrated on top of `origin/main` `22d691535`; Task 14 and Task 15 evidence refreshed. No NK/NK2 deployment, live migration, or source repair was performed.

## Expected Behavior

| Visit / action | Expected result |
|---|---|
| Edit a paid or prior-period service and choose another order source | Source controls are disabled; ordinary API mutation returns `409 SOURCE_IMMUTABLE`. |
| Edit a non-source field on that locked service | Save succeeds; direct order source is unchanged; no source audit row is written. |
| Use the permissioned correction endpoint | Requires the correction permission and reason/evidence/rollback metadata; correction and append-only audit commit atomically. |
| Create an order without an explicit source | The active customer source is snapshotted once to the order and audited in the same transaction. |
| Change a customer source later | Existing order attribution and closed-period report buckets do not move. |
| Rename, retype, or delete a referenced source label | Rename/retype fails with `CUSTOMER_SOURCE_LABEL_LOCKED`; delete fails with `CUSTOMER_SOURCE_IN_USE`; description and active-state maintenance remain allowed. |
| Read reports/exports | Order and customer attribution are separate; exports label `Nguồn đơn` and `Nguồn KH` distinctly. |
| Update or delete a source-audit row | PostgreSQL append-only triggers reject the operation. |
| Access a correction/report route without permission | Request fails closed. |

## Candidate proof

| Gate | Result |
|---|---|
| Focused API matrix | PASS — 16 suites / 188 tests |
| Focused frontend matrix | PASS — 4 files / 19 tests |
| Settings Chromium smoke | PASS — referenced lock badges, inactive history, create-new guidance, active toggle restored |
| Paid/closed ServiceForm smoke | PASS — 16 source buttons disabled; lock copy visible; notes-only save succeeded; source unchanged; note restored |
| Migration 051/053 clone rehearsal | PASS — idempotent apply; correction + audit insert; UPDATE/DELETE blocked; probe rolled back |
| Migration 051/053 local E2E apply | PASS — both tables, two grants, and two append-only triggers present |
| Source-audit semgrep | PASS — 0 findings |
| Default semgrep on changed production code | PASS — 41 paths, 0 findings, 0 scan errors |
| Default semgrep on changed tests too | REVIEWED — 5 test-harness-only heuristics (4 WARNING, 1 INFO), 0 HIGH/ERROR and no production finding |
| Website lint | PASS with 40 non-fatal existing warnings |
| Website build | PASS with existing bundle/dynamic-import warnings |
| Documentation governance | PASS |

The full repository sweeps remain at unrelated pre-existing baselines: API 80/82 suites (973/985 tests) and website 95 passed / 2 skipped / 4 failed files (566 passed / 32 skipped / 5 failed tests). The candidate does not change the failing test or implementation paths; the incident-focused matrices above are green.

## Production and human gates

1. **PR review/merge:** human review plus required CI is the merge boundary.
2. **CP-E clinic approvals:** 0/6 clinics approved; 220 proposed repair rows remain non-executable.
3. **CP-G migration 050:** separate immediate production confirmation is required; it must not be bundled with app deployment or repair.
4. **Migrations 051/053 and app deploy:** execute only from synchronized merged `main`, under a fresh immediate production confirmation and rollback plan.
5. **Live acceptance:** prove canonical deployed SHA plus locked edit, correction/audit, taxonomy protection, and order/customer report separation before calling the incident closed.

Production source repair remains explicitly out of scope until CP-E closes per clinic and a fresh CP-F confirmation authorizes the exact approved rows.
