# 08 — Risk Register

**Baseline:** `22d691535` · Leads from R1 RK-* promoted or retained after lanes A–M.

| ID | Area | Risk statement | Sev | Likelihood | Related AUD / evidence | Mitigation direction | Status |
|---|---|---|---|---|---|---|---|
| RK-001 | Security | Tracked secrets/creds in hermes-map (and historical secret theme) | S1 | High (in-repo) | AUD-014, K-F002, CX-017 | Rotate; purge/replace; env-only; gitignore yaml secrets | Open |
| RK-002 | Authz | Investor IDOR residual on customer-derived routes missing resolveInvestorScope | S1 | High if investor used | AUD-002–005, AUD-018 | Fail-closed allowlist everywhere; hard deny writes | Open |
| RK-003 | Authz | Location scope FE-only (INV-009) | S2 | Medium | BL-006, CX-010 | Accept product risk or add BE company filters | Open (design) |
| RK-004 | Money | Payment allocation / deposit / void edge cases | S1 | High under concurrency/adversarial API | AUD-006–009, AUD-021–026 | Matrix locks; residual SoT; wallet checks | Open |
| RK-005 | Money | Legacy accountPayments + import scripts writing/reading money split-brain | S2 | Medium | AUD-072, F-F018, M imports | Deprecate legacy reads; guard scripts | Open |
| RK-006 | Data | Migration number collisions / dual dirs / destructive 008 in glob | S0–S2 | Latent S0 if re-run | AUD-001, AUD-054 | Split destructive SQL; single inventory | Open |
| RK-007 | Multi-tenant/LOB | Authority describes LOB gates absent on baseline | S1 | High for agents | AUD-015, CX-001 | Captain lob-authority-truth | Blocked |
| RK-008 | Multi-tenant/LOB | Incomplete LOB merge on other pins → cross-DB leakage (prior brutal audit) | S1 | Unknown on other SHA | M-S004, historical LOB audit | Re-audit chosen LOB pin only | Research |
| RK-009 | Integrations | Face health gating API health | S2 | Medium ops | AUD-038 | Degrade optional deps | Open |
| RK-010 | Integrations | Hosoonline credential + image proxy failures / unbound media | S2 | Medium | AUD-005, AUD-039 | Scope proxy; secret hygiene | Open |
| RK-011 | Auth | JWT in localStorage (ADR-0004) XSS → session theft | S2 | Medium | B-F013, ADR-0004 | XSS hygiene; future httpOnly discussion | Accepted design (monitor) |
| RK-012 | Auth | PUBLIC_PATHS unmounted legacy login casings | S4 | Low now | AUD-082, B-F012 | Clean paths; rate-limit if remount | Open |
| RK-013 | Validation | Many mutating routes lack Zod validate() | S2 | Medium | AUD-040 | Expand contracts coverage | Open |
| RK-014 | CI | e2e continue-on-error; api full suite not always blocking | S2 | High process | AUD-041 | Tighten PR gates | Open |
| RK-015 | UX/i18n | Hardcoded strings / mock-coupled types / fake KPIs | S3 | High staff confusion | AUD-059–063 | Honesty + i18n lint | Open |
| RK-016 | Dead code | services/account/session retained | S3 | Low until remount | AUD-078, captain dead-route-retention | Delete after window or keep documented | Blocked |
| RK-017 | Permissions | Feedback nav uses permissions.view; feedback.* unused | S2 | Medium | AUD-036 | Captain feedback-admin-perm-model | Blocked |
| RK-018 | Reports | Complex SQL aggregations vs financial truth unknown | S2 | Medium | FLOW-026, unknowns Odoo | Reconciliation research | Research |
| RK-019 | Deploy | Sibling worktree deploy erase risk | S2 | Medium if preflight skipped | AUD-085, BL-019 | Enforce preflight in process/CI | Open |
| RK-020 | Imports | TDental/XLSX/Q10 scripts can rewrite production-shaped data | S1–S2 | Ops error | AUD-001, AUD-055 | Explicit confirm; isolate destructive | Open |
| RK-021 | Payroll | HrPayslips auth-only exposes salary PII | S1 | High if route called | AUD-012 | requirePermission + investor deny | Open |
| RK-022 | Catalog | Broken Products POST/PUT (missing import) | S1 | Certain on write | AUD-010 | One-line import fix | Open |
| RK-023 | HR | password_hash in employee mutation responses | S1 | Certain on write | AUD-011 | Strip RETURNING columns | Open |
| RK-024 | Exports | Missing nginx 300s timeouts vs INV-019 | S1 | High on large export | AUD-013 | Fix nginx templates | Open |
| RK-025 | Attachments | Unauth feedback static + weak upload validation | S2–S3 | Medium if URLs leak | AUD-035, AUD-066 | Captain access model + harden upload | Blocked / Open |
| RK-026 | Appointments | Status collapse done→arrived; double-book; name race | S2 | Medium | AUD-051–053 | Captain policies + eng fixes | Partial blocked |
| RK-027 | False green | enterprise-verification path bug hides dead FE client | S2 | Certain in CI | AUD-042 | Fix path assert | Open |

---

## Risk heat (baseline)

| Band | Risks |
|---|---|
| **Immediate (P0)** | RK-001, RK-002, RK-004, RK-006(S0), RK-007, RK-021–024 |
| **Next wave** | RK-005, RK-009–010, RK-013–014, RK-017, RK-019–020, RK-025–027 |
| **Design / research** | RK-003, RK-008, RK-011, RK-018 |
| **Hygiene** | RK-012, RK-015, RK-016 |

---

## Notes

- Likelihood is qualitative on baseline code paths; no production exploit proof was run.
- “Latent S0” (RK-006 / AUD-001) requires an ops action (full migration re-run) to realize — still captain-visible.
- Do not treat historical Apr-2026 CRIT “no auth” as current risk (CX-012 resolved).
