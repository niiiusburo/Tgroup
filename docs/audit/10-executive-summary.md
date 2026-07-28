# 10 — Executive Summary

**Product:** TGClinic / TGroup dental portal<br>
**Baseline:** git `22d691535` · website **0.32.59** · api **1.2.2**<br>
**Audit date:** 2026-07-28<br>
**Nature:** Documentation-only forensic package consolidating lanes r1 + A–M

---

## One-paragraph verdict

On this pin the clinic portal is a **real, authenticated, single-DB dental operations system** with substantial investor-scope, payments, customers, and face-id work in code — **not** an empty scaffold. It is also **not** production-ready or bug-free. Specialized lanes confirmed **one latent catastrophic data-destruction footgun**, **fourteen critical (S1)** issues (investor fail-open revenue, IDOR/PII paths, payment allocation holes, broken catalog writes, password_hash leakage, payroll exposure, nginx export timeouts, tracked Hermes credentials, LOB doc overclaim), and a large S2/S3 backlog. Authority docs describing **Cosmetic LOB v2 / dual-DB / CTV / D13 earnings as implemented are false on this checkout**.

---

## Dashboard metrics (baseline)

| Metric | Value |
|---|---|
| Lane reports ingested | 14 (r1, A–M) |
| Substantive A–M lane findings | 184 |
| Master AUD rows (merged) | 86 (AUD-001–086) |
| S0 | 1 (latent ops TRUNCATE path) |
| S1 | 14 |
| S2 | ~41 |
| S3–S4 | condensed remainder |
| Captain decision holds | 20 (see `12-unresolved-questions.md`) |
| Spot-verified S0/S1 paths | 11 (≥5 required) |
| LOB runtime on pin | **Absent** |
| Full test suites run as gate | **No** (commands inventoried only) |
| Production access | **None** |

---

## Top risks for leadership

1. **Money integrity under concurrent/API use** — allocation TOCTOU, multi-line over-alloc, PATCH shadow void (AUD-006–009).
2. **Investor confidentiality** — empty allowlist paid revenue fail-open; resolve/face/external gaps; payslip auth-only (AUD-002–005, AUD-012).
3. **Secrets in git** — Hermes map credential fields tracked (AUD-014); rotate immediately.
4. **Ops data loss footgun** — migration `008_*` TRUNCATE in default-style globs (AUD-001).
5. **False assurance** — LOB/dual-DB docs and some “fixed” infra claims (nginx timeouts) do not match code (AUD-015, AUD-013).
6. **Broken admin catalog writes** — Products POST/PUT ReferenceError (AUD-010).
7. **Staff credential material on the wire** — employee create/update returns `password_hash` (AUD-011).

---

## What improved since older audits (do not re-open as current CRIT)

- Global API `requireAuth` is present (Apr AUDIT “no auth” stale).
- Substantial api/website test trees exist (GAPS “almost no api tests” stale).
- Zod on Partners/Appointments/Payments create/update paths (partial only).
- Investor scope implemented on many read paths (holes remain).
- Payment void path uses dedicated transaction (old void SQL claims fixed — F-F020).

---

## What leadership must decide (samples)

| Theme | Hold keys |
|---|---|
| LOB docs vs code | `lob-authority-truth`, `lob-round2-pin` |
| Money product rules | `monthly-plan-cash-link`, `deposit-overdraft-policy`, `payment-physical-delete`, `residual-source-of-truth` |
| Appointments product | `appt-conflict-policy`, `appt-default-create-state`, `appt-drag-reschedule`, `fe-appointment-status-subset` |
| Portal UX / perms | `overview-shell-gate`, `placeholder-fake-metrics`, `so-write-permission`, `multi-visit-model`, `catalog-editor-surfaces` |
| Feedback / reports / dead code | `feedback-admin-perm-model`, `feedback-attachment-access`, `investor-hr-via-reports`, `legacy-dashboard-reports-getsumary`, `dead-route-retention` |

Full list: `12-unresolved-questions.md`.

---

## Recommended immediate actions (Wave 0–1)

1. Rotate and un-track Hermes credentials.
2. Quarantine destructive `008_*` migrations from default apply loops.
3. Fix Products `normalizeVietnamese` import; strip employee `password_hash` from responses.
4. Fail-closed investor empty allowlist in `canonicalRevenue`; lock down HrPayslips; scope resolve/face.
5. Patch nginx export timeouts to match INV-019.
6. Schedule captain decision session on LOB posture + money residual/void policies.

Detailed sequencing: `09-remediation-roadmap.md`.

---

## Explicit non-claims

- This package does **not** certify production readiness.
- This package does **not** prove absence of further bugs outside lane scopes.
- LOB security on other branches is **unverified** here.
- Financial report accuracy vs Odoo/source systems remains a **research** item.
