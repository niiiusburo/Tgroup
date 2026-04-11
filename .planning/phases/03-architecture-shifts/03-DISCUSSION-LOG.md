# Phase 3: Architecture Shifts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 03-architecture-shifts
**Areas discussed:** Multi-Branch Assignment, Customer Delete, Payment Allocation

---

## Multi-Branch Assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Location checkboxes inside EmployeeForm | Show all branches as checkboxes directly | |
| Dual selectors: Primary + Additional | Keep LocationSelector for primary, add multi-select for extras | ✓ |
| You decide | Claude chooses simplest implementation | |

**User's choice:** Dual selectors: Primary branch + Additional branches
**Notes:** User wants existing LocationSelector to remain for primary `companyid`, and a separate multi-select for secondary branches via `employee_location_scope`. Global top location filter stays unchanged.

---

## Customer Delete

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete only | Mark `isdeleted=true`, hide from lists | |
| Hard delete with pre-check | Actually DELETE if zero linked records | |
| Two-tier delete | Soft delete for standard users, hard delete admin-only | ✓ |

**User's choice:** Two-tier delete — soft delete + hard delete (admin-only, permission-gated)
**Notes:** User explicitly requested both options in the UI. Hard delete restricted to admin via permissions. Confirmation dialog should warn about linked records.

---

## Payment Allocation Targets

| Option | Description | Selected |
|--------|-------------|----------|
| Replace invoices with dotkhams | Show only dotkhams in allocation | |
| Keep both tabs | Toggle/tabs for dotkhams AND saleorders | ✓ |
| Dotkhams only, invoices read-only | Use dotkhams for allocation, show invoices for context | |

**User's choice:** Keep both tabs
**Notes:** PaymentForm should support allocating to both examination vouchers (`dotkhams`) and existing invoices (`saleorders`).

---

## Deferred Ideas

- Full patient finance redesign (4-tab Overview/Invoices/Plans/Payments) — deferred to future phase

---

## Claude's Discretion

- Specific styling for the additional-branches multi-select
- Whether to use `target_type` polymorphism or separate allocation tables for dotkhams vs saleorders
- Exact confirmation dialog copy
