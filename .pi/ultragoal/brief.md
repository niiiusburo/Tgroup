# Ultragoal Brief: Permission Domain Repair

**Source:** `docs/superpowers/specs/2026-05-14-permission-domain-repair-design.md`  
**Approved:** 2026-05-14 (8 decision cards confirmed)  
**Station:** `/Users/thuanle/Documents/TamTMV/Tgrouptest` on `main`  

## Problem
Registry drift between docs, backend guards, frontend matrix, tests, and product rules. Five audit teams found mismatches in permission strings, route guards, and token lifetimes.

## Success Criteria
1. One canonical registry (`permission-registry.yaml`) drives backend, frontend, and tests.
2. No label-derived fake permissions in the matrix.
3. `/services` gated by `services.view`, not `customers.edit`.
4. `external_checkups.create` and `external_checkups.upload` are separate gates.
5. Payment proof upload = `payment.add`; record patch = `payment.edit`.
6. Admin cannot accidentally self-lockout from `permissions.edit`.
7. Remember Me token = 60 days (matches UI promise).
8. A parity test fails CI if new permission strings drift from the registry.

## Non-Goals
- New permission concepts like `saleorders.edit` or `ipaccess.view` (noted for follow-up).
- Auth middleware architecture refactor.
- Tier/override data model changes.
