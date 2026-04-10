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

- ✓ TG Clinic dashboard deployed and operational (v0.4.9)
- ✓ Customer CRUD, appointments, payments connected to real DB
- ✓ KOL project has proven face recognition (@vladmandic/face-api) and VietQR implementation

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
| Start with VietQR (Phase 1) | Lower complexity, no ML models, faster win | — Pending |
| Use @vladmandic/face-api (same as KOL) | Proven working in KOL, client-side only | — Pending |
| Reuse KOL components where possible | Reduces risk, maintains consistency | — Pending |

---
*Last updated: 2026-04-10*
