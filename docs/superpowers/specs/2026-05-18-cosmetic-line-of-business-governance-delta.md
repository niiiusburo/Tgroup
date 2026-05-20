# Cosmetic Line of Business v2 — Governance Delta

**Date:** 2026-05-19 (Phase 0 execution)
**Status:** Phase 0 complete — product-map + authority docs updated
**Owner:** Product Governance & Documentation Agent
**North Star:** `2026-05-18-cosmetic-line-of-business-design-v2.md` (approved) + PLAN.md + specialist reviews (DB/Auth/FE/Money)
**Related:** visual-companion.md, product-map/domains/* (new split domains)

## Purpose

This document records the **governance delta** introduced by Cosmetic LOB v2: changes to authority stack, product-map structure, permission model, decision logging, documentation obligations, and coordination rules. It ensures future agents and humans respect the two-DB topology, LOB scoping, "local only" rule, and TDD gates without re-auditing every file.

It supersedes nothing in root AGENTS.md / ARCHITECTURE.md; it **extends** them for the new domain.

## 1. Product-Map Governance Delta

### New / Split Domains (created Phase 0)
- `product-map/domains/business-unit.yaml` — LOBContext, toggle, lob_scope, requireLobScope, flag plumbing
- `product-map/domains/cosmetic-clients.yaml` — independent clients in tcosmetic_demo, cross-view badge, consultations
- `product-map/domains/ctv.yaml` — is_ctv role, /ctv dashboard, redirect, ctv.* perms, cross-DB aggregation
- `product-map/domains/earnings-commissions.yaml` — dbo.earnings (append-only, both DBs), D13 resolution, payouts, distinction from legacy commissions rules tables, engine ownership

### Updated Parent
- `product-map/domains/cosmetic.yaml` — corrected to reference `earnings` table (not commissions) per DB specialist + PLAN; now cross-refs the four sub-domains; owns the high-level LOB surfaces and mirrors

### Contracts Updated
- `product-map/contracts/permission-registry.yaml`
  - +9 keys (cosmetic.access, dental.access, ctv.dashboard.view, ctv.commission.view.self, ctv.referrals.view.self, commissions.view.team, commissions.payout.run, commissions.export, lob.crossview)
  - Updated meta counts, frontend_route + nav sections, risks
  - Note: permissions retain "commissions.*" logical names; table is earnings
- `product-map/contracts/api-index.md` — new sections: Cosmetic LOB Mirrors, CTV Dashboard, Me/LOB Scope

### Schema / System
- `product-map/schema-map.md` — new "Two-DB Topology" section + entries for earnings, payouts, consultations, additive columns
- `product-map/unknowns.md` — §14 added with parked questions from v2 spec (role rename, auto-unlock, CTV reports, splits, dental rates)
- `product-map/change-checklist.md` — new "LOB / Business-Unit / Two-DB Changes" checklist (mandatory for future edits)
- `product-map/system-map.md` — diagram + note updated for tdental_demo + tcosmetic_demo

**Rule:** Before any code touching LOB/cosmetic/ctv/earnings, agent MUST read the four new domain yamls + cosmetic.yaml + schema-map two-DB section.

## 2. Authority Stack Extensions (v2)

Per v2 spec "Documentation updates (mandatory)":
- AGENTS.md — (to be) annotated with two-DB, per-route requireLobScope discipline, "agents must specify LOB when touching cosmetic code"
- ARCHITECTURE.md — (to be) two-DB diagram, role model (is_ctv vs lob_scope), recipient-resolution algorithm (D13)
- DESIGN.md — LOB toggle UX + CTV dashboard visual rules
- BEHAVIOR.md — S_LOB_FORBIDDEN error envelope + CTV redirect behavior
- DECISIONS.md — D1–D16 (v2) logged as durable DEC- entries
- docs/CONTRACTS.md — new types: Lob, BusinessUnitScope, CommissionRow (earnings), Payout, CtvCommissionSummary
- docs/DATA-MODEL.md — two-DB breakdown, additive-only dental changes called out
- docs/MIGRATIONS.md — steps 1–8 + reversal SQL per dental additive
- docs/SECURITY.md — LOB gate, CTV role gate, scope=empty behavior, no PII in ctv responses
- docs/RUNBOOK.md + runbooks/DEPLOYMENT.md + VERIFICATION.md — flag rollout, tcosmetic_demo backup/restore, local-only gates
- docs/TEST-MATRIX.md — 8 new test classes registered (dental regression, LOB isolation, CTV agg, etc.)
- docs/CHANGELOG.md — per-migration entries (planning + execution)
- testbright.md — acceptance scenarios (toggle, regression, CTV, reversal)
- .claude/memory.md — two-DB toggle convention + "never JOIN across DBs"

All updates performed in Phase 0 for governance foundation (more detail edits continue into later phases with code).

## 3. Decision Logging (D1–D16)

All v2 design decisions from spec table now durable in DECISIONS.md (added during Phase 0+):

- D1: Two separate Postgres DBs (tdental_demo untouched shape + tcosmetic_demo)
- D2: No shared identity (independent clients per LOB)
- D3: Dental referral_locks stays dental-internal
- D4: Header LOB dropdown (multi-scope admins only)
- D5: lob_scope TEXT[] + is_ctv on users
- D6: Cross-LOB owner badge (lob.crossview only, soft probe)
- D7: Consultations invisible (backend attribution)
- D8: Cosmetic lock TTL 6mo (engine)
- D11: commission_rate_percent per-product (both DBs)
- D12: Earnings on payment collected; refunds = negative reversal
- D13: Recipient resolution order (CTV > consultation > salestaff)
- D14: CTV role (is_ctv, hard redirect to /ctv, never admin)
- D15: Cosmetic staff flags mirror dental for v1
- D16: cosmetic.staff seeded empty (admin populates via UI)

**Table name decision (post-review, supersedes early spec diagrams):** dbo.earnings for transactional (not commissions) in both DBs to avoid collision with legacy rules tables.

Logged as multiple DEC-20260519-0N entries in DECISIONS.md.

## 4. Coordination & Reporting Rules (Delta)

- Every cosmetic/LOB change must reference this delta + the 4 domain yamls in commit / agent log.
- Use COORDINATION_REQUESTS.md for any cross-DB or earnings + payment interaction.
- "local only, NK2 later" (PLAN global rule) — zero direct changes to nk2 or prod until Phase 4 gate + full local green + rollback dry-run.
- TDD: failing tests first for every new surface (context, db factory, engine, gates, CTV flows).
- After UI: Playwright + real-browser screenshots mandatory before "done".
- Product-map must stay in sync: after edit, re-verify blast radius in schema-map + owning yaml.
- Rollback: any dental regression or isolation failure → immediate revert of that phase's artifacts + DB objects.

## 5. Permission & RBAC Governance Delta

- Hard gate: lob_scope (JWT/user object) + requireLobScope middleware on all /cosmetic/* and CTV admin routes.
- Soft gate: the 9 new permission strings (seeded in dental DB; cosmetic staff get cosmetic.access etc.).
- CTV users: scope empty or null; is_ctv=true is authoritative for redirect + ctv perms only.
- Admins with multi-scope: see toggle; crossview badge requires lob.crossview.
- Legacy dental users: backfilled to ['dental']; continue to work unchanged until explicitly granted cosmetic scope.

## 6. Verification & Rollback Gates (Governance)

Pre any flag flip or promotion (local / nk2 / nk):
1. Dental Playwright 100% green
2. Backfill COUNT(*) users lob_scope IS NULL = 0
3. Migration rollback dry-run clean
4. Negative tests (no-scope → 403 on cosmetic; is_ctv → 403 on admin)
5. Positive: toggle renders, cosmetic empty but functional, earnings attribution correct, CTV redirect + numbers match seeds from both DBs
6. Real-browser end-to-end (t@clinic.vn on 127.0.0.1:5175) + screenshots

All captured in artifacts/cosmetic/ and testbright.md.

## 7. Files Touched in Phase 0 (Governance Only)

**product-map/**
- domains/ (new: business-unit.yaml, cosmetic-clients.yaml, ctv.yaml, earnings-commissions.yaml)
- domains/cosmetic.yaml (corrected + cross-refs)
- contracts/permission-registry.yaml (+9 keys + meta)
- contracts/api-index.md (new sections)
- schema-map.md (two-DB + tables)
- unknowns.md (§14)
- change-checklist.md (LOB section)
- system-map.md (diagram + note)

**docs/superpowers/specs/**
- 2026-05-18-cosmetic-line-of-business-governance-delta.md (this file — created)

(Other authority docs listed in v2 spec § Documentation updates will receive detailed edits as code lands in Phases 1–4; Phase 0 establishes the product-map + this delta as the foundation.)

## 8. Status & Next

- Phase 0 governance foundation: **COMPLETE**
- Blockers: None (all listed product-map + delta created/updated)
- Hand-off: Other agents (DB, Auth, FE, Money) may now implement skeletons per PLAN Phase 0 (db factory, BusinessUnitContext, tests) referencing these maps.
- Future sessions: MUST start by reading this delta + the 4 new domain yamls + PLAN.md + v2 design.

**Sign-off:** Product Governance & Documentation Agent — 2026-05-19 — feat/cosmetic-line-of-business worktree only.

All changes local to worktree. "local only" honored. No main/prod touched.
