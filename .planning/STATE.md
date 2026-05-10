---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Deploy Speed Refactor
current_plan: Not started
status: planning
stopped_at: Roadmap created — awaiting phase planning
last_updated: "2026-05-10T00:00:00.000Z"
last_activity: 2026-05-10
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State — TG Clinic v2.0 Deploy Speed Refactor

**Status:** Roadmap created — awaiting phase planning  
**Last Activity:** 2026-05-10 — Roadmap approved, 8 phases defined with wave structure  

## Current Position

- **Milestone:** v2.0 Deploy Speed Refactor
- **Phase:** Not started (Phase 5 pending planning)
- **Plan:** —
- **Status:** Roadmap created
- **Last activity:** 2026-05-10 — Roadmap v2.0 finalized with 8 phases (Phase 5–12)

## Phase Tracker

| Phase | Name | Team | Wave | Status | Plans | Verified |
|-------|------|------|------|--------|-------|----------|
| 5 | Health & Version Endpoints | Backend | 1 | Not started | 0 | — |
| 6 | Graceful Shutdown | Backend | 1 | Not started | 0 | — |
| 7 | Dockerfile Multi-Stage Rewrites | Infra | 1 | Not started | 0 | — |
| 8 | Compose Files + Prod-Parity | Infra | 1 | Not started | 0 | — |
| 9 | GitHub Actions → GHCR | CI | 2 | Not started | 0 | — |
| 10 | Atomic Deploy Script | Backend | 3 | Not started | 0 | — |
| 11 | Migration Sidecar (optional) | Infra | 3 | Not started | 0 | — |
| 12 | Docs + E2E Verification | Either | 4 | Not started | 0 | — |

## Accumulated Context (carried from v1.1)

### v1.1 Final Status

| Phase | Status | Plans | Verified |
|-------|--------|-------|----------|
| 1: Bug Fixes Wave 1 | Completed | 1 | Yes |
| 2: Quick Features & Validations | Completed | — | — |
| 3: Architecture Shifts | Completed | 4 | — |
| 4: Polish & Walk-in Redesign | **Parked** — picked up in future milestone | — | — |

### Validated Capabilities (do not re-research)

- TG Clinic React + Express stack deployed at https://nk.2checkin.com
- Docker Compose stack at /opt/tgroup on VPS root@76.13.16.68
- 9 services in docker-compose.yml: db, api, face-service, compreface-postgres-db, compreface-api, compreface-core, web (+ shared volumes)
- Two Postgres instances: Homebrew @ :5433 (local dev), Docker @ :55433 (parity testing), prod @ tgroup-db
- GitHub Actions CI exists (.github/workflows/ci.yml) — runs lint/typecheck/build/E2E but does NOT push images
- Multi-branch employee assignment, two-tier customer delete, dotkham allocations all validated in v1.1

### Known Constraints (entering v2.0)

- VPS deploys today: ssh + git pull + `docker compose up -d --build api web` (3–8 min on VPS, blocking)
- No registry account configured; no `image:` tags in compose, only `build:`
- Dockerfile.web uses `npm install --legacy-peer-deps`, ships Playwright in image (Dockerfile.web:5)
- Dockerfile.api copies contracts but never builds them inside the image (Dockerfile.api:3-7)
- face-service downloads ONNX models via wget at build time (face-service/Dockerfile:15-19)
- nginx.conf and nginx.docker.conf differ in ways that can mask local/prod parity bugs

### Decisions Carried Forward from v1.1

- Use pool.connect() with explicit BEGIN/COMMIT/ROLLBACK for transactional scope updates
- Exclude primary companyid from junction inserts to maintain a single source of truth
- Hard delete is gated behind permissions and runs FK-safe counts
- Demo DB schema uses VIEWs for some tables (dotkhams) — FK constraints not always possible

### v2.0 Design Decisions Locked

- Auto-rollback on healthcheck failure (60s window)
- Migration sidecar optional (Phase 11); v2.0 keeps manual `docker exec` pattern
- GHCR images private (PAT-authenticated VPS pulls)
- 2 parallel teams (Backend + Infra) in Wave 1; 4 waves total

## Roadmap Summary

**8 Phases, 36 Requirements Mapped:**

- Phase 5–6: Backend observability + graceful shutdown (Wave 1, parallel with Infra)
- Phase 7–8: Infra image rewrites + compose refactor (Wave 1, parallel with Backend)
- Phase 9: CI GitHub Actions → GHCR push (Wave 2, sequential after Phase 7–8 merged)
- Phase 10–11: Deploy script + optional migrations (Wave 3, Backend + Infra parallel)
- Phase 12: Docs + E2E verification <3 min (Wave 4, integration)

**Coverage:** 36/36 requirements mapped (100%)

**Team Structure:**
- Backend: Phase 5, 6, 10 (health, graceful shutdown, deploy script)
- Infra: Phase 7, 8, 11 (Dockerfiles, compose, optional migrations)
- CI: Phase 9 (GitHub Actions workflow)
- Either: Phase 12 (documentation)

## Reports

- **Roadmap:** `.planning/ROADMAP.md` created with full phase details, success criteria, test isolation commands
- **Pitfalls:** 14 deployment pitfalls researched and mapped to phases (see `research/PITFALLS.md`)
- **Requirements:** 36 requirements defined and mapped (see `.planning/REQUIREMENTS.md`)

## Session Notes

- **Session date:** 2026-05-10
- **Artifact:** ROADMAP.md with 8 phases (Phase 5–12, continuing from v1.1's Phase 4)
- **Next:** User approval → `/gsd-plan-phase 5` (Backend health endpoints)
- **Wave 1 parallelization:** Backend (Phase 5–6) and Infra (Phase 7–8) fully independent, no blocking dependencies
