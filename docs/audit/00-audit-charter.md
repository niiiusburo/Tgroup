# 00 — Audit Charter

| Field | Value |
|---|---|
| **Package** | TGClinic / TGroup forensic audit control set |
| **Baseline git SHA** | `22d69153501b4ce5cd97e20ecca23e8e4836bbe7` |
| **Website version** | `0.32.59` |
| **API version** | `1.2.2` |
| **Baseline label** | Dental portal single-DB mainline |
| **Audit window** | 2026-07-28 (lanes r1, A–M) |
| **Package authored** | 2026-07-28 |
| **Authority** | Captain-mandated docs-only control package under `docs/audit/` |

---

## 1. Purpose

Produce a durable, evidence-based control package so leadership and engineering can:

1. See what the repository actually is on the pinned baseline (not aspirational docs alone).
2. Track confirmed findings with stable `AUD-###` IDs across remediation waves.
3. Separate **code truth** from **authority-doc claims**, especially Cosmetic LOB v2.
4. Drive remediation without re-discovering the monorepo.

This package consolidates Round-1 discovery (`tgroup-audit-r1`) and specialized lanes A–M. It does **not** claim the product is production-ready or bug-free.

---

## 2. Scope — in

- Repository structure, packages, runtime topology, infra manifests (as of baseline SHA).
- Module, flow, and business-logic inventories with stable IDs.
- Confirmed findings from lanes r1 + A–M, deduplicated into `06-findings-register.md`.
- Contradictions, risks, remediation roadmap (Waves 0–5), executive summary.
- Captain decision holds and remaining unknowns.
- Spot-verification of ≥5 S0/S1 evidence paths against this worktree.

---

## 3. Scope — out

- Implementing application fixes, migrations, dependency upgrades, or runtime config changes.
- Live VPS / production data access or credential use.
- Full green CI as a gate for this documentation package.
- Secret **values** in reports (field names and presence only; rotate if exposed).
- Re-auditing LOB-bearing commits (requires captain pin — see holds).

---

## 4. Evidence standard

| Level | Meaning |
|---|---|
| **Confirmed** | Directly observed in baseline checkout (file/line/command). |
| **High** | Strong code path + consistent docs; small residual ambiguity. |
| **Medium** | Partial code or docs; needs fixture/runtime proof. |
| **Low** | Historical claim, other branch, or incomplete inspection — belongs in unresolved/research. |

Prefer **code over stale markdown**. Every finding cites lane IDs and paths.

---

## 5. Severity scale

| Sev | Name | Criteria |
|---|---|---|
| **S0** | Catastrophic | Active money loss, auth bypass, secret exposure on prod path, data destruction footgun. |
| **S1** | Critical | High-likelihood integrity/authz break; PII leak; broken primary write path. |
| **S2** | High | Confirmed bug with bounded blast radius; missing money/auth edge enforcement. |
| **S3** | Medium | Drift, dead code, incomplete tests, UX/contract mismatch without immediate loss. |
| **S4** | Low | Docs stale, hygiene, style, non-blocking tech debt. |

---

## 6. Priority scale (remediation)

| Priority | Meaning |
|---|---|
| **P0** | Stop-ship / immediate Wave 0–1 |
| **P1** | Next release wave (integrity/authz/money) |
| **P2** | Planned hardening |
| **P3** | Backlog / hygiene |

---

## 7. Status vocabulary (findings)

| Status | Meaning |
|---|---|
| **Open** | Confirmed, not fixed on baseline |
| **Blocked** | Waiting on captain decision |

---

## 8. Safety constraints

- Documentation only in this package task.
- No production access; no live credential use; no secret values printed.
- No push/merge to default branch from scout/docs workers without firstmate instruction.
- Never claim “production-ready” or “bug-free.”

---

## 9. Source lane reports

Absolute path prefix: `/Users/thuanle/firstmate-homes/tgroup/data/`

| Lane | Report | Focus |
|---|---|---|
| r1 | `tgroup-audit-r1/report.md` | Discovery, IDs, topology, leads |
| A | `tgroup-audit-a/report.md` | FE shell, routes, i18n, UX |
| B | `tgroup-audit-b/report.md` | Authn/authz/investor |
| C | `tgroup-audit-c/report.md` | Settings / system config |
| D | `tgroup-audit-d/report.md` | Customers / partners |
| E | `tgroup-audit-e/report.md` | Appointments / calendar |
| F | `tgroup-audit-f/report.md` | Money: payments/deposits/plans/SO |
| G | `tgroup-audit-g/report.md` | Catalog / services / products |
| H | `tgroup-audit-h/report.md` | Employees / commissions / payslips |
| I | `tgroup-audit-i/report.md` | Reports / exports |
| J | `tgroup-audit-j/report.md` | Feedback / CMS |
| K | `tgroup-audit-k/report.md` | Integrations (face/hoso/hermes) |
| L | `tgroup-audit-l/report.md` | Platform: contracts/CI/dead code |
| M | `tgroup-audit-m/report.md` | Data/migrations/imports/LOB truth |

Captain holds: `/Users/thuanle/firstmate-homes/tgroup/backlog.md`.

---

## 10. Non-goals

- Rewriting product-map or AGENTS LOB policy in this package (record contradiction; captain decides posture).
- Full E2E proof of every flow.
- Schema application or migration runs.

---

## 11. Sign-off

| Role | Responsibility |
|---|---|
| Crewmate (docs package) | Merge lane evidence → control files; spot-verify S0/S1; commit on `docs/tgroup-audit-docs` |
| Firstmate | Gate PR / no-mistakes |
| Captain | Decision holds in `12-unresolved-questions.md`; wave prioritization |

**Baseline pin is immutable for this package.** Remediation work must re-pin or re-verify against a new SHA.
