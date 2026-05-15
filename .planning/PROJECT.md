# TG Clinic KOL Integration

## What This Is

Integrate KOL project features (facial recognition + Vietnamese QR payments) into the existing TG Clinic dashboard.

## Core Value

Enable faster patient check-in via face recognition and frictionless payments via VietQR — reducing receptionist workload and improving patient experience.

## Target Users

- Receptionists (primary — enroll faces, generate QR codes)
- Clinic managers (configure bank accounts, view enrolled patients)
- Patients (pay via QR, faster check-in)

## Key Constraints

- Must integrate with existing TG Clinic React + Express stack
- TDD approach required — tests before implementation
- Demo DB on port 55433 — must add migrations carefully
- Face-api.js models are large (~20MB) — lazy load only

## Requirements

### Validated

- ✓ TG Clinic dashboard deployed and operational (v0.4.15)
- ✓ Customer CRUD, appointments, payments connected to real DB
- ✓ KOL project has proven face recognition (@vladmandic/face-api) and VietQR implementation
- ✓ Multi-branch employee assignment (REQ-12) — Validated in Phase 3
- ✓ Two-tier customer delete with permission gating (REQ-06) — Validated in Phase 3
- ✓ Dotkham payment allocations via tabbed UI (REQ-15) — Validated in Phase 3

### Active

- [ ] VietQR payment generation in PaymentForm and DepositWallet
- [ ] Clinic bank account configuration in Settings
- [ ] Face enrollment during customer registration
- [ ] Face identity verification in CustomerProfile
- [ ] Face-enrolled indicator in customer list
- [ ] Payment proof upload for QR transactions

### Out of Scope

- Real-time commission tracking from KOL — not needed for clinic operations
- KOL referral network logic — irrelevant to dental clinic workflow
- Mobile app integration — web dashboard only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with VietQR (Phase 1) | Lower complexity, no ML models, faster win | Completed |
| Use @vladmandic/face-api (same as KOL) | Proven working in KOL, client-side only | Deferred to Phase 4 |
| Reuse KOL components where possible | Reduces risk, maintains consistency | Completed |

## Current State

- Phase 3 (Architecture Shifts) complete — v0.4.15 shipped with multi-branch employees, two-tier customer delete, and dotkham payment allocations.
- Phase 4 (Polish & Walk-in Redesign) **parked** — to be picked up in a future milestone.
- Milestone v2.0 (Deploy Speed Refactor) started 2026-05-10.

## Current Milestone: v2.0 Deploy Speed Refactor

**Goal:** Cut "code fix → live in production" cycle from 8–15 min to under 3 min via prebuilt Docker images, GHCR registry, and atomic VPS swap, while making local development a true mirror of production.

**Target features:**
- Multi-stage Dockerfile rewrites with BuildKit cache mounts (api, web, face-service)
- GitHub Actions workflow that builds and pushes images to GHCR on every push to main
- docker-compose.yml refactored to pull tagged images from GHCR instead of building from source
- One-command local prod-parity stack (`docker compose -f docker-compose.dev.yml up`)
- Atomic deploy script `scripts/deploy.sh` with healthcheck-gated swap and auto-rollback
- Updated `docs/runbooks/DEPLOYMENT.md` reflecting the new flow

**Key constraints (this milestone):**
- Pure infrastructure / DX work — no user-facing feature changes
- Every phase must be independently testable (no phase blocks the previous from being merged)
- VPS at root@76.13.16.68 with single-node Docker Compose stack — no Kubernetes
- Must preserve existing nginx/SSL setup and Postgres data volumes
- Registry: GHCR under `niiiusburo/Tgroup` namespace (free for public/private repos)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-10*
