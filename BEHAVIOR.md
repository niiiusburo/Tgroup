# BEHAVIOR.md

> Product and interaction behavior authority for TGClinic. This file governs
> how the app should behave for users before implementation details are chosen.

## 1. Source Of Truth

- `BEHAVIOR.md`: interaction behavior, forms, loading, error states, confirmations, permission feedback.
- `product-map/domains/*.yaml`: domain ownership and data/API surfaces.
- `product-map/unknowns.md`: unresolved behavior or integration questions.
- `website/design.md`: visual treatment of behavior states.

If behavior is accepted as product truth, promote it here or to a domain runbook. Do not leave it only in chat, a test, or local component logic.

## 2. General Interaction Rules

- Prefer direct operational workflows over explanatory landing pages.
- Loading states should tell staff what is being loaded when the wait is noticeable.
- Empty states must distinguish "no records exist" from "data failed to load" and "you do not have permission".
- Disabled controls must expose why they are disabled through nearby copy, tooltip, or state text.
- Destructive actions require confirmation and should preserve enough context for staff to know what will be removed.
- After successful writes, the visible surface must refresh immediately. Do not require a manual reload for normal staff workflows.

## 3. Auth And Permissions

- Frontend route guards and backend `requirePermission()` checks must stay aligned.
- Admin users can edit/create/delete according to granted permissions.
- Manager-like roles may view admin surfaces only when permission rules allow it; mutation still requires explicit edit/create/delete permissions.
- 401 means the session is invalid or expired; return the user to login or trigger re-auth.
- 403 means the user is authenticated but not allowed; show a permission-specific denial rather than a generic failure.

## 4. Forms

- Preserve saved values even when option lists are filtered to active records. Existing inactive migrated employees/customers must still hydrate selected values.
- Validate before submit and keep errors next to the field.
- For edit forms, prefill from canonical backend records, not display-only derived text.
- For customer and treatment records, IDs from migration should remain searchable and visible where staff use them operationally.

## 5. Dense Lists

- Appointments, services, payments, notifications, reports, and similar repeated rows must use a bounded internal scroll region when row counts can grow.
- Keep headers, filters, and primary actions visible.
- Use `min-h-0` on flex/grid parents when needed so scroll bodies can shrink correctly.

## 6. Exports

- Operational Excel exports should use the current page/filter meaning, not raw database table dumps.
- Preview row counts/filter summaries before long-running downloads when possible.
- Large exports need backend, nginx, and browser timeout behavior verified before production release.

## 7. External Integrations

- Hosoonline health-checkup image reads must be proxied through TGClinic because direct image URLs require Hosoonline session auth.
- Staff-facing integration errors should say what action failed and whether the issue is credentials, customer match, network, or upstream data.
- Compreface is optional for core app startup; face-recognition failures must not block unrelated customer workflows.

## 8. Localization

- New user-visible text needs English and Vietnamese keys.
- Do not mix hardcoded English labels into Vietnamese operational pages unless the product decision is explicit.
- Preserve clinic terms staff already use, including customer codes, appointment refs, treatment/service refs, and payment language.
