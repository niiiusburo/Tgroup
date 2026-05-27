# Cosmetic Line of Business (v2) — Implementation Plan (TDD-Enforced)

**North Star:** `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md` (canonical/approved) + `2026-05-18-cosmetic-line-of-business-visual-companion.md`

**Specialist Review Inputs Incorporated (4 reports, cold-audit of worktree 2026-05-19):**
- **Database Specialist Report:** Two physical DBs (`tdental_demo` on 5433 + new `tcosmetic_demo`). Additive-only on dental (no shape changes to existing rows/queries). **Table name collision identified on `commissions`** (legacy rules/config table + `commissionproductrules` + `saleorderlinepartnercommissions` vs. v2 transactional earnings). **Decision:** Use `earnings` (not `commissions`) for the new transactional table in BOTH DBs. `payouts` remains for payout batches. `consultations` (cosmetic-only, invisible to admin UI), `referral_locks` (dental-only). No cross-DB FKs/JOINs; soft refs + API validation only. Empty `staff`/`companies` in cosmetic per D16. Separate connection pools (`dbDental`, `dbCosmetic`).
- **Auth/RBAC + CTV Gating Specialist Report:** Extend `users` with `lob_scope TEXT[] NULL` + `is_ctv BOOLEAN NULL DEFAULT FALSE`. Backfill legacy to `ARRAY['dental']`. CTV users (`is_ctv=true`) get empty/null `lob_scope`, **never** see LOB toggle or admin UI; hard redirect on login to `/ctv` + 403 guards on all admin routes. New permissions registered in `product-map/contracts/permission-registry.yaml`. New `requireLobScope(lob)` middleware + `/api/me/lob-scope` endpoint. `lob.crossview` for cross-LOB badge (admins only). CTV perms: `ctv.dashboard.view`, `ctv.commission.view.self`, `ctv.referrals.view.self`.
- **Frontend Specialist Report:** Mirror `LocationContext` exactly for new `BusinessUnitContext` (or `LOBContext`). Header toggle placed immediately left of `FilterByLocation` in `Layout.tsx`. **Keyed remount** (`key={currentLOB}`) on main content subtree to guarantee no stale dental data flash. All data-fetch hooks (`useCustomers`, `useOverview`, etc.) become LOB-aware (read context + call dental routes or `/api/cosmetic/*` mirrors). `/ctv` route + bottom-nav mobile-first 4-tab dashboard (Home/Commission/Referrals/Me) using existing design tokens. Reuse all dental components 1:1 for cosmetic admin (empty states per visual companion). Login redirect logic in `AuthContext` + `ProtectedRoute`.
- **Money / Commission Engine Specialist Report:** New `earnings` (not commissions) table is append-only transactional (triggered on payment collected; refunds = negative reversal rows, original row untouched). Recipient resolution strictly per D13 (CTV `referred_by_ctv_id` wins first, then cosmetic `consultations` active card, then dental `partners.salestaffid`). Separate from legacy commission *rules* system (do not touch `commissions`/`commissionproductrules`/`saleorderlinepartnercommissions`). `payouts` + `earnings.payout_id` for admin batch payouts. Attribution for cosmetic via invisible `consultations` cards (auto-created on booking with `consulting_staff_id`). Engine lives in payment mutation path + dedicated commission service. No impact on existing `/commission` admin page (rules UI).

