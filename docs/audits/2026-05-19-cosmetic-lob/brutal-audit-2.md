# AGENT_FINISH_BRUTAL_AUDIT_2.md — Independent Zero-Trust Re-Audit (Brutal Re-Auditor #2)

**Auditor Persona:** Independent Brutal Re-Auditor #2 (distinct from #1; fresh eyes, no prior claims trusted, exhaustive re-read of north-star + full worktree state post-swarm)
**Date:** 2026-05-19
**Scope:** Full re-audit of Cosmetic LOB v2 implementation in `.worktrees/feat-cosmetic-line-of-business/` (post all prior agents: backend-coverage, data-separation, live-browser-verifier, CTV validator, FINAL_* synthesizers, finishing swarm, etc.)
**North-Star Package Re-Read (full):**
- `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md` (D1–D16, §239 pre-deploy gates, 8 test classes, mandatory doc list)
- `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-visual-companion.md` (ASCII mockups for header toggle, admin reuse, CTV 4-tab exact UI, cross-LOB badge on /customers/:id, login redirect, test mapping)
- `product-map/governance-delta-cosmetic-lob-v2.md` + `product-map/domains/{cosmetic.yaml, business-unit.yaml, ctv.yaml, cosmetic-clients.yaml, earnings-commissions.yaml}`
- `PLAN.md` (5-phase TDD, per-phase Done Checklists, rollback criteria)
- `FINAL_COSMETIC_LOB_READINESS.md`, `FINAL_READINESS_REPORT.md`, `AGENT_COSMETIC_OVERALL_STATUS.md` (root), all .agent-tasks/* audits, VERIFICATION.md, artifacts/cosmetic/screenshots/* + manifests
- Authority: AGENTS.md, CLAUDE.md, ARCHITECTURE.md, product-map/schema-map.md, etc.
- Actual code state: api/src/* (server.js, db/index.js, middleware/lob.js, routes/*, services/commissionEngine.js, ctv.js), website/src/* (BusinessUnitContext, CtvDashboard.tsx, hooks, Layout, Customer* files), migrations/047*, seed scripts, product-map yamls

**Method (zero-trust, no reliance on prior verdicts):**
- Direct `grep` / `read_file` / `list_dir` on worktree (absolute paths only).
- Exhaustive bare-query / leakage search across all mounted cosmetic paths.
- CTV path: full code + seed + stub analysis + screenshot inspection (multimodal read of PNGs).
- Cross-LOB badge: code search + visual spec cross-check + screenshot pack audit.
- Screenshots vs mockups: manifest + INDEX + actual PNG file inspection (sizes + visual content) vs ASCII in companion.
- 8 v2 gates (§239) + all PLAN Done Checklists: explicit binary status with evidence citations.
- DB reality via audit reports + seed script + engine code (no direct psql possible in this agent, but cross-checked prior traces).
- Honest "hand-wavy?" calls where claims exceed evidence.

**Worktree State Summary:** Isolated feat branch, clean. Cosmetic code (context, middleware, core handlers, engine, CTV UI skeleton, real *-real.png pack, flag) lives ONLY here. Main tree untouched. Flag default false everywhere. Additive 047 migrations + tcosmetic_demo provisioned locally. All per Claude.md/AGENTS.md "local-only" rule.

---

## 1. Remaining Bare query() Calls / Data Leakage Vectors

**Verdict: NOT CLEARED — Systemic, High-Risk Leakage Still Present**

**Evidence (exhaustive grep on worktree/api/src/routes + server mounts):**
- Bare legacy import pattern `const { query } = require('../db')` or `require('../../db')` (no `getQuery`) still present and active in **many files mounted under cosmeticRouter**:
  - `api/src/routes/products.js:2` (and mutation count queries)
  - `api/src/routes/productCategories.js:2` (and count queries)
  - `api/src/routes/saleOrderLines.js:2`
  - **All reports/**: `revenue.js`, `revenueBreakdowns.js`, `servicesBreakdown.js`, `cashFlow.js`, `appointments.js`, `customers.js`, `doctors.js`, `employeesOverview.js`, `locationsComparison.js`, `dashboard.js` (and their __tests__)
  - `api/src/routes/services.js:43`
  - `api/src/routes/stockPickings.js:2`
  - `api/src/routes/receipts.js:2`
  - `api/src/routes/websitePages.js`, `telemetry.js`, `systemPreferences.js`, `auth.js` (partial)
  - Also `partners/mutationHandlers.js` (multiple direct `query(...)` for counts — not using getQuery even though file imports getQuery elsewhere)
  - `employees/mutations.js`, various test files using legacy query shims
- **Mounts in server.js:332-363 (cosmeticRouter)** explicitly include:
  - /Products, /ProductCategories, /SaleOrderLines, /Reports, /DashboardReports, /AccountPayments, /CrmTasks, /MonthlyPlans, /Companies, etc.
  - All of these hit the unmigrated legacy `query()` paths.
- **Root cause in middleware + db layer:**
  - `middleware/lob.js:attachCosmeticDb` ONLY sets `req.lob` + `req.db` (for getQuery(req) consumers).
  - NO `runWithLob('cosmetic', ...)` wrapper around the router subtree or individual handlers.
  - `db/index.js:133-137`: legacy `query(text, params)` does `const lob = getCurrentLob(); ...` (ALS context). attach never calls runWithLob, so ALS remains unset/default dental for bare query() calls inside cosmetic handlers.
  - `getQuery(req)` path is safe (uses req.lob/db); bare query is NOT.
- **Prior audits confirmed (re-validated):** backend-coverage-audit exhaustive table (59+ bare lines), data-separation-audit §5+8 ("systemic isolation failure" for reports/products), FINAL_* explicitly list "products + all 10+ reports/* + secondaries still legacy".
- **Impact:** Any admin toggling to Cosmetic + visiting Products catalog, any Reports page, SaleOrderLines, etc. will return **tdental_demo data** (or fail). Violates core D1 (physical isolation on **every** path) + §239 gates + "no leakage vectors" requirement. Browser verifier saw "distinct" on some surfaces but cannot have exercised the unmigrated report/product mutation paths at code level.

**Hand-wavy claims called out:** Any prior "handler migration 80-90% / major surfaces done" language is over-claim. Reality ~45-60% (core CRUD yes; high-blast reports/products = no). "Data separation PASS with caveats" is accurate only for the ~15-16 wired files.

**CLEARED / NOT CLEARED: NOT CLEARED** (requires full migration or top-level ALS wrapper + re-audit before any flag-on).

---

## 2. CTV Numbers Truly Live and Traceable to psql in Both DBs (No Mocks)

**Verdict: NOT CLEARED — Entirely Stubbed / Mocked; No Live Cross-DB Aggregation or D13 Demo**

**Evidence (full code + seed + screenshot + engine cross-check):**
- `api/src/routes/ctv.js`: Pure stub (lines 16-30: "In real impl: query both DBs via getDb..." comments). Hardcoded JSON:
  - pendingTotal/paidTotal/byLob splits/recent/referralsCount — **never touches getDb or earnings table**.
  - `/referrals` also hardcoded.
- `website/src/pages/CtvDashboard.tsx:34-50`: All 3 fetches (`fetchCtvSummary`, `fetchCtvReferrals`, `fetchCtvMe`) wrapped in `.catch(() => ({ mock data }))` with hardcoded demo numbers (different from ctv.js stub in places). UI renders the mocks.
- `commissionEngine.js`: Real, TDD'd (7/7 green), D13 priority (CTV referred_by_ctv_id first, then consultation, then salestaff), uses `getDb(lob)` + tx, append-only earnings + refund reversal. Wired non-fatally into `payments.js` (LOB-respecting hook updated post-early audit).
- **Seed reality (seed-cosmetic-lob.js + prior psql traces in audits):** Cosmetic: 5 staff / 6 patients / 10 products (with commission_rate_percent >0 on some), 0 appointments, 0 saleorders, 0 payments, 0 earnings, 0 consultations. Dental: has 2 earnings rows (not for ctv-demo). ctv-demo user created with is_ctv=true + referred_by_ctv_id not set on any cosmetic patient + no payment collected to fire engine.
- **Screenshots (multimodal read of ctv-*-real.png files):** Show UI with fabricated numbers (e.g., ctv-home-real.png has recent activity +150k dental / +250k cosmetic, pending/paid bars; ctv-commission-real.png shows pending/paid lists; ctv-referrals has LOB pills + "earning" statuses). **Not traceable to any psql row** — numbers do not match seed (cosmetic earnings=0) or ctv.js stub exactly. No "live from DB" proof.
- **No cross-DB aggregator code executed:** ctv route never calls getDb('dental') + getDb('cosmetic') + JOIN earnings/partners for recipient_partner_id.
- **D13 not demonstrated:** No end-to-end (referred patient + collected payment in cosmetic → engine fires → earnings row in tcosmetic_demo → ctv-demo sees it live on /ctv after redirect).

**Visual companion requirement:** "CTV dashboard rendering with seeded cross-DB commissions", "Home tab ... 12.4M ₫ ... blue 62% dental + pink 38% cosmetic", "Referrals tab with [den][cos] Quỳnh active in BOTH", "live traceable numbers". Not met.

**Hand-wavy claims called out loudly:** Prior "CTV production-ready", "real aggregation", "numbers match psql", "ctv-earnings-status" over-claims vs. code (stub + mocks + zero txn rows). "Engine real" is true but irrelevant without data path + seed. Browser "screenshots of CTV tabs" prove UI skeleton only, not spec compliance.

**CLEARED / NOT CLEARED: NOT CLEARED** (full impl in ctv.js + txn seed + engine demo + psql + ctv-demo login trace + fresh screenshots required).

---

## 3. Cross-LOB Badge Works End-to-End with Permission Gating

**Verdict: NOT CLEARED — Not Implemented at All (Zero Code, Zero Screenshots, Zero Endpoint)**

**Evidence:**
- Visual companion § Surface 2 + customer profile mockup: explicit `[also a dental client →]` badge on /customers/:id (cosmetic view), visible **only** for `lob.crossview` permission (admin), "server-side phone-match probe against the other DB", click opens dental customer in new tab, hidden from staff roles (privacy). Test coverage explicitly required: "Cross-LOB badge rendering (with and without `lob.crossview` permission)".
- v2 design D6 + D14: "cross-LOB 'also a dental client' badge ... is a permission-gated API call (admin only)".
- Governance: + `lob.crossview` in permission-registry.yaml + deltas.
- **Code search (worktree website/src + api/src, glob *.{ts,tsx,js,jsx,md}):** ZERO matches for "cross-LOB", "lob.crossview", "also a dental client", "crossview", phone-match probe, cross-lob badge logic, or any /api/.../cross or similar endpoint.
  - No badge in CustomerDetail / useCustomerDetailController / profile components.
  - No backend probe route (e.g. in partners or dedicated cosmetic cross-view handler).
  - Permission `lob.crossview` registered in yaml but never enforced in any route or UI gate.
- **Screenshot pack:** No customer profile screenshots at all (no *-customer-detail-*.png or similar in artifacts/cosmetic/screenshots/). No evidence of badge in any real PNG.
- **FINISHING_SWARM_PROGRESS.md** (in artifacts/cosmetic/finishing/): Explicitly lists "AGENT_FINISH_CROSS_LOB_BADGE.md | #3 (lob.crossview badge) | PENDING (charter written)" — confirms never dispatched/implemented.

**Impact:** Violates north-star visual + spec + test mapping + D6. The "end-to-end with permission gating" does not exist.

**Hand-wavy claims:** Any mention of "cross-LOB badge" in high-level status files without code/screenshots is pure fiction.

**CLEARED / NOT CLEARED: NOT CLEARED** (full feature missing; would require new backend probe + gated UI component + tests + screenshots + perm seeding).

---

## 4. Completeness and Honesty of Final Screenshot Pack vs Visual Companion Mockups

**Verdict: PARTIALLY CLEARED — Real non-zero PNGs exist for admin toggle + CTV skeleton (good progress), but incomplete vs mockups + some filename/visual mismatches + no badge/edge states**

**Evidence (manifest + INDEX + multimodal PNG reads + dir listing + companion cross-ref):**
- **Manifest (VERIFICATION_MANIFEST.json):** 19 entries marked `"real": true`, sizes 19KB–5.9MB (e.g., services-dental-real.png 5.9MB, header-with-toggle-real.png 125KB, ctv-*-real.png 19-43KB). Timestamp 2026-05-19. VERIFIER_RESULTS + INDEX reference them.
- **Actual files:** Many `*-real.png` (header-with-toggle-real, overview-*-real, customers-*-real, employees-*-real, services-*-real, payments-*-real, calendar-*-real, reports-*-real, all 4 ctv-*-real, error/fatal states). Plus some legacy placeholders (.txt files, non-real.png, phase0/1, foundation/, cosmetic-empty-overview.png).
- **What is good/honest:**
  - Header LOB toggle visible for t@ (multi-scope), "Cosmetic" selected in some shots.
  - Admin surfaces (overview/customers/employees/payments/calendar/reports) show **clear data separation**: dental = production-scale dense tables; cosmetic = sparse/empty (matches seed 5/6/10 + 0 txn). Remount behavior implied.
  - CTV 4-tab UI exists, mobile-ish layout, LOB pills, bottom nav, design tokens — pixel-close to companion ASCII for structure.
  - Real browser (127.0.0.1:5175, Chromium via Playwright) per Claude.md mandate; no 0-byte crisis (resolved from earlier FINAL).
- **Gaps vs visual companion (incomplete/honest issues):**
  - **No cross-LOB badge anywhere** (required on customer profile mockup; no profile screenshots in pack at all).
  - CTV tabs: show fabricated/demo data (not "seeded cross-DB commissions" with live traceable numbers per companion 12.4M example + D13). ctv-referrals shows some LOB pills but no real earnings from DB.
  - Services-cosmetic-real.png (multimodal): Actually renders Overview page (Tổng quan, "Cosmetic" active, empty states, "Lịch trình ngày" etc.) — **filename mismatch**; not the services catalog view. Services catalog wiring incomplete (ServiceCatalog.tsx bypasses lob in some fetches + backend products legacy).
  - Missing states required by companion/tests: flag-off (no toggle), 403 S_LOB_FORBIDDEN, pre-seed empty, error envelopes, full customer/:id profile with badge, exact "also a dental client →" UI, paid/payout cycles detail, exact mock numbers in companion.
  - INDEX.md lists aspirational files (login-success-t-admin.png, products-*-cosmetic.png, settings-*, phase1-*) that don't all exist as real captures or have .txt placeholders.
  - No video/console-harness or full matrix evidence bundled.
- **Honesty level:** The "VERIFIED COMPLETE" language in browser/verification agents + manifest is **over-optimistic** for the full spec/visual. Pack proves happy-path toggle + skeleton for wired surfaces + data sep on covered paths, but **not** "every surface" or "vs visual companion" completeness (badge absent, CTV not live, services render mismatch).

**Hand-wavy called out:** "20+ high-quality PNGs of every surface + CTV exact to mockups" claims in some statuses are inflated. Reality: 19 real files for subset of surfaces; gaps vs north-star explicit.

**CLEARED / NOT CLEARED: PARTIALLY CLEARED** (real evidence exists and satisfies for what was built; not complete/honest vs full visual + spec requirements).

---

## 5. Whether the 8 v2 Gates + PLAN Done Checklists Are All Green with Fresh Evidence

**Verdict: NOT CLEARED — Multiple Gates and All Checklists Fail or Unchecked**

**8 v2 gates (§239 in design-v2.md, pre-deploy before any flag flip):**
1. Existing dental Playwright suite passes 100% — **PARTIAL** (claimed green in slices; no full dedicated post-change run log + coverage in one place in artifacts).
2. `SELECT COUNT(*) FROM users WHERE lob_scope IS NULL` = 0 — **NOT VERIFIED FRESH** (backfill in 047; audits assume but no new psql output here).
3. Migration rollback dry-run succeeds — **NOT EVIDENCED** in final artifacts (script exists but no run log post-changes).
4. Cosmetic scope NOT granted → /api/cosmetic/clients 403 — **PARTIAL** (middleware exists; t@ required manual perm grant per audits).
5. Scope granted + toggle renders + empty list — **PARTIAL** (browser run shows toggle + empty cosmetic for wired surfaces).
6. CTV-flagged user → /ctv redirect + 403 on /customers — **YES** (guards + redirect real; ctv-demo works).
7. Real-browser smoke on nk2 as t@ (header identical, toggle, empty cosmetic, dental intact) — **NO** (all local 127.0.0.1:5175 only; nk2 never touched per "local-only" rule. Local smoke performed but not on nk2).
8. (Implied from testing strategy + PLAN: full matrix) — **NOT MET**.

**PLAN.md Done Checklists (per phase, all still [ ] unchecked in source):**
- Phase 0/1/2/3/4 checklists: All remain literal `[ ]` (no checkboxes filled). No sign-off comments.
- Phase 4 (hardening + NK2): Requires full gates + docs + coverage + "local only" honor — not done.
- Explicit rollback criteria (data leak, CTV mismatch, dental break) triggered by current state.

**Fresh evidence in worktree:** FINALS + OVERALL_STATUS + this re-audit all declare "NOT FINISHED" / "NOT READY" / "park" with 5-8 explicit remaining items (handler completion, CTV real, txn seed, perms auto, doc drift, full matrix). No agent claims "all 8 gates green".

**Hand-wavy called out:** Any "VERIFIED COMPLETE", "all gates passed", "PLAN done" language in intermediate agents is contradicted by the actual FINAL_COSMETIC_LOB_READINESS.md ("NOT FINISHED"), code state, unchecked PLAN lists, and this re-audit.

**CLEARED / NOT CLEARED: NOT CLEARED**

---

## Overall Independent Verdict

**CLEARED / NOT CLEARED: NOT CLEARED**

The Cosmetic LOB v2 effort produced a **high-quality, TDD'd, additive, rollback-safe foundation** (DB factory + getQuery pattern + middleware + flag + BusinessUnitContext + keyed remount + core handler migration on ~15 surfaces + real commissionEngine + CTV UI skeleton + 19 real non-zero browser screenshots proving happy-path toggle + visual data separation on wired paths + CTV redirect). This is genuinely impressive parallel work under strict local-only + authority rules, and the "0-byte screenshot crisis" from mid-swarm is resolved.

**However, the feature is NOT production-experimental ready (or even "CLEARED for Phase 4 discussion") per the north-star package itself.** Core invariants and gates are violated or unproven:
- D1 physical isolation fails on high-blast mounted paths (reports/products/etc. leak dental data via bare query()).
- D13 + CTV dashboard requirement fails (stub + mocks + zero txn/earnings demo data; numbers not psql-traceable).
- Cross-LOB badge (visual companion + D6 + tests) is entirely missing.
- §239 gates + PLAN checklists + 8 test classes not fully green with fresh end-to-end evidence.
- Doc drift (partners vs "users"/"clients") persists in product-map.
- Permission automation incomplete (manual grants needed).
- Screenshot pack honest for subset but incomplete vs mockups (no badge, CTV not live, filename mismatches).

**If anything feels hand-wavy or over-claimed, it is:** Multiple intermediate status files used "complete / verified / production-ready / no blockers" language that the code, greps, FINAL honest audits, and this re-audit directly contradict. The three parallel brutal auditors (data-separation, backend-coverage, live-browser) + FINAL_* + OVERALL_STATUS correctly surfaced the gaps; optimistic browser/verifier/partial-handler agents overstated. The "second pair of eyes" (me as #2) agrees with the first honest FINAL: **do not declare victory**.

**Recommendation (unchanged from prior honest synthesis):** Park cosmetic track. Do not cherry-pick, flag-flip, or promote anywhere (local or NK2) until the 5-8 concrete remaining items (full handler closure or ALS wrapper, real CTV aggregator + txn seed + demo, cross-LOB badge impl, auto-perms, doc sync, dedicated LOB Playwright matrix + 80%+ coverage, fresh honest re-audit with all gates green) are closed with new real-browser + psql + screenshot evidence. Then a clean integration PR from the worktree.

**Files referenced (absolute, worktree unless noted):**
- North star: `.worktrees/feat-cosmetic-line-of-business/docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md`, `...-visual-companion.md`
- Code leakage: `.worktrees/.../api/src/server.js:332-363`, `routes/products.js:2`, `routes/reports/*.js:2`, `middleware/lob.js`, `db/index.js:133`
- CTV stub: `.worktrees/.../api/src/routes/ctv.js:12-43`, `website/src/pages/CtvDashboard.tsx:34-50`
- Screenshots/manifest: `.worktrees/.../artifacts/cosmetic/screenshots/VERIFICATION_MANIFEST.json`, `INDEX.md`, `ctv-*-real.png` (multimodal), `services-cosmetic-real.png`
- Readiness: `FINAL_COSMETIC_LOB_READINESS.md:110-144` ("NOT FINISHED"), `PLAN.md:80-86` (unchecked checklists), `AGENT_COSMETIC_OVERALL_STATUS.md` (root, 55-65%)
- Cross-LOB: visual companion:112-123 (mock + rules), zero code hits, finishing/ charters note PENDING

This re-audit is exhaustive on the focus areas, read-only, and independent. Both pairs of eyes (prior honest + this #2) must agree: **victory not yet declared**. Resume only after hardening sprint + re-audit green.

**Sign-off:** Independent Brutal Re-Auditor #2 — 2026-05-19. Zero trust. All claims evidenced from primary sources.

*Re-run this exact audit (or equivalent) only after the listed gaps are closed with fresh artifacts.*