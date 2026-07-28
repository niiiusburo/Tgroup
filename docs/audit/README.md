# TGClinic / TGroup — Forensic Audit Package

**Baseline pin:** `22d691535` · website `0.32.59` · api `1.2.2`  
**Package date:** 2026-07-28  
**Nature:** Documentation-only control set (lanes r1 + A–M).  
**Non-claim:** Does not certify production-ready or bug-free.

---

## Start here

| Audience | Read first |
|---|---|
| Leadership | [10-executive-summary.md](./10-executive-summary.md) → [14-final-audit-report.md](./14-final-audit-report.md) |
| Engineering leads | [06-findings-register.md](./06-findings-register.md) → [09-remediation-roadmap.md](./09-remediation-roadmap.md) |
| Captain / product | [12-unresolved-questions.md](./12-unresolved-questions.md) |
| New auditors | [00-audit-charter.md](./00-audit-charter.md) → [11-agent-coverage-ledger.md](./11-agent-coverage-ledger.md) |

---

## Control files (00–14)

| # | File | Contents |
|---|---|---|
| 00 | [00-audit-charter.md](./00-audit-charter.md) | Purpose, scope, evidence/severity scales, baseline pin |
| 01 | [01-repository-map.md](./01-repository-map.md) | Packages, topology, infra, what is absent |
| 02 | [02-business-logic-register.md](./02-business-logic-register.md) | BL-001–025 rules vs enforcement |
| 03 | [03-module-inventory.md](./03-module-inventory.md) | MOD-001–038 |
| 04 | [04-flow-inventory.md](./04-flow-inventory.md) | FLOW-001–043 |
| 05 | [05-test-and-validation-matrix.md](./05-test-and-validation-matrix.md) | Commands, CI gaps, validation mapping |
| 06 | [06-findings-register.md](./06-findings-register.md) | **MASTER** AUD-001+ table (deduped) |
| 07 | [07-contradiction-register.md](./07-contradiction-register.md) | CX-001–030 |
| 08 | [08-risk-register.md](./08-risk-register.md) | RK-001–027 |
| 09 | [09-remediation-roadmap.md](./09-remediation-roadmap.md) | Waves 0–5, Fix IDs, parallelization |
| 10 | [10-executive-summary.md](./10-executive-summary.md) | Leadership one-pager |
| 11 | [11-agent-coverage-ledger.md](./11-agent-coverage-ledger.md) | Lane coverage + spot-verify ledger |
| 12 | [12-unresolved-questions.md](./12-unresolved-questions.md) | 20 captain holds + unknowns |
| 13 | [13-research-opportunities.md](./13-research-opportunities.md) | R-001–012 |
| 14 | [14-final-audit-report.md](./14-final-audit-report.md) | Dashboard + sections 1–24 |

---

## Historical files (pre-existing; retained)

| File | Note |
|---|---|
| [2026-04-09-deep-audit-report.md](./2026-04-09-deep-audit-report.md) | Prior deep audit (partially stale) |
| [state-hooks-deep-review.md](./state-hooks-deep-review.md) | Historical brief |
| [team-backend-api-brief.md](./team-backend-api-brief.md) | Historical team brief |
| [team-design-consistency-brief.md](./team-design-consistency-brief.md) | Historical team brief |
| [team-frontend-components-brief.md](./team-frontend-components-brief.md) | Historical team brief |
| [team-pages-routing-brief.md](./team-pages-routing-brief.md) | Historical team brief |
| [team-quality-hygiene-brief.md](./team-quality-hygiene-brief.md) | Historical team brief |
| [team-state-hooks-brief.md](./team-state-hooks-brief.md) | Historical team brief |

Related LOB/other audits may also live under `docs/audits/` (not this package’s 00–14 set).

---

## Source lane reports (firstmate data)

Absolute prefix: `/Users/thuanle/firstmate-homes/tgroup/data/`

- `tgroup-audit-r1/report.md`
- `tgroup-audit-a` … `tgroup-audit-m` `/report.md`
- Captain holds: `/Users/thuanle/firstmate-homes/tgroup/backlog.md`

---

## Severity quick legend

| Sev | Meaning |
|---|---|
| S0 | Catastrophic / data destruction |
| S1 | Critical integrity/authz/PII/broken primary write |
| S2 | High bounded bug / missing enforcement |
| S3 | Medium drift/UX/tests |
| S4 | Low hygiene |

---

## Maintenance

- New remediation work should cite **AUD-###** and update Status in `06-findings-register.md` on the fix SHA (not silently on this pin).  
- Re-baseline requires a new pin SHA and delta pass.  
- Captain decisions close rows in `12-unresolved-questions.md` and unblock Wave items in `09-remediation-roadmap.md`.
