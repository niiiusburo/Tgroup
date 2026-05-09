# COORDINATION_REQUESTS.md

> Cross-domain and cross-role coordination log. Use this when one owner needs
> another owner to make or approve a change before implementation proceeds.

## How To Use

Add one row per request. Keep the request concrete and update the status instead of duplicating rows.

| Date | From | To | Need | Status |
|---|---|---|---|---|
| 2026-05-02 | Architecture | All agents | Use this file for cross-domain blockers instead of leaving them only in chat. | OPEN |
| 2026-05-06 | Integrations | QA + Release | Verify the new Hosoonline patient creation proxy against live v2 `/api/patients/_create` and `_search` with a disposable patient before deploy. | IN PROGRESS |
| 2026-05-09 | Integrations + Auth | Release | Repair Hosoonline split-permission enforcement and verify live grants for `external_checkups.create` and `external_checkups.upload`. | RESOLVED |
| 2026-05-09 | Reports | Payments + QA | Add read-only legacy flat revenue/deposit Excel exports from payment allocation and deposit data; no payment write routes, migrations, or allocation mutation included. | RESOLVED |

## Status Values

- `OPEN`: needs action or decision.
- `IN PROGRESS`: owner is working on it.
- `BLOCKED`: cannot move until another dependency changes.
- `RESOLVED`: action is complete.
- `REJECTED`: owner declined the request with rationale.

## Coordination Triggers

Create or update a row when work touches:

- Multiple `product-map/domains/*.yaml` files.
- Shared schema or high-blast-radius tables.
- Permission strings, JWT payloads, or auth middleware.
- Deployment, Docker, nginx, env vars, or VPS scripts.
- External integrations such as Hosoonline or Compreface.
- Money/payment allocation, deposits, refunds, receipts, or residuals.
- Any item listed in `product-map/unknowns.md`.
