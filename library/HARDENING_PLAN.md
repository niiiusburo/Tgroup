# TGClinic Hardening & Audit Plan — **NK3 scope**

> Generated 2026-06-14 from actual audit results + the reference library. Concrete, evidence-backed, ordered by ROI and risk.
>
> **Scope rule (2026-06-14):** All work in this plan lands on **NK3 first** (`tmv.2checkin.com`, `tdental_nk3` + `tcosmetic_nk3`). NK / NK2 promotion is a **separate** runbook later, **NOT** part of this plan. Anything tagged **🧪 NK3-ONLY** must not block NK/NK2 portability; it must remain conceptually promotable later (no hardcoded `tdental_nk3` strings in shared code, no cosmetic-LOB assumptions outside the `/api/cosmetic/*` namespace, no CompreFace as the default face provider).
>
> Marking convention: **🌐 UNIVERSAL** (ship-to-NK3, doesn't introduce a new NK/NK2 blocker) | **🧪 NK3-ONLY** (NK3-only surface, OK to ship, will need a wrapper when NK/NK2 promotion happens).

## Current Audit Snapshot (2026-06-14)

| Gate | Result | Notes |
|---|---|---|
| `npm run lint` (website) | ⚠️ 56 warnings, 0 errors | Mostly `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`, unused imports |
| `npm run test` (website vitest) | ✅ 732 pass / 32 skip / 0 fail | Clean |
| `npm test` (api jest) | ❌ 37 fail / 988 pass | All failures in 2 files: `comprefaceClient.test.js` (22, NK3-ONLY) + `faceEngineClient.test.js` (15, UNIVERSAL) — `jest.spyOn(global, 'fetch')` broken under Node 18+ / jest 30 |
| `npm run build` (website) | ✅ 2.23s | Warning: `index-*.js` chunk 577 KB, needs `manualChunks` |
| `npm run verify:crossrefs` | ✅ 336 files / 15 strict | Clean |
| `npm run verify:docs` | ❌ FAIL | Missing `docs/CONTRACTS.md` and `product-map/contracts/api-index.md` updates for uncommitted route changes (services.js deletion + serviceReversal edit) |
| Crossref breadcrumbs | ✅ | 336 source files covered |
| TestSprite live sweep | ✅ 19/19 | NK3 only |

**Real risks (not noise):**
1. 37 broken API tests in CI — face/CompreFace mocking is silently broken (22 🧪 NK3-ONLY, 15 🌐 UNIVERSAL)
2. Docs gate is failing — `services.js` deletion was committed without updating `docs/CONTRACTS.md` per §16
3. 577 KB main bundle — code-splitting will materially improve page load on NK3 mobile staff
4. Library work (66 reference repos, `library/`) is not yet committed
5. Module-size rule still violated on 10+ files (`CtvManagementTab.tsx` 33 KB, etc.)

---

## Triage — Fix This Week (P0, low-risk, high-payoff)

### T1. Restore the 37 broken API tests — **🌐 UNIVERSAL** (fixes NK3 + universal alike)
**Problem:** `comprefaceClient.test.js` (22 tests, 🧪 NK3-ONLY source) and `faceEngineClient.test.js` (15 tests, 🌐 UNIVERSAL source) use `jest.spyOn(global, 'fetch')` which fails under Node 18+ because `fetch` is a non-configurable property. Tests silently break on the same runtime, regardless of which env they're deployed to.
**Reference:** `library/testing-patterns/alexrusin-api-testing` — sets up fetch mocks via dependency injection rather than global spy.
**Files:**
- `api/src/services/__tests__/comprefaceClient.test.js`
- `api/src/services/__tests__/faceEngineClient.test.js`
**Fix (preferred):** Refactor `comprefaceClient` + `faceEngineClient` to accept an optional `fetchFn` injection (default `globalThis.fetch`); tests pass a mock. This is the only fix that doesn't rely on global mocking tricks.
**Acceptance:** `cd api && npm test` reports 1025 pass / 0 fail.
**Risk:** Low — test-only change; small source touch.

### T2. Resolve the docs gate failure — **🌐 UNIVERSAL**
**Problem:** Uncommitted changes to `api/src/routes/services.js` (deletion) and `api/src/services/serviceReversal.js` (edit) trigger §16 doc-update requirements. `docs/CONTRACTS.md` and `product-map/contracts/api-index.md` are not updated.
**Fix:** Either (a) update the docs to reflect the deletion + edit, then commit; or (b) revert the uncommitted changes if they were not intended to ship yet.
**Acceptance:** `npm run verify:docs` exits 0.
**Risk:** Low — documentation update.

### T3. Commit the reference library — **🌐 UNIVERSAL** (docs/tooling)
**Problem:** 66 reference repos and 4 governance docs under `library/` are untracked. Per §16 the library work needs a CHANGELOG entry and a `website/package.json` patch bump is **NOT** required (docs-only governance change per §8).
**Fix:** `git add library/ && git commit -m "..."` with a `[Docs/Tooling]` CHANGELOG entry.
**Acceptance:** `git log --oneline -1` shows the library commit.
**Risk:** None — documentation.

### T4. Code-split the 577 KB main bundle — **🌐 UNIVERSAL** (web build)
**Problem:** Vite warning — main `index-*.js` is 577 KB unchunked, hurting first-load on slower connections (NK3 target is mobile clinic staff in Vietnam).
**Reference:** `library/react-patterns/shadcn-ui` examples use route-level lazy loading.
**Files:** `website/vite.config.ts` (add `manualChunks` for `react`, `react-dom`, `i18next`, `framer-motion`, `lucide-react`).
**Acceptance:** Largest chunk ≤ 400 KB; `npm run build` succeeds.
**Risk:** Low — build config.

### T5. Top-10 real lint warnings — **🌐 UNIVERSAL**
**Problem:** Out of 56 warnings, ~10 are real bug risks (missing `useEffect` dependencies that could cause stale-closure bugs in `Calendar.tsx`, `useVersionCheck.ts`, `CtvManagementTab.tsx`).
**Files:**
- `website/src/pages/Calendar.tsx:81,92,99` — missing deps `colorsFilter`/`doctorsFilter`/`statusesFilter`
- `website/src/hooks/useVersionCheck.ts:125,226,303` — `applyUpdate` and `enabled` dep issues
- `website/src/components/commission/CtvManagementTab.tsx:276,708` — `formApi` / `handleLoad` dep issues
- `website/src/components/commission/DiscountCodesAdminTab.tsx:52`
- `website/src/components/ctv/CtvRecruitModal.tsx:55`
- `website/src/components/services/ServiceForm.tsx:132`
**Fix:** Add proper deps or `useRef` for stable callbacks. Verify with a manual test.
**Acceptance:** `npm run lint` reports ≤ 0 react-hooks warnings on the top-10 files.
**Risk:** Medium — could surface real behavior bugs.

---

## Phase 1 — Foundation Helpers (per `library/REFACTOR_ROADMAP.md` §1)

### 1.1 `withTransaction()` helper — **🌐 UNIVERSAL**
**Problem:** 10+ route files repeat `pool.connect() + BEGIN/COMMIT/ROLLBACK/release` boilerplate.
**Reference:** `library/express-patterns/Z3r0J-nodejs-clean-architecture/src/infrastructure/UnitOfWork.ts` + the CommonJS adaptation in `library/express-patterns/README-reference.md` §2.3.
**Files:** New `api/src/db/transaction.js`; migrate `payments.js`, `payouts.js`, `monthlyPlans.js`, `saleOrderLines.js`, `employees/mutations.js`, `feedback/*.js`.
**Acceptance:** New `withTransaction(dbName, work)` used in 1 file first, then 1 more per commit. Tests still pass; CHANGELOG + `website/package.json` minor bump.
**Risk:** Low (additive).

### 1.2 `Money` parsing utility — **🌐 UNIVERSAL**
**Problem:** `parseFloat(amount || 0)` repeated 100+ times across backend; float drift risk on sums.
**Reference:** `library/money-flow/medici` (Node.js double-entry library) and `library/money-flow/blnk` (Go ledger with `big.Int` precision).
**Files:** New `api/src/lib/money.js` with `toCents`, `fromCents`, `sumMoney(rows, key)`; incremental migration starting with `payments.js`.
**Acceptance:** New helper used in 1 file; unit tests for rounding edge cases.
**Risk:** Low (additive).

### 1.3 `<Can>` React permission component — **🌐 UNIVERSAL**
**Problem:** Inline `hasPermission('payment.view')` checks scattered across JSX; would benefit from declarative wrapper.
**Reference:** `library/auth-rbac/casl/packages/casl-react/src/Can.ts` — port only the component, not the CASL `Ability` class.
**Files:** New `website/src/components/shared/Can.tsx`; consume in 2-3 sites first.
**Acceptance:** Used in 3 call sites; existing tests pass.
**Risk:** Low (additive).

### 1.4 `FormField` shared primitives — **🌐 UNIVERSAL**
**Problem:** Form duplication across Employee/Service/Payment/AddCustomer forms. `CtvCreationForm` already has a good `Field` component.
**Reference:** `library/react-patterns/bulletproof-react/apps/react-vite/src/components/ui/form/form.tsx` (FormField/FormItem/FormLabel/FormControl/FormMessage).
**Files:** Generalize `website/src/components/shared/CtvCreationForm/Field.tsx` into `website/src/components/ui/form/`; migrate one form (PaymentForm) first.
**Acceptance:** PaymentForm uses the shared FormField; visual + behavior parity.
**Risk:** Low (additive).

---

## Phase 2 — Service-Layer Extraction (medium-risk, per `library/REFACTOR_ROADMAP.md` §2)

### 2.1 `PaymentService` extract — **🌐 UNIVERSAL**
**Problem:** `api/src/routes/payments.js` (536 lines) owns create/refund/void/delete/allocation/residual logic.
**Reference:** `library/express-patterns/restuwahyu13-express-rest-api-clean-architecture` controllers + services pattern.
**Files:** New `api/src/services/payments/index.js` with `createPayment`, `refundPayment`, `voidPayment`, `deletePayment`; thin controller at `api/src/routes/payments.js`.
**Acceptance:** Route file ≤ 200 lines; `payments.test.js` still passes; no API contract change.
**Risk:** Medium (refactor).

### 2.2 CTV earnings aggregator (eliminates duplication) — **🌐 UNIVERSAL** (CTV SSOT pattern)
**Problem:** `api/src/routes/ctv.js` (lines 440–485) and `api/src/routes/ctvClientJourneys.js` (lines 43–84) contain duplicated CTV summary aggregation.
**Reference:** `library/commissions-mlm/prathammahajan-affiliate/CommissionEngine.js` aggregator pattern.
**Files:** New `api/src/services/ctv/summary.js` with `buildSummary(earnRows, { client })`.
**Acceptance:** `ctv.js` calls `buildSummary`; both files deduplicated; `ctvBookings.test.js` 17/17 still pass.
**SSOT discipline:** Per `AGENTS.md` §5.1 — if this changes the CTV creation domain or commission shape, co-update SSOT + 3 consumers + product-map.
**Risk:** Medium.

### 2.3 `PayoutBatchProcessor` extract — **🌐 UNIVERSAL**
**Problem:** `api/src/routes/payouts.js` handles `FOR UPDATE` lock + total calc + payout insert + earnings update inline; logic duplicated across dental/cosmetic legs.
**Reference:** `library/commissions-mlm/blnkfinance-blnk/transaction.go` batch pattern + `library/commissions-mlm/pgr0ss-pgledger/pgledger.sql` ordered locking.
**Files:** New `api/src/services/payouts/batchProcessor.js`; thin route handler.
**Acceptance:** Route ≤ 200 lines; service unit-testable with fake runner.
**Risk:** Medium.

### 2.4 Split oversized components — **🌐 UNIVERSAL**
**Problem:** `CtvManagementTab.tsx` (33 KB), `FeedbackAdminContent.tsx` (22 KB), `EarningsPayoutsTabs.tsx` (25 KB), `ServiceForm.tsx` (24 KB) all exceed the 500-line module-size rule.
**Reference:** `library/react-patterns/bulletproof-react` feature-folder pattern with `components/`, `hooks/`, `types/` per feature.
**Files:** Split each into folder structure. For `CtvManagementTab`: extract `useCtvManagement` hook + `CtvRow`, `CtvFilters`, `CtvEditModal` sub-components.
**Acceptance:** All files ≤ 500 lines; vitest still passes.
**Risk:** Medium.

---

## Phase 3 — Audit-Driven Hardening (high-impact, per reference patterns)

### 3.1 Bank statement import pipeline — **🧪 NK3-ONLY** (deploy to NK3 first; NK/NK2 promotion will need its own parser config)
**Problem:** No current bank-statement import. TDental migration scripts parse Vietnamese descriptions heuristically.
**Reference:** `library/bank-statements/bankstatementparser` (Python Pydantic + FastAPI, deterministic SHA-256 dedup, three-tier dedup strategy).
**Plan:** Design import pipeline (parser → normalizer → matcher → preview → commit) using `bankstatementparser` patterns. Coordinate with `product-map/domains/payments-deposits.yaml`.
**Acceptance:** Design doc + schema sketch + first 1-2 parsers (CSV + OFX).
**Risk:** High — new domain, requires coordination with finance.
**Portability note:** Wrap parser drivers in a per-env config; do not hardcode Vietcombank/VCBS specifics into shared code.

### 3.2 Payment engine idempotency keys — **🌐 UNIVERSAL**
**Problem:** `createEarningsForPayment` and `createEarningsForServiceCard` use `WHERE NOT EXISTS` for idempotency, but no external idempotency key for replaying a payment webhook.
**Reference:** `library/money-flow/formance-ledger/internal/storage/ledger/transactions.go` (Idempotency-Key header + IdempotencyHash).
**Plan:** Add `idempotency_key` column to `earnings` (or a new `commission_runs` log); engine short-circuits when key already exists. Migration + engine change.
**Acceptance:** Replaying a payment webhook does not double-create earnings; migration adds the column; `commissionEngine` test suite still passes.
**Risk:** High — schema change + cross-DB (dental + cosmetic).
**NK3 note:** Apply to both `tdental_nk3` + `tcosmetic_nk3` in lockstep; `library/commissions-mlm/formance-ledger` patterns are the model.

### 3.3 DB schema audit triggers — **🌐 UNIVERSAL**
**Problem:** No native audit trail for `payments`/`saleorders`/`partners`/`earnings` changes; only application-level changes.
**Reference:** `library/postgresql-patterns/postgresql-audit-log` (trigger-based `f_audit()` + `t_audit_log` table).
**Plan:** Add `f_audit()` trigger + `audit_log` table to high-blast tables; selective enable (only payments + earnings + ctv-create events).
**Acceptance:** Triggers fire on payments/earnings changes; sample regression test for the audit insert.
**Risk:** High — schema change; needs coordination with DBA.
**NK3 note:** Same SQL applies to both physical DBs; trigger must not break the dual-DB mirror writes.

### 3.4 Token revocation table — **🌐 UNIVERSAL**
**Problem:** TGClinic uses long-lived JWTs (24h / 30d); no logout-side revocation means a stolen token is valid until expiry.
**Reference:** `library/auth-rbac/jwt-refresh-token-node-js` (DB-tracked refresh tokens + revocation).
**Plan:** Add `revoked_tokens` table with `jti` claim; `requireAuth` checks before verify. Plus optional short access tokens (15m) + DB-tracked refresh tokens.
**Acceptance:** Revoked token returns 401; new login issues refresh token.
**Risk:** High — auth flow change.
**NK3 note:** Both NK3 auth source DBs (`tdental_nk3.partners`) need to issue the new token shape; legacy tokens remain valid until expiry for backward compatibility.

---

## Audit Hardening — Documentation Gaps

### A. CHANGELOG hygiene — **🌐 UNIVERSAL**
- Library work is not yet in `docs/CHANGELOG.md` → add `[Docs/Tooling]` entry per §16.
- Each completed item above needs a CHANGELOG entry + `website/package.json` bump per §8.

### B. TestSprite plan — **🧪 NK3-ONLY** (TestSprite only runs against NK3)
- `testbright.md` should be updated for any Phase 2/3 change per `scripts/verify-docs.sh` TESTBRIGHT_PATTERNS.

### C. ADRs (Architectural Decision Records) — **🌐 UNIVERSAL**
- Several architectural choices are unrecorded:
  - Why CommonJS for `api/` while `website/` is ESM?
  - Why dual-DB topology instead of single DB with `company_id`?
  - Why dual-pool factory instead of schema-per-tenant?
  - Why NK3-first promotion strategy (per this 2026-06-14 plan)?
- Add 3-4 ADRs to `docs/ADR/` so future agents don't relitigate.

### D. `product-map/` gaps — **🌐 UNIVERSAL**
- `library/CODEBASE_ANALYSIS.md` notes missing mapping for several duplicate patterns → add to `product-map/contracts/dependency-rules.yaml` and `product-map/schema-map.md`.

---

## Risk & Priority Matrix

| Phase | Items | Scope | Risk | ROI | When |
|---|---|---|---|---|---|
| Triage (T1–T5) | 5 items | 🌐 Universal | Low | High | This week |
| Phase 1 (1.1–1.4) | 4 helpers | 🌐 Universal | Low–Medium | High | Next 1–2 weeks |
| Phase 2 (2.1–2.4) | 4 extracts | 🌐 Universal (with CTV SSOT discipline on 2.2) | Medium | High | Next 2–4 weeks |
| Phase 3 (3.1–3.4) | 4 hard-hitters | 1× 🧪 NK3-only (3.1), 3× 🌐 Universal | High | High | Next 1–2 months |
| Docs/Audit (A–D) | 4 doc gaps | 1× 🧪 NK3-only (B), 3× 🌐 Universal | Low | Medium | Continuous |

## NK3 Verification Standard (per item)

For every shipped item, before declaring done:
1. **TDD first** — write/update the test that demonstrates the bug or pins the new behavior.
2. **Audit gates pass** — `npm run verify:governance` (root) + `npm run lint && npm test` (website) + `npm test` (api).
3. **§16 docs updated** — CONTRACTS / DATA-MODEL / INVARIANTS / TEST-MATRIX / CHANGELOG in the same commit.
4. **CTV SSOT** — if touching CTV/LOB/commission/payment creation, co-update SSOT + 3+ consumers + product-map.
5. **Live NK3 smoke** — for high-blast changes (Phase 2/3), run a real-flow smoke on `tmv.2checkin.com` (login → affected flow → confirm DB state) before promoting from the worktree to the deploy branch. Disposable data only.

## NK3 Promotion Safety (separate runbook, NOT in this plan)

When NK3 is stable and the team is ready to backport to NK/NK2, the runbook will cover:
- Per-item portability audit (does this touch `tdental_nk3` strings, `VITE_COSMETIC_LOB_ENABLED` env, or CompreFace defaults?)
- `scripts/verify-migration-additivity.js` re-run for the new migration delta
- Flag-off-first deployment to NK2/NK (NK3-only features stay gated by `COSMETIC_LOB_ENABLED` / `VITE_COSMETIC_LOB_ENABLED` / `FACE_RECOGNITION_PROVIDER=compreface`)
- Pre-port regression suite run
- Per-target definition of done (NK then NK2)

This is a **future** concern, not part of the NK3 hardening plan.

## Non-Goals (Deliberately Excluded)

- Wholesale replacement of existing services with reference patterns (CASL, drizzle, etc.) — too disruptive.
- Cross-DB JOINs (forbidden by two-DB topology per `AGENTS.md` §3).
- Touching CTV creation domain without co-updating SSOT + backend + product-map + tests per §5.1.
- Migration of `commissionEngine.js` L0–L4 ladder logic (already battle-tested in production).
- NK/NK2 migration planning (separate runbook, not this plan).

## Coordination Required

| Item | Owner | Coordination | Scope |
|---|---|---|---|
| 3.1 Bank statement import | Backend + Finance | `product-map/domains/payments-deposits.yaml` | 🧪 NK3-ONLY |
| 3.2 Idempotency keys | Backend | `docs/DATA-MODEL.md`, `docs/MIGRATIONS.md`, schema-map, `earnings-commissions.yaml` | 🌐 Universal |
| 3.3 Audit triggers | Backend + DBA | `docs/MIGRATIONS.md`, schema-map, performance review | 🌐 Universal |
| 3.4 Token revocation | Backend + Frontend | `docs/CONTRACTS.md`, `auth-rbac` middleware, AuthContext | 🌐 Universal |
| 2.1 PaymentService | Backend | `docs/CONTRACTS.md` (if any shape change), TEST-MATRIX | 🌐 Universal |
| 2.2 CTV aggregator | Backend | `product-map/domains/ctv.yaml`, `earnings-commissions.yaml`, CTV SSOT per §5.1 | 🌐 Universal |

## Next Concrete Step

Start with **T1** (fix 37 broken tests) and **T3** (commit library) — both are 30–60 minutes of work and unblock the rest. Then schedule **T2** (docs gate) and **1.1** (`withTransaction` helper) as the first refactor.

For T1 specifically: prefer Option C (inject `fetch` into the source) so the same fix serves both `comprefaceClient` (🧪 NK3-only) and `faceEngineClient` (🌐 universal) without per-env divergence. One test run, one CHANGELOG entry, version-bump decision per `AGENTS.md` §8 (test-only source change → patch bump).
