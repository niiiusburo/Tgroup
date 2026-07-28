# 12 — Unresolved Questions

**Baseline:** `22d691535`<br>
**Sources:** `/Users/thuanle/firstmate-homes/tgroup/backlog.md` captain holds + residual lane unknowns.<br>
**State:** All holds below awaited captain decision as of package authoring (2026-07-28).

---

## 1. Captain decision holds (complete inventory)

| # | Decision key | Origin | Question | Options (summary) | Blocks |
|---|---|---|---|---|---|
| 1 | `lob-authority-truth` | r1 | LOB authority posture on non-LOB baseline | (a) demote docs to planned/spec-only (b) keep with baseline-SHA banner (c) audit separate LOB pin | AUD-015, Wave 5 |
| 2 | `dead-route-retention` | r1 | Retain or delete unmounted `account.js` / `session.js` / `services.js` | keep indefinitely vs delete after verification window | AUD-078, FIX-054 |
| 3 | `lob-round2-pin` | m | Choose Round-2 LOB git pin set | foundation-only / NK3-only / dual pin / no LOB pin | FLOW-041/042 deep audit |
| 4 | `overview-shell-gate` | a | Must every staff role hold `overview.view` for portal shell? | keep dual-gate vs auth-only parent | AUD-016 |
| 5 | `placeholder-fake-metrics` | a | Ship Commission/Notifications with fabricated KPIs? | labeled coming-soon / hide nav / wire real APIs | AUD-060 |
| 6 | `fe-appointment-status-subset` | a | FE status picker 3 states vs full BE VALID_STATES | intentional subset / expand FE / read-only map hidden | AUD-051/061 |
| 7 | `so-write-permission` | g | SaleOrder write permission model | keep customers.edit + gate UI / move to services.edit / split matrix | AUD-028 |
| 8 | `multi-visit-model` | g | Multi-visit treatment UI product intent | remove UI / implement persisted visits / derive read-only from appts | AUD-029 |
| 9 | `catalog-editor-surfaces` | g | Catalog editor consolidation | single surface / thin alias / document split roles | AUD-073 |
| 10 | `appt-conflict-policy` | e | Appointment conflict policy | allow-all / FE warn-only / hard reject overlap | AUD-053 |
| 11 | `appt-default-create-state` | e | Default create state confirmed vs scheduled | pick one canonical default | AUD-071 |
| 12 | `appt-drag-reschedule` | e | Calendar drag reschedule capability | ship working drag / form-only / day-only MVP | AUD-049/050 |
| 13 | `monthly-plan-cash-link` | f | Should installment pay create canonical payments? | status-only+disclaimer / auto payment+alloc / block until manual payment | AUD-024 |
| 14 | `deposit-overdraft-policy` | f | Allow refund/usage beyond deposit wallet? | hard block / admin+audit / keep silent overdraft | AUD-021 |
| 15 | `payment-physical-delete` | f | Keep or retire physical DELETE on payments | void-only / keep DELETE for admins / soft-delete | AUD-072 |
| 16 | `residual-source-of-truth` | f | Residual column decrement vs recompute from allocations | recompute-after-write / dual+reconcile job / DB-generated | AUD-022/025 |
| 17 | `legacy-dashboard-reports-getsumary` | i | Legacy DashboardReports/GetSumary disposition | delete / keep-deprecated / rewrite | AUD-075 |
| 18 | `investor-hr-via-reports` | i | Investor access to employee HR via Reports | deny / allow / counts-only | AUD-033 |
| 19 | `feedback-admin-perm-model` | j | Feedback admin permission model | wire feedback.* / deprecate and keep permissions.* | AUD-036 |
| 20 | `feedback-attachment-access` | j | Feedback attachment read access model | signed URLs / cookie session / blob fetch (+ auth static) | AUD-066/035 |

---

## 2. Residual unknowns (not full captain holds)

| ID | Unknown | Why open | Suggested next |
|---|---|---|---|
| U-001 | Live NK/NK2 schema vs supplemental migrations (face embeddings, payment_proof UUID) | No DB access | Env inspect on staging |
| U-002 | Whether `schema_migrations` table is used in real deploys | Runbook ignores; install file exists | Ops interview |
| U-003 | Report financial accuracy vs Odoo/legacy | unknowns §8; complex SQL | Reconciliation research (13) |
| U-004 | External API consumers of unmounted Account/Session | unknown clients | Traffic/log window before delete |
| U-005 | Production nginx vhost parity vs repo templates | templates lack timeouts; VPS may differ | Compare live conf |
| U-006 | Investor production role matrices (who lacks overview.view) | A-F001 blast radius | Seed/role export |
| U-007 | LOB leakage status on post-May-19 commits | other pins only | After lob-round2-pin |
| U-008 | Hosoonline upload target / full PII DPA | integrations | Legal + K follow-up |
| U-009 | Commission auto-calc historical trigger | unknowns; no writers found | Product archaeology |
| U-010 | Mobile / third-party apps using JWT APIs | not in repo | Inventory integrations |
| U-011 | Whether cancelled SO should be allocatable | F-S004 | Product money rule |
| U-012 | Dotkhams VIEW vs table residual updates per env | F-S006 | Schema inspect |
| U-013 | Playwright live module-audit against prod | not run | Optional controlled run |
| U-014 | `testsprite_tests` ledger usefulness | dir present, not deep-read | Optional |

---

## 3. Low-confidence items (kept out of master “Confirmed” severity inflation)

| Item | Notes |
|---|---|
| RK-008 LOB cross-DB leak on other SHA | Cite prior audit only as research |
| Practical exploit rate of investor face without UI | Code path confirmed; usage depends on grants |
| Concurrent payment race in production traffic | Code TOCTOU confirmed; frequency unknown |
| Hermes credentials still valid | Presence confirmed; rotation state unknown — assume compromised |

---

## 4. Questions that are **not** unresolved (settled on baseline)

| Topic | Settled fact |
|---|---|
| Is LOB runtime on `22d691535`? | **No** |
| Is global API auth missing? | **No** — requireAuth present |
| Is `/api/Services` mounted? | **No** — unmounted |
| Do Products POST/PUT work? | **No** — missing import |
| Are nginx 300s timeouts in tracked confs? | **No** |
