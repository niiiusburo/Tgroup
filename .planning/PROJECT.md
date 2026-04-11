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
- Phase 4 (Polish & Walk-in Redesign) is next.

---
*Last updated: 2026-04-11*
