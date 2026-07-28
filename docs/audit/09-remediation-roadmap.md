# 09 — Remediation Roadmap

**Baseline pin:** `22d691535` · website `0.32.59` · api `1.2.2`  
**Rule:** Waves are sequencing guidance, not a claim that work is done. Fix IDs map to `06-findings-register.md` AUD rows.

---

## Wave overview

| Wave | Name | Goal | Parallelism | Exit criteria |
|---|---|---|---|---|
| **0** | Stabilize & stop-bleed | Secrets, destructive migration guard, broken primary writes, credential leaks | 3–4 eng tracks | AUD-001/010/011/014 closed or explicitly accepted; secrets rotated |
| **1** | Authz fail-closed | Investor allowlist + payroll + face/resolve/external | 2–3 BE tracks | AUD-002–005, AUD-012 green tests; empty allowlist fails closed |
| **2** | Money integrity | Allocation matrix, void semantics, residual SoT (post-captain) | 1–2 money owners serialized | AUD-006–009 + captain money holds resolved or implemented |
| **3** | Product honesty & clinic ops | Placeholders, appointments policies, catalog/SO UX, settings | FE+BE parallel after captain | Blocked AUDs unblocked; no fake KPIs in nav surfaces |
| **4** | Platform quality | Zod coverage, CI gates, dead routes, nginx, health | Platform track | AUD-013/040–042/041; CI policy documented |
| **5** | Governance & LOB truth | Authority docs, product-map refresh, LOB pin or demote | Docs + optional LOB audit | AUD-015/054/079; CX-001 closed per captain |

---

## Wave 0 — Stabilize & stop-bleed

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-001 | AUD-014 | Rotate Hermes/Telegram/site/model credentials; remove values from tracked yaml; env-only | Ops access to secret stores | `git` tree has no non-empty secret fields; services work via env | Yes (sec) |
| FIX-002 | AUD-001 | Quarantine `008_*` from default migration glob; runbook forbid blind re-run; CI/deny-list optional | — | Default deploy path cannot TRUNCATE core tables | Yes (data) |
| FIX-003 | AUD-010 | Import `normalizeVietnamese` in `products.js` | — | POST/PUT Products 2xx with name; unit test | Yes |
| FIX-004 | AUD-011 | Employee mutations return safe column list (no `password_hash`) | — | Response JSON key assert in test | Yes |
| FIX-005 | AUD-042 | Fix enterprise-verification path to real `website/src/lib/api/services.ts` | — | Test fails if file present (or delete client and pass) | Yes |

**Wave 0 exit:** P0 non-decision engineering items above verified on a branch; status not claimed on baseline SHA.

---

## Wave 1 — Authz fail-closed

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-010 | AUD-002 | `canonicalRevenue.buildWhere` fail-closed on investor empty allowlist; invert unit test | — | Empty `[]` yields no rows / zero revenue; test inverted | Serialize with report callers |
| FIX-011 | AUD-003 | `resolveHandler` + principal-scoped cache + `isdeleted=false` | FIX-010 patterns | Investor IDOR tests pass | Yes after pattern |
| FIX-012 | AUD-004 | Face routes scope + candidate filter | FIX-011 pattern | Investor face tests (new) | Yes |
| FIX-013 | AUD-005 | ExternalCheckups + StockPickings scope/perms | FIX-011 | IDOR matrix | Yes |
| FIX-014 | AUD-012 | `requirePermission` on HrPayslips; deny investors | — | Investor 403 | Yes |
| FIX-015 | AUD-018 | Hard deny or scope investor writes (payments/appts/partners) | DEC investor writes | Override fixture cannot IDOR write | After reads |
| FIX-016 | AUD-019 | requirePermission on auth-only GETs (sources, categories, telemetry mgmt, journals) | Registry strings | readRoutePermissions expanded | Yes |

**Wave 1 exit:** INV-021 fail-closed on cited surfaces; new/updated tests green.

---

## Wave 2 — Money integrity

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-020 | AUD-006 | `SELECT residual FOR UPDATE` in payment tx | — | Concurrent double-pay test | Serialize money |
| FIX-021 | AUD-007 | Accumulate multi-alloc per invoice in validator | FIX-020 | Matrix M3 | Serialize |
| FIX-022 | AUD-008 | Enforce sum(alloc) ≤ payment.amount | FIX-020 | Matrix M4 | Serialize |
| FIX-023 | AUD-009 | Disallow PATCH shadow void or reverse allocs | — | PATCH status=voided rejected or equals void | Serialize |
| FIX-024 | AUD-021 | Deposit overdraft policy implementation | **Captain** `deposit-overdraft-policy` | Policy tests | Blocked until decision |
| FIX-025 | AUD-024 | Monthly plan cash link | **Captain** `monthly-plan-cash-link` | FLOW-020 e2e | Blocked |
| FIX-026 | AUD-022/025 | Residual single SoT recompute | **Captain** `residual-source-of-truth` | Reconcile fixtures | Blocked |
| FIX-027 | AUD-023 | Reject amount/method PATCH when allocations exist | — | 400 on stale PATCH | With FIX-023 |
| FIX-028 | AUD-072 slice | Physical DELETE disposition | **Captain** `payment-physical-delete` | void-only or soft-delete | Blocked |

**Wave 2 exit:** Allocation matrix S1 closed; captain money holds either implemented or accepted-risk documented.

---

## Wave 3 — Product honesty & clinic ops

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-030 | AUD-016 | Split shell auth from overview.view | **Captain** `overview-shell-gate` | Role without overview can use calendar if permitted | Blocked |
| FIX-031 | AUD-060 | Remove/hide fake Commission/Notifications KPIs | **Captain** `placeholder-fake-metrics` | No fabricated financial/send volumes | Blocked |
| FIX-032 | AUD-051/061 | Status picker + mapper preserve done states | **Captain** `fe-appointment-status-subset` | Edit done appt does not write arrived | Blocked |
| FIX-033 | AUD-049/050 | Drag reschedule ship or remove claims | **Captain** `appt-drag-reschedule` | Product-map matches UI | Blocked |
| FIX-034 | AUD-053 | Conflict policy | **Captain** `appt-conflict-policy` | Policy enforced or documented allow-all | Blocked |
| FIX-035 | AUD-071 default | Create default state unify | **Captain** `appt-default-create-state` | FE/BE same default | Blocked |
| FIX-036 | AUD-028 | SO write perm + UI gate | **Captain** `so-write-permission` | View-only cannot open create | Blocked |
| FIX-037 | AUD-029 | Multi-visit cancel model | **Captain** `multi-visit-model` | No local-only fiction | Blocked |
| FIX-038 | AUD-073 | Catalog editor consolidation | **Captain** `catalog-editor-surfaces` | Single source of edit | Blocked |
| FIX-039 | AUD-027 | Export state vocabulary map | — | Filtered export non-empty for done | Yes |
| FIX-040 | AUD-043–046 | Settings sources tab; prefs types; bank perm; Places key | — | Settings usable | Yes FE/BE |
| FIX-041 | AUD-059/062/063 | DataTable error channel; mock kill; i18n literals | — | BEHAVIOR empty≠error; no referral mock | Yes FE |
| FIX-042 | AUD-031/032 | Employee PUT Result.rows; tier dual-write | — | PUT employee stable; tier clears perms | Yes |
| FIX-043 | AUD-033 | Investor HR via reports | **Captain** `investor-hr-via-reports` | Deny/allow/partial implemented | Blocked |
| FIX-044 | AUD-036/066/035 | Feedback perm + attachment access + upload harden | **Captain** feedback holds | Chosen model live | Blocked |
| FIX-045 | AUD-037 | WebsitePages SEO PUT 200 | — | Unit | Yes |
| FIX-047 | AUD-017 | Remove CTV redirect until LOB | lob holds | No /ctv navigate | Yes |
| FIX-048 | AUD-047/048/070 | Partners resolve cache/SMI/list hygiene pack | FIX-011 | Customer flows stable | After W1 |

**Wave 3 exit:** No open captain-blocked product lies in primary nav; appointment/money product decisions recorded.

---

## Wave 4 — Platform quality

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-050 | AUD-013 | nginx 300s timeouts in tracked confs + VPS parity note | — | Conf contains timeouts; large export soak | Yes |
| FIX-051 | AUD-038 | Health optional face degrade | — | DB up + face down → 200 degraded | Yes |
| FIX-052 | AUD-040 | Expand Zod validate + use result.data | — | Coverage metric ↑ on money/auth writes | Multi-PR |
| FIX-053 | AUD-041 | CI: api full jest + contracts build blocking; e2e policy | Team capacity | pr-checks reflect policy | Yes |
| FIX-054 | AUD-078 | Dead route retention execution | **Captain** `dead-route-retention` | Delete or document keep | Blocked |
| FIX-055 | AUD-034 | Export audit durability | — | Audit row on download success path tested | Yes |
| FIX-056 | AUD-085 | Deploy preflight discipline / optional GHA check | — | Documented; bypass rare | Yes |
| FIX-057 | AUD-075 | Legacy GetSumary disposition | **Captain** `legacy-dashboard-reports-getsumary` | Delete/deprecate/rewrite | Blocked |

**Wave 4 exit:** Platform gates match documented quality bar; nginx/health export path hardened.

---

## Wave 5 — Governance & LOB truth

| Fix ID | AUD | Work | Prerequisites | Acceptance | Parallel? |
|---|---|---|---|---|---|
| FIX-060 | AUD-015 | Apply captain LOB authority posture (demote / banner / second pin) | **Captain** `lob-authority-truth` | Authority matches code or explicit planned | Blocked |
| FIX-061 | AUD-054/079 | Migration inventory + product-map/registry LOB keys | FIX-060 | No false 047 LOB pointer on pin | After decision |
| FIX-062 | — | Refresh unknowns, API_ROUTE_INDEX, GAPS, MODULE_REGISTRY, CX docs | Wave 0–4 facts | Doc drift checklist clean | Yes docs |
| FIX-063 | AUD-015 follow | Optional Round-2 LOB forensic on chosen pin | **Captain** `lob-round2-pin` | Separate audit package or appendix | Blocked |
| FIX-064 | AUD-056 | Gate LOB import tests on schema presence | FIX-060 | No false completeness | Yes |

**Wave 5 exit:** CX-001 closed per captain choice; baseline docs do not overclaim LOB.

---

## Parallelization sketch

```text
Wave 0:  FIX-001 | FIX-002 | FIX-003 | FIX-004 | FIX-005
Wave 1:  FIX-010 → (FIX-011 || FIX-012 || FIX-013 || FIX-014 || FIX-016) → FIX-015
Wave 2:  FIX-020 → FIX-021/022/023/027  ||  captain-blocked 024–026/028
Wave 3:  captain batch decisions → many FE/BE fixes parallel
Wave 4:  platform parallel with late Wave 3
Wave 5:  after lob decisions; docs can start earlier as draft
```

**Serialization hard points:** money residual/allocation (single owner); investor scope helper changes (coordinate B/D/F/I/K); migration runbook (ops).

---

## Explicitly out of roadmap until decided

- Implementing Cosmetic LOB dual-DB / CTV / D13 earnings on this baseline
- Production deploy of fixes (local verify first per AGENTS)
- Accepting residual overdraft or fake KPIs without captain note
