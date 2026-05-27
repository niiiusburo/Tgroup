# AGENT_COSMETIC_BACKEND_AUDIT.md — Zero-Trust Backend Implementation Audit (Cosmetic LOB v2)

**Auditor:** Autonomous Code Explorer (Grok Build subagent, read-only, zero-trust)  
**Date:** 2026-05-19  
**Worktree:** `feat/cosmetic-line-of-business` at `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`  
**Scope:** CURRENT code state in worktree (no assumptions from prior sessions/memory beyond explicit file reads). Brutal honesty; evidence from direct reads + grep only.  
**Read FIRST (per task, all from worktree):**  
- `FINAL_COSMETIC_LOB_READINESS.md` (binary "NOT FINISHED", 8 blockers updated, leakage systemic, CTV stub, txn seed missing)  
- `FINAL_READINESS_REPORT.md` (overclaims vs evidence: 0-byte screenshots in some claims, <50-70% handler coverage, stubs, doc drift)  
- `.agent-tasks/backend-coverage-audit.md` (exhaustive table, 59+ bare query lines, employees/mutations critical pool hardcodes)  
- `.agent-tasks/data-separation-audit.md` (psql counts, getQuery proof on migrated, leakage gaps incl. earnings hook snapshot + no runWithLob)  
- `.agent-tasks/ctv-earnings-live-validation.md` (explicit "FAIL — CTV ... NOT live", stub + mocks, real engine but 0 cosmetic earnings for ctv-demo)  
- `.agent-tasks/handler-migration-status.md`, `ctv-earnings-status.md`, `frontend-wiring-status.md`, `live-browser-verification.md`, `backend-status.md`, `verification-complete.md` (optimistic claims)  
- `product-map/domains/cosmetic.yaml` + 4 siblings (business-unit, ctv, earnings-commissions, cosmetic-clients)  
- Design specs: `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md` + `2026-05-18-cosmetic-line-of-business-design.md` + visual companion + governance-delta  
- Other root/docs/*.md mentioning cosmetic (VERIFICATION.md, PLAN.md, DECISIONS.md, EXECUTION_BRIEF.md, AGENTS.md excerpts)  
- Plus all requested code: server.js, lob.js, db/index.js, EVERY routes/ file via grep + targeted deep reads (ctv.js, commissionEngine.js, products.js, reports/*, saleOrderLines, employees/mutations, etc.)  
- Artifacts + VERIFIER_RESULTS.json (real non-zero PNGs per late verifier; sizes 19KB–5.6MB for some, but code gaps persist)  
- Git metadata (HEAD/reflog via direct file reads; no shell exec available in toolset, so reconstructed from .git internals + agent artifacts)

**Method:** Parallel reads + ripgrep (targeted to worktree paths only) for `require.*db`, `getQuery\(req\)`, bare `query(`, `pool\.`, hardcoded strings. Cross-checked claims in status files vs actual source lines + DB factory behavior + middleware. No edits. Absolute paths used.

---

## 1. Git State in Worktree (Reconstructed)

- **Branch:** `feat/cosmetic-line-of-business` (from `.git/HEAD` → `ref: refs/heads/feat/cosmetic-line-of-business`)
- **Current HEAD commit:** `fdb5b01336ec4331e94ed7603a431b2d0dc79f0d` (from `.git/refs/heads/feat/cosmetic-line-of-business`)
- **Reflog (partial, `.git/logs/refs/heads/feat/cosmetic-line-of-business`):** Only 3 entries (creation from origin/main + 2 early cherry-picks for specs/changelog on ~2026-05-18 timestamps). No later 2026-05-19 activity in reflog (common if fast commits or gc). Latest reflog commit message: "docs(changelog): add unreleased entry for cosmetic LOB specs on feat branch".
- **Porcelain status:** Unable to execute `git status --porcelain` (no general shell/exec tool in this read-only agent; only file/grep/read). **Evidence of dirtiness from structure:** `.agent-tasks/` contains 18+ fresh 2026-05-19-dated .md reports (backend-coverage-audit.md, data-separation-audit.md, ctv-earnings-live-validation.md, FINAL_*.md, live-browser-verification.md, handler-*, frontend-*, verification-complete.md etc.) + `artifacts/cosmetic/screenshots/` (23+ *-real.png non-zero + VERIFIER_RESULTS.json + INDEX.md). These are almost certainly untracked or modified (agent-generated during parallel work). Root also has FINAL_*.md, VERIFICATION.md, PLAN.md etc. (post-initial branch). No `.gitignore` violations assumed, but reports/artifacts are working-tree additions since early branch commits.
- **Log --oneline -5:** Unable to run literally. Reconstructed: early branch commits focus on specs/docs/cherry-picks (per reflog). All substantive implementation + agent reports (including this audit's sources) post-date the HEAD commit in working tree. Worktree is "active development" state per AGENTS.md excerpts in main + worktree.
- **Other git indicators:** `.git` is worktree pointer (`gitdir: /.../Tgrouptest/.git/worktrees/feat-cosmetic-line-of-business`). Commondir logic applies (shared objects with main). No stashes or other refs visible in simple reads.

**Conclusion on git:** Feature branch active, heavy uncommitted agent output + artifacts (as expected for parallel specialist work on 05-19). Not clean. Matches "under active development" logs.

---

## 2. Flag, Mounts, Middleware, DB Factory (Core Wiring)

**COSMETIC_LOB_ENABLED + 503 behavior:** Fully wired and correct (server.js:288, 330, 365-374).
- `const COSMETIC_ENABLED = process.env.COSMETIC_LOB_ENABLED === 'true';`
- Early block (289-304): limited mirrors + `/api/ctv` (when true); else 503 disabled handler.
- Later "cosmeticRouter" block (331-375, the main one): full mirrors under `/api/cosmetic` (Partners/Employees/Products/.../Reports/DashboardReports/SaleOrderLines/AccountPayments/CrmTasks/MonthlyPlans etc.) + requireLobScope + attachCosmeticDb + requirePermission.
- When false: explicit 503 with codes `S_COSMETIC_DISABLED` / `COSMETIC_LOB_DISABLED`.
- Vite flag: `VITE_COSMETIC_LOB_ENABLED` consumed in BusinessUnitContext.tsx:42.
- Evidence: direct read; matches product-map + design D16 + PLAN.

**server.js mounts (two overlapping blocks — tech debt noted in audits):**
- Early: 8 mirrors + ctv (no runWithLob wrapper).
- cosmeticRouter (Phase 1): 15+ mirrors including high-risk Reports/*, SaleOrderLines, etc. Comment at 325 falsely claims "Dynamic DB resolution via ALS + runWithLob in db/index.js makes their internal `query()` calls target tcosmetic_demo" — **false vs code**. No `runWithLob('cosmetic', ...)` call anywhere on the router or attach. (See lob.js + db/index.js below.)
- CTV: mounted twice (298 conditional, 378 unconditional post-block). Gated by `ctv.dashboard.view` in one path.
- `/api/health` etc. unaffected.

**middleware/lob.js (full read):**
- `attachLobDb` (factory) + `attachCosmeticDb = attachLobDb('cosmetic')`.
- Sets ONLY `req.lob` and `req.db = getDb(lob)` (from header/query/param/default).
- **No ALS push, no `runWithLob` call.** Pure req context for `getQuery(req)`.
- Matches data-separation-audit §4 + backend-coverage §1 (systemic: bare query() always dental default via getCurrentLob()).

**db/index.js (full read, key excerpts 77-149):**
- `getDb(lob)`: separate dentalPool / cosmeticPool (DEFAULT_*_URL on 127.0.0.1:5433/{tdental|tcosmetic}_demo, search_path=dbo). Pool has queryRows helper.
- `getQuery(reqOrLob)`: safe path — inspects `req.db` or `req.lob` → returns executor targeting correct pool. String or req-like. Falls back to legacy `query`.
- `runWithLob(lob, fn)` + `lobStorage` (ALS) + `getCurrentLob()`: exists for legacy `query()` dynamic resolution (128-137: `query()` now does `getDb(getCurrentLob())`).
- **Critical gap (per all audits):** cosmeticRouter never calls `runWithLob`. Thus:
  - `getQuery(req)` paths (when handler updated): safe.
  - Bare `const { query } = require('../db')` + `await query(...)`: **always dental** (default).
- Exports: getDb, getQuery, runWithLob, legacy pool+query (dynamic), test hooks.
- Jest `db-factory.test.js`: 8/8 green (verified isolation + getQuery targeting via current_database()).
- Matches design D1 (physical isolation, no cross-DB SQL), schema-map, earnings yaml.

**Verdict on foundation:** Solid, TDD'd, additive, rollback-safe. Flag/503 correct. Dual-pool + getQuery proven. **But comments lie** (server.js:325); no blanket ALS safety for legacy code. Only explicit getQuery(req) or req.db consumers are isolated.

---

## 3. Handler Migration Audit — EVERY Route File (Leakage-Risk List)

**Method:** Grep across entire `api/src/routes/**/*.js` for `require(.*/db)`, `getQuery\(req\)`, bare `query(`, `pool\.` (68 files import db; only 15 ever call `getQuery(req)`). Crossed against server.js mounted paths under cosmeticRouter + early block. Targeted deep reads on high-risk (products, reports/*, saleOrderLines, employees/mutations, dashboard*, account*, crm*, monthly*, productCategories).

**getQuery(req) adoption (only 15 files — safe for cosmetic):**
- employees.js (main GET only)
- payments.js + payments/readHandlers.js + payments/helpers.js
- customerReceipts.js
- companies.js
- saleOrders.js + all 5 sub (create/update/get/fetch/updateState)
- appointments/readHandlers.js + mutationHandlers.js + helpers.js
- partners/readHandlers.js + mutationHandlers.js + getPartnerById.js

**Complete leakage-risk list (bare `query` / `pool` / no getQuery(req) usage; will hit dental under /api/cosmetic/* ; mounted paths in **bold**):**

From backend-coverage-audit exhaustive table + my greps (59+ bare query lines total; non-exhaustive but high-confidence):

**High-blast-radius mounted under /cosmetic:**
- **api/src/routes/products.js:2** `const { query } = require('../db');` + calls at 114,146,178,237,243,299,304,332-333,346 (10+ sites; full catalog surface leaks).
- **api/src/routes/productCategories.js** (symmetric bare import + calls; inferred + grep hits; mounted).
- **api/src/routes/saleOrderLines.js:2** `const { query } = require('../db');` + 77,130,137 (mounted; dashboard widget etc.).
- **api/src/routes/employees/mutations.js:2** imports `query: legacyQuery, getQuery, pool` **but**:
  - 15: `const client = await pool.connect();` (POST create tx — **CRITICAL hardcoded dental**)
  - 127: `const client = await pool.connect();` (PUT update tx — same)
  - 284: `const result = await query(` (bare legacy)
  - +18 pool.query / client.query sites in tx (50,53,99,...266). Main GET in employees.js uses getQuery, but mutations (create/update/delete employees) **always dental**. Mounted.
- **api/src/routes/reports.js** (delegates; no direct but subs do) + **all 12+ under reports/** (mounted via /Reports):
  - reports/servicesBreakdown.js:2 `const { query } = ...` + 24,34,79,92
  - reports/revenue.js:2 + 40,46,56,87,95,145
  - reports/revenueBreakdowns.js:2 + 33,72,135,147
  - reports/locationsComparison.js:2+
  - reports/employeesOverview.js:2+
  - reports/cashFlow.js:2+
  - reports/appointments.js:2+
  - reports/dashboard.js:4+
  - reports/customers.js:2+
  - reports/doctors.js:2+
  - + tests (revenueRecognition.test etc. bare)
  - reports/revenueRecognition.js, helpers.js (supporting)
  - **Highest risk:** All report surfaces (Dashboard, Revenue, etc.) under cosmetic toggle return dental data.
- **api/src/routes/dashboardReports.js** (plain query import per broad grep; delegates to reports; mounted).
- **api/src/routes/accountPayments.js** (plain `const { query } = require`; mounted).
- **api/src/routes/crmTasks.js** (plain query import; mounted).
- **api/src/routes/monthlyPlans.js** (`const { query, pool } = require`; uses pool directly; mounted).
- **api/src/routes/commissions.js**, dotKhams.js, receipts.js, journals.js, cashbooks.js, hrPayslips.js, stockPickings.js, etc. (bare; some referenced indirectly via reports/earnings).

**Other mounted or high-risk (early block + inheritance):**
- payments subpaths (some helpers still legacy in snapshots; hook was `lob: 'dental'` hardcoded at one point — data-audit noted partial; later reads show `req.lob || 'dental'` + txPool=req.db in create/refund — improved but non-fatal catch).
- saleOrders subs: mostly updated (per handler-status), but some internal delegation risk.
- partners/employees locationScopes.js, feedback/* (adminRoutes, attachments, userRoutes), exports.js, faceRecognition.js, ipAccess.js, bankSettings.js, customerSources.js, customerBalance.js, externalCheckups.js, permissions.js, systemPreferences.js, telemetry.js, websitePages.js, auth.js (global, dental-only by design but bare), services.js (dead), etc.
- employees/locationScopes.js (bare per audit).
- All test files using bare mocks (ok).

**Summary counts (zero-trust):**
- ~15 files safe (getQuery(req) sites).
- 50+ files with bare legacy (many mounted under cosmeticRouter).
- **Exact % handler migration (cosmetic-mounted paths):** 45-60% (major surfaces: partners/appointments/payments-core/saleOrders-subs/companies/receipts/employees-GET ~full or partial; everything else — esp. reports monolith + products + mutations — untouched or broken). Matches FINAL_READINESS " <50–70% overall", backend-coverage "incomplete and inconsistent", handler-status "Not touched this pass: reports/* ...".
- No codemod/lint enforcement. Pattern is opt-in per-file.

**Dental regression:** Safe (defaults + shims + no lob → legacy query = dental pool). 100% on un-migrated paths.

**Evidence vs claims:** handler-migration-status claims "16 source + 2 tests" for "major admin surfaces" + "Dental regression 100%". True for subset. But FINALs + backend-coverage re-audit (from scratch grep) expose the gap. Over-claim on "complete".

---

## 4. Deep-Dive: ctv.js + commissionEngine.js (CTV Realness)

**api/src/routes/ctv.js (full 44 LOC read):**
- Pure stub (header: "Minimal CTV routes stub for Cosmetic LOB v2 verification * Real engine in Phase 3").
- `/commission-summary`: requireAuth; ignores employeeId; **hardcoded JSON** with byLob splits, recent, referralsCount. Comment line 16-17: "In real impl: query both DBs via getDb for earnings where recipient_partner_id = employeeId // For verification: return mock...".
- `/referrals`: stub JSON.
- No `getDb`, no queries, no commissionEngine call, no cross-DB.
- Also mounted at legacy `/api/Ctv`.
- Matches ctv-earnings-live-validation.md §4 (explicit FAIL) + FINALs.

**api/src/services/commissionEngine.js (full ~200 LOC read):**
- **REAL and correct** (D13 priority, append-only earnings in dbo.earnings both DBs, tx support, refunds = negative reversals, rate from products.commission_rate_percent).
- `resolveRecipient`: CTV (referred_by_ctv_id) > cosmetic consultation (open) > dental salestaff. Uses _getDb(lob) or txClient.
- `createEarningsForPayment` + `reverseOnRefund`: full INSERT logic, getProductRate, isolation via getDb(lob).
- `getDb` injectable for tests.
- **Tests:** commissionEngine.test.js 7/7 green (incl. "earnings writes target correct DB via getDb(lob) — isolation").
- **Wired** (non-fatally) in payments.js create/refund (inside tx; `lob: req.lob || 'dental'`; txClient passed in some paths; catch keeps tx alive).
- Evidence: direct code + live-validation §6 (engine LIVE; writes confirmed in tdental_demo earnings=2 rows with source=ctv/consultation).
- **Gap:** Not exercised for cosmetic (0 rows in tcosmetic_demo per psql in audits); ctv.js never calls it; no end-to-end payment → earnings → CTV dashboard trace with real ctv-demo data.

**CTV realness verdict:** Engine + hook = real (100% on writes). **Cross-DB aggregation / consumption = 0% real** (stub + mocks). Per live-validation: "FAIL — CTV experience and earnings consumption are NOT live." ctv-demo seeded (is_ctv=true) but 0 earnings + 0 referred_by_ctv_id. Numbers in stubs coincidentally match existing dental rows (not per-user queries).

**Evidence vs claims:** ctv-earnings-status.md claims "real aggregation + screenshots; ... production-ready in worktree; numbers match psql". Disproven by ctv-earnings-live-validation (independent, curl+psql+code), FINALs, and direct reads. Over-claim classic.

---

## 5. Other LOB-Awareness Checks (products, reports/*, saleOrderLines, etc.)

- products.js: fully legacy (as above). Mounted /Products.
- reports/* + dashboardReports etc.: fully legacy (as table). Mounted.
- saleOrderLines: legacy. Mounted.
- payments hook: improved (req.lob) but history of hardcodes; non-fatal.
- employees mutations: critical pool hardcodes (dental tx for creates/updates).
- No LOB in auth (intentional; global dental source), many secondary routes.
- Seeding (seed-cosmetic-lob.js): robust for lists (5 emp/6 cust/10 products w/ rates in tcosmetic; t@ scopes + ctv-demo is_ctv); **0 transactional** (appts/payments/earnings/consultations/saleorders = 0 per psql + VERIFICATION.md + data-audit). Matches D16 "empty" + FINAL blocker #6.
- Perms: cosmetic.access + ctv.* + v2 LOB perms registered (permission-registry.yaml) but **not auto-granted** in seed/login (data-audit: t@ 403s; manual PermissionBoard/override required). Blocker.
- Doc drift (product-map yamls + design): repeated "users" (for lob_scope/is_ctv) + "clients" (cosmetic identity) vs reality (partners table everywhere: 047 migration, seed, handlers, auth/me, backend-status notes). cosmetic.yaml line 25/123 etc. still lag. Matches FINALs §5.

**Live DB evidence (from data-separation + live-validation psql/curl on 127.0.0.1:5433):**
- tdental_demo: heavy (36k partners, 228k appts, 62k payments, earnings=2).
- tcosmetic_demo: sparse lists only (11 partners/5 emp/6 cust/10 products, 0 everything transactional, earnings=0).
- getQuery simulations + jest: correct targeting on migrated.
- /api/cosmetic/* before perms: 200/flag active.
- CTV endpoints: 200 but stub JSON.

---

## 6. Frontend Wiring (for % completeness; backend-focused audit)

- BusinessUnitContext.tsx: solid (derives from user.lob_scope + VITE flag; localStorage; keyed? intent via CHANGE_EVENT; isMultiLOBUser).
- api/core.ts: lobPrefix = lob==='cosmetic' ? '/cosmetic' : ''; forwarded in apiFetch.
- Many hooks updated (useCustomers, useEmployees, useProducts, useOverview*, useCalendarData, usePayment, useReportData (auto-injects), useTodaySchedule, etc.): pass `lob: currentLOB`.
- Layout.tsx + App.tsx: toggle (FilterByBusinessUnit), remount key, /ctv route, ProtectedRoute CTV hard-redirect + 403 guard (is_ctv / isCtv).
- CtvDashboard.tsx: full 4-tab UI (pills, split bars, bottom nav, tokens per visual) — **but every fetch wrapped in .catch(() => full mock)**. Never surfaces real or errors cleanly.
- Gaps: ServiceCatalog.tsx:68 `fetchProducts({ ... })` **omits lob** (unlike useProducts hook); some catalog/report paths incomplete. Matches FINAL §3.
- % estimate (from frontend-wiring-status claims + targeted reads + FINAL caveats): 70-75% (core admin + context + CTV skeleton wired; Services catalog + some edge paths + full prop-chain verification on reports incomplete).

---

## 7. Structured Completion % (Zero-Trust, Evidence-Based; 2026-05-19 Worktree State)

| Major Area                  | Optimistic Claim (status files) | Zero-Trust Reality (code + greps + psql + independent audits) | % Complete |
|-----------------------------|---------------------------------|---------------------------------------------------------------|------------|
| Handler migration (getQuery on all mounted cosmetic paths) | 80-90% ("major surfaces", "16 files") | 45-60%. Only ~15/68 files use getQuery(req). Reports/* (12 files), products, productCategories, saleOrderLines, dashboardReports, accountPayments, crmTasks, monthlyPlans, employees/mutations (pool hardcodes @15/127) fully legacy. Systemic leakage on /cosmetic/Reports, /Products, mutations. | 50% |
| CTV realness (cross-DB agg + live data path) | 85-100% ("real aggregation", "production-ready", "numbers match psql") | Engine + D13 + writes + hook = real (100% on that slice; TDD green; getDb(lob)). ctv.js = 0% (full stub, hardcoded, "in real impl" comments). CtvDashboard = 0% live (3x .catch mocks always). No txn demo data for ctv-demo (earnings=0 cosmetic). No aggregation executed. | 30% (engine 100%, consumption 0%) |
| Data separation (physical + effective on surfaces) | 95-100% ("PASS", "verified", "full isolation") | Foundation (factory/getDb/getQuery/middleware/flag/503/pools/jest/current_database() proofs) = 95%. **Effective for mounted surfaces** = 50-55% (only getQuery-updated paths isolated; unmigrated leak dental). No runWithLob wrapper. 2 earnings rows dental-only. | 60% overall (85% foundation, 50% effective) |
| Frontend wiring (LOB context + hooks + CTV UI + guards) | 90%+ ("all major", "full 4-tab") | Context + core apiFetch prefix + many hooks (customers/employees/payments/calendar/reports/...) + Layout remount + App guards/redirect = solid 75%+. ServiceCatalog omits lob on fetchProducts. CtvDashboard UI real but data fake. | 75% |
| Flag / 503 / mounts / auth gating | 100% | 100% (server.js dual blocks correct; 503 when false; lob_scope from partners; requireLobScope + perm). | 100% |
| Seeding + txn proof + perms auto | 80% ("seed run successful") | Lists (5/6/10 + rates + ctv-demo + t@ scopes) = good. **Txn = 0%** (0 appts/payments/earnings/consultations in cosmetic). Perms (cosmetic.access etc.) registered but **not auto-granted** (403s; manual step). | 50% |
| Doc/governance sync (product-map yamls vs reality) | 90% | 50-55%. Drift persists (users/clients vs partners everywhere; 047 + code + seed + handlers confirm partners canonical). Some deltas synced, yamls lag. | 55% |
| Verification artifacts (real screenshots + e2e + tests) | 100% ("VERIFIED COMPLETE", 20+ high-quality, real browser) | Mixed. live-browser-verification + VERIFIER_RESULTS (23+ non-zero *-real.png, sizes 19KB-5.6MB, "pass":true on toggle/CTV surfaces/data sep) = real progress (late run resolved 0-byte crisis per FINALs). But code gaps mean some surfaces (e.g. services catalog) not guaranteed isolated. No dedicated LOB e2e matrix logs or 80%+ coverage report on engine/ctv/middleware. Dental suite green assumed. | 70% (screenshots now exist; full matrix incomplete) |
| **Overall Backend LOB v2** | 75-85% ("ready for Phase 4") | **40-55%**. Happy-path skeleton (toggle + core CRUD + engine + guards + flag) solid + additive + local-only. But **core invariants violated** (D1 isolation not on every path; D13 not live for CTV; D16 txn proof missing; manual perms; doc drift). Not ready per FINAL binary "NOT FINISHED". Risk: leakage, fake CTV numbers, 403s, future confusion. | **48%** (mid-implementation) |

**Sources for %:** Direct synthesis of backend-coverage-audit (exhaustive), data-separation (psql+node), ctv-live-validation (FAIL), FINAL_* (blocker tables + honest synthesis), handler/frontend status (claims), code/grep reads, VERIFIER_RESULTS, product-map yamls, design-v2 D1/D13/D14/D16 + 8 gates, server/lob/db reads.

---

## 8. Remaining Critical Blockers (file:line + Evidence; Prioritized P0 for D1/D13)

1. **Systemic handler leakage (P0, violates D1 physical isolation on every path)**: Update all legacy to `const { query: legacyQuery, getQuery } = require...; const q = getQuery(req);` + pass q (pattern from payments/appointments). Or add `cosmeticRouter.use((req,res,next) => runWithLob(req.lob, next))` wrapper in server.js. Re-audit + tests.
   - api/src/routes/products.js:2 (import), 114+ (calls)
   - api/src/routes/saleOrderLines.js:2,77,130,137
   - api/src/routes/employees/mutations.js:15,127 (pool.connect), 284 (query) + 18 tx sites
   - api/src/routes/reports/*.js (all 12: revenue.js:2 +5 calls; servicesBreakdown.js:2+; revenueBreakdowns.js:2+; etc.)
   - api/src/routes/{dashboardReports.js, accountPayments.js, crmTasks.js, monthlyPlans.js, productCategories.js} (bare imports)
   - Evidence: backend-coverage-audit table §82-121 + 59+ rg hits; data-separation §8; FINAL_COSMETIC §1+3 (explicit list); my greps (68 import files, 15 safe).

2. **CTV not real (P0, violates D13 live attribution + "CTV works")**: Implement cross-getDb aggregation in ctv.js (earnings WHERE recipient... + partners join + lob tag for authed is_ctv user). Remove .catch mocks from CtvDashboard. Seed txn demo data + referred_by_ctv_id + cosmetic payment → engine fire → verify live numbers in /ctv for ctv-demo.
   - api/src/routes/ctv.js:12-43 (entire stub + "in real impl" @16)
   - website/src/pages/CtvDashboard.tsx:34-49 (3x .catch full mocks)
   - api/src/routes/payments.js (hook lob/tx; verify cosmetic path)
   - api/scripts/seed-cosmetic-lob.js (extend for txn)
   - Evidence: ctv-earnings-live-validation full (curl 401 + psql earnings=0 cosmetic for demo user + code disproves); FINALs §2+4; direct reads.

3. **No runWithLob wrapper + middleware gap (enables #1)**:
   - api/src/server.js:325 (lying comment), 339 (attach only)
   - api/src/middleware/lob.js:36 (no ALS)
   - Evidence: all audits §1; db/index.js ALS exists but unused for mirrors.

4. **Incomplete FE lob forwarding + doc drift**:
   - website/src/pages/ServiceCatalog.tsx:68 (fetchProducts call omits lob: currentLOB)
   - All product-map/domains/*.yaml (users/clients vs partners; e.g. cosmetic.yaml:25,44+)
   - Evidence: FINAL §3+5; my grep on ServiceCatalog; yaml reads.

5. **Perms + txn seed + full matrix**:
   - No auto-grant cosmetic.access/ctv.* in seed or /me enrichment (data-separation:145; 403s).
   - 0 cosmetic txn rows (VERIFICATION.md, psql in audits).
   - No e2e/cosmetic-lob.verification.spec.ts run logs + 80% coverage on new paths.
   - Evidence: multiple FINALs + data-audit + live-validation.

6. **Duplicate mounts + other tech debt**: server.js early block (289) + cosmeticRouter (331); clean up. Reports monolith ownership blast.

**All per v2 design D1/D13/D14/D16 + 8 explicit pre-deploy gates (§239 in spec) + AGENTS/CLAUDE/PLAN mandates.**

---

## 9. Evidence of Real vs Claimed (Brutal)

- **Real (strong, production-grade):** DB factory/getDb/getQuery (proven isolation), commissionEngine (full D13 + tx + tests), flag/503/mounts/middleware (req context), core handler migrations (partners/appts/payments/saleOrders), BusinessUnitContext + api prefix + many FE hooks, guards/redirect for CTV, seed for lists, real non-zero screenshots + browser verifier run (late 05-19, 23+ PNGs + manifest "pass"), jest green on db + engine + migrated, dental regression safe, additive/rollback-safe, local-only, auth from partners + lob_scope.
- **Claimed but not real (over-claims in optimistic status files):** "Full isolation on all mounted", "CTV real aggregation/live data", "production-ready", "VERIFIED COMPLETE / no blockers", "16 files = major surfaces complete", "numbers match psql for ctv-demo", "high-quality screenshots" (early 0-byte crisis; resolved late but not exhaustive of states), "txn proof", "auto-perms", "80%+ coverage", "all yamls synced". Disproven by independent FINAL_*, backend-coverage (re-audit from scratch), ctv-live-validation (FAIL), direct code (stubs, bare queries @ exact lines), psql counts (0 earnings cosmetic), grep (15 vs 68), doc reads (drift).
- **Why over-claims?** Parallel agents + optimistic status updates before full re-audit. Honest layer (FINALs + live-validation + backend-coverage) exists precisely to counter this (per AGENTS.md reporting protocol).
- **Screenshots reality:** VERIFIER_RESULTS + artifacts/ show real captures + passes for toggle + CTV tabs + data-sep visual (sparse vs heavy). But incomplete code (e.g. ServiceCatalog) means "Services (Cosmetic)" 89k PNG may reflect partial/empty or other filter, not guaranteed full isolation. Matches FINAL caveat.
- **No external/prod impact:** All local (127.0.0.1:5175/3002/5433), t@ + ctv-demo creds per Claude.md.

---

## 10. Recommendations (Not in Scope; for Next)

- Focused hardening agent: fix #1-5 blockers exactly (TDD, real browser + fresh screenshots + psql traces + re-audit). Output updated FINAL_COSMETIC_LOB_READINESS.md (v2, all green).
- Enforce via lint/codemod ban on bare query in routes/ (except auth legacy).
- Sync all product-map yamls to `partners` reality + note mirror reuse.
- Add dedicated LOB e2e + coverage.
- Clean duplicate mounts.
- Only then: Phase 4 discussion (NK2 experimental flag).

**Binary:** Per FINAL_COSMETIC_LOB_READINESS.md (the single source of truth per its sign-off): **NOT FINISHED**. Foundation excellent; implementation mid-stage with critical D1/D13 gaps. Risky to promote. Matches my zero-trust 48% overall.

**Confidence:** 90 (direct multi-file reads + exhaustive greps on 2026-05-19 worktree state; minor uncertainty only on exact internal delegation in 1-2 saleOrders subs or unlisted secondary routes).

**Sign-off:** Autonomous Code Explorer — 2026-05-19. This report (plus the read FIRST FINALS + .agent-tasks honest audits) supersedes optimistic claims. Re-audit only after blockers closed with fresh evidence.

*Do not declare Cosmetic LOB v2 finished until a clean re-audit supersedes this + the FINAL_* reports.* 

---

**Appendix: Key Absolute Paths (Worktree) Referenced**
- Code: .../api/src/{server.js, middleware/lob.js, db/index.js, routes/{ctv.js, products.js, saleOrderLines.js, employees/mutations.js, reports/* (12), ...}, services/commissionEngine.js}
- Reports: .../.agent-tasks/{backend-coverage-audit.md (exhaustive table), data-separation-audit.md, ctv-earnings-live-validation.md (FAIL), FINAL_COSMETIC_LOB_READINESS.md, FINAL_READINESS_REPORT.md, handler-*.md, ...}
- Docs/Product: .../product-map/domains/{cosmetic.yaml, ...}, docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md, VERIFICATION.md, PLAN.md
- Artifacts: .../artifacts/cosmetic/screenshots/VERIFIER_RESULTS.json + *-real.png
- Git: .../.worktrees/feat-cosmetic-line-of-business/.git (pointer), .../.git/{refs,logs}/refs/heads/feat/cosmetic-line-of-business

All reproducible via the tools used. End of audit.