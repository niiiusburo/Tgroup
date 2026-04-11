---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
current_plan: Not started
status: planning
stopped_at: Completed 03-04-PLAN.md
last_updated: "2026-04-11T04:50:49.291Z"
last_activity: 2026-04-11
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 12
  completed_plans: 11
  percent: 92
---

# Project State — TG Clinic v1.1 Bugfixes & Features

**Status:** Ready to plan
**Last Activity:** 2026-04-11

## Phase Tracker

| Phase | Status | Plans | Verified |
|-------|--------|-------|----------|
| 1: Bug Fixes Wave 1 | Completed | 1 | Yes |
| 2: Quick Features & Validations | Completed | — | — |
| 3: Architecture Shifts | Completed | — | — |
| 4: Polish & Walk-in Redesign | Not started | — | — |

## Reports

- `v1-1-audit-report.md` — Codebase audit (4 exist, 1 partial, 10 missing)
- `v1-1-contradictions-report.md` — Top 5 architectural conflicts and resolutions
- `v1-1-playwright-report.md` — Playwright verification (save-button bugs confirmed by test failures)

## Phase Tracker (Detailed)

**Phase 03: Architecture Shifts**

- **Current Plan:** Not started
- **Plan Status:** Completed

| Plan | Status |
|------|--------|
| 03-01 | Completed |
| 03-02 | Completed |
| 03-03 | Completed |
| 03-04 | Completed |

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 03-architecture-shifts | 03-01 | 18min | 2 | 2 |
| Phase 03-architecture-shifts P03 | 23min | 3 tasks | 7 files |
| Phase 03-architecture-shifts P03-02 | 35min | 3 tasks | 7 files |
| Phase 03-architecture-shifts P03-04 | 571 | 4 tasks | 7 files |

## Decisions

- Use pool.connect() with explicit BEGIN/COMMIT/ROLLBACK for transactional scope updates
- Exclude primary companyid from junction inserts to maintain a single source of truth
- [Phase 03-architecture-shifts]: Hard delete is gated behind customer:hard_delete permission and runs FK-safe counts on appointments, saleorders, dotkhams
- [Phase 03-architecture-shifts]: Soft delete is exposed in both list view (trash icon) and profile view (dropdown) for users with customer:delete
- [Phase 03-architecture-shifts]: Linked record counts shown in hard-delete dialog come from hookProfile (appointmentcount, ordercount, dotkhamcount)
- [Phase 03-architecture-shifts]: 409 Conflict from hard delete maps to user-facing message 'Không thể xóa: còn dữ liệu liên quan.'
- [Phase 03-architecture-shifts]: Use useColumns hook to close over locationNameMap since DataTable Column render only receives row
- [Phase 03-architecture-shifts]: Filter out primary companyid from scope chips to avoid duplicate selection
- [Phase 03-architecture-shifts]: Dotkhams is a VIEW in the demo schema; FK constraint to dotkhams(id) cannot be added, so column was added without REFERENCES
- [Phase 03-architecture-shifts]: Allocation state was refactored to target-agnostic keys to support both invoices and dotkhams

## Session

- **Last session:** 2026-04-11T04:41:03.361Z
- **Stopped at:** Completed 03-04-PLAN.md
