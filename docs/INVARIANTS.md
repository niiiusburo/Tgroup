# TGroup Clinic — Global Invariants

> Truths that must never break regardless of which module is edited. Each invariant has an ID so PRs can cite them.
> If your change violates an invariant, either abandon the change or supersede the invariant via an ADR with explicit approval.

## How to Use This File

- Every PR touching money, auth, data consistency, or contracts MUST cite the invariants it preserves or intentionally modifies.
- Invariant IDs are permanent. If an invariant is superseded, mark it `SUPERSEDED by ADR-NNNN` and append the new invariant with the next ID.
- Violations found in production become new invariants with IDs in the `INC` (Incident) series.

---

## Data & Schema Invariants

### INV-001 — Partners SMI Identity Uniqueness
**Rule:** `dbo.partners.id` (UUID) is the sole durable identity key for every person. `ref`, `phone`, and `email` are operational but not guaranteed unique. No code may assume phone or email is a unique lookup key.
**Rationale:** Real-world duplicates exist (families sharing phones, migrated refs colliding).
**Enforced by:** Frontend selectors always pass `partnerId`; backend FKs use `partners.id`.
**Cite when:** Changing partner lookup, customer create/edit, or import logic.

### INV-002 — Appointment Name Auto-Generation
**Rule:** Appointment names follow the pattern `AP<6-digit-sequence>` and are generated exclusively by the backend. Frontend never writes `name`. The sequence is `MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)) + 1` per insert.
**Rationale:** Prevents collisions and ensures audit traceability.
**Enforced by:** `api/src/routes/appointments.js` CREATE path.
**Cite when:** Editing appointment creation, migration scripts, or sequence logic.

### INV-003 — Payment Residual Non-Negative
**Rule:** `saleorders.residual` must never be negative. Allocation logic must reject any payment that would drive residual below `0` (with `0.01` tolerance).
**Rationale:** Negative residuals imply the clinic owes the patient money on a closed invoice.
**Enforced by:** `validateAllocationResidual()` in `api/src/routes/payments/helpers.js` + `GREATEST(0, residual - amount)` SQL update.
**Cite when:** Changing payment allocation, refund, void, or import logic.

### INV-003A — Payment Delete/Void Must Reverse Earnings Attribution (NK3+)
**Rule:** DELETE /api/Payments/:id and POST /api/Payments/:id/void MUST produce symmetric negative reversal rows in dbo.earnings (via commissionEngine.reverseOnRefund) for every positive earnings row previously created for that payment. Net attribution for the payment becomes zero. Hard delete may remove the original payment row; the negative reversal rows remain for audit.
**Rationale:** The previous delete/void paths reversed residuals but left phantom positive earnings rows → phantom commissions in CTV downline, admin reports, and payouts. This was the root cause of "can't delete payments" + inflated downline numbers after deletes.
**Enforced by:** payments.js DELETE and /void handlers (inside tx, non-fatal hook) + commissionEngine.reverseOnRefund. Only on nk3-deploy and later (local 5433 NK3 demo DBs first).
**Cite when:** Editing payments delete/void, commissionEngine, or any earnings reversal path.

### INV-003B — Paid-Out CTV Commission Locks Reversal
**Rule:** A payment or service line tied to `dbo.earnings` rows where `status = 'paid'` or `payout_id IS NOT NULL` MUST NOT be voided, deleted, or auto-reversed. Service-line deletion may auto-void linked payments only when the deleted line is the last active line on the order, every affected payment is allocated solely to that order, and all related earnings are still unpaid/pending.
**Rationale:** There are two money events: the client paying the clinic creates pending CTV earnings, and the clinic paying the CTV locks that commission. Once the CTV payout/proof exists, reversing the client-side service/payment would corrupt the payout ledger.
**Enforced by:** `api/src/routes/payments.js` paid-out guards, `api/src/services/serviceReversal.js`, and `DELETE /api/SaleOrderLines/:id` requiring both `customers.edit` and `payment.void`.
**Cite when:** Editing service deletion, sale-order residuals, `payment_allocations`, payouts, earnings statuses, or CTV commission reversal logic.

### INV-003C — CTV Service Card Commission Trigger
**Rule:** CTV commission MUST be created when (and ONLY when) a service card with an explicitly attached CTV is created. If the create-service payload does not include `ctv_id`, the service MUST stay CTV-less (`saleorders.ctv_id` NULL) and MUST NOT create any earnings — even when the customer partner has an active `referred_by_ctv_id` (owner decision DEC-20260610-01; supersedes the previous create-time inheritance mandate). The commission base is the full service price immediately, not the paid amount or collected payment amount. CTV percentages MUST come from CTV tier config, not product-level `commission_rate_percent`. CTV booking remains appointment-only and MUST NOT create commission. The invariant "no CTV on the card ⇒ zero ACTIVE earnings" is watched nightly by `scripts/nk3-commission-audit.sh` (VPS cron, Telegram alert).
**Rationale:** NK3 CTV business logic pays CTVs when the client activates a service. Payment timing and deposits are customer-accounting events, not the CTV earning trigger.
**Enforced by:** `api/src/routes/saleOrders/createSaleOrder.js`, `api/src/services/commissionEngine.js`, `api/src/routes/saleOrders/__tests__/createSaleOrderReferralCtv.test.js`, and accepted business logic in `docs/business-logic/ctv-referral-commission.md`.
**Cite when:** Editing service creation, saleorderlines, CTV tier config, commissionEngine, CTV bookings, payout selection, or product/service commission fields.

### INV-004 — Deposit Category Heuristic Stability
**Rule:** If a payment has `method !== 'deposit'` and `method !== 'mixed'`, has no `service_id`, has no `deposit_used`, and has no allocations, it MUST be classified as `payment_category = 'deposit'` and `deposit_type = 'deposit'`.
**Rationale:** This heuristic is the primary way deposits are identified in the absence of explicit flags. Changing it retroactively reclassifies historical payments.
**Enforced by:** `api/src/routes/payments.js` POST handler.
**Cite when:** Changing payment create logic, `PaymentCreateSchema`, or deposit detection.

### INV-005 — Face Embedding Dimension Lock
**Rule:** When `FACE_RECOGNITION_PROVIDER=local`, face embeddings must remain 128-dimensional vectors (SFace model). Changing the model or dimension requires re-registering all locally stored faces.
**Rationale:** Mismatched dimensions break the distance calculation and recognition accuracy. CompreFace mode stores examples in CompreFace instead of TGClinic embedding rows.
**Enforced by:** `face-service` Python code (OpenCV SFace), `dbo.customer_face_embeddings` schema, and `FACE_RECOGNITION_PROVIDER` routing.
**Cite when:** Updating face-service dependencies, model weights, embedding storage, or the Face ID provider boundary.

### INV-006 — Search Accent-Insensitivity
**Rule:** Every user-facing search bar must match Vietnamese strings regardless of diacritics. Staff typing `Nguyen` must match `NGUYỄN`.
**Rationale:** Operational staff often type without accents on mobile or English keyboards.
**Enforced by:** Frontend `normalizeText()` helper; backend SQL using accent-stripped comparisons.
**Cite when:** Adding any new search field, filter, or picker.

### INV-015 — Sale Order Source IDs Are Persisted Active-LOB UUIDs
**Rule:** `saleorders.sourceid` may only be written as `null` or a persisted UUID from the currently active LOB's `dbo.customersources` rows. Display-only fallback IDs such as `src-1` must never be submitted as write values.
**Rationale:** Cosmetic and Dental source rows are isolated by database. Stale Dental or fallback source IDs can block Cosmetic service creation or misattribute source reporting.
**Enforced by:** `useCustomerSources()` active-LOB reload behavior, `ServiceSourceSelector`, and `nullableUuid()` normalization in `useServices`.
**Cite when:** Editing service creation/editing, customer-source settings, `SaleOrders` API clients, or source reporting.

### INV-021 — Accepted CTV Bookings Are Customer-Visible
**Rule:** When `POST /api/ctv/bookings` accepts an existing `dbo.partners` row as the referred client, that row MUST be marked `customer = true` in the selected LOB database before the appointment is created.
**Rationale:** The admin Customers page and `GET /api/Partners` intentionally filter to `customer = true`; a portal-accepted client must be searchable by admins without duplicating the partner identity.
**Enforced by:** `api/src/routes/ctv.js` booking reclaim path and `api/src/routes/__tests__/ctvBookings.test.js`.
**Cite when:** Editing CTV booking, partner phone lookup, referral claim, or admin customer search behavior.

### INV-022 — CTV Booking Is Appointment-Only
**Rule:** `POST /api/ctv/bookings` MUST create or reclaim the client and write `dbo.appointments` only. It MUST NOT create `dbo.saleorders` or `dbo.saleorderlines`; a selected service, or the configured Referral Start product when no service is selected, is metadata on `appointments.productid` until clinic staff convert the visit into an actual service card. The route must resolve a non-null `appointments.companyid` from request/JWT/selected-LOB fallback before mutating `dbo.partners`.
**Rationale:** A booking is a scheduled appointment, not proof that the client already visited or received treatment. Creating a service card at booking time corrupts journey stage, service history, and operational status.
**Enforced by:** `api/src/routes/ctv.js`, `api/src/services/ctvBookingCompany.js`, `api/src/routes/__tests__/ctvBookings.test.js`, and `api/src/services/referralClaim.js` using the booking appointment as a claim anchor.
**Cite when:** Editing CTV booking, referral claim windows, service-card creation, appointment creation, or CTV journey stage logic.

---

## Auth & Permission Invariants

### INV-007 — JWT Secret Runtime Requirement
**Rule:** The API process MUST exit with FATAL error if `JWT_SECRET` is missing at startup. It must not start in a degraded state.
**Rationale:** Starting without JWT_SECRET would allow token forgery or break all authenticated routes.
**Enforced by:** `api/src/server.js` top-level `if (!process.env.JWT_SECRET) { process.exit(1) }`.
**Cite when:** Changing startup logic, env validation, or container orchestration.

### INV-008 — Effective Permission Resolution Consistency
**Rule:** `api/src/middleware/auth.js` and `api/src/routes/auth.js` MUST use the SAME shared `resolveEffectivePermissions()` function from `api/src/services/permissionService.js`. No inline duplication of permission logic is permitted.
**Rationale:** Past duplication caused middleware to reject tokens that the login endpoint accepted.
**Enforced by:** Code review + `ARCHITECTURE.md` §6.
**Cite when:** Editing auth middleware, login, or permission resolution.

### INV-008A — Admin-Only LOB Selection
**Rule:** Only Admin permission-group users may receive/select multiple visible LOBs. Non-admin staff must be pinned to one scoped LOB in auth responses and `BusinessUnitContext`; localStorage or URL query state must not expand staff LOB access.
**Rationale:** Dental staff must not be able to switch into Cosmetic, and cosmetic staff should not be able to switch into Dental.
**Enforced by:** `api/src/routes/auth.js`, `/api/me/lob-scope`, `api/src/services/permissionService.js:isAdminPermissionState`, and `website/src/contexts/BusinessUnitContext.tsx`.
**Cite when:** Editing LOB selector, auth payloads, `lob_scope`, or admin/staff permission-group behavior.

### INV-008B — CTV Role Isolation
**Rule:** Authenticated users flagged as CTV by either `is_ctv === true` or legacy `isCtv === true` must be routed to `/ctv` before the admin app renders. Non-CTV users must not render the CTV portal.
**Rationale:** CTV self-service is separate from clinic admin operations, and older auth payloads may still carry the camelCase flag.
**Enforced by:** `website/src/App.tsx` route guards and `website/src/__tests__/ProtectedRoute.ctv.test.tsx`.
**Cite when:** Editing CTV auth payloads, `/ctv` route guards, login redirects, or admin route protection.

### INV-008C — CTV Login: Phone Lookup For All CTVs; Legacy Password Fallback Import-Marker Gated
**Rule:** The `/api/Auth/login` partner *lookup* resolves by email for any staff/admin/customer, and additionally by phone/ref-code for any active `is_ctv = true` partner (so CTVs created via admin "Add CTV" or public self-signup — phone + bcrypt password, **email optional** — can authenticate). The salted SHA-256 *legacy password* fallback, however, may run ONLY for rows where `is_ctv === true` and `created_via` starts with `legacy_ctv_import`, and a successful legacy-password login must immediately replace the stored hash with bcrypt. Every account — CTV included — still requires its correct bcrypt password; non-CTV accounts remain email-login-only.
**Rationale:** CTVs are created with phone + password and an *optional* email (AGENTS.md §5.1), so gating the phone/ref *lookup* to `legacy_ctv_import` made every admin/public-created CTV unable to log in (401), blocking the entire `/ctv` portal. Widening only the lookup keeps the auth boundary intact: bcrypt is still required for all (`bcrypt.compare` runs first for everyone), and legacy SHA-256 hash support stays restricted to imported rows via `canUseLegacyCtvPassword`.
**Enforced by:** `api/src/services/loginIdentifier.js`, `api/src/services/legacyCtvPassword.js`, and the `/api/Auth/login` lookup/password verification flow.
**Cite when:** Editing auth login, CTV imports, password hash storage, or partner migration scripts.

### INV-008D — Cosmetic Staff Auth Source
**Rule:** When `COSMETIC_LOB_ENABLED=true`, `/api/Auth/login` must preserve dental-first authentication and then fall back to the cosmetic identity database only when no dental login row matches. Tokens must carry the selected auth-source LOB, and `/api/Auth/me` must resolve the user and permissions from that same LOB.
**Rationale:** TMV can create active cosmetic-only employees in `tcosmetic_*`; treating login as dental-only makes valid credentials look invalid until the rate limiter blocks the user.
**Enforced by:** `api/src/routes/auth.js` and `api/tests/loginRateLimiter.test.js`.
**Cite when:** Editing login lookup, `/api/Auth/me`, LOB auth payloads, or cosmetic employee creation.

### INV-008E — Cosmetic Route Prefix Is Fixed Scope
**Rule:** Every `/api/cosmetic/*` route MUST force `req.lob = 'cosmetic'`, use the Cosmetic DB pool, and ignore `?lob=` or `X-LOB` overrides. Cross-LOB reads such as `lob=all` must live on explicit top-level admin routes, not on the Cosmetic mirror prefix.
**Rationale:** A route prefix is a permission and data-boundary signal. Allowing query/header overrides under `/api/cosmetic/*` can widen a mirror route into Dental or all-LOB data after the Cosmetic access gate has already been selected.
**Enforced by:** `api/src/middleware/lob.js`, `/api/cosmetic` mount order in `api/src/server.js`, `api/src/middleware/__tests__/lob.test.js`, and route-specific mirror tests such as `api/src/routes/__tests__/newClientsRoute.test.js`.
**Cite when:** Editing `attachCosmeticDb`, `attachLobDb`, `/api/cosmetic/*` mounts, mirror routes, or LOB override behavior.

### INV-008F — Legacy Dental Routes Are LOB-Gated (Symmetric to the Cosmetic Mirror)
**Rule:** The un-prefixed legacy dental data routes that the `/api/cosmetic/*` mirror exposes (Partners, Appointments, Payments, SaleOrders, SaleOrderLines, Products, ProductCategories, Employees, Companies, Reports, DashboardReports, CustomerBalance, CustomerReceipts, CustomerSources, CommissionConfig, Ctvs, NewClients, Permissions, AccountPayments, DotKhams, MonthlyPlans, ExternalCheckups) MUST be guarded by `requireLobScope('dental')`. A token without `dental` in `lob_scope` (cosmetic-only staff, CTV) MUST receive `403 S_LOB_FORBIDDEN`, NOT dental data.
**Rationale:** Before this gate only the cosmetic mirror was LOB-gated; the dental side relied on the frontend LOB pin (INV-008A) for isolation, so a crafted cosmetic-only/CTV token could read the full dental patient list (PHI) via `GET /api/Partners`, bypassing the UI. INV-008A is FE defense; this is the matching backend hard gate. Admins (both scopes) and dental staff pass; cross-cutting routes (Auth, Feedback, telemetry, face, settings, Places, SystemPreferences) are NOT gated.
**Enforced by:** `api/src/middleware/dentalLobGate.js` (mounted on `/api` after `requireAuth` in `api/src/server.js`) and `api/src/middleware/__tests__/dentalLobGate.test.js`.
**Cite when:** Adding/removing a legacy dental route mount, editing the cosmetic mirror set, or changing `lob_scope`/`requireLobScope` behavior. Keep the gated set in sync with the cosmetic mirror in `server.js`.

### INV-008G — CTV Permissions Are tier_id-Independent
**Rule:** A partner with `is_ctv = true` MUST resolve to exactly `['ctv.dashboard.view', 'ctv.commission.view.self', 'ctv.referrals.view.self']` (group "CTV") and MUST NOT inherit any staff permission group — even when a staff `tier_id` is erroneously stamped on the row. CTV rows MUST NOT carry a staff `tier_id`.
**Rationale:** A bulk tier-assignment (migration 031 / merge_employee_permissions) swept CTVs — which are `employee = true` for login — into the "Editor" staff group. That skipped the CTV self-perm auto-grant (which only fired when `tier_id` was NULL) → 403 on the whole `/ctv` portal, AND leaked staff perms (`payment.edit`, `appointments.add`) to external vendors.
**Enforced by:** `api/src/services/permissionService.js` (`is_ctv` short-circuit before the group branch), `api/src/services/__tests__/permissionService.test.js` ("CTV self-permissions"), and migration `api/migrations/059_ctv_never_staff_tier.sql`.
**Cite when:** Editing permission resolution, CTV creation, bulk tier-assignment scripts/migrations, or partner imports.

### INV-009 — Branch Admin Location Scope Is Backend-Enforced
**Rule:** Staff assigned to a limited branch scope MUST receive only rows for their primary `partners.companyid` plus rows in `dbo.employee_location_scope` on backend read surfaces. Frontend `LocationContext` remains a convenience lock, but it is not the security boundary. Plain `Admin` respects branch scope; all-location access requires wildcard permission, `Super Admin`, or `System Administrator`.
**Rationale:** Direct API calls can omit UI-selected `companyId`. Customer, appointment, payment, report, and Investor+ visibility reads must not leak other branches when a branch admin or scoped manager calls the endpoint directly.
**Enforced by:** `api/src/services/locationScope.js`, scoped read handlers in Partners/Appointments/Payments/Reports/Investor+ visibility, and focused route tests in `api/src/routes/{partners,appointments,payments,reports}/__tests__`.
**Cite when:** Adding backend list/detail routes, editing `resolveEffectivePermissions`, changing `LocationContext`, or implementing multi-location features.

---

## Money & Payment Invariants

### INV-023 — Customer Outstanding Balance Excludes Deleted Receivables
**Rule:** Customer balance calculations MUST exclude soft-deleted service orders (`dbo.saleorders.isdeleted = true`) from `outstanding_balance`.
**Rationale:** Deleting the last active service line soft-deletes the parent sale order. Keeping its residual in profile balance makes staff see phantom debt for a service that was removed.
**Enforced by:** `api/src/routes/customerBalance.js` and `api/src/routes/__tests__/customerBalance.lob.test.js`.
**Cite when:** Editing customer balance, service-line deletion, saleorder residuals, payment allocation displays, or customer profile financial cards.

### INV-010 — Payment Allocation Immutability
**Rule:** Once a payment allocation row is created in `dbo.payment_allocations`, the API does NOT support updating or deleting it via a PATCH/PUT on the payment. Changing a payment's `amount` does NOT recalculate allocations.
**Rationale:** Prevents race conditions and audit drift. Corrections require void + new payment.
**Enforced by:** `api/src/routes/payments.js` (no allocation update path).
**Cite when:** Editing payment update, refund, or void logic.

### INV-011 — Receipt Number Year Reset
**Rule:** Deposit receipt numbers (`TUKH/YYYY/NNNNN`) reset the sequential counter each calendar year.
**Rationale:** Matches Vietnamese accounting practice for receipt books.
**Enforced by:** `generateReceiptNumber("TUKH", client)` using `EXTRACT(YEAR FROM ...)` partition.
**Cite when:** Changing receipt generation, fiscal year logic, or accounting exports.

### INV-012 — Over-Allocation Rejection
**Rule:** A payment allocation MUST be rejected if `allocated_amount > invoice.residual + 0.01`.
**Rationale:** Prevents paying more than the outstanding balance on any single invoice.
**Enforced by:** `validateAllocationResidual()` in `api/src/routes/payments/helpers.js`.
**Cite when:** Changing allocation math, tolerance values, or payment create validation.

---

## Integration Invariants

### INV-013 — Hosoonline Image Proxy Required
**Rule:** All Hosoonline health-checkup images MUST be proxied through TGClinic (`/api/ExternalCheckups/...`) and never served directly to the browser from `hosoonline.com`.
**Rationale:** Direct image URLs require Hosoonline session cookies that the browser does not possess.
**Enforced by:** `api/src/routes/externalCheckups.js` and frontend `AuthenticatedCheckupImage` component.
**Cite when:** Changing external checkups routes, image display components, or CDN caching.

### INV-014 — Compreface Optional Startup
**Rule:** The core app MUST start successfully even if the configured Face ID provider is down. Face-recognition features may degrade but must not block unrelated workflows.
**Rationale:** Face ID providers are optional operational dependencies; clinics may run without CompreFace or the local face-service.
**Enforced by:** `api/src/server.js` health check reports `faceService: false` on failure and includes `faceProvider`; frontend handles missing face data gracefully.
**Cite when:** Changing face-service or CompreFace startup dependencies, health checks, provider routing, or Docker Compose.

---

## UI & Behavior Invariants

### INV-015 — Expandable Text Overflow Rule
**Rule:** Any user-visible text that may exceed its container MUST use runtime overflow detection (`scrollHeight > clientHeight`) with an inline expand/collapse toggle. Browser-native `title` alone is unacceptable.
**Rationale:** Staff need fast inline access to full text without slow unstyled tooltips.
**Enforced by:** `website/src/components/shared/ExpandableText.tsx` and `TruncatedCell`.
**Cite when:** Adding new table columns, cards, or any bounded text container.

### INV-016 — i18n Dual-Language Requirement
**Rule:** Every new user-visible text string MUST have both English and Vietnamese i18n keys before merge. Hardcoded English labels on Vietnamese operational pages are forbidden.
**Rationale:** The app operates in Vietnamese clinics; English is secondary. Mixed languages look unprofessional.
**Enforced by:** Code review + `website/src/i18n/` namespace files.
**Cite when:** Adding UI copy, error messages, labels, or toast text.

### INV-017 — Dense List Internal Scroll
**Rule:** Any list that can grow beyond one viewport (appointments, payments, services, reports, feedback) MUST keep headers/filters/actions visible and scroll the row body internally. Unbounded page growth is forbidden.
**Rationale:** Staff use these surfaces repeatedly; losing the header or action bar forces excessive scrolling.
**Enforced by:** `website/design.md` and `BEHAVIOR.md` §5.
**Cite when:** Adding new list pages, tables, or data panels.

---

## Deployment & Runtime Invariants

### INV-018 — Local-First Verification Before VPS
**Rule:** All fixes and features MUST be verified locally before touching the production VPS. Direct VPS editing as the first fix path is forbidden.
**Rationale:** Prevents unverified changes from breaking live clinics during work hours.
**Enforced by:** `AGENTS.md` §2 and `DEPLOYMENT.md`.
**Cite when:** Any deploy, hotfix, or infra change.

### INV-019 — Nginx Timeout Alignment for Exports
**Rule:** If the API supports Excel exports (>60s runtime), the production nginx `proxy_read_timeout`, `proxy_send_timeout`, and `send_timeout` MUST be ≥300s for the `/api` proxy block.
**Rationale:** Default 60s nginx timeouts kill large operational exports mid-stream.
**Enforced by:** `nginx.conf` and `nginx.docker.conf` directives.
**Cite when:** Adding new export types, changing nginx config, or modifying download routes.

### INV-020 — Version Bump for Runtime Changes
**Rule:** Any website or API runtime code change MUST bump `website/package.json` version (patch/minor/major). Docs-only governance changes do NOT require a version bump.
**Rationale:** Production release checks rely on version metadata for cache-busting and verification.
**Enforced by:** `AGENTS.md` §8 and `DECISIONS.md` DEC-20260502-05.
**Cite when:** Shipping frontend, API, or behavior changes.

---

## Incident-Derived Invariants

### INC-20260506-01 — Permission System Drift Lock
**Rule:** `partners.tier_id`, `employee_permissions.group_id`, and `permission_groups` MUST stay synchronized. A NULL `tier_id` on an active employee MUST NOT result in an empty effective permission set.
**Origin:** Permission system broke when tier_id was NULL for migrated employees; UI showed "No permissions" despite active status.
**Fix:** Ensure `resolveEffectivePermissions` handles NULL tier_id by falling back to employee-level overrides or a default group.
**Cite when:** Editing permission resolution, employee import, or tier assignment.

### INC-20260506-02 — Hosoonline Mixed Content Block
**Rule:** All Hosoonline image URLs returned to the frontend MUST use `https://` regardless of upstream scheme.
**Origin:** Live production blocked Hosoonline images due to mixed-content policy (HTTPS page loading HTTP image URLs).
**Fix:** Frontend HTTPS fallback in `AuthenticatedCheckupImage`; backend proxy normalizes URLs.
**Cite when:** Changing external checkup image URLs, proxy logic, or CDN config.

---

## Invariant Change Log

| Date | ID | Action | Commit / PR |
|---|---|---|---|
| 2026-06-06 | INV-008F, INV-008G | Added dental-route LOB gate + CTV-perms-tier_id-independent invariants | 4e616a3a |
| 2026-06-06 | INV-008E | Added fixed Cosmetic route-prefix boundary invariant | pending |
| 2026-06-07 | INV-008C | Amended: phone/ref login lookup widened to all active is_ctv CTVs (admin/public-created can log in); legacy SHA-256 password fallback stays import-marker gated; bcrypt required for all | pending |
| 2026-06-05 | INV-003C | Added CTV service-card-created commission trigger invariant | pending |
| 2026-06-01 | INV-023 | Added customer balance deleted-receivable invariant | pending |
| 2026-06-01 | INV-022 | Added appointment-only invariant for CTV booking flow | pending |
| 2026-05-28 | INV-008C | Added import-marker-gated legacy CTV password and phone/ref-code login fallback invariant | pending |
| 2026-05-13 | INV-001..INV-020 | Initial invariant set created | feat/complete-documentation-stack |
| 2026-05-13 | INC-20260506-01, INC-20260506-02 | Incident-derived invariants added | feat/complete-documentation-stack |
