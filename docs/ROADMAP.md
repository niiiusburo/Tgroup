# TGroup Clinic — Roadmap

> Phases, scope per phase, inter-phase dependencies, current phase marker.

## Legend

- `[====]` — Completed
- `[>...]` — In Progress (current phase)
- `[....]` — Not Started
- `→` — Dependency (must complete before next phase starts)

---

## Phase 1: Foundation & Migration (Completed)
**Timeline:** 2025-07 — 2025-12

- `[====]` React 18 + Vite 5 frontend rewrite
- `[====]` Express 5 API with raw pg queries
- `[====]` TDental CSV data import and normalization
- `[====]` PostgreSQL schema migration system (manual SQL)
- `[====]` JWT authentication
- `[====]` Docker Compose local dev environment
- `[====]` VPS deployment pipeline (`scripts/deploy-tbot.sh`)

**Deliverables:** Working clinic dashboard with customers, appointments, services, and payments.
**Stabilization:** 2025-12

---

## Phase 2: Core Operations & RBAC (Completed)
**Timeline:** 2026-01 — 2026-03

- `[====]` Permission tier system (`permission_groups`, `partners.tier_id`)
- `[====]` Payment allocation engine (`payment_allocations`)
- `[====]` Deposit wallet and receipt generation
- `[====]` Monthly installment plans
- `[====]` Face recognition integration (local OpenCV + Compreface fallback)
- `[====]` External checkups (Hosoonline proxy)
- `[====]` i18n (English + Vietnamese)

**Deliverables:** Secure multi-role access, flexible payments, face check-in, health-checkup images.
**Stabilization:** 2026-03

---

## Phase 3: Reporting & Quality (In Progress)
**Timeline:** 2026-03 — 2026-06 (Current)

- `[====]` Revenue reports and Excel exports
- `[====]` Cash flow aggregation
- `[====]` Employee revenue export with location scope
- `[>...]` Report accuracy validation (automated tests vs legacy Odoo)
- `[>...]` Permission system hardening (INC-20260506-01, override edge cases)
- `[>...]` Frontend performance (bundle size, render optimization)
- `[....]` Commission module auto-calculation trigger
- `[....]` Advanced analytics (trending, forecasting)

**Deliverables:** Reliable financial reporting, hardened permissions, faster UI.
**Blockers:**
- Commission auto-calculation trigger is unknown (`product-map/unknowns.md` #12).
- Report SQL accuracy needs manual validation against legacy system.

---

## Phase 4: Enterprise Architecture & Scale (Planned)
**Timeline:** 2026-06 — 2026-09

- `[....]` Expand enterprise domain routes (v2 API for all domains)
- `[....]` Backend location scope enforcement (replace frontend-only filter)
- `[....]` Database query optimization (indexes, materialized views for reports)
- `[....]` Centralized audit logging (unified table for all mutations)
- `[....]` API rate limiting and throttling (beyond login)
- `[....]` Automated migration runner (idempotent, tracked)

**Dependencies:** Phase 3 must be stabilized before starting v2 route migration.
**Deliverables:** Clean architecture API, enforced multi-location security, faster reports, audit trail.

---

## Phase 5: Integrations & Mobility (Planned)
**Timeline:** 2026-09 — 2026-12

- `[....]` Mobile-optimized PWA or native app wrapper
- `[....]` SMS/WhatsApp appointment reminders
- `[....]` ZaloPay / MoMo full integration (currently schema-only)
- `[....]` e-Invoice downstream integration (unknown consumer)
- `[....]` Inventory and lab order management (Odoo sync)
- `[....]` Customer portal (online booking, payment history)

**Dependencies:** Phase 4 API stability.
**Deliverables:** Patient self-service, richer integrations, mobile-first workflows.

---

## Phase 6: Intelligence & Automation (Future)
**Timeline:** 2027+

- `[....]` AI-assisted scheduling (predict no-shows, optimize doctor load)
- `[....]` Automated commission calculation and payroll sync
- `[....]` Predictive inventory and supply ordering
- `[....]` Voice-assisted check-in and data entry

**Dependencies:** Clean data pipeline from Phases 3–5.
**Deliverables:** Operational intelligence, reduced manual work.

---

## Current Phase Marker

> **We are in Phase 3: Reporting & Quality.**
> Priority order:
> 1. Fix permission system edge cases (INC-20260506-01).
> 2. Add backend tests for payment allocation, void, refund.
> 3. Validate report SQL accuracy against legacy Odoo.
> 4. Complete documentation stack (this deliverable).
> 5. Optimize frontend bundle and calendar render performance.

## Inter-Phase Dependencies

```
Phase 1 (Foundation)
    → Phase 2 (Core Ops)
        → Phase 3 (Reporting) ← YOU ARE HERE
            → Phase 4 (Enterprise)
                → Phase 5 (Integrations)
                    → Phase 6 (Intelligence)
```

**Critical path:** Phase 3 must resolve commission unknown and report accuracy before Phase 4 starts. Starting Phase 4 with unresolved unknowns will compound technical debt.