**Global Rules (NON-NEGOTIABLE per AGENTS.md + Claude.md + root AGENTS.md):**
- **TDD First:** Write failing tests (Jest unit + integration for API/DB + Playwright E2E) **before** any implementation code in every phase. 80%+ coverage on new code. Run `npm test` / Playwright before marking phase complete.
- **"Local only, NK2 later" Rule:** ALL development, DB provisioning (`tcosmetic_demo`), staff seeding, flag testing, CTV user creation, commission engine runs, screenshots, and verification happen **exclusively on local dev** (`http://127.0.0.1:5175`, Postgres 127.0.0.1:5433, `t@clinic.vn` / `123123`). **Never** touch nk2.2checkin.com or prod until explicit Phase 4 gate (after full local green + rollback dry-run). Feature flag `COSMETIC_LOB_ENABLED=false` by default in all envs until Phase 4 promotion.
- **Verification:** Real browser end-to-end (Playwright MCP or manual via `npm run dev` + Chrome) + screenshots **after every UI change**. Trace full prop chain (component → context → API client → route → DB selector). Existing dental Playwright suite 100% green at every checkpoint.
- **Immutability + Security:** Never mutate; additive only. Validate every input. LOB + permission gates on every new route. No cross-DB leaks.
- **Authority:** At start of any execution session, read `AGENTS.md`, `Claude.md`, `ARCHITECTURE.md`, `product-map/` files, `docs/runbooks/`. Update `DECISIONS.md`, `DATA-MODEL.md`, `product-map/*`, `CHANGELOG` (no version bump until Phase 4), `testbright.md`, etc. per v2 spec § Documentation updates.
- **Rollback Criteria:** Any phase fails its verification gates or dental regression >0 tests → immediate rollback of that phase's migrations + code; do not proceed.
- **Agents execute autonomously** from this PLAN: each phase lists exact files, commands, test names, verification scripts, and "done" checklist.

**Feature Flag & Env:**
- Backend: `process.env.COSMETIC_LOB_ENABLED === 'true'` (default false). When false, cosmetic routes return 503, toggle hidden.
- Frontend: `import.meta.env.VITE_COSMETIC_LOB_ENABLED === 'true'`.
- Local `.env` only for now.

**Chosen Naming (post-DB review):**
- Transactional earnings table: `dbo.earnings` (both DBs).
- Payout batches: `dbo.payouts` (both).
- Cosmetic-only: `dbo.consultations`, `dbo.clients`, `dbo.staff`.
- Dental-only additive: `users.lob_scope`, `users.is_ctv`, `partners.referred_by_ctv_id`, `products.commission_rate_percent`, `dbo.referral_locks`.
- API namespaces: existing dental routes unchanged (`/api/Partners` etc.); new mirrors at `/api/cosmetic/Partners`, `/api/cosmetic/...`; CTV at `/api/ctv/...`; helper `GET /api/me/lob-scope`.

**Dependencies Graph:** Phase 0 → 1 (toggle + mirrors + seeding) → 2 (earnings engine) → 3 (CTV full + payouts) → 4 (hardening + NK2).

---

## Phase 0: Governance & Foundation (product-map, docs, basic context)

**Goals:**
- Establish product-map domains for new surfaces (business-unit, cosmetic, ctv, earnings).
- Update authority docs (AGENTS, ARCHITECTURE, DATA-MODEL, DECISIONS, SECURITY, RUNBOOK, TEST-MATRIX, etc.) with two-DB topology and "local only" rule.
- Add basic `BusinessUnitContext` skeleton + feature flag plumbing (no UI toggle yet).
- Register new permission keys.
- Provision local `tcosmetic_demo` skeleton (empty, matching dental dbo shape) + connection factory.
- Write TDD tests for context + flag + permission registry.

**Deliverables:**
- `product-map/domains/business-unit.yaml`
- `product-map/domains/cosmetic-clients.yaml`
- `product-map/domains/ctv.yaml`
- `product-map/domains/earnings-commissions.yaml` (note naming)
- `product-map/contracts/permission-registry.yaml` (9 new keys per v2)
- `product-map/contracts/api-index.md` (new cosmetic/ctv routes)
- `product-map/unknowns.md` + `change-checklist.md` updates
- Updated: `AGENTS.md`, `ARCHITECTURE.md` (two-DB diagram), `DATA-MODEL.md`, `DECISIONS.md` (log D1–D16 + table-name decision), `docs/SECURITY.md`, `docs/RUNBOOK.md` + `docs/runbooks/DEPLOYMENT.md` + `docs/runbooks/VERIFICATION.md`, `docs/TEST-MATRIX.md` (8 new test classes), `docs/CONTRACTS.md`, `.claude/memory.md`
- `api/src/db.js` → `api/src/db/index.js` with `getDb(lob: 'dental'|'cosmetic')` factory + env switch
- `website/src/contexts/BusinessUnitContext.tsx` (skeleton mirroring LocationContext, with `currentLOB`, `setLOB`, `userLobScope`, `isCosmeticEnabled`)
- Feature flag checks in `server.js` + `AuthContext`
- Jest tests: `api/src/__tests__/db-factory.test.js`, `website/src/contexts/__tests__/BusinessUnitContext.test.tsx`
- Playwright skeleton test file for later phases

