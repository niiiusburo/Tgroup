# 11 — Agent Coverage Ledger

**Baseline:** `22d691535` · Package task: `tgroup-audit-docs`  
**Worktree:** disposable treehouse path (isolated from primary checkout)

---

## 1. Lane coverage

| Lane | Report path | Status | Primary scope | Deep-trace? |
|---|---|---|---|---|
| r1 | `.../data/tgroup-audit-r1/report.md` | done | Discovery, MOD/FLOW/BL IDs, topology | Inventory |
| A | `.../data/tgroup-audit-a/report.md` | done | FE shell, routes, i18n, UX | Yes |
| B | `.../data/tgroup-audit-b/report.md` | done | Authn/authz/investor | Yes |
| C | `.../data/tgroup-audit-c/report.md` | done | Settings/system | Yes |
| D | `.../data/tgroup-audit-d/report.md` | done | Customers/partners | Yes |
| E | `.../data/tgroup-audit-e/report.md` | done | Appointments/calendar | Yes |
| F | `.../data/tgroup-audit-f/report.md` | done | Money payments/deposits/plans/SO | Yes |
| G | `.../data/tgroup-audit-g/report.md` | done | Catalog/services/products | Yes |
| H | `.../data/tgroup-audit-h/report.md` | done | Employees/commissions/payslips | Yes |
| I | `.../data/tgroup-audit-i/report.md` | done | Reports/exports | Yes |
| J | `.../data/tgroup-audit-j/report.md` | done | Feedback/CMS | Yes |
| K | `.../data/tgroup-audit-k/report.md` | done | Face/hoso/hermes | Yes |
| L | `.../data/tgroup-audit-l/report.md` | done | Contracts/CI/dead code | Yes |
| M | `.../data/tgroup-audit-m/report.md` | done | Migrations/imports/LOB truth | Yes |

All expected lanes **present**. No lane report invented.

---

## 2. Docs package coverage (this agent)

| Output file | Written | Notes |
|---|---|---|
| `00-audit-charter.md` | Yes | |
| `01-repository-map.md` | Yes | |
| `02-business-logic-register.md` | Yes | |
| `03-module-inventory.md` | Yes | |
| `04-flow-inventory.md` | Yes | |
| `05-test-and-validation-matrix.md` | Yes | |
| `06-findings-register.md` | Yes | Master AUD-001+ merged |
| `07-contradiction-register.md` | Yes | |
| `08-risk-register.md` | Yes | |
| `09-remediation-roadmap.md` | Yes | Waves 0–5 |
| `10-executive-summary.md` | Yes | |
| `11-agent-coverage-ledger.md` | Yes | this file |
| `12-unresolved-questions.md` | Yes | |
| `13-research-opportunities.md` | Yes | |
| `14-final-audit-report.md` | Yes | |
| `README.md` | Yes | index |

Pre-existing historical files under `docs/audit/` (**preserved, not deleted**):

- `2026-04-09-deep-audit-report.md`
- `state-hooks-deep-review.md`
- `team-*-brief.md` (six briefs)

---

## 3. Spot-verification ledger (required ≥5 S0/S1)

| # | AUD | Evidence path | Method | Result |
|---|---|---|---|---|
| 1 | AUD-002 | `api/src/services/canonicalRevenue.js` | read allowlist branch | **Confirmed** filter only if `.length` |
| 2 | AUD-006 | `api/src/routes/payments/helpers.js` | rg FOR UPDATE; read residual SELECT | **Confirmed** no row lock |
| 3 | AUD-009 | `api/src/routes/payments.js` PATCH `allowedFields` | read | **Confirmed** `status` patchable |
| 4 | AUD-010 | `api/src/routes/products.js` | head imports; rg normalizeVietnamese | **Confirmed** call sans import |
| 5 | AUD-011 | `api/src/routes/employees/mutations.js` | rg RETURNING * | **Confirmed** |
| 6 | AUD-001 | `api/migrations/008_data_migration_from_tdental_v3.sql` | rg TRUNCATE | **Confirmed** core tables |
| 7 | AUD-014 | `hermes/hermes-map.yaml` | git ls-files + field names only | **Confirmed** tracked non-empty credential fields |
| 8 | AUD-012 | `api/src/routes/hrPayslips.js` | rg requirePermission | **Confirmed** absent |
| 9 | AUD-003 | `api/src/routes/partners/resolveHandler.js` | rg resolveInvestorScope | **Confirmed** absent |
| 10 | AUD-013 | `nginx.conf`, `nginx.docker.conf` | rg proxy_*_timeout | **Confirmed** absent |
| 11 | AUD-015 | LOB paths / `api/migrations/047*` | ls / rg requireLobScope | **Confirmed** missing |

No spot-check **refuted** a lane S0/S1 claim. Values of secrets were **not** copied into docs.

---

## 4. Intentionally not covered

| Area | Reason |
|---|---|
| Live DB / VPS | Charter forbid |
| Full jest/vitest/e2e green proof | Docs package; commands only |
| LOB-bearing commit deep-trace | No captain pin (`lob-round2-pin`) |
| Secret value transcription | Safety |
| Implementing fixes | Docs-only mission |
| Code-review-graph MCP | Unavailable; used shell rg/find |

---

## 5. Merge / dedup quality notes

- B-F001 ≡ I-F001 → AUD-002  
- B-F002 slices → AUD-003/004/005  
- A-F007 ≡ H-F005 → AUD-060  
- A-F005/D-F014 → AUD-059  
- L-F004/G-F012 → AUD-042  
- Lane S3/S4 condensed into fewer AUD rows with multi-evidence; raw lane IDs retained in Evidence columns  

---

## 6. Confidence

| Layer | Confidence |
|---|---|
| File existence / mounts / missing LOB | Confirmed |
| S0/S1 cited lines | Confirmed (spot-checked subset + lane reads) |
| Exploitability in production | High for code-path issues; **not** runtime-proved against live DB |
| Completeness of all S3 strings | Medium (condensed) |
| LOB other branches | Low / out of scope |

---

## 7. Tooling used (package agent)

```text
pwd -P; git rev-parse; branch fm/tgroup-audit-docs
no-mistakes doctor
cat lane reports + backlog.md
rg/sed/node spot checks on S0/S1 paths
write docs/audit/00–14 + README
```
