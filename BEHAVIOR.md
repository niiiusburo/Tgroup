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
- Search bars must be accent-insensitive across the project. Staff typing `Nguyen`, `Thoai`, `Duong`, or `Quyen` must match records such as `NGUYỄN`, `THOẠI`, `DƯƠNG`, or `Quyền`.

## 3. Auth And Permissions

- Frontend route guards and backend `requirePermission()` checks must stay aligned.
- Admin users can edit/create/delete according to granted permissions.
- Manager-like roles may view admin surfaces only when permission rules allow it; mutation still requires explicit edit/create/delete permissions.
- 401 means the session is invalid or expired; return the user to login or trigger re-auth.
- 403 means the user is authenticated but not allowed; show a permission-specific denial rather than a generic failure.
- **Cosmetic LOB v2:** New `S_LOB_FORBIDDEN` error envelope for LOB scope violations (dental user hits /cosmetic/* or CTV hits admin). See governance-delta.md and BEHAVIOR updates in v2 spec. CTV users see hard redirect to /ctv instead of admin 403s.
- **Cosmetic LOB selector:** Only Admin permission-group users can select between Dental and Cosmetic. Non-admin staff are pinned to one LOB from their scoped auth payload and must not see the header LOB dropdown, even if a stale database row contains multiple LOB values.
- **CTV referral claim and commission authority:** Detailed CTV ownership, six-month timer, service-card commission trigger, tier config, paid-out lock, signup, hierarchy, payout, and deposit-wallet rules live in `docs/business-logic/ctv-referral-commission.md`. Current target behavior is LOB-local claim locking: a client actively claimed by a different CTV in the same LOB is blocked; Dental claims do not block Cosmetic claims and Cosmetic claims do not block Dental claims. `POST /api/ctv/bookings` creates/reclaims the client and writes an appointment only; it must not create a saleorder/service card or commission. If the CTV does not pick a service, the appointment uses the configured Referral Start product as `appointments.productid`. A commissionable CTV earning is created when staff creates a service card with an attached CTV, calculated from the full service price immediately, using CTV tier config rather than product-level `commission_rate_percent`.
- **CTV portal header motion:** `/ctv` uses a compact orange pill header with primary CTV actions grouped inside a smaller pill menu. The header hides on downward scroll to free mobile viewport space, returns on upward scroll or focus, and must remain fully available when reduced-motion preferences are active.
- **CTV self account settings:** The `/ctv` Tôi tab lets an authenticated CTV change only their own display name and password. Name save refreshes the visible portal profile immediately; password change requires current password, new password, and confirmation before the API writes a new bcrypt hash.
- **Public CTV booking:** The public `/welcome` landing page may open the CTV refer-client sheet without login. In that mode the customer phone field appears before name, the sheet shows "Type in the phone number to verify first.", an available existing customer name may be populated after phone lookup, and the submit requires the CTV phone number so the backend can attribute the appointment. The CTV phone field must verify live while typing and block submit until the phone resolves to an active CTV in the system.
- **Public CTV signup:** The public `/welcome` `Đăng Ký CTV` CTA loads `/ctv/join` without requiring login or a referral-code link. If a referral code or upline CTV phone is entered, the new CTV is attached under that upline; if no upline is entered, signup creates an active root/top-level CTV. Phone and password are required, email is optional, and the signup UI must make optional email clear with field-level notice/progress treatment. Duplicate signup blocks only when phone/email already belongs to another CTV; an existing customer signing up as CTV creates a separate CTV partner row instead of converting the customer row.

## 4. Forms

- Preserve saved values even when option lists are filtered to active records. Existing inactive migrated employees/customers must still hydrate selected values.
- Validate before submit and keep errors next to the field.
- For edit forms, prefill from canonical backend records, not display-only derived text.
- For customer and treatment records, IDs from migration should remain searchable and visible where staff use them operationally.
- Date pickers inside sheets, modals, and scrollable forms must use the app's in-flow picker treatment instead of native mobile `type=date` popups or absolute overlays that cover later fields, footers, or action buttons.
- Mobile dialogs and bottom sheets must keep their close button in a non-scrolling header and keep submit/apply/cancel actions reachable through either a fixed footer or the internal scroll body. The page behind the dialog must not be the only way to reach hidden modal controls.
- Floating helpers such as the feedback login hint must not render over active modal, dialog, or date-picker workflows.

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

## 8. Text Overflow And Truncation

Any user-visible text that can exceed its container width must be handled consistently:

- **Default to truncation** with CSS `line-clamp` (1–3 lines depending on cell density).
- **Overflow detection** must be runtime-measured (`scrollHeight > clientHeight`); do not assume overflow based on character count.
- **Hover tooltip** must reveal the full text when truncation is active.
- **Expand/collapse button** must appear when overflow is detected, allowing staff to toggle the full text inline.
- **Table cells** must use `TruncatedCell` (or equivalent) so expand-toggle clicks do not trigger row-selection or navigation.
- **Never use browser-native `title` alone** as the primary overflow remedy; it is slow, unstyled, and inaccessible.

Surfaces that must apply this rule include, but are not limited to:
- DataTable columns: employee names, roles, location lists, customer emails, service names, feedback previews.
- Calendar cards: customer names, service names, dentist names.
- Payment and deposit history: notes, method descriptions.
- Settings panels: permission group descriptions, SEO titles/descriptions.

Component reference: `website/src/components/shared/ExpandableText.tsx`.

## 9. Localization

- New user-visible text needs English and Vietnamese keys.
- Do not mix hardcoded English labels into Vietnamese operational pages unless the product decision is explicit.
- Preserve clinic terms staff already use, including customer codes, appointment refs, treatment/service refs, and payment language.
