# Agent 5 Swarm Checker Summary

Date: 2026-05-19
Worktree: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`
Role: Independent checker/summarizer only.
Write scope used: this file only.

## Authority / Polling Status

- Required first command attempted: `bash scripts/prompt-authority-check.sh`
- Result: FAIL. `scripts/prompt-authority-check.sh` does not exist in this worktree. `scripts/verify-docs.sh` and `scripts/sync-claude-mem.sh` are present.
- `AGENTS.md` was read before summary work.
- Worker report polling started with all four reports missing, stopped after two reports appeared, then incorporated the two late-arriving reports before final handoff:
  - Present: `AGENT_FINISH_ORCHESTRATION.md` updated 2026-05-19 18:39:59.
  - Present: `AGENT_FINISH_DB_BOOTSTRAP.md` updated 2026-05-19 18:39:57.
  - Present: `AGENT_FINISH_ROUTE_SAFETY.md` updated 2026-05-19 18:39:47.
  - Present: `AGENT_FINISH_CTV_FLOW.md` updated 2026-05-19 18:39:57.

## Worker Claims Summarized

### Agent 1: Finish Orchestration

Agent 1 reports FAIL for merge readiness from orchestration/governance.

Key claims:
- The branch is isolated on `feat/cosmetic-line-of-business`, is ahead of `origin/main`, and has a website version bump from `0.31.18` to `0.31.19`.
- High-level docs, product-map coverage, `testbright.md`, permission registry entries, syntax checks, `git diff --check`, and finishing screenshots exist.
- The worktree is heavily dirty with 133 changed/untracked entries, while only two docs/spec commits are ahead of `origin/main`.
- The prompt authority gate script is missing.
- Product-map/docs still drift from accepted `partners` identity/auth language in places that reference `users` or `recipient_user_id`.
- Two migration files share the `047` prefix, creating release-order/rollback ambiguity.
- Acceptance evidence is contradictory across older and newer reports, and some older screenshot placeholders are still zero-byte.
- Fresh final logs are still needed for prompt gate, governance verification, backend/frontend tests, Playwright matrix, migration rollback, and Semgrep.

### Agent 2: DB / Bootstrap / Seed

Agent 2 reports FAIL for final DB readiness, with PASS for current local DB shape and script static runnability.

Key claims:
- Local Postgres on `127.0.0.1:5433` is reachable and both `tdental_demo` and `tcosmetic_demo` exist.
- Both DBs contain expected v2 schema objects/columns: `partners.lob_scope`, `partners.is_ctv`, `partners.referred_by_ctv_id`, `products.commission_rate_percent`, plus `earnings`, `payouts`, `referral_locks`, and `consultations`.
- Current seed state includes dental admin cosmetic scope, a demo CTV, cosmetic employees/customers/products/payments, and earnings.
- `bootstrap-cosmetic-db.sh` and `seed-cosmetic-lob.js` pass static syntax checks and required npm packages are installed.
- Neither local DB exposes `dbo.schema_migrations`, so migration tracking cannot be proven.
- Duplicate `047_*` migrations remain, and one appears redundant/legacy.
- Bootstrap was not run because it drops/recreates `tcosmetic_demo`; clean bootstrap-to-seed is still unproven.
- Seed fallback can directly insert earnings and use sentinel UUIDs, weakening proof that real payment collection creates earnings via the engine path.

### Agent 3: Route / LOB Safety

Agent 3 reports the branch is not route-safe for finish/merge.

Key claims:
- `/api/cosmetic/*` has a mostly correct gated path using `requireLobScope('cosmetic')`, `attachCosmeticDb`, `runWithLob`, and `requirePermission('cosmetic.access')`.
- Legacy dental APIs are still mounted after global auth without a dental LOB hard gate, so cosmetic-scoped users may still reach dental default-pool APIs.
- `/api/ctv` and `/api/Ctv` are mounted more than once, including unguarded paths, while `api/src/routes/ctv.js` mostly enforces only `requireAuth`.
- `COSMETIC_LOB_ENABLED=false` may not reliably disable CTV APIs because a later unconditional CTV mount reopens the route.
- Frontend `/ctv` is outside the admin layout but is not protected by an auth/CTV-only route guard.
- CTV endpoint-specific permissions are registered but not enforced inside the route handlers.

### Agent 4: CTV / Referral / Commission Flow

Agent 4 reports overall FAIL for the CTV referral and commission business flow.

Key claims:
- The visible `/ctv` dashboard exists, bypasses admin chrome, redirects CTV users out of admin routes, and calls live CTV API clients.
- CTV API aggregation across dental and cosmetic DBs exists, but CTV APIs are not consistently restricted to `is_ctv` users or endpoint self permissions.
- Customer/partner creation does not accept or persist v2 `referred_by_ctv_id`.
- Appointment creation does not create or supersede cosmetic consultation attribution cards.
- Earnings insertion is append-only in the engine and focused engine tests pass, but the live payment route passes `lines: []`, so normal payment-created earnings are not wired to real service lines/product rates.
- Refund, delete, and void payment flows do not call `reverseOnRefund`, so negative reversal rows are not produced for real operational paths.
- Payout runner/linking is documented but not implemented.
- Focused Jest tests passed for `commissionEngine` and `permissionService`; full Playwright matrix was not run.

## Contradictions / Alignment Check

- No direct contradictions between the four final reports were found in their readiness verdicts: all four say not ready / FAIL for final readiness.
- Agent 1 reports internally contradictory historical evidence exists in the repo: older reports say incomplete/not finished, while later finishing reports claim completion. That is a documentation/evidence contradiction that still needs one authoritative closeout.
- Agents 1 and 2 both identify duplicate `047` migrations and missing prompt authority gate script.
- Agents 1, 2, and 4 all identify doc/schema wording drift around `users` / `recipient_user_id` versus accepted `partners` / `recipient_partner_id`.
- Agents 3 and 4 independently identify duplicated or unguarded CTV mounts, missing `is_ctv`/endpoint permission enforcement, and incomplete `/ctv` frontend route protection.
- Agent 2 says current local DB shape exists, but it does not prove clean migration tracking or clean bootstrap-to-seed flow because `schema_migrations` is missing and bootstrap was intentionally not run.

## Top Blockers

1. P0: Worktree is not merge-ready. Agent 1 reports 133 changed/untracked entries and contradictory readiness evidence that needs a single authoritative closeout.
2. P0: Required prompt authority gate is missing from the worktree, and all four reports observed the same failure for `bash scripts/prompt-authority-check.sh`.
3. P0: Migration readiness is blocked by duplicate `047` migration files and missing visible `dbo.schema_migrations` in both local DBs.
4. P0: CTV API access is not safe. Duplicate/unconditional route mounts plus route-local `requireAuth` allow broader authenticated access than the CTV-only contract permits.
5. P0: Feature flag disablement is not deterministic for CTV APIs because an unconditional mount can bypass the disabled handler.
6. P0: Legacy dental APIs lack explicit hard LOB enforcement, so cosmetic-only users may still access dental default-pool routes.
7. P0/P1: Commission lifecycle is not complete for real operations. Live payments do not resolve valid sale order lines/product rates, and refund/void/delete paths do not create append-only reversals.
8. P1: Referral/consultation attribution is not wired into customer/client and appointment mutation paths.
9. P1: `/ctv` frontend route lacks a dedicated auth/CTV-only guard.
10. P1: Payout implementation remains documentation/schema only.
11. P1: Product-map/docs still contain stale `users` / `recipient_user_id` wording that conflicts with the accepted `partners` / `recipient_partner_id` model.

## Still Needs Human / Main-Agent Verification

- Verify whether the missing authority gate script is expected to be absent in this worktree or must be restored/aligned with root project policy.
- Decide how to resolve duplicate `047` migration files and prove migration tracking with `dbo.schema_migrations` in both local DBs.
- Run clean disposable bootstrap-to-migration-to-seed verification for `tcosmetic_demo`; do not run destructive bootstrap against valuable local state without explicit approval.
- Produce one authoritative readiness report that supersedes stale contradictory evidence and removes/replaces zero-byte screenshot placeholders.
- Confirm with route-level tests that:
  - dental-only users cannot call `/api/cosmetic/*`;
  - cosmetic-only users cannot call legacy dental APIs;
  - non-CTV authenticated users cannot call `/api/ctv/*`;
  - `COSMETIC_LOB_ENABLED=false` returns deterministic 503 responses for cosmetic and CTV surfaces.
- Verify local DB bootstrap/migration state for both dental and cosmetic databases before trusting any CTV/earnings runtime test.
- Run browser/API verification with `COSMETIC_LOB_ENABLED=true` only after the backend and Vite services are stable.
- Run the full Playwright CTV/cosmetic LOB matrix after the route and data-flow blockers are fixed.
- Run scoped Semgrep security checks after any auth, route gating, payment, or backend data-flow fixes.
- Update `testbright.md`, affected product-map/docs, changelog, and website version as required after worker code changes are finalized.

## Checker Verdict

Based on all four worker reports, the cosmetic LOB finishing swarm is not ready to finish, merge, or deploy. The branch needs main-agent follow-up on worktree cleanliness, missing prompt-gate infrastructure, migration numbering/tracking, CTV route safety, dental/cosmetic LOB isolation, commission/refund lifecycle wiring, and stale doc/evidence drift before it can be considered complete.
