# 14 — Final Audit Report

**TGClinic / TGroup Forensic Audit Control Package**  
**Baseline pin:** `22d69153501b4ce5cd97e20ecca23e8e4836bbe7`  
**Versions:** website `0.32.59` · api `1.2.2`  
**Date:** 2026-07-28  
**Scope:** Documentation merge of lanes r1 + A–M; no production code changes  

> **Non-claim:** This report does not certify the system production-ready or bug-free.

---

## Top dashboard metrics

| Metric | Value |
|---|---|
| Baseline SHA | `22d691535` |
| Website / API | 0.32.59 / 1.2.2 |
| Lanes ingested | 14 (r1, A–M) |
| Raw lane findings (approx.) | ~145 |
| Master findings (AUD-*) | 86 merged rows |
| S0 | 1 (latent destructive migration path) |
| S1 | 14 |
| S2 | ~41 |
| S3–S4 | condensed remainder |
| Captain holds | 20 |
| Spot-verified S0/S1 paths | 11 |
| LOB runtime present | **No** |
| Dual-DB pool present | **No** |
| Full CI suites executed as gate | **No** |
| Production systems accessed | **No** |
| Control files in package | 00–14 + README |

---

## 1. Purpose and charter

See `00-audit-charter.md`. Mission: durable evidence-based control set for remediation without rediscovery.

---

## 2. Baseline and method

- Clean detached HEAD at pin; branch `docs/tgroup-audit-docs` for docs only.
- Read all lane `report.md` files and captain `backlog.md`.  
- Merge duplicates into AUD IDs; keep lane IDs in Evidence.  
- Spot-verify ≥5 S0/S1 paths in worktree (11 paths checked; all confirmed).  
- Prefer code over stale markdown.

---

## 3. System under audit (repository map)

See `01-repository-map.md`.

Monorepo: React website + Express API + Zod contracts + product-map governance + optional face/Hermes. Runtime topology is Nginx → web/api → single PostgreSQL `dbo` dental DB. Optional face, Hosoonline, Lark, CompreFace.

---

## 4. Module inventory summary

See `03-module-inventory.md` (MOD-001–038).

Critical active modules: auth/permissions (004–006), partners (008), appointments (009), payments (010), reports/exports (015–016), employees (013), products (012).  
**Absent:** MOD-037 LOB dual-DB, MOD-038 earnings engine.  
**Unmounted:** MOD-023 account/session/services.

---

## 5. Business logic summary

See `02-business-logic-register.md` (BL-001–025).

Strongest confirmed rules: JWT gate, permission resolution, investor same-portal intent, partners SMI, canonical payments tables, accent search, deploy preflight script.  
Weakest/missing enforcement: investor fail-closed holes, payment residual matrix, LOB BL-022/023 (docs only), FE location-only scope.

---

## 6. Flow inventory summary

See `04-flow-inventory.md` (FLOW-001–043).

P0 flows: payment allocate/void/deposit (017–019), reports (026), customer resolve deep link (013), face (032), catalog write (022), employee mutate (023), Hermes (043), imports (038).  
Blocked: LOB/CTV/earnings (041–042).

---

## 7. Route and job surface (condensed)

