# TGClinic Reference Library Index

> Battle-tested open-source repositories downloaded and curated for TGClinic domains. Use as exemplars when refactoring, not wholesale replacement.

| Domain Folder | Status | Lead Agent | Repos | README | License Mix |
|---|---|---|---|---|---|
| `money-flow/` | ✅ Complete | MoneyFlowRef | 6 | ✅ | MIT, Apache-2.0 |
| `bank-statements/` | ✅ Complete | BankStatementRef | 7 | ✅ | MIT, Apache-2.0 |
| `commissions-mlm/` | ✅ Complete | CommissionRef | 8 | ✅ | MIT, Apache-2.0, Elastic-2.0 |
| `ctv-referral/` | ✅ Complete | CtvRef | 13 | ✅ | MIT, AGPL-3.0, GPL-3.0, MPL-2.0 |
| `auth-rbac/` | ✅ Complete | AuthRef | 6 | ✅ | MIT |
| `react-patterns/` | ✅ Complete | ReactRef | 7 | ✅ | MIT |
| `express-patterns/` | ✅ Complete | ExpressRef | 7 | ✅ | MIT |
| `postgresql-patterns/` | ✅ Complete | PostgresRef | 7 | ✅ | MIT |
| `testing-patterns/` | ✅ Complete | TestingRef | 5 | ✅ | MIT, ISC |

**Legend:** ✅ Complete | 🚧 In progress | 🔍 Needs review

## Repository Counts

- **Total reference repos:** 66
- **Total disk size:** ~178 MB (after node_modules / .git / lockfiles stripped)
- **Total reference READMEs:** 9

## Global Artifacts

- `library/README.md` — library overview and usage rules
- `library/CODEBASE_ANALYSIS.md` — current duplication and bottleneck analysis (hotspots, parseFloat repetition, transaction boilerplate, dual-DB mirror risks)
- `library/REFACTOR_ROADMAP.md` — phased enterprise refactor plan (5 phases, low-risk → high-risk)
- `library/HARDENING_PLAN.md` — current-state audit + triage + Phase 1/2/3 hardening work
- `library/INDEX.md` — this index

## How to Use

1. **Read** the domain `README-reference.md` for patterns + recommendations.
2. **Study** the listed key files in each reference repo.
3. **Adopt incrementally** — never copy verbatim; map patterns to TGClinic's authority stack (`AGENTS.md`, `ARCHITECTURE.md`, `product-map/`).
4. **Update product-map and CHANGELOG** when adopting patterns per `AGENTS.md` §16.
5. **Preserve SSOT invariants** — CTV/LOB/commission changes must co-update SSOT + backend + product-map + tests per `AGENTS.md` §5.1.

## License Discipline

- **MIT / Apache-2.0 / ISC:** safe to study, adapt, and reuse patterns.
- **AGPL-3.0 / GPL-3.0:** copyleft — study patterns only, do not embed into TGClinic proprietary codebase.
- **Elastic-2.0:** source-available — use as architectural reference only.
- **Unknown / Other:** listed per repo; verify before reuse.

## NK3 Scope (2026-06-14)

The library and the hardening plan are **NK3-scope by default**. Everything lands on NK3 (`tmv.2checkin.com`) first; NK/NK2 promotion is a separate runbook later and NOT part of this work. See `library/HARDENING_PLAN.md` for the 🌐 UNIVERSAL vs 🧪 NK3-ONLY marking on every item.

## Next Steps

See `library/HARDENING_PLAN.md` for the concrete audit + phased work plan, and `library/REFACTOR_ROADMAP.md` for the patterns-to-adopt map.
