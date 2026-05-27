# TG Clinic KOL Integration

## Current Milestone: v1.2 CTVlegacy Port

**Goal:** Port CTVlegacy's signup → approval → per-LOB commission tier config → CSKH commission type → Gemini OCR into Tgrouptest, keeping existing `commissionEngine.js` and `/api/ctv` portal intact.

**Target features:**
- Public CTV signup with signature pad, referrer phone lookup, versioned terms (vi/en), optional Gemini Vision OCR (gated by `GEMINI_API_KEY`)
- Admin approval queue creating partners with `is_ctv=true` in chosen LOB(s)
- Per-LOB admin editor for commission tiers L0–L4 (rate, custom label, active toggle); dental ≠ cosmetic
- `earnings.commission_type` (direct vs cskh) + CSKH branching in `commissionEngine.js` for cosmetic follow-up visits
- Dual-format password verify (legacy plain SHA256 ↔ new salted) so existing CTVlegacy logins survive
- Five additive migrations: `048_commission_tiers`, `049_ctv_registrations`, `050_signup_terms`, `051_partners_signature_image`, `052_earnings_commission_type_and_level` — applied to both `tdental_demo` and `tcosmetic_demo`

**Out of scope (explicit):**
- Marketing scrollytelling landing page (CTVlegacy `App.tsx`)
- Google Sheets sync worker, Redis cache
- Two-config-table footgun — use single canonical `commission_tiers`
- Flask sessions, `activity_logs` audit (deferred)
- Re-porting `commissionEngine.js`, `/api/ctv` routes, CTV portal page, hierarchy panel — already wired

## What This Is

Integrate KOL project features (facial recognition + Vietnamese QR payments) into the existing TG Clinic dashboard. As of v1.2, also brings CTVlegacy collaborator-referral features into the cosmetic and dental LOBs.

## Core Value

Enable faster patient check-in via face recognition and frictionless payments via VietQR — reducing receptionist workload and improving patient experience. CTV (Cộng tác viên) onboarding and per-LOB commission management expand the network without manual admin DB edits.

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
- [ ] **v1.2** Per-LOB commission tier admin editor (L0–L4, custom labels, active toggle)
- [ ] **v1.2** Public CTV signup form with signature pad + referrer phone lookup
- [ ] **v1.2** Versioned signup terms (vi/en) with admin editor
- [ ] **v1.2** Admin approval queue for `ctv_registrations`
- [ ] **v1.2** `earnings.commission_type` direct/cskh + CSKH commissionEngine branch
- [ ] **v1.2** Gemini Vision OCR for ID-card scan at signup (env-gated)
- [ ] **v1.2** Dual-format password verify (legacy + salted)

### Out of Scope

- Real-time commission tracking from KOL — not needed for clinic operations
- ~~KOL referral network logic — irrelevant to dental clinic workflow~~ Superseded in v1.2 by CTVlegacy port (collaborator referrals)
- Mobile app integration — web dashboard only
- CTVlegacy marketing scrollytelling landing page — not part of operator surface
- CTVlegacy Google Sheets sync worker — Tgrouptest DB is system of record
- CTVlegacy Redis cache layer — premature optimization
- CTVlegacy `activity_logs` table — deferred to a later milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with VietQR (Phase 1) | Lower complexity, no ML models, faster win | Completed |
| Use @vladmandic/face-api (same as KOL) | Proven working in KOL, client-side only | Deferred to Phase 4 |
| Reuse KOL components where possible | Reduces risk, maintains consistency | Completed |

## Current State

- v1.1: Phase 3 (Architecture Shifts) complete — v0.4.15 shipped with multi-branch employees, two-tier customer delete, and dotkham payment allocations. Phase 4 (Polish & Walk-in Redesign) deferred and runs in parallel with v1.2 when prioritized.
- v1.2: CTVlegacy Port — defining requirements. Existing scaffolding on `fix/feedback-reports` (commissionEngine.js + /api/ctv portal + CTV dashboard page + i18n EN/VI) will be preserved; v1.2 only adds the new pieces above.

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
*Last updated: 2026-05-27*