**TDD Requirements:**
1. Write failing tests first for:
   - DB factory returns dental pool when LOB=dental or flag=false; cosmetic when enabled.
   - BusinessUnitContext throws outside provider; provides correct defaults from mock user.
   - Permission registry loader includes new keys (unit test on yaml).
2. Run `npm test -- api/src/__tests__/db-factory.test.js` + frontend equivalent → red.
3. Then implement to green. Coverage >80% on new modules.

**Verification Steps (local only):**
- `psql -h 127.0.0.1 -p 5433 -U postgres -l` shows `tcosmetic_demo` (empty dbo schema bootstrapped via script).
- `node -e "console.log(require('./api/src/db').getDb('cosmetic'))"` succeeds.
- `npm run test:unit` (or `cd website && npm test`) — all new tests green, zero dental regressions.
- Manual: `npm run dev` (127.0.0.1:5175), login t@clinic.vn → no toggle visible yet (scope still legacy), but context loads without crash. Screenshot: `artifacts/cosmetic/phase0-context-load.png`
- Rollback: `DROP DATABASE tcosmetic_demo;` + revert db factory + context files. Dental queries unchanged (run full dental Jest suite).

**Dependencies:** Clean worktree on `feat/cosmetic-line-of-business`. Read authority stack first. No code touching earnings or CTV yet.

**Rollback Criteria:** Any dental query breaks or tests fail → stop.

**Done Checklist:**
- [ ] product-map domains + contracts updated + `product-map/system-map.md` re-rendered
- [ ] All listed docs updated with "local only, NK2 later" + two-DB warnings
- [ ] DB factory + BusinessUnitContext skeleton + tests green
- [ ] Screenshots + real-browser smoke captured
- [ ] `testbright.md` + `CHANGELOG.md` (planning entry) updated
- [ ] Phase 0 sign-off in `.agent-tasks/` or PR comment

---

## Phase 1: Thin Slice (LOB toggle + empty cosmetic mirror + staff seeding)

**Goals:**
- LOB toggle renders for users with `lob_scope.length >= 2` (next to location filter in header).
- Cosmetic LOB shows empty but functional admin UI (reuses all existing pages/components, queries empty `tcosmetic_demo`).
- Staff seeding: admin can add cosmetic staff/locations via existing Employees UI (under cosmetic LOB) → populates `tcosmetic_demo.staff` + `companies` + `employee_location_scope`.
- API mirrors: `/api/cosmetic/Partners`, `/api/cosmetic/Employees`, `/api/cosmetic/Products`, etc. (exact same handlers, different DB).
- `GET /api/me/lob-scope` + login response enrichment with `lob_scope` + `is_ctv`.
- CTV role stub (no dashboard yet).
- All behind flag (default off).

**Deliverables:**
- Backend: `requireLobScope` middleware in `api/src/middleware/auth.js` (or new `lob.js`).
- Cosmetic route mirrors: new `api/src/routes/cosmetic/` folder with index that re-exports dental handlers bound to cosmetic DB (or thin wrappers). Mount `/api/cosmetic/*` in `server.js` gated by flag + scope.
- `api/src/routes/auth.js` + `auth.ts` frontend: extend responses with `lob_scope`, `is_ctv`.
- `api/src/routes/me.js` (or extend auth) for `/api/me/lob-scope`.
- Frontend: full `BusinessUnitContext.tsx` (persist to localStorage, dispatch events like auth-change), LOB dropdown component `LOBSelector.tsx` (mirrors FilterByLocation), integrate into `Layout.tsx` header.
- Update all major data hooks (`useOverviewData`, `useCustomers`, `useEmployees`, etc. in `website/src/hooks/`) and API client (`website/src/lib/api/`) to be LOB-aware: `apiFetch(endpoint, { lob })` → resolves to `/api/cosmetic/...` or legacy path.
- Keyed remount in `App.tsx` or `Layout` main area: `<div key={currentLOB}> <Outlet /> </div>`.
- ProtectedRoute + login redirect logic for future CTV (stub).
- Empty-state friendly UI on cosmetic (no special wizard; use existing Employees/Services to seed).
- Seed script: `api/scripts/seed-cosmetic-staff.js` (local only) for 1-2 test staff.
- Permission registration + `hasPermission('cosmetic.access')` etc. in backend services/permissionService.js + frontend.
- Jest/Playwright tests for isolation, toggle, empty render, seeding.

**TDD Requirements:**
- Write **first**:
  - Backend integration: dental-scoped user hits `/api/cosmetic/Partners` → 403 `S_LOB_FORBIDDEN`.
  - Cosmetic-scoped (flag on) → 200 empty list from `tcosmetic_demo`.
  - Frontend: toggle component renders only when scope.length>=2; selecting cosmetic calls cosmetic endpoints (mocked).
  - Playwright: "LOB isolation smoke" — login, grant scope via direct DB update, toggle, assert empty customers list + no dental data leak.
  - Seeding test: POST /api/cosmetic/Employees creates row in cosmetic DB only.
- Run full existing dental Playwright suite (`npx playwright test`) → must stay 100% green.
- New tests green before any prod-like code.

**Verification Steps (local only + real browser screenshots):**
1. `COSMETIC_LOB_ENABLED=false` (default): no toggle, all routes dental-only, existing dental data unchanged. Screenshot: `artifacts/cosmetic/phase1-flag-off.png`
2. Grant `lob_scope = ARRAY['dental','cosmetic']` to `t@clinic.vn` via psql (local).
3. `npm run dev` → login → header shows `[Dental ▾] [All Locations ▾]` (exact visual per companion). Toggle to Cosmetic → page remounts (key change), shows empty overview/customers/employees (per visual mockups). Screenshot full header + empty /customers: `artifacts/cosmetic/phase1-toggle-cosmetic-empty.png` + `phase1-dental-intact.png`
4. Under Cosmetic: navigate to Employees → add new staff → verify row in `tcosmetic_demo.dbo.staff`, NOT in dental. Screenshot.
5. Toggle back → dental data intact, no flash of stale cosmetic.
6. API curl (with token): dental-only user → cosmetic 403; scoped user → empty success.
7. Run: `npm test` + Playwright dental suite + new phase1 tests → all green.
8. Rollback dry-run: feature flag flip to false + context revert → dental only.

**Dependencies:** Phase 0 complete (context skeleton, DB factory, permissions, docs). No earnings code yet.

**Rollback Criteria:** Dental data appears in cosmetic view, or any existing test fails, or toggle causes unmount crash → revert toggle + mirrors, drop cosmetic rows if any, re-test dental suite.

**Done Checklist:**
- [ ] Toggle + BusinessUnitContext fully wired + persisted + remount proof
- [ ] All /api/cosmetic/* mirrors functional for core entities (Partners, Employees, Appointments, Payments, Products, Services, Overview)
- [ ] Staff seeding works end-to-end in cosmetic LOB (real browser)
- [ ] 8+ new tests + full regression green
- [ ] 4+ real-browser screenshots in artifacts/cosmetic/phase1/
- [ ] product-map updated with thin-slice ownership
- [ ] "local only" confirmed in all logs

---

## Phase 2: Commission Engine + CTV attribution

**Goals:**
- Implement earnings attribution engine (on payment collected in either LOB).
- `dbo.earnings` table (append-only) + `payouts` in both DBs.
- Recipient resolution per D13 (CTV first via `referred_by_ctv_id` on clients/partners; cosmetic consultation cards; dental salestaff).
- Cosmetic `consultations` table (invisible; auto-managed on appointment booking with `consulting_staff_id`).
- `referred_by_ctv_id` on dental `partners` (customers) and cosmetic `clients`.
- `commission_rate_percent` on `products` (both DBs; defaults 0 for dental backward compat).
- Refunds create negative reversal earnings rows.
- API: payment mutation paths updated to call commission service (gated by flag).
- CTV role basic: `is_ctv` users can be created/seeded locally; `/api/ctv/*` stubs return 501 until Phase 3.
- Admin commission views (if any) still legacy until Phase 3.

**Deliverables:**
- DB migrations (additive): `api/migrations/XXX_add_lob_columns_earnings.sql` (users, partners, products, new earnings/payouts/referral_locks/consultations tables). Reversible.
- `api/src/services/commissionEngine.js` (pure functions + DB writes via getDb(lob)): `resolveRecipient(client, payment, lines)`, `createEarningsForPayment(...)`, `reverseOnRefund(...)`.
- Hook into payment creation/mutation handlers (`api/src/routes/payments.js`, `payments/` helpers, sale order close paths).
- Cosmetic appointment booking: auto-create or supersede `consultations` row (6mo TTL).
- `api/src/routes/cosmetic/` extensions for consultations (internal only).
- `referred_by_ctv_id` support in partners/clients create/update.
- Backend tests + engine unit tests (mock DB).
- Frontend: no visible changes yet (earnings invisible to admin UI per spec; CTV dashboard in Phase 3).
- Seed scripts for test data (local CTV user + referred clients + payments in both DBs).
- Update legacy commission docs to note separation.

**TDD Requirements:**
- Write first:
  - Unit: `resolveRecipient` tests for all 4 D13 branches + tie-breaker (CTV wins).
  - Integration: insert payment in cosmetic → earnings row created with correct recipient + source + amount (using product rate).
  - Dental equivalent.
  - Refund path: original earnings row status untouched; new negative row created; net zero.
  - Consultation card lifecycle (open → superseded on new booking).
  - Isolation: earnings written to correct DB only.
- All new tests red → implement engine → green.
- Dental full test suite still 100% (earnings writes are additive, no mutation of old paths).

**Verification Steps (local only + screenshots):**
- Seed: 1 CTV user (is_ctv=true, lob_scope empty), 1 referred client in dental + 1 in cosmetic, products with rates, payments collected.
- Trigger payment → assert exact `earnings` rows via psql (correct source, amount, recipient).
- Refund → verify reversal row + original unchanged.
- Screenshot: psql output or admin debug view of earnings rows.
- Engine test script run: `node api/scripts/test-commission-engine.js` (local).
- Full Jest + Playwright dental → green.
- No visible UI change for non-CTV users.

**Dependencies:** Phase 1 (mirrors + toggle + staff) complete. Payments flow understood.

**Rollback Criteria:** Any mutation of legacy `saleorderlinepartnercommissions` or `commissions` (rules) tables, or earnings written to wrong DB, or dental tests fail → drop new tables, revert payment hooks, re-verify.

**Done Checklist:**
- [ ] `earnings` + `payouts` + `consultations` + `referral_locks` created (additive)
- [ ] Engine resolves + writes correctly for all D13 cases + refunds
- [ ] Rates column + referred_by_ctv_id populated on seed
- [ ] Tests (unit + integration) green + dental regression green
- [ ] Local seed data + verification script output captured

---

## Phase 3: Full CTV Dashboard + Payouts

**Goals:**
- Complete `/ctv` mobile-first 4-tab dashboard (Home, Commission, Referrals, Me) exactly per visual companion (bottom nav, LOB pills, split bars, pending/paid segmented, referral list with dual-LOB badges, recent activity).
- `GET /api/ctv/commission-summary` (aggregates earnings from BOTH DBs for the CTV user; server-side only).
- CTV login redirect + route protection (is_ctv users land at /ctv, 403 on any admin route).
- Admin payout UI + runner: `/payouts` or extension of reports/commissions for admins (`commissions.payout.run` permission) — list earnings, create payout batch (updates earnings.payout_id), mobile-friendly.
- Earnings list views (pending/paid) for CTV.
- All data LOB-tagged in UI (den/cos pills).

**Deliverables:**
- Frontend: new `website/src/pages/CtvDashboard.tsx` (or `/ctv/index.tsx`) + tabs: CtvHome, CtvCommission, CtvReferrals, CtvMe.
  - Use existing components (cards, lists, segmented controls, LOBBadge).
  - Mobile bottom nav.
  - API client: `fetchCtvSummary()`, `fetchMyReferrals()`.
- Route in App.tsx: `/ctv` (public for CTV after login redirect).
- Login flow: in `AuthContext.login` + `LoginRoute` / `ProtectedRoute` — if `is_ctv` redirect to `/ctv`.
- Backend: `api/src/routes/ctv.js` (or `ctv/` folder) with `/commission-summary` (cross-DB read via getDb calls, aggregate), `/referrals`, self-only gated by `is_ctv` + `ctv.*` perms.
- Payouts admin: new or extended routes `POST /api/payouts`, list earnings by cycle; UI page or modal under admin (visible only with permission, LOB-aware).
- Update `Layout.tsx`? (CTV bypasses Layout/sidebar entirely — separate chrome).
- Tests: Playwright full CTV flow (login as CTV → /ctv → tabs → numbers match seeds).
- Screenshots for every visual surface per companion.

**TDD Requirements:**
- Write first:
  - API contract tests for `/api/ctv/commission-summary` (dental + cosmetic earnings summed + per-LOB breakdown).
  - CTV role gate tests: is_ctv user GET /api/Partners → 403; can only hit ctv routes.
  - Frontend component tests for each tab + LOB pill rendering + aggregation display.
  - E2E Playwright: "CTV happy path" + "CTV cannot reach admin" + "payout run creates batch + links earnings".
- Red → green before wiring UI to real data.

**Verification Steps (local only + real browser screenshots — MANDATORY multiple):**
- Create CTV test account locally (`is_ctv=true`).
- Seed earnings in both DBs for the CTV.
- `npm run dev` → login as CTV → auto-redirect to `/ctv` (mobile viewport 375px). Screenshot full Home tab (greeting, pending tile with split bar blue/pink, this-month stats, recent activity feed with [den]/[cos] pills): `artifacts/cosmetic/phase3-ctv-home.png`
- Switch to Commission tab (pending/paid segmented) → screenshot.
- Referrals tab (dual-LOB clients, earning status) → screenshot.
- Me tab → screenshot.
- Desktop viewport also (CTV dashboard usable on desktop too).
- Admin (with commissions.payout.run): run a payout cycle → verify earnings linked, CTV sees paid in dashboard. Screenshot payout flow.
- Toggle/scope tests: CTV never sees LOB toggle.
- Full dental regression + new CTV E2E suite green.
- Cross-check: numbers in UI exactly match psql aggregates from both DBs.

**Dependencies:** Phase 2 engine complete (earnings data exists to display).

**Rollback Criteria:** CTV sees admin data, earnings numbers mismatch, login redirect fails for normal users, or dental UI broken → revert CTV routes + dashboard + redirect logic.

**Done Checklist:**
- [ ] 4-tab CTV dashboard pixel-close to visual companion (screenshots)
- [ ] Cross-DB aggregation endpoint + payout runner working
- [ ] Role gating + redirect 100% enforced
- [ ] Playwright CTV suite + dental suite all green
- [ ] 8+ screenshots in artifacts/cosmetic/phase3/

---

## Phase 4: Hardening, docs, NK2 verification

**Goals:**
- Full hardening (error envelopes `S_LOB_FORBIDDEN`, rate limits on new routes, input validation, audit logs for payouts/earnings).
- Complete all mandatory documentation updates listed in v2 spec.
- Local-only exhaustive verification gates (pre-deploy checklist from v2 § Pre-deploy verification gates).
- **First** promotion: flip flag + grant scopes on local only, full end-to-end as t@clinic.vn + CTV test accounts.
- Then (only after local 100% green + rollback dry-run): prepare for NK2 (staging) — update env, run migrations on staging clone first, etc. (actual NK2 execution is post-plan handoff).
- Update CHANGELOG.json + package.json version (per Claude.md release notes rule).
- Final product-map + schema-map refresh.
- Test coverage, performance (CTV summary query), security review sign-off.

**Deliverables:**
- All v2 "Documentation updates (mandatory)" items completed (see list in design-v2 §262-281).
- Hardened middleware, error handler entries for new codes.
- Migration rollback test automation (`api/scripts/rollback-cosmetic-dryrun.js`).
- `testbright.md` full acceptance scenarios passing.
- `website/public/CHANGELOG.json` entry (new version) + version bump.
- Final screenshots on local with flag on (full admin toggle + CTV + payout).
- NK2 promotion checklist / runbook entry (but execution deferred).

**TDD Requirements:**
- Write regression + hardening tests first (e.g., flag-off behavior, malformed lob_scope, payout idempotency, large CTV aggregation perf).
- Run full matrix (existing + 8 new classes) → 100% green.
- Security: no PII leaks in CTV responses, proper 403s.

**Verification Steps (local first — exhaustive; NK2 later):**
1. Existing dental Playwright 100%.
2. `SELECT COUNT(*) FROM users WHERE lob_scope IS NULL` = 0 (backfill).
3. Automated migration rollback dry-run succeeds.
4. Scope/flag negative tests (403s).
5. Positive toggle + empty cosmetic + staff seeding.
6. CTV dashboard numbers match seeds across DBs.
7. Refund reversal + payout cycle.
8. **Real-browser smoke (t@clinic.vn on 127.0.0.1:5175):** login, header toggle Dental↔Cosmetic multiple times, empty cosmetic state, back to dental intact, CTV login redirect, full CTV tabs, admin payout. **Multiple screenshots** of every critical view + before/after.
9. All docs updated + cross-referenced.
10. Only after local gate: handoff for NK2 (env var, DB provision on staging, scope grants to test admins, repeat verification on nk2.2checkin.com with Playwright against staging URL).

**Dependencies:** Phases 0-3 complete + all tests green.

**Rollback Criteria:** Any gate fails on local → do not promote flag anywhere; full revert of migrations + code to pre-Phase 0 state on local.

**Done Checklist:**
- [ ] Every documentation artifact updated
- [ ] Full local verification gates + screenshots passed
- [ ] Version + CHANGELOG released per rules
- [ ] NK2 promotion runbook + checklist ready (execution outside this PLAN)
- [ ] Security + code-reviewer sign-off
- [ ] "local only, NK2 later" honored — zero direct NK2 changes in this worktree until Phase 4 approval

---

**Execution Notes for Autonomous Agent Teams:**
- Use parallel sub-agents per phase (e.g., DB team for migrations/earnings, FE team for context+toggle+ctv pages, Auth team for RBAC+redirect, Money team for engine).
- Every code change must include `@crossref` comments + update relevant product-map files.
- After any UI change: immediate Playwright run + screenshots before "done".
- Track progress in `.agent-tasks/` or dedicated orchestration doc.
- Escalate blockers via COORDINATION_REQUESTS.md.
- On completion of each phase: update this PLAN with "Phase X — COMPLETE [date] — links to artifacts/tests/screenshots".

**Final Sign-off:** Only when Phase 4 local gates + docs + tests all green. NK2 is a separate controlled rollout step.

**References:**
- v2 Design + Visual Companion (immutable north star)
- 4 Specialist Reviews (DB/Auth/FE/Money) — collision decision, gating, patterns, engine rules
- Existing: LocationContext, Layout header, AuthContext, payment handlers, permissionService, product-map/
- AGENTS.md / Claude.md (TDD, verification, authority stack)

This PLAN is now the execution blueprint. Agents: start with Phase 0, read authority, TDD red-green, local only.

---

*Generated by Planner subagent — 2026-05-19 — feat/cosmetic-line-of-business worktree*
*Status: Ready for autonomous execution*