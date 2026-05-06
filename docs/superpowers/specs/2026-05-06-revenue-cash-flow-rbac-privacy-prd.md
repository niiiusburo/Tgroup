# 2026-05-06 Revenue, Cash Flow, and Privacy-Scoped Access PRD

> Source: Plaud shared note checked on 2026-05-06.
> Status: Intake / not implementation approval.
> Domains: Payments & Deposits, Reports & Analytics, Auth & Permissions, Integrations, Data Migration.

## Recap

The meeting separates accounting revenue from operational cash flow and flags full-admin fallback as a privacy risk. It also creates a May 2026 follow-up stream for report gaps, online form upload/submission errors, and two remaining file-processing items.

## Source Link

- Plaud note: https://web.plaud.ai/s/pub_c2063114-dc04-4eeb-a43e-09ae55950814::W5ARnvEfNp4_csiL81YcHsieV9VF1cgD7o76pYyygKrZis2CuJnG8_RW8DawhVHNwPSx_9SgftvgdpcC

## What This Adds

- Revenue recognition must not treat every collected payment as revenue by default.
- Cash flow must stay separate from revenue and represent money moving in or out, including deposits, partial payments, refunds, and voucher cancellations.
- Revenue and expenditure reports need additional report capabilities before they can answer the meeting questions.
- Staff should not rely on broad admin access for routine work because it exposes private information.
- Online application/form upload and submission errors need a technical owner and route-level reproduction.
- Two remaining files should be processed within May 2026 after source shape and target behavior are confirmed.
- Non-urgent report/list items may need color highlighting so operators can prioritize work quickly.

## Product Surfaces

- Revenue Report: existing reporting area such as `/reports` or `/reports/revenue`.
- Cash Flow Report: likely reporting/payment analytics surface; exact URL is not approved yet.
- Payment Page and Customer Records: existing money surfaces such as `/payment` and customer profile records.
- Permission Board and Employee Access: existing permission/admin surfaces such as `/permissions`.
- Online Form Upload/Submission: integration or public-form surface; exact route is not confirmed by the Plaud note.
- File Processing: migration/import operational workflow for the two remaining files.

## Working Decisions Captured

- Certain payments cannot be counted as revenue without a clearer accounting rule.
- Temporary full-admin access may continue as an operational fallback, but it is not the target access model.
- Report changes must account for cash movement and revenue recognition separately.

## Open Questions

- Which payment types, statuses, services, or accounting events are excluded from revenue?
- Who owns final accounting confirmation for revenue rules, and how should that approval be represented in the app?
- Should report dates follow payment date, service date, deposit date, refund date, voucher cancellation date, or a configurable basis?
- Which users need privacy-scoped access instead of full admin, and which pages/actions must be visible or blocked?
- Is the online application/form issue part of Hosoonline, another external integration, or a local TGClinic form?
- What are the two remaining files, what source system created them, and what validation proves they were processed correctly?
- What does "non-urgent" mean for color highlighting, and who can change that priority?

## Authority Checks Before Implementation

- Read `product-map/domains/payments-deposits.yaml` before changing payment, deposit, allocation, refund, residual, or customer-balance behavior.
- Read `product-map/domains/reports-analytics.yaml` before changing reports, exports, report filters, or report totals.
- Read `product-map/domains/auth.yaml` before changing roles, permission strings, employee access, or admin visibility.
- Read `product-map/schema-map.md` before touching `payments`, `payment_allocations`, sale-order rows, permission tables, or file-import staging data.
- Read `product-map/contracts/dependency-rules.yaml` for permission, API, report, export, schema, and integration checklists.
- Check `product-map/unknowns.md` because payment allocation edge cases, report accuracy, upload behavior, and permission registry boundaries are still sensitive.
- Use `docs/runbooks/MONEY_FLOW.md` for money-flow verification requirements.

## Suggested Implementation Slices

1. Revenue Recognition Rules: define the accounting rule matrix and add report tests before changing totals.
2. Cash Flow Reporting: specify money-in/money-out categories, dates, filters, and export expectations.
3. Privacy-Scoped Access: replace routine full-admin usage with explicit allowed/forbidden role tests.
4. Online Form Blocker: reproduce upload/submission failure locally, identify route ownership, then fix in the owning integration/form layer.
5. May 2026 File Processing: document source files, dry-run validation, anomaly notes, and post-import proof.

## Verification Targets

- Unit/API coverage for revenue totals, cash-flow totals, refunds, deposits, partial payments, and voucher cancellations.
- Permission tests proving allowed and forbidden access for admin, manager/read-only staff, and any accounting role.
- Browser checks for `/reports`, `/payment`, `/permissions`, and the affected online form route once confirmed.
- Named customer/payment validation when money data changes.
- Export verification if report or cash-flow exports are changed.