**FE:** `/login`, shell under `/` with overview.view parent gate; calendar, customers, employees, locations, services, service-catalog, payment, website (no nav), settings, relationships, commission, reports/*, notifications, permissions, feedback. No `/ctv`.

**API mounts:** Partners, SaleOrders, Appointments, Payments, Employees, Products, Reports, Exports, Auth, face, Feedback, MonthlyPlans, ExternalCheckups, HrPayslips, legacy AccountPayments, etc. Unmounted: account, session, services.

**Jobs:** No in-api cron; Hermes timer external; ops import/deploy scripts high-risk.

---

## 8. Test and validation posture

See `05-test-and-validation-matrix.md`.

~77 api test files, ~99 FE unit, ~77 e2e specs inventoried. CI is FE-heavy; full api jest not default-blocking; e2e continue-on-error. Notable false signals: canonicalRevenue empty-allowlist test encodes bug; enterprise-verification wrong path for services.ts.

---

## 9. Prior audit disposition

| Prior claim | Baseline disposition |
|---|---|
| Unauthenticated CRUD (Apr) | **Fixed** — global requireAuth |
| Almost no api tests (GAPS) | **Stale** — large suite exists |
| No Zod | **Partial** — key writes only |
| LOB production-ready (some LOB docs) | **Not on this pin** |
| INV-019 nginx 300s fixed | **Not in tracked confs** |
| Void SQL/tx broken | **Fixed** on dedicated void path; PATCH shadow void remains |

Historical files retained under `docs/audit/` and `docs/audits/`.

---

## 10. Findings summary by severity

See master table `06-findings-register.md`.

### S0
- **AUD-001** — `008_*` migration TRUNCATE in default-style apply loops.

### S1 (titles)
| AUD | Title |
|---|---|
| AUD-002 | Investor empty allowlist revenue fail-open |
| AUD-003 | Partners resolve IDOR / no investor scope |
| AUD-004 | Face recognize PII without allowlist |
| AUD-005 | ExternalCheckups/StockPickings scope gaps |
| AUD-006 | Payment residual TOCTOU |
| AUD-007 | Multi-alloc same invoice not accumulated |
| AUD-008 | No sum(alloc) ≤ payment.amount |
| AUD-009 | PATCH status=voided without reverse |
| AUD-010 | Products POST/PUT missing normalizeVietnamese import |
| AUD-011 | Employee mutations leak password_hash |
| AUD-012 | HrPayslips auth-only payroll PII |
| AUD-013 | Nginx missing export timeouts |
| AUD-014 | Hermes tracked credentials |
| AUD-015 | LOB authority overclaim / missing 047 |

### S2 themes
Shell overview gate; investor write seed-only deny; auth-only GETs; money wallet/residual/plans; catalog export/perm/fiction UI; employee PUT/tier; investor HR reports; export audit; feedback/CMS; health/face coupling; Zod/CI gaps; settings broken contracts; appointment drag/status/name race; migration dual dirs; unguarded importers.

### S3–S4 themes
Nav orphans, empty≠error, fake KPIs, i18n hardcode, mock coupling, IP fail-open, session active check, dead routes/docs drift, hygiene.

---

## 11. Contradictions

See `07-contradiction-register.md` (CX-001–030). Headliner: **CX-001 LOB docs vs code**, **CX-017 secrets vs DEC**, **CX-023 nginx vs INV-019**, **CX-008/019 appointment state FE/BE**.

---

## 12. Risks

See `08-risk-register.md` (RK-001–027). Immediate band: secrets, investor IDOR, money matrix, migration TRUNCATE, LOB false assurance, payslips, catalog write break, hash leak, nginx timeouts.

---

## 13. Remediation roadmap

See `09-remediation-roadmap.md`.

| Wave | Focus |
|---|---|
| 0 | Secrets, TRUNCATE guard, products import, hash strip, false-green test |
| 1 | Investor fail-closed + payslips + scoped reads/writes |
| 2 | Money allocation/void/residual (captain-gated pieces) |
| 3 | Product honesty, appointments, catalog, settings, feedback |
| 4 | Platform CI/Zod/nginx/health/dead routes |
| 5 | Governance LOB truth + doc refresh |

---

## 14. Executive summary

See `10-executive-summary.md` for leadership one-pager.

---

## 15. Agent coverage

See `11-agent-coverage-ledger.md`. All lanes present; 10 S0/S1 spot-checks confirmed; historical docs/audit files preserved.

---

## 16. Unresolved questions

See `12-unresolved-questions.md`. **20 captain holds** + residual ops/DB unknowns. No hold auto-resolved in this package.

---

## 17. Research opportunities

See `13-research-opportunities.md` (R-001–012): report truth, LOB pin forensic, live nginx/DB, role matrices, privacy egress, concurrency frequency, etc.

---

## 18. Money special section

| Topic | Baseline truth |
|---|---|
| Canonical tables | `payments` + `payment_allocations` |
| Create/void transactions | Present on dedicated paths |
| Residual validation | Exists but TOCTOU + multi-line + no payment-sum cap |
| Shadow void | PATCH status allowed without reverse |
| Deposits | Heuristic classification split-brain; refund/use ignore wallet |
| Monthly plans | Pay updates installment status only |
| Earnings D13 | **Absent** |
| Physical DELETE | Destroys payment row after reverse |
| Investor money writes | No object scope; seed omission only |

**Do not ship money “hardening” that skips captain residual/overdraft/plan/delete decisions where marked Blocked.**

---

## 19. Auth / investor special section

| Topic | Baseline truth |
|---|---|
| Global requireAuth | Yes |
| Effective permissions | group ± overrides + `*` |
| Investor same-portal | Yes |
| Allowlist fail-closed | **Intent yes; holes confirmed** (revenue empty list, resolve, face, external, stock) |
| Investor writes | DEC forbids; **not hard-denied in handlers** |
| Payslips | Auth-only — critical |
| JWT storage | localStorage 24h (ADR-0004) |
| IP ACL | Before auth; fail-open on DB error |
| Feedback uploads | Static unauthenticated |

---

## 20. LOB truth verdict

| Claim | Verdict on `22d691535` |
|---|---|
| Cosmetic LOB v2 implemented | **False** |
| Dual DB getDb/requireLobScope | **Missing** |
| Migration 047 LOB in api/migrations | **Missing** |
| CTV portal /api/ctv | **Missing** (FE redirect residue only) |
| D13 commissionEngine/earnings | **Missing** |
| Docs/AGENTS/product-map LOB sections | **Overclaim / other-branch truth** |
| Round-2 LOB audit | **Blocked** on captain pin |

---

## 21. Recommendations (ordered)

1. **Wave 0 now:** rotate Hermes secrets; quarantine 008 TRUNCATE; fix products import; strip password_hash; fix false-green path test.  
2. **Wave 1 now:** investor fail-closed revenue + resolve/face/payslips.  
3. **Captain session:** LOB posture + money four holds + appointment three holds + placeholder/overview.  
4. **Wave 2** money matrix after or with residual SoT decision.  
5. **Refresh** unknowns, API_ROUTE_INDEX, GAPS, SECURITY LOB paragraphs per decision.  
6. **Do not** merge LOB docs-as-code assumptions into dental hotfixes.

---

## 22. Evidence index

| Artifact | Location |
|---|---|
| Lane reports | `/Users/thuanle/firstmate-homes/tgroup/data/tgroup-audit-*/report.md` |
| Captain backlog | `/Users/thuanle/firstmate-homes/tgroup/backlog.md` |
| Control package | `docs/audit/00`–`14`, `README.md` |
| Spot-check notes | `06-findings-register.md` §Spot-verification; `11-agent-coverage-ledger.md` §3 |
| Authority stack | `AGENTS.md`, `docs/INVARIANTS.md`, `product-map/**` (mixed truth) |

---

## 23. Change control for this package

| Item | Value |
|---|---|
| Branch | `docs/tgroup-audit-docs` |
| Code/runtime changes | **None** |
| Dependency changes | **None** |
| Migration changes | **None** |
| Pre-existing docs/audit history | **Preserved** |

---

## 24. Sign-off and next step

| Role | Action |
|---|---|
| Docs crewmate | Package committed on feature branch |
| Firstmate | Instruct no-mistakes → PR when ready |
| Captain | Resolve holds in §16; prioritize Wave 0–1 |
| Engineering | Implement only from AUD/FIX IDs; re-pin SHA after fixes |

**End of final audit report.**
