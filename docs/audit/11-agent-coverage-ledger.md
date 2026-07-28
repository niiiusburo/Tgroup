# 11 — Agent Coverage Ledger

**Baseline:** `22d691535` · Package task: `tgroup-audit-docs`<br>
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
| 1 | AUD-002 | `api/src/services/reports/canonicalRevenue.js` | read allowlist branch | **Confirmed** filter only if `.length` |
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
- Lane S3/S4 condensed into fewer AUD rows with multi-evidence; the explicit crosswalk below preserves every substantive A–M source ID.

### Explicit crosswalk for condensed source IDs

The control package traces **184 substantive A–M finding IDs** into 86 open or
blocked AUD rows plus an explicit resolved prior-audit disposition. The
following IDs were implicit in range notation, cross-lane deduplication, or
that resolved disposition; this table makes each source-to-control relationship
explicit.

| Source finding IDs | Master AUD mapping | Consolidation basis |
|---|---|---|
| A-F012 | AUD-062 | Camera quick-add mock slice |
| B-F004 | AUD-072, AUD-074, AUD-077, AUD-078, AUD-079 | Permission-registry drift split across the owning money, HR, integration, platform, and LOB rows |
| C-F010 | AUD-043 | Customer-source Settings surface |
| C-F011 | AUD-073 | Duplicate of the dual catalog-editor finding |
| C-F012 | AUD-043, AUD-044 | Unmounted/mock Settings component family |
| C-F014, C-F015, C-F016 | AUD-083 | Settings hygiene bundle |
| D-F007, D-F008, D-F009, D-F010, D-F011, D-F012 | AUD-070 | Condensed Partners data-integrity bundle |
| E-F009, E-F010, E-F011 | AUD-071 | Condensed appointment contract/time/pagination bundle |
| F-F014, F-F017, F-F022, F-F023 | AUD-072 | Condensed money-edge and permission-drift bundle |
| F-F019 | AUD-008 | Historic over-allocation is impact evidence for the missing payment-level allocation cap |
| F-F020 | No open AUD; `14-final-audit-report.md` §9 | Resolved prior-audit void-path claim; AUD-009 tracks the distinct PATCH shadow-void defect |
| G-F007, G-F008, G-F009, G-F010, G-F011, G-F013 | AUD-073 | Condensed catalog UX/data-integrity bundle |
| H-F007, H-F008, H-F009, H-F010, H-F012 | AUD-074 | Condensed HR/permission/map-drift bundle |
| I-F008, I-F009, I-F010 | AUD-075 | Condensed reports dead-surface/map/export bundle |
| J-F006, J-F008, J-F010, J-F011, J-F012, J-F013 | AUD-076 | Condensed feedback/CMS bundle |
| K-F007 | AUD-077 | Integration auth-model/configuration slice |
| L-F006, L-F007, L-F008, L-F009 | AUD-078 | Condensed platform footgun/documentation bundle |
| M-F007 | AUD-015, AUD-017 | Baseline LOB absence and dead-end CTV redirect |
| M-F011 | AUD-079 | Divergent local LOB history slice |

Coverage after explicit crosswalk: **184 / 184 substantive A–M finding IDs
traceable to an AUD row or explicit resolved disposition; 0 absent**. R1
discovery IDs remain separately cross-linked through the master Evidence
columns and the stable MOD/FLOW/BL/CX/RK registers.

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
