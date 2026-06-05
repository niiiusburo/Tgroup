# COORDINATION_REQUESTS.md

> Cross-domain and cross-role coordination log. Use this when one owner needs
> another owner to make or approve a change before implementation proceeds.

## How To Use

Add one row per request. Keep the request concrete and update the status instead of duplicating rows.

| Date | From | To | Need | Status |
|---|---|---|---|---|
| 2026-05-02 | Architecture | All agents | Use this file for cross-domain blockers instead of leaving them only in chat. | OPEN |
| 2026-05-06 | Integrations | QA + Release | Verify the new Hosoonline patient creation proxy against live v2 `/api/patients/_create` and `_search` with a disposable patient before deploy. | IN PROGRESS |
| 2026-05-20 | QA/Verification | Reports + Payments + Appointments + Customers + Feedback | Fix and verify 2026-05-19 live NK feedback bugs: revenue/deposit exports, calendar export date shift, and appointment clinic/location persistence. Keep production read-only until staging proof exists. | OPEN |
| 2026-06-02 | Frontend + Backend | QA/Verification | Verify `/welcome` public no-login CTV booking against valid/invalid CTV phones and confirm the write remains appointment-only. | RESOLVED |
| 2026-06-02 | Frontend + Backend | QA/Verification | Verify `/welcome` public CTV signup routes to `/ctv/join`, requires an actual upline CTV phone when no referral link is present, and creates the new CTV under that upline only. | RESOLVED |
| 2026-06-02 | Frontend + Backend | QA/Verification | Verify both public CTV phone fields live-check `/api/ctv-public/ctv-lookup` while typing and block submit when the CTV phone is not in the system. | RESOLVED |

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
