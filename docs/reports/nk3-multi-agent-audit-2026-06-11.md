# NK3 Multi-Agent Audit — 2026-06-11

**Scope:** NK3 only (`tmv.2checkin.com`, `runtime/docker-compose.nk3.yml`, Cosmetic LOB v2).  
**Branch:** `nk3-deploy` @ repo root.  
**Out of scope:** NK2 (`nk.2checkin.com`), unrelated worktrees.

## Orchestration summary

| Role | Agent / actor | Outcome |
|------|----------------|---------|
| Chunk architecture | `PlanChunks` (plan) | **9 verification packages** + dependency graph + verifier≠implementer workflow |
| Business logic verifier | `reviewer` (`VerifyBizLogic`) | **CONFIRMED P0** — service delete vs service-card earnings reversal |
| Scout fleet | `explore` / `task` subagents | **Blocked** (Kimi 429, Codex model) — main session completed discovery |
| Governance verifier | Main session | `npm run verify:governance` → **PASS** |

Orchestration contract: `local://nk3-audit-orchestration-2026-06-11.md` (session-local).

## Verification packages (NK3)

Use these as independent audit chunks; **verifier must not be the implementer** (see `agent://PlanChunks` → `verifier_workflow`).

| ID | Focus | Primary verify |
|----|--------|----------------|
| `nk3-auth-identity` | JWT, permissions, CTV isolation | api jest auth suite + web AuthContext tests |
| `nk3-lob-cosmetic` | Two-DB, `/api/cosmetic/*` mirrors | `cosmeticLobGuards`, `db-factory`, e2e `cosmetic-lob-full-matrix` |
| `nk3-web-shell` | LOB toggle, routing, i18n, crossrefs | vitest shell + `verify:crossrefs` |
| `nk3-customers-identity` | Partners SMI, face | partners/face jest + customer e2e |
| `nk3-calendar-appointments` | Calendar CRUD | appointments jest + e2e |
| `nk3-services-money` | Sale orders, payments, reversals | payments/saleOrders jest + payment e2e |
| `nk3-ctv-commission` | CTV SSOT, earnings, payouts | commission jest + CtvCreationForm tests |
| `nk3-reports-exports` | Reports / Excel | reports jest + export e2e |
| `nk3-settings-governance` | Feedback, IP, doc gates | `verify:governance` |

**Parallel order:** Auth → (LOB ∥ Shell) → (Customers ∥ Calendar ∥ Money) → CTV → (Reports ∥ Governance).

## Independent verifier findings (business logic)

### CONFIRMED — P0

**Service deletion leaves service-card CTV earnings unreversed**

- **Authority:** `product-map/domains/earnings-commissions.yaml` (service-card delete/refund → negative reversal row; paid-out guard).
- **Behavior:** Service-card earnings use `payment_id = NULL` (`createEarningsForServiceCard`). `reverseServiceLine` (`api/src/services/serviceReversal.js`) reverses via `payment_id` only → misses service-card rows.
- **Impact:** CTV can retain **pending earnings for deleted services** on NK3 when `CTV_SERVICE_CARD_COMMISSION=true`.
- **Verifier:** `reviewer` / `VerifyBizLogic` (confidence 0.95). **Not self-reviewed by implementer scout.**
- **Fix direction:** In `reverseServiceLine`, when service-card model enabled: detect paid-out via `service_line_id` + `payment_id IS NULL`; call `reverseServiceCardEarnings` (or equivalent) before delete path completes.
- **Regression test:** Extend `serviceReversal.test.js` — delete line with pending service-card earnings → expect reversal row.

### Tests run (verifier, main session)

```text
jest: commissionEngine + commissionEngineServiceCard + ctvCreateLobScope → 24/24 PASS

## Update 2026-06-11 (steps 1–3 executed)

- **P0 fixed:** `reverseServiceLine` calls `reverseServiceCardEarnings` + paid-out guard on `service_line_id` / `payment_id IS NULL`.
- **Tests:** `serviceReversal.test.js` 7 tests (incl. 2 new service-card cases).
- **CI:** `scripts/nk3-verify-package.sh` + `.github/workflows/nk3-verify-packages.yml` (matrix: 5 core packages).
- **Version:** `0.37.6` + `docs/CHANGELOG.md` + `docs/TEST-MATRIX.md`.

```

`serviceReversal.test.js` — run separately; does not prove service-card delete reversal (gap aligns with reviewer finding).

## Structural / maintainability (discovery)

### Files >500 lines (NK3 blast radius)

| Lines | File |
|------:|------|
| 1095 | `api/src/routes/ctv.js` |
| 859 | `website/src/components/commission/CtvManagementTab.tsx` |
| 536 | `api/src/routes/payments.js` |
| 526 | `api/src/routes/ctvPublic.js` |
| 504 | `website/src/components/services/ServiceForm.tsx` |

**Improvement:** Extract sub-routers/services per `AGENTS.md` §5 before adding features (CTV routes highest priority).

### CTV creation SSOT

`ast_grep` shows **canonical consumers** import `CtvCreationForm`:

- `CtvManagementTab.tsx`, `CtvRecruitModal.tsx`, `JoinCtv.tsx`

No duplicate inline create forms found in quick structural scan. Full SSOT audit still belongs in `nk3-ctv-commission` package (grep `createCtv`/`joinCtv` without shared import).

### LOB middleware

`requireLobScope` present in `middleware/auth.js`, `dentalLobGate.js`, `server.js`, guarded by `cosmeticLobGuards.test.js`.

### Live NK3 routing guard

`website/e2e/nk3-live-cosmetic-lob-routing-audit.spec.ts` — cosmetic UI must hit `/api/cosmetic/*` (P0 dental leak detection). Recommended periodic run against `tmv.2checkin.com` (read-only / intercepted mutations).

## Governance state

- `verify:governance` — **PASS** (authority, crossrefs 336 files, docs/testbright).
- No code changes in this audit session → **no deploy**.

## Recommended next work (prioritized)

1. **P0:** Fix service-card earnings reversal on service line delete + test (`nk3-services-money` + `nk3-ctv-commission` verifiers re-run).
2. **P1:** Split `api/src/routes/ctv.js` into focused modules (bookings, referrals, admin create).
3. **P1:** Run `nk3-lob-cosmetic` package jest + `e2e/nk3-live-cosmetic-lob-routing-audit.spec.ts` on TMV after any API routing change.
4. **P2:** Persist `verification-reports/<package-id>-<date>.md` per `PlanChunks` workflow for each release train.
5. **P2:** Extract `@tgroup/payment-allocations` / `@tgroup/commission-engine` (medium-term, per plan agent).

## Agent fleet limitations (this session)

- Kimi-backed `explore` agents returned **429 rate limit** — scout work folded into main session + `PlanChunks` + `reviewer`.
- `task` + Codex subagent failed on **gpt-5.3-codex** ChatGPT account restriction.

**Workaround for future runs:** Use `task` + `oracle`/`reviewer` on main subscription, or run package verify commands in CI matrix per chunk ID.