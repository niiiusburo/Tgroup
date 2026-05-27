---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: CTVlegacy Port
current_plan: Not started
status: planning
stopped_at: Roadmap created for v1.2 — 5 phases, 15 plans
last_updated: "2026-05-27T00:00:00.000Z"
last_activity: 2026-05-27
progress:
  total_phases: 9
  completed_phases: 4
  total_plans: 26
  completed_plans: 20
  percent: 77
---

# Project State — TG Clinic v1.2 CTVlegacy Port

## Current Position

Phase: 5 (Schema Foundation) — ready to plan
Plan: —
Status: Roadmap complete; awaiting plan execution for Phase 5
Last activity: 2026-05-27 — v1.2 Roadmap created (Phases 5–9)

## Phase Tracker

| Phase | Milestone | Status | Plans | Verified |
|-------|-----------|--------|-------|----------|
| 1. Bug Fixes Wave 1 | v1.1 | Complete | 3/3 | ✓ |
| 2. Quick Features & Validations | v1.1 | Complete | 8/8 | ✓ |
| 3. Architecture Shifts | v1.1 | Complete | 4/4 | ✓ |
| 4. Polish & Walk-in Redesign | v1.1 | Not started | — | — |
| 5. Schema Foundation | v1.2 | Not started | 0/2 | — |
| 6. Commission Tier Admin | v1.2 | Not started | 0/3 | — |
| 7. Public CTV Signup + Auth + OCR | v1.2 | Not started | 0/4 | — |
| 8. Refer-A-Client Flow | v1.2 | Not started | 0/3 | — |
| 9. E2E Verification & Polish | v1.2 | Not started | 0/2 | — |

## Accumulated Context (v1.2 locked)

### Decisions

- Per-LOB commission tiers (dental ≠ cosmetic) — explicit in schema with (lob, level) PK
- No admin approval queue — CTVs self-sign-up directly; admins review on partners list page
- Gemini Vision OCR env-gated by GEMINI_API_KEY — control hidden when unset, endpoint 503s
- Dual-format password support (legacy SHA256 + bcrypt) — lazy rehash on login, no hard cutoff date
- Refer-A-Client hardened by 6-month eligibility gate on completed/paid services in chosen LOB only
- Five migrations (048–052) applied to BOTH tdental_demo and tcosmetic_demo for schema mirroring

### Pitfalls & Mitigations

Top 3 critical pitfalls identified in research:

1. **Two-DB Partner Approval Atomicity** (Pitfall 1) — Dual-LOB partner creation can leave one DB incomplete. Mitigation: idempotent retry; approve transaction fails both or succeeds both.
2. **Commission Tiers Drift** (Pitfall 2) — Tier rate updates must stay in sync across LOBs. Mitigation: single API endpoint validates both DBs update or fails both.
3. **Gemini OCR Cost Runaway** (Pitfall 3) — Public OCR endpoint vulnerable to bot abuse. Mitigation: rate limit 5 OCR calls per IP per day, image size validation, env-gated by GEMINI_API_KEY.

Full pitfalls list: `.planning/research/PITFALLS.md` (10 pitfalls, phase-specific mitigations listed).

### Pending Blockers

None — research complete, phase dependencies clear, no unresolved questions in architecture.

## Session Continuity

Last session: 2026-05-27 — Roadmap creation
Stopped at: ROADMAP.md written; REQUIREMENTS.md updated; STATE.md initialized
Resume: Ready to invoke `/gsd-plan-phase 5` for Schema Foundation

</content>
</invoke>