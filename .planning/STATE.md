---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: CTVlegacy Port
current_plan: Not started
status: planning
stopped_at: Milestone v1.2 started — defining requirements
last_updated: "2026-05-27T00:00:00.000Z"
last_activity: 2026-05-27
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State — TG Clinic v1.2 CTVlegacy Port

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-27 — Milestone v1.2 started

## Phase Tracker

| Phase | Status | Plans | Verified |
|-------|--------|-------|----------|
| (to be defined by roadmapper) | — | — | — |

## Accumulated Context (carried from v1.1)

- Existing CTV scaffolding on branch `fix/feedback-reports`:
  - `api/src/services/commissionEngine.js` — engine in place, needs CSKH branch
  - `api/src/routes/ctv.js` — 4 endpoints live (commission-summary, referrals, hierarchy, me)
  - `website/src/pages/CTV/index.tsx` + `components/ctv/*` — dashboard wired
  - `website/src/i18n/locales/{en,vi}/ctv.json` — 92 keys each
  - `product-map/domains/ctv.yaml` — authoritative domain spec
- Cosmetic LOB infrastructure live: `attachCosmeticDb`, `getDb('cosmetic')`, `runWithLob()`, `COSMETIC_LOB_ENABLED`
- CTV redirect on login (`is_ctv=true` → `/ctv`) wired in `AuthContext.tsx`
- Last applied migration: `047_face_model_upgrade_arcface.sql` — next available is `048`
- v1.1 Phase 4 (Polish & Walk-in Redesign) still pending; runs in parallel when prioritized

## Reports

- (none yet for v1.2)

## Decisions (v1.2 locked answers)

- Per-LOB commission tiers (dental ≠ cosmetic)
- Gemini Vision OCR included at signup, gated by `GEMINI_API_KEY` env var
- Marketing scrollytelling landing page **dropped entirely**
- Do NOT re-port existing commissionEngine or CTV portal
- Five migrations 048–052, applied to both dental and cosmetic DBs

## Session

- **Last session:** 2026-05-27 — Milestone v1.2 kickoff
- **Stopped at:** Defining requirements
