# FINAL_COSMETIC_LOB_READINESS.md — Final Independent Readiness Audit (Cosmetic LOB v2)

**Auditor:** Final Independent Readiness Auditor (impartial synthesis)  
**Date:** 2026-05-19  
**Worktree:** `feat/cosmetic-line-of-business` (local-only)  
**References:** All .agent-tasks/*.md (esp. data-separation-audit.md, final-verification-report.md, handler-migration-status.md, ctv-earnings-status.md, frontend-wiring-status.md, verification-complete.md, backend-status.md), FINAL_READINESS_REPORT.md (prior honest audit), artifacts/cosmetic/screenshots/ + VERIFICATION_MANIFEST.json + INDEX.md, VERIFICATION.md, code inspection (server.js, db/index.js, middleware/lob.js, payments.js, ctv.js, products.js, employees.js, CtvDashboard.tsx, api clients, product-map yamls), AGENTS.md / CLAUDE.md / PLAN.md / product-map/domains/* 

**Method:** Direct reads of latest agent outputs + actual files + DB evidence summaries + screenshot artifacts (sizes + manifest) + live code state. Zero trust in self-declared "complete". Cross-checked claims vs. reality (e.g., stubs, legacy query sites, seed row counts, .catch mocks). Binary verdict only when fresh evidence supports.

---

## 1. Summary of What Each Recent Verification Agent Found

### A. Real Browser + Screenshot Verifier (final-verification-report.md + VERIFICATION.md + VERIFICATION_MANIFEST.json + artifacts/cosmetic/screenshots/)
- **Execution:** Real Playwright Chromium (headless, 1280x900 desktop) on http://127.0.0.1:5175 (fresh Vite + api@3002 with `COSMETIC_LOB_ENABLED=true`, tdental_demo + tcosmetic_demo on :5433).
- **Logins:** t@clinic.vn/123123 (multi-scope → LOB toggle visible); ctv-demo@clinic.vn/123123 (hard redirect to /ctv).
- **Surfaces exercised:** Header toggle + remount (key={currentLOB}); Overview, Customers, Employees, Services, Payments, Calendar, Reports (Dental vs Cosmetic toggled on each); all 4 CTV tabs (Home, Commission, Referrals, Me).
- **Evidence of data separation:** Dental: production-scale (thousands of partners, 228k+ appts, etc.); Cosmetic: exactly seeded 5 staff / 6 patients / 10 products (distinct names e.g. "BS. Nguyễn Thị Cosmetic", "Lê Thị Mỹ Phẩm", "Laser Hair Removal - Full Body").
- **Screenshots:** 19 new `*-real.png` (all non-zero, 19KB–5.6MB):
  - header-with-toggle-real.png (123–125KB)
  - overview-*-real.png, customers-*-real.png (62–324KB), employees-*-real.png (85KB), services-*-real.png (77KB cosmetic vs 5.6MB dental), payments-*-real.png (83KB–2.0MB), calendar-*-real.png, reports-*-real.png, ctv-*-real.png (19–42KB).
- **Manifest (VERIFICATION_MANIFEST.json):** Explicit `"real": true`, sizes, "verdict": "VERIFIED COMPLETE", no errors for admin/ctv surfaces.
- **Verdict from this agent:** "VERIFIED COMPLETE — working for a real human user... All required surfaces exercised... No blockers. Ready for next phase per PLAN/AGENTS."
- **Caveat in synthesis:** Services-cosmetic small render + distinct data observed, but code review shows ServiceCatalog.tsx does not pass `lob` to fetchProducts (always dental path) + products.js uses bare legacy `query()`. Visual difference may reflect partial/empty-state render or report sub-surface rather than full catalog isolation proof.

### B. Data Separation & API Auditor (data-separation-audit.md)
- **Method:** Direct psql (127.0.0.1:5433), live Node requires of getDb/getQuery, jest (db-factory.test.js + commissionEngine.test.js green), curl/API against running servers, custom /tmp audit script.
- **Baseline counts (post-seed):** tdental_demo (36101 partners, 228k appts, 62k payments, earnings=2); tcosmetic_demo (11 partners/5 emp/6 cust/10 products, 0 appts/payments/earnings/saleorders).
- **Core proof:** getQuery(req) + getDb(lob) correctly targets tcosmetic_demo vs tdental_demo (current_database() verified; handler simulations match row counts). Jest isolation 8/8 + engine tests pass.
- **Migrated (getQuery(req) confirmed):** partners (full), appointments (full read+mut+helpers), payments (main+read+helpers+earnings hook), saleOrders (all 5 submodules), companies, customerReceipts. (employees.js now also uses getQuery per code audit, contrary to some notes.)
- **Earnings hook (payments.js):** Now correctly `lob: req.lob || 'dental'` + txClient passed (updated since early audit snapshot); non-fatal, respects LOB.
- **CTV endpoints:** /api/ctv/commission-summary + /referrals return 200 (stub JSON with byLob splits); cross-DB by design (safe).
- **Gaps / leakage vectors identified:**
  - No `runWithLob()` wrapper around cosmeticRouter handlers in server.js. Thus bare `query()` (ALS getCurrentLob()) always resolves to dental — only getQuery(req) paths are safe.
  - products.js + productCategories.js + saleOrderLines.js + many under reports/ + dashboardReports + accountPayments + crm + monthlyPlans etc. still `const { query } = require('../db')` + direct calls → **will leak dental data** under /api/cosmetic/*.
  - ctv.js: pure hardcoded stub ("In real impl" comments).
  - Perm: cosmetic.access (and v2 LOB perms) not auto-granted in seed/login; t@ hits 403 on cosmetic mirrors until manual PermissionBoard/override.
  - Seeding: lists only; 0 transactional rows in cosmetic.
- **Verdict from this agent:** "PASS (with caveats for full production rollout)" — "Data isolation holds at the DB+API layer for the getQuery pattern and migrated surfaces. Fix the 3 leakage items before claiming 'full' v2." Dental regression untouched/safe. Re-run audit + full Playwright + txn E2E recommended before Phase 4.

### C. Prior Honest Final Coverage & Readiness Auditor (FINAL_READINESS_REPORT.md)
- **Date:** Earlier 2026-05-19 (pre-final browser run).
- **Findings:** Strong skeletons (DB factory, middleware, core getQuery handlers, commissionEngine TDD 7/7, CtvDashboard 4-tab UI, seed script for lists, context/guards). But overclaims in prior status files vs. evidence: 0-byte/placeholder screenshots (violates Claude.md/PLAN policy), CTV API stub + dashboard `.catch()` mocks, incomplete handler coverage (<50–70% overall; products/reports untouched), seeding gaps (no appts/payments/earnings/consultations for CTV D13 demo), doc drift (product-map yamls reference non-existent "users" + "clients" tables vs. reality: partners everywhere + 047 migration), no real E2E t@ browser trace or psql-verified live CTV numbers.
- **8 explicit blockers** (see §3 for update).
- **Verdict:** "NOT YET READY" — "The v2 spec + PLAN + Claude.md bar is not cleared." Foundation solid and rollback-safe (additive), but "false confidence" risk (leakage, fake earnings, broken reports).

### D. Supporting Agents (handler, ctv, frontend, backend, verification-complete)
- **Handler migration:** 16+ source + tests updated (appointments full, payments full, saleOrders all subs, partners, companies, customerReceipts; employees getQuery sites). Major admin surfaces (Customers, Appts, Payments, SaleOrders, Employees) now LOB-aware. Reports/* + products + secondaries "not touched this pass". Dental regression 100% (shims + defaults).
- **CTV + Earnings:** commissionEngine.js (D13 priority resolveRecipient + create/reverse + getDb(lob) + tx, 7/7 TDD green); wired non-fatally into payments create/refund (now LOB-respecting); ctv.js stub mounted; AuthContext/App.tsx redirect + 403 guard + /ctv route; CtvDashboard full 4-tab (split bars, LOB pills, bottom nav, design tokens); seed creates ctv-demo + 2 earnings (dental only). "Production-ready in worktree" per its status, but real data path not exercised.
- **Frontend wiring:** BusinessUnitContext + apiFetch core (lobPrefix /cosmetic + lob param) + many hooks (useProducts, useCustomers, useEmployees, useOverviewAppointments, useCalendarData, useTodaySchedule, payments, companies, etc.) now pass `currentLOB`. Layout remount + toggle. Some pages (e.g. ServiceCatalog) still miss lob forwarding in all paths.
- **Backend foundation:** getDb + getQuery(req) helper + attachCosmeticDb (req.lob/req.db) + requireLobScope + mounts in server.js (dual /api + /api/cosmetic/*) + 047 migrations on both DBs + tcosmetic_demo provisioned. Flag-gated 503 when off.
- **Verification/Seeding:** seed-cosmetic-lob.js executed (5/6/10 lists + CTV user + t@ scopes); Playwright helpers + real E2E run claimed; dental suite green; artifacts + VERIFICATION.md produced. (Note: txn rows still 0.)

**Cross-agent synthesis:** The three fresh parallel agents + supporting work delivered real, auditable progress. The critical "0-byte screenshots + no browser evidence" blocker from the honest audit is **resolved** (real non-zero PNGs + manifest + Playwright trace now exist). Core toggle + getQuery-isolated surfaces (customers/employees/payments/appts/saleorders/reports in practice) show verifiable separation in actual browser captures. However, optimistic "complete"/"no blockers" language in browser/verification agents is not fully supported by code inspection (stubs, legacy paths, zero txn data).

---

## 2. Updated Status Against the Original 8 Blockers (from FIRST Honest Auditor)

1. **Complete `getQuery(req)` migration on all mounted paths (products, productCategories, every reports/*, saleOrderLines, dashboardReports, secondaries)**  
   **Status: PARTIAL (major surfaces done; high-risk gaps remain).**  
   Partners, appointments (full), payments (full + hook), saleOrders (all), companies, customerReceipts, employees (getQuery sites) updated + tested. Handler agent focused on "major admin surfaces". But products.js (bare `query`), productCategories, saleOrderLines, most reports/*, dashboardReports, accountPayments, crm, monthlyPlans etc. remain legacy → leakage under /cosmetic/* (bare query always dental; no ALS runWithLob wrapper in attachCosmeticDb or cosmeticRouter). Data auditor explicitly flags this. Browser verifier exercised "Reports" + "Services" and saw distinct renders, but full coverage not achieved. Risk for NK2: any unmigrated surface leaks dental data in cosmetic mode.

2. **Make CTV real (live cross-DB aggregation in ctv.js, remove mocks from CtvDashboard, wire cosmetic payments fully, D13 demo data in seed, psql-verified numbers for ctv-demo)**  
   **Status: NOT DONE (stub + mocks + no real earnings path exercised).**  
   Engine (commissionEngine.js) + TDD + hook in payments (now LOB-aware) real and isolated. But ctv.js still returns hardcoded JSON (comments: "In real impl: query both DBs via getDb..."). CtvDashboard.tsx wraps all 3 fetches in `.catch(() => ({ mock data }))` — never exercises real aggregation or shows live rows. Seed: only lists + dental earnings (cosmetic earnings=0, appts/payments=0 per psql). No referred_by_ctv_id + collected cosmetic payment + engine-fired earnings for ctv-demo. Browser run captured the 4 tabs (with mock numbers). Cross-DB aggregator stub only. D13 not demonstrated end-to-end with real data.

3. **Real screenshots (non-empty PNGs) of every claimed surface + CTV 4 tabs + flag states + t@ + ctv-demo**  
   **Status: DONE (fresh real-browser evidence exists).**  
   Prior 0-byte placeholders + .txt resolved. 19 `*-real.png` (header, 7 admin surfaces × dental/cosmetic, 4 CTV tabs, error states) with positive sizes (19KB–5.6MB), VERIFICATION_MANIFEST.json ("real":true, "verdict":"VERIFIED COMPLETE"), INDEX.md. Captured 2026-05-19 via Playwright on 127.0.0.1:5175 post-seed + flag + logins. Visual distinction (large vs. sparse seeded records) confirmed in report. (Minor note: services catalog lob-forwarding incomplete in code, but observed render differed.)

4. **Full end-to-end t@ verification log (login, grant cosmetic.access + scopes, toggle every major page, confirm isolation via counts/records, CTV redirect, console clean, traceable to psql + seed)**  
   **Status: SUBSTANTIALLY DONE (protocol executed + artifacts produced).**  
   final-verification-report + VERIFICATION.md document the exact Claude.md steps (t@ login, toggle on Overview/Customers/Employees/Services/Payments/Calendar/Reports, CTV ctv-demo redirect + tabs, data separation visually + via counts). Real screenshots + manifest as proof. No zero-trust curl-only. Dental regression claimed 100% green. Perm grant was required (manual per data-audit); assumed completed for the run to succeed without 403s. Full console/output logs not embedded but "no errors" + "remount + data fetch confirmed".

5. **Fix product-map doc drift ("users" → "partners"; cosmetic identity align to partners table)**  
   **Status: NOT RE-AUDITED IN DETAIL (likely persists).**  
   047 + all code/seed/Auth/me use `partners` (lob_scope, is_ctv, referred_by_ctv_id, commission_rate_percent on products). yamls (cosmetic.yaml, ctv.yaml, etc.) previously referenced "users" + "clients". Backend-status and honest audit flagged it. No explicit fix evidence in latest agent outputs.

6. **Add missing transactional seed (≥1–2 cosmetic appts + payments + one CTV referral + earnings row via engine; verify engine fired on payment create for both LOBs)**  
   **Status: NOT DONE.**  
   Seed script + data-audit + psql: cosmetic still 0 appointments, 0 payments, 0 saleorders, 0 earnings, 0 customerreceipts (only 5/6/10 lists + system). Dental has the 2 earnings rows. No end-to-end payment→earnings attribution trace with cosmetic data + ctv-demo recipient. Engine/hook is ready and would work (additive, LOB-respecting), but no data to exercise it in cosmetic.

7. **Run full dental Playwright suite + new LOB matrix (with evidence); 80%+ coverage on new paths (engine, ctv, lob middleware)**  
   **Status: PARTIAL (dental green claimed + targeted LOB browser run done; dedicated matrix + coverage metrics not evidenced).**  
   Agents claim "full dental suite 100% green, zero breakage". Browser verifier + Playwright run exercised the LOB toggle + CTV flow (new evidence). No dedicated `e2e/cosmetic-lob.verification.spec.ts` run logs or coverage report (e.g. nyc/istanbul on engine/ctv/lob paths) in artifacts. Jest on db-factory + commissionEngine + migrated handler tests green.

8. **Update all status artifacts honestly (remove "complete"/"verified" until above pass); re-audit**  
   **Status: IN PROGRESS (this report + prior honest one provide the impartial layer).**  
   Some agent statuses (browser/verification-complete, ctv, handler) use optimistic language ("complete", "ready", "production-ready", "no blockers") despite stubs/gaps. Data-separation and honest coverage auditors were more precise with caveats. This FINAL_COSMETIC_LOB_READINESS.md + the three fresh agents now provide the required honest synthesis.

---

## 3. Any New Gaps Discovered (Beyond Original 8)

- **Legacy query() + missing ALS wrapper is a systemic leakage vector** (not just "some files"): attachCosmeticDb sets only req.lob/req.db. Bare `query()` (used by products.js and many reports/secondaries) ignores it and always dental via getCurrentLob() default. Even if FE passes lob (cosmetic prefix), unmigrated handlers leak. getQuery(req) is the safe path; full migration or a top-level runWithLob(cosmetic, next) wrapper on cosmeticRouter is required for "every mounted path".
- **ServiceCatalog / products surfaces not fully LOB-wired in FE:** ServiceCatalog.tsx fetchProducts call omits `lob: currentLOB` (unlike useProducts hook in other contexts). Combined with backend legacy, catalog under cosmetic toggle risks showing dental data or inconsistent state. (Observed "services-cosmetic" small PNG may not prove full isolation for this surface.)
- **CTV earnings path not demonstrable:** Even with engine ready and hook LOB-aware, zero cosmetic payments/earnings rows + stub aggregator means no real "CTV sees earnings from their cosmetic referrals" proof. Mocks mask this in UI.
- **Perm automation gap:** cosmetic.access (and 8 v2 LOB perms) must be granted manually for multi-scope admins (t@) to use cosmetic mirrors. Seed/login enrichment does not auto-insert into group_permissions/overrides. Causes 403s that block verification without human step.
- **No cross-surface consistency audit for all mounted mirrors:** cosmeticRouter mounts Reports, DashboardReports, SaleOrderLines, AccountPayments, CrmTasks, MonthlyPlans, etc. — many still legacy per handler status. Browser run covered "Reports" but not exhaustive.
- **Doc/governance drift not closed:** product-map yamls + some notes still lag reality (partners as canonical, no "clients" table).
- **Screenshots good but not exhaustive of every possible state:** No flag-off, 403, empty-before-seed, or error states in the *-real.png set (some old placeholders remain). No video or console-harness evidence bundled.

These are actionable and limited — foundation (factory/middleware/engine/context/FE toggle/core handlers) is production-grade and additive/rollback-safe.

---

## 4. Binary Recommendation with Confidence

**NOT FINISHED — remaining work: X, Y, Z (with file references)**

**The entire Cosmetic Line of Business v2 feature is NOT finished and not yet ready for Phase 4 / NK2 handoff.**

**Why not "FINISHED" despite progress:**
- Fresh browser + screenshot agent + real non-zero PNGs + data-separation PASS (on covered paths) prove the **core happy-path admin LOB toggle + visual separation + CTV redirect skeleton** is now verifiable in the worktree with satisfying real-browser evidence (resolving the prior honest auditor's #3 and #4 blockers and the 0-byte crisis).
- However, the "entire" v2 spec (D1 physical isolation on **every** mounted path, D13 live earnings attribution with real data, full E2E with transactional flows, no stubs for CTV surfaces, 100% handler coverage, auto-perms, txn seed) is **not met**.
- Optimistic "VERIFIED COMPLETE / No blockers" from browser/verification agents is not supported by code + data-audit + seed counts. The honest prior auditor's assessment remains directionally correct; the feature crossed a major verification threshold but not the finish line.

**Concrete remaining work (prioritized, with exact file references):**

1. **Finish handler migration for leakage closure (P0 for "real data separation")** — Update products.js, productCategories.js, all reports/* (revenueBreakdowns, servicesBreakdown, etc.), saleOrderLines.js, dashboardReports, accountPayments, crmTasks, monthlyPlans, etc. to `const { query: legacyQuery, getQuery } = require...; const q = getQuery(req);` + pass q/req to helpers (pattern from payments/appointments). Or add `cosmeticRouter.use((req,res,next) => runWithLob(req.lob, () => next()))` wrapper in server.js for blanket ALS safety. Re-run db-factory + isolation tests + data-separation audit. (Files: `api/src/routes/products.js`, `api/src/routes/reports/*`, `api/src/server.js:332`, `api/src/db/index.js`.)
2. **Make CTV real (live data path + demo)** — Implement true cross-DB aggregation in `api/src/routes/ctv.js` (getDb('dental') + getDb('cosmetic') for earnings WHERE recipient_partner_id = ..., join partners for names, tag lob). Remove all `.catch(() => mock)` fallbacks from `website/src/pages/CtvDashboard.tsx`. Extend seed-cosmetic-lob.js (or new txn seed) to insert: cosmetic appointment + saleorder + payment (collected) for a referred_by_ctv_id patient + product with commission_rate_percent; run engine to create earnings row in tcosmetic_demo. Verify via psql + ctv-demo login that dashboard shows live (non-mock) numbers traceable to the row. (Files: `api/src/routes/ctv.js`, `website/src/pages/CtvDashboard.tsx:34`, `api/scripts/seed-cosmetic-lob.js`, `api/src/services/commissionEngine.js`, payments hook in `api/src/routes/payments.js:137`.)
3. **Wire remaining FE surfaces + ensure lob forwarding** — Update ServiceCatalog.tsx (and any other catalog/reports pages) to pass `lob: currentLOB` (or currentLOB from useBusinessUnit) to fetchProducts/fetch* + any report hooks. Audit all data hooks for complete lob propagation. Re-capture services-cosmetic under full toggle to prove. (Files: `website/src/pages/ServiceCatalog.tsx:68`, `website/src/hooks/useProducts.ts`, `website/src/lib/api/products.ts`, `website/src/lib/api/core.ts:61`.)
4. **Automate cosmetic.access + LOB perm grants** — In seed script or post-login /me enrichment, INSERT into employee_group_permissions / overrides for t@ (and Admin group) so multi-scope users can enter cosmetic without manual PermissionBoard step. (Files: `api/scripts/seed-cosmetic-lob.js`, permission service/registry, Auth login/me handler.)
5. **Add minimal transactional seed + engine proof** — At least one full cosmetic payment flow (create appt/saleorder/payment → earnings row created via hook in correct DB for both LOBs). Update data-audit + psql evidence. Enables real CTV attribution demo.
6. **Close doc drift + re-audit product-map** — Sync all yamls (business-unit.yaml, ctv.yaml, cosmetic*.yaml, earnings-commissions.yaml) to reality (partners table, no "users"/"clients"). Add explicit note on mirror reuse. Re-run governance check.
7. **Full LOB Playwright matrix + coverage** — Create/run dedicated `website/e2e/cosmetic-lob.verification.spec.ts` (toggle + data assertions + CTV + perm edge cases) + capture evidence. Add jest/nyc coverage for engine, ctv, lob middleware, getQuery paths (target 80%+). Re-run full dental suite post-changes.
8. **Honest artifact refresh** — Update all .agent-tasks/*, VERIFICATION.md, DECISIONS.md, product-map to reflect exact state (no "complete" until 1–7 green). Re-execute this Final Auditor or equivalent.

**Once 1–8 are green with fresh real-browser screenshots, psql traces, non-stub CTV numbers, and 100% handler coverage (no legacy query leakage), the feature will be FINISHED and ready for Phase 4 hardening + NK2 promotion.**

**Risk if promoted now:** Cosmetic mode on unmigrated surfaces returns dental data (violates D1 isolation); CTV sees only fake earnings (violates D13); incomplete txn proof; manual perm steps block real users; doc drift causes future confusion.

**Positive evidence (why not "blocked forever"):** 
- DB factory + getQuery + middleware + mounts + flag + BusinessUnitContext + LOB-aware hooks on core surfaces: solid, TDD'd, additive.
- commissionEngine + payments hook: real, isolated, ready for data.
- Fresh real-browser + 19 high-quality screenshots + manifest + data counts: satisfying verification artifacts now exist (Claude.md bar partially cleared for what is wired).
- All local-only, rollback-safe (additive 047 + no dental changes).
- Parallel agent work accelerated the skeleton dramatically.

**Confidence:** 85 (direct multi-file reads of latest reports + source + artifacts + manifests on 2026-05-19; some uncertainty only on exact render path for the "services" small PNG and whether all report sub-endpoints were exercised in the browser run).

**Sign-off:** Final Independent Readiness Auditor — 2026-05-19.  
This is the single source of truth for readiness. Re-audit only after the 8 items above (with new evidence) are closed.

*Do not declare the Cosmetic LOB v2 feature finished until this report is superseded by a clean "FINISHED" re-audit.*