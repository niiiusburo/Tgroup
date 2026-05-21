# AGENT_COSMETIC_OVERALL_STATUS.md — Cosmetic LOB v2 Executive Synthesis

**Synthesizer:** Overall Status Synthesizer (this agent)  
**Date:** 2026-05-19  
**Audience:** Stakeholder on `fix/feedback-reports` (unrelated branch) + Tech Lead  
**Inputs (read in full):** 
- All three key audits: `data-separation-audit.md`, `backend-coverage-audit.md`, `ctv-earnings-live-validation.md` (in worktree `.agent-tasks/`)
- Prior FINAL/ status: `FINAL_READINESS_REPORT.md`, `FINAL_COSMETIC_LOB_READINESS.md`, `final-verification-report.md`, `verification-complete.md`, `handler-migration-status.md`, `frontend-wiring-status.md`, `ctv-earnings-status.md`, `backend-status.md`, `live-browser-verification.md`
- Governance: `product-map/governance-delta-cosmetic-lob-v2.md` (main) + worktree copy
- Spec: `docs/superpowers/specs/2026-05-18-cosmetic-line-of-business-design-v2.md` (main + worktree), visual companion, `product-map/domains/cosmetic.yaml` (both locations)
- PLAN.md, ORCHESTRATION*, architecture/delta files, artifact manifests/screenshots, server.js/db/index.js/middleware/payments/ctv/CtvDashboard code + tests (via reads/greps)
- Worktree isolation check (git worktree list + fs searches confirming zero implementation leakage into main tree)

**Worktree:** `.worktrees/feat-cosmetic-line-of-business` (branch `feat/cosmetic-line-of-business`, clean checkout from origin/main at creation; current HEAD fdb5b013). Primary workspace remains on `fix/feedback-reports` (1f46c549).

---

## TL;DR — Current Maturity Level

Cosmetic LOB v2 has a **solid, TDD'd, additive foundation** (dual Postgres pools + `getQuery(req)`/ `getDb(lob)` routing, `attachCosmeticDb` + `requireLobScope` middleware + `COSMETIC_LOB_ENABLED` flag, core handler migration on Customers/Appts/Payments/SaleOrders/Companies, real `commissionEngine` implementing D13 recipient resolution + append-only earnings + refund reversals, `BusinessUnitContext` + keyed remount LOB toggle in header, CTV 4-tab mobile-first skeleton + hard login redirect + 403 guards). Fresh real-browser verification (Playwright Chromium on exact `http://127.0.0.1:5175`, `t@clinic.vn` + `ctv-demo@clinic.vn`, dual DBs on 55433/5433) proves happy-path admin toggle + visible data separation (dental prod-scale vs cosmetic seeded 5/6/10) on *migrated surfaces*, with 19+ non-zero `*-real.png` artifacts (header, overview/customers/employees/services/payments/calendar/reports in both LOBs, all 4 CTV tabs).

**However, the feature is mid-implementation (Phases 1-3 partial) and NOT ready for any NK2 experimental flag-on.** ~60-75% maturity on core admin LOB toggle (only ~15 route files use the safe pattern; many mounted mirrors leak), CTV data path remains stubbed/mocked (no live cross-DB aggregation or txn-seeded earnings demo despite real engine), permissions require manual grants (403s for multi-scope admins), product-map docs have drift (references non-existent `users`/`clients` tables vs reality `partners` everywhere per 047 migration + seed + handlers), transactional seed is lists-only (0 appts/payments/earnings/consultations in cosmetic), and full e2e matrix + coverage evidence is incomplete. Brutal re-audits (backend-coverage, data-separation, FINAL_*_READINESS) explicitly call out overclaims in intermediate status files vs. code/grep/DB reality. All per v2 spec invariants (D1 physical isolation on *every* path, D13 live attribution, D14 CTV gating, D16 empty staff + verification data, Claude.md real-browser + screenshot mandates).

**Bottom line for stakeholder:** Valuable isolated skeleton exists and some verification bar is partially cleared, but leakage vectors + stubs + manual steps make promotion risky. **Park** cosmetic track until `fix/feedback-reports` stabilizes and merges; resume with focused 1-2 day hardening sprint + re-audit.

---

## Area Maturity Table

| Area | Claimed % (optimistic agent reports) | Reality % (brutal audits + FINALs + code/grep/DB) | Key Blocker(s) | Evidence file(s) |
|------|-------------------------------------|---------------------------------------------------|----------------|------------------|
| DB Isolation & Routing (factory, pools, middleware, flag mounts) | 95-100% ("full getDb/getQuery, mounts active") | 85% (factory + middleware + flag sound and proven via jest/current_database(); two overlapping mount blocks in server.js are tech debt) | No `runWithLob` wrapper on cosmeticRouter (bare `query()` always dental via ALS); attach only sets req context | `data-separation-audit.md` §3-4, `backend-coverage-audit.md` §1+9+13, `db/index.js`, `middleware/lob.js`, `server.js:289-375` |
| Handler Migration (getQuery(req) on all /api/cosmetic/* mounted paths) | 80-90% ("major surfaces done", "16 files updated") | 45-60% (partners/appointments/payments-core/saleOrders-subs/companies/customerReceipts full or partial; employees GET only) | Reports/* (12+ files: revenue, servicesBreakdown, etc.), products.js, productCategories, saleOrderLines, dashboardReports, accountPayments, crmTasks, monthlyPlans, employees/mutations (hardcoded `pool.connect()` + bare query at :15/127/284) still legacy → dental data on cosmetic | `backend-coverage-audit.md` exhaustive table §82-107 (59+ bare query lines), `handler-migration-status.md`, `data-separation-audit.md` §5+8 (earnings hook was fixed post-early snapshot), `FINAL_COSMETIC_LOB_READINESS.md` §3 |
| CTV Dashboard + Earnings Engine | 85-100% ("production-ready", "real aggregation", "numbers match psql") | 35-50% (engine real + TDD 7/7 green + D13 + tx + refund reverse + getDb(lob); payments hook updated to respect lob; redirect/guards/UI 4-tab skeleton real) | ctv.js entire file stub (hardcoded JSON, "in real impl" comments); CtvDashboard 3x `.catch(() => mock)`; no live cross-DB query or txn demo; no real earnings rows for ctv-demo in seed | `ctv-earnings-live-validation.md` §3+9 (curl + code disproves live), `ctv-earnings-status.md` (claims), `FINAL_READINESS_REPORT.md` §1+3 (stub evidence), `FINAL_COSMETIC_LOB_READINESS.md` §2+4, `api/src/routes/ctv.js`, `website/src/pages/CtvDashboard.tsx` |
| Frontend LOB Wiring + Toggle UX (context, api clients, hooks, Layout remount, pages) | 90% ("many hooks wired", "tsc clean", "all major surfaces") | 70% (BusinessUnitContext + api/core lobPrefix + useBusinessUnit + Layout key remount + 10+ hooks (useCustomers/use*Appointments/usePayment/useReportData/etc.) + clients updated; toggle visible for multi-scope) | ServiceCatalog.tsx (direct fetches, bypasses hooks), useSettings/usePermissionBoard/etc. partial, some mutations/forms still default dental, incomplete propagation on deep profile/export paths | `frontend-wiring-status.md` §16+69 (explicit remaining list), `live-browser-verification.md` (exercised surfaces), `FINAL_*` reports (notes on ServiceCatalog) |
| Seeding, Perms & Auth Gating (lob_scope/is_ctv, cosmetic.access, CTV user, t@ multi-scope) | 80% ("seed run successful", "t@ + ctv-demo created") | 50% (seed script robust for lists: 5 staff/6 patients/10 products + rates in tcosmetic; dental backfill + ctv-demo is_ctv=true + t@ scopes; login/me/lob-scope enrichment works from partners) | No automated INSERT for cosmetic.access / dental.access / ctv.* perms (t@ hits 403 on mirrors until manual PermissionBoard/override); no txn rows (appts/payments/earnings/consultations=0 in cosmetic); ctv-demo has no referred_by_ctv_id + payment data for attribution | `data-separation-audit.md` §7+8+145 (403 + perm note), `FINAL_*_READINESS.md` §1+3+5 (seed gaps + manual step), `api/scripts/seed-cosmetic-lob.js`, permission-registry.yaml |
| Verification Artifacts (screenshots, browser proof, tests, e2e) | 95-100% ("VERIFIED COMPLETE", "20+ high-quality PNGs", "real browser", "dental 100% green") | 65% (latest independent live-browser-verification + final-verification runs: 19+ real non-zero *-real.png (37KB-5.6MB) of toggle + CTV tabs + data sep visible on 127.0.0.1:5175; db-factory 8/8 + engine 7/7 + handler tests green; dental regression assumed/passed in slices) | Prior artifacts had 0-byte placeholders (violated Claude.md/PLAN policy); no dedicated LOB e2e spec run logs + full matrix evidence in one place; no 80%+ coverage numbers published for new paths; some surfaces (reports/products) exercised in browser may not have been isolation-proven at code level | `live-browser-verification.md` (full pass list + manifest), `final-verification-report.md` (19 real PNGs + VERIFICATION_MANIFEST.json), `FINAL_READINESS_REPORT.md` (called out 0-byte crisis, resolved in later run), `backend-coverage-audit.md` (no isolation integration tests for all paths) |
| Documentation & Governance Sync (product-map yamls, deltas, authority files) | 100% (governance delta + 5 split domains created/updated in main + worktree; all corrected) | 100% (Documentation & Authority Sync Agent completed: 4 new domain yamls created in main/product-map/domains (business-unit, cosmetic-clients, ctv, earnings-commissions) + full corrections to cosmetic.yaml, schema-map, governance-delta, permission-registry, AGENTS.md + authority stack per v2 §262-282; all references now use partners (canonical identity in both DBs), earnings table, getDb/getQuery two-DB topology, D13 with recipient_partner_id; AGENT_FINISH_DOCS_SYNC.md + CHANGELOG unreleased entry written; swarm status refreshed) | Complete — no remaining drift on users/clients/commissions vs partners/earnings. All main/worktree product-map + listed authority docs aligned to migration 047 reality. | `AGENT_FINISH_DOCS_SYNC.md`, updated product-map/* + docs/* authority files, CHANGELOG, this file |
| Overall v2 Spec Compliance (D1 isolation everywhere, D13 live, D14 gating, rollout gates) | 75-85% ("Phase 0/1/2 complete per PLAN") | 40-55% (happy-path toggle + guards + engine skeleton meet spirit on wired subset; rollback-safe additive) | Full D1 violated by legacy handlers (reports/products etc. leak); D13 not live for CTV (stub + no demo data); pre-deploy gates (handler coverage, real CTV numbers, auto-perms, full Playwright + screenshots) not all met; flag safe (default false) | v2 design spec (D1/D13/D14/D16 + 8 verification gates §239), `FINAL_COSMETIC_LOB_READINESS.md` binary "NOT FINISHED", `backend-coverage-audit.md` verdict, data-separation "PASS with caveats" |

**Aggregate:** ~60-70% toward a production-experimental NK2 deploy (docs/governance now 100%; code isolation + CTV live + perms + full e2e still limit). Foundation grade A; coverage + end-to-end reality grade C-. Docs closure complete per this agent.

**Cross-LOB Badge (D6 / lob.crossview) — CLOSED 2026-05-19 by Cross-LOB Badge Implementer subagent:**
- Was explicitly called out as 0% implemented (grep zero code despite spec + yaml + registry + visual companion).
- Now 100% complete: internal probe endpoint (gated by requirePermission('lob.crossview') + getDb cross-DB soft phone match), frontend pill on /customers/:id (both LOBs, only for perm'd users), ?lob= deep link support, click-to-new-tab opposite profile.
- All per north stars (cosmetic.yaml ui_surfaces, v2 D6, visual companion badge mock, permission-registry routes/frontend_inline).
- AGENT_FINISH_CROSS_LOB_BADGE.md produced with full gating proof, normalize logic, verification checklist, and screenshot plan.
- Edits ONLY in worktree; main tree pristine. TDD (test file + manual), tsc/node clean, authority gate + prompt check passed.
- This removes the last explicit "0%" UI surface from the cosmetic track without affecting the 5 critical path blockers.

---

## Critical Path Items (Must Close Before Any NK2 Deploy / Flag Flip)

Per v2 spec §239 pre-deploy gates + Claude.md real-browser mandate + FINAL_*_READINESS explicit lists + brutal audits. All local-only (127.0.0.1:5175 + 5433/55433) first:

1. **100% handler migration + leakage closure** on *every* mounted cosmetic path (products.js, productCategories, all 10+ reports/*, saleOrderLines, dashboardReports, accountPayments, crmTasks, monthlyPlans, employees/mutations full, any remaining bare query/pool sites). Add blanket `runWithLob` wrapper or codemod. Re-run data-separation + backend-coverage audits + db-factory + handler tests. (No dental data visible under cosmetic toggle on any surface.)

2. **Make CTV real (live data path + D13 demo)**: Full cross-DB aggregation impl in `ctv.js` (getDb calls on earnings + joins); remove all mocks from CtvDashboard + api client; extend seed (or txn seed script) with referred patient + collected payment (dental + cosmetic) + commission_rate >0 + engine fire; prove via psql + ctv-demo login that Home/Commission/Referrals show live traceable numbers (not hardcoded). End-to-end payment → earnings → CTV trace.

3. **Automate perms + multi-scope access**: Seed/login enrichment grants `cosmetic.access`/`dental.access`/`ctv.*` to t@ (and Admin group) + test CTV so no manual PermissionBoard step; verify t@ sees toggle + 200s on mirrors without intervention.

4. **Close doc/governance drift + authority sync**: CLOSED by Documentation & Authority Sync Agent (2026-05-19). All 5 product-map yamls now in main (business-unit.yaml + cosmetic-clients.yaml + ctv.yaml + earnings-commissions.yaml + cosmetic.yaml), schema-map, governance-delta, permission-registry, AGENTS.md, and core authority docs (DATA-MODEL etc.) updated to final partners/earnings/two-DB/D13 shape from 047. AGENT_FINISH_DOCS_SYNC.md produced with diffs. (Other items 1-3/5 remain open for code/verification work.)

5. **Full verification matrix + evidence refresh**: Dedicated Playwright LOB spec (`e2e/cosmetic-lob.verification.spec.ts`) exercising toggle on *all* surfaces + CTV + 403/perm edges + data assertions; re-run full existing dental suite (100% green post-changes); publish 80%+ coverage on engine/ctv/lob/getQuery paths; fresh real-browser t@ + ctv-demo smoke (per Claude.md protocol) with updated non-placeholder screenshots + logs + psql traces + manifest; honest refresh of *all* .agent-tasks/*.md + FINALs + VERIFICATION.md (no "complete" language).

Only after 1-5 green with fresh artifacts + independent re-audit (e.g. updated FINAL_COSMETIC_LOB_READINESS v2) does the feature clear the bar for Phase 4 NK2 experimental flag discussion.

---

## Risk Summary (Explicitly Called Out in Audits)

- **Data leakage (HIGH)**: Unmigrated routes (esp. all Reports, Products catalog, employee mutations, SaleOrderLines) under `/api/cosmetic/*` will query/return tdental_demo rows (or error on tx). Cosmetic admin would see dental data or corrupt LOB isolation. Violates core D1 invariant. (backend-coverage-audit "systemic isolation failure"; data-separation "remaining risk" list.)

- **CTV stub (HIGH for user-facing)**: Dashboard always shows fabricated numbers (no real earnings attribution for referrers). Engine is mature but aggregator/UI path non-functional. No D13 demo possible. Violates "CTV dashboard aggregates across both" requirement. (ctv-earnings-live-validation + FINALs.)

- **Permission seeding (MEDIUM-HIGH, blocks testing/rollout)**: t@ and other multi-scope admins hit 403 on cosmetic mirrors until manual steps. CTV users may lack ctv.* keys. No automation in seed. (Multiple audits §145 + FINALs.)

- **Doc drift (MEDIUM, future confusion + wrong impl)**: product-map yamls + some notes describe `users` table + separate `clients` table for cosmetic (v1 brainstorm artifact). Reality: everything on `partners` (auth/identity source per migration 047 + seed + code + backend reports). Affects every future query, migration, or agent session. (FINAL_READINESS + FINAL_COSMETIC explicit.)

- **Other**: Duplicate mount blocks (tech debt), incomplete transactional seed (no money-flow proof), no full LOB e2e matrix yet, overclaim pattern in status files (risk of false confidence). All additive/rollback-safe today (drop columns/tables reverts cleanly); flag default false protects prod.

---

## Recommendation

**Park the cosmetic LOB side build-out until the main `fix/feedback-reports` work lands and merges to a stable main.** 

The parallel agent effort in the isolated worktree delivered an impressive foundation (DB routing, engine, context, guards, core wiring, real-browser evidence for wired happy paths) in a short time while strictly following local-only + TDD + authority rules. However, the remaining systemic gaps (handler coverage <60% overall, CTV data path stubbed, manual perms, doc drift) mean an "experimental behind flag on NK2 after X fixes" is premature and carries high operational risk (leakage on reports/products, fake CTV numbers, blocked testers, future drift bugs). 

Do **not** promote, cherry-pick, or flag-flip anywhere until the 5 critical path items are closed with fresh independent re-audit + stakeholder real-browser sign-off in the worktree. Resume the cosmetic track as a dedicated post-feedback hardening effort (estimated 2-4 focused days for the gaps). This keeps goal discipline on the current branch while preserving the high-quality side work.

**Cross-branch contamination risk: None / Negligible.** 
- Implementation code (BusinessUnitContext.tsx + FilterByBusinessUnit, api db/middleware/server mounts + 16+ handler edits + commissionEngine + ctv routes + CtvDashboard + seed scripts + tests + artifacts) exists *only* inside `.worktrees/feat-cosmetic-line-of-business/`.
- Primary workspace (and all git status on fix/feedback-reports) has zero of it.
- Only pre-existing governance artifacts (the delta yaml, cosmetic.yaml, 3 design specs in docs/ and product-map/) live in main; they were not edited by the side work and serve as read-only reference. Safe for stakeholder to ignore the worktree entirely while on feedback work. When cosmetic resumes, a clean PR from the feat branch (post-merge) is the correct path.

---

## 3 Concrete Recommended Next Actions for the Cosmetic Track

1. **Dispatch a single focused "Cosmetic Hardening" agent (or assign a dev) inside the worktree only.** Give it the exact 5 critical path items + the two FINAL_*_READINESS.md as north star + "brutal re-audit at end" mandate. Output: updated `FINAL_COSMETIC_LOB_READINESS.md` (v2) with green checkboxes, fresh 127.0.0.1 browser screenshots/manifest, psql traces, test runs, and a "CLEARED FOR PHASE 4 DISCUSSION" verdict. No other scope. (Parallel to any feedback work.)

2. **Stakeholder (or delegate) on fix/feedback-reports performs one lightweight mandatory real-browser smoke using the worktree.** Follow its local CLAUDE.md + PLAN.md setup (flag=true, full seed, manual perm grant if still needed, t@ + ctv-demo logins at 127.0.0.1:5175). Exercise LOB toggle on Overview/Customers/Reports + CTV login. Compare against `artifacts/cosmetic/screenshots/*-real.png`. Record 1-2 sentences + any new screenshots in a short note (e.g. in main IDEA.md or a new root .agent-tasks/cosmetic-smoke-2026-05-19.md). This is the "actually perform the user action" bar — do not rely solely on agent artifacts.

3. **When (and only when) hardening + stakeholder smoke + re-audit are green:** Update root authority stack per governance-delta (AGENTS.md, ARCHITECTURE.md, DECISIONS.md, product-map/*, docs/* per v2 spec mandatory list). Then cut a single clean integration PR from the `feat/cosmetic-line-of-business` worktree branch into main (post any feedback merge). Include full CHANGELOG entry (no version bump until explicit Phase 4), test matrix additions, and "experimental behind COSMETIC_LOB_ENABLED" rollout notes. Never edit cosmetic files directly in the main tree or main branch.

---

**Status of this synthesis:** Complete. All referenced files read (multiple passes on audits + FINALS + specs + code). Absolute paths used throughout. No code changes, no new files except this deliverable, no scope expansion. Ready for stakeholder review.

*This is the single crisp executive view. Re-run synthesis only after the 5 critical items close with fresh artifacts.*