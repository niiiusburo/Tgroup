---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
current_plan: 3 / 4
status: executing
stopped_at: Completed 03-03-PLAN.md
last_updated: "2026-04-11T04:21:13.683Z"
last_activity: 2026-04-11
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 12
  completed_plans: 9
  percent: 75
---

# Project State — TG Clinic v1.1 Bugfixes & Features

**Status:** Executing Phase 03
**Last Activity:** 2026-04-11

## Phase Tracker

| Phase | Status | Plans | Verified |
|-------|--------|-------|----------|
| 1: Bug Fixes Wave 1 | Completed | 1 | Yes |
| 2: Quick Features & Validations | Not started | — | — |
| 3: Architecture Shifts | Not started | — | — |
| 4: Polish & Walk-in Redesign | Not started | — | — |

## Reports

- `v1-1-audit-report.md` — Codebase audit (4 exist, 1 partial, 10 missing)
- `v1-1-contradictions-report.md` — Top 5 architectural conflicts and resolutions
- `v1-1-playwright-report.md` — Playwright verification (save-button bugs confirmed by test failures)

## Phase Tracker (Detailed)

**Phase 03: Architecture Shifts**

- **Current Plan:** 3 / 4
- **Plan Status:** In Progress

| Plan | Status |
|------|--------|
| 03-01 | Completed |
| 03-02 | Not started |
| 03-03 | Completed |
| 03-04 | Not started |

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 03-architecture-shifts | 03-01 | 18min | 2 | 2 |
| Phase 03-architecture-shifts P03 | 23min | 3 tasks | 7 files |

## Decisions

- Use pool.connect() with explicit BEGIN/COMMIT/ROLLBACK for transactional scope updates
- Exclude primary companyid from junction inserts to maintain a single source of truth
- [Phase 03-architecture-shifts]: Hard delete is gated behind customer:hard_delete permission and runs FK-safe counts on appointments, saleorders, dotkhams
- [Phase 03-architecture-shifts]: Soft delete is exposed in both list view (trash icon) and profile view (dropdown) for users with customer:delete
- [Phase 03-architecture-shifts]: Linked record counts shown in hard-delete dialog come from hookProfile (appointmentcount, ordercount, dotkhamcount)
- [Phase 03-architecture-shifts]: 409 Conflict from hard delete maps to user-facing message 'Không thể xóa: còn dữ liệu liên quan.'

## Session

- **Last session:** 2026-04-11T04:21:13.681Z
- **Stopped at:** Completed 03-03-PLAN.md
