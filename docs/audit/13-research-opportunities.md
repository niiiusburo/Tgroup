# 13 — Research Opportunities

**Baseline:** `22d691535`<br>
Items here are **not** confirmed production defects ready for Wave-0 coding. They need investigation, measurement, or a separate pin before becoming AUD fixes.

---

## R-001 — Financial report truth vs source systems

| Field | Value |
|---|---|
| Question | Do Reports/Exports paid revenue, outstanding, and deposit figures match Odoo/legacy/accountpayments and bank reality? |
| Why | RK-018; complex SQL; historical over-allocation read caps (F-F019 local audit) |
| Method | Fixture DB golden cases; sample NK anonymized extract; reconcile 30-day window |
| Output | Accuracy matrix + AUD promotions if systematic bias found |
| Depends | Staging DB access |

---

## R-002 — LOB-bearing commit forensic (Round 2)

| Field | Value |
|---|---|
| Question | On captain-chosen LOB pin(s), what is dual-DB isolation, CTV, earnings D13, and cross-DB leak status today? |
| Why | AUD-015/CX-001; May-19 brutal audit may be stale; M-S004 |
| Method | Fresh worktree on pin; re-run M/B/F lanes; never assume park doc current |
| Output | Separate appendix or `docs/audit/lob-<sha>/` |
| Depends | Captain `lob-round2-pin` |

---

## R-003 — Production nginx and deploy path parity

| Field | Value |
|---|---|
| Question | Do live NK/NK2 vhosts include INV-019 timeouts and match repo templates? |
| Why | AUD-013; U-005 |
| Method | Read-only conf dump from VPS; diff to `nginx.conf` / `nginx.docker.conf` |
| Output | Drift list; hotfix conf if live also missing |
| Depends | Ops access |

---

## R-004 — Migration apply history on live DBs

| Field | Value |
|---|---|
| Question | Which of canonical vs supplemental migrations (`api/migrations` vs `api/src/db/migrations`) actually applied? Is `schema_migrations` populated? |
| Why | AUD-054; U-001/U-002; face/payment_proof drift risk |
| Method | `\dt` / version table / column existence probes on staging then prod |
| Output | Applied-set inventory; gap remediation migrations |
| Depends | DB read access |

---

## R-005 — Investor and role matrix in real seeds

| Field | Value |
|---|---|
| Question | Which production roles lack `overview.view`? Which investors have `reports.view` / `customers.view` / face perms? |
| Why | AUD-016 blast; AUD-002–005 exploitability |
| Method | Export permission_groups + investor_accounts (no PII beyond roles) |
| Output | Blast-radius table for Wave 1 prioritization |
| Depends | DB or admin export |

---

## R-006 — External consumer discovery for dead routes

| Field | Value |
|---|---|
| Question | Does any external system still call Account/Session/Services? |
| Why | Captain `dead-route-retention` |
| Method | Access logs, API gateway metrics, partner questionnaires; 30-day window |
| Output | Keep vs delete recommendation with evidence |
| Depends | Log retention |

---

## R-007 — Payment concurrency under real load

| Field | Value |
|---|---|
| Question | How often do concurrent allocations hit same invoice in production? |
| Why | AUD-006 TOCTOU severity calibration |
| Method | Log correlation / residual anomaly queries; synthetic load on staging |
| Output | Priority confirm; maybe escalate monitoring |
| Depends | Staging + optional prod metrics |

---

## R-008 — Privacy / biometric egress boundary

| Field | Value |
|---|---|
| Question | Full data-flow map for CompreFace image retention, Hosoonline payloads, Lark previews, face phone return |
| Why | AUD-039; compliance |
| Method | Code trace + vendor settings + DPA checklist |
| Output | Privacy ADR + minimization backlog |
| Depends | Legal/ops |

---

## R-009 — Commission calculation archaeology

| Field | Value |
|---|---|
| Question | Was auto commission ever computed in a removed service or external job? |
| Why | BL-021; H-F006; unknowns |
| Method | git history; DB `commissionhistories` population; staff interviews |
| Output | Retire vs rebuild product decision input |
| Depends | History + product |

---

## R-010 — Accent-search completeness beyond calendar

| Field | Value |
|---|---|
| Question | Customers/Employees/Payment list accent e2e parity with BL-015 |
| Why | Lane A noted calendar-only e2e |
| Method | Extend playwright; BE search unit already exists |
| Output | Pass/fail; gaps → AUD if fail |
| Depends | e2e stack |

---

## R-011 — False-green and CI effectiveness study

| Field | Value |
|---|---|
| Question | How many regressions would full api jest have caught in last N PRs? |
| Why | AUD-041, AUD-042 |
| Method | Replay failed historical bugs against suite; coverage map |
| Output | CI investment business case |
| Depends | CI history |

---

## R-012 — Deposit classification empirical audit

| Field | Value |
|---|---|
| Question | How many live rows disagree across create category, list filter, and CustomerBalance formula? |
| Why | AUD-026 |
| Method | SQL classify three ways; count mismatches |
| Output | Data cleanup + unify function priority |
| Depends | DB read |

---

## Prioritization hint

| Priority | Research IDs |
|---|---|
| Do soon (unblocks money/auth decisions) | R-003, R-004, R-005, R-007, R-012 |
| After captain LOB choice | R-002 |
| Parallel / compliance | R-001, R-008 |
| Backlog | R-006, R-009, R-010, R-011 |
