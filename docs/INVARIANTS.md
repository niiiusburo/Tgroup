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

### INV-004 — Deposit Category Heuristic Stability
**Rule:** If a payment has `method !== 'deposit'` and `method !== 'mixed'`, has no `service_id`, has no `deposit_used`, and has no allocations, it MUST be classified as `payment_category = 'deposit'` and `deposit_type = 'deposit'`.  
**Rationale:** This heuristic is the primary way deposits are identified in the absence of explicit flags. Changing it retroactively reclassifies historical payments.  
**Enforced by:** `api/src/routes/payments.js` POST handler.  
**Cite when:** Changing payment create logic, `PaymentCreateSchema`, or deposit detection.

### INV-005 — Face Embedding Dimension Lock
**Rule:** Face embeddings must remain 128-dimensional vectors (SFace model). Changing the model or dimension requires re-registering all faces.  
**Rationale:** Mismatched dimensions break the distance calculation and recognition accuracy.  
**Enforced by:** `face-service` Python code (OpenCV SFace) and `dbo.customer_face_embeddings` schema (if present).  
**Cite when:** Updating face-service dependencies, model weights, or embedding storage.

### INV-006 — Search Accent-Insensitivity
**Rule:** Every user-facing search bar must match Vietnamese strings regardless of diacritics. Staff typing `Nguyen` must match `NGUYỄN`.  
**Rationale:** Operational staff often type without accents on mobile or English keyboards.  
**Enforced by:** Frontend `normalizeText()` helper; backend SQL using accent-stripped comparisons.  
**Cite when:** Adding any new search field, filter, or picker.

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

### INV-009 — Location Scope Frontend-Only Filter
**Rule:** Backend list routes generally do NOT enforce location scope. The frontend `LocationContext` is responsible for filtering by `companyid`.  
**Rationale:** Backend location scoping was historically inconsistent; frontend filtering is the current operational contract.  
**Enforced by:** Most `api/src/routes/*.js` list handlers lack location scoping SQL.  
**Cite when:** Adding backend list routes, changing `LocationContext`, or implementing multi-location features.

---

## Money & Payment Invariants

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
**Rule:** The core app MUST start successfully even if Compreface containers are down. Face-recognition features may degrade but must not block unrelated workflows.  
**Rationale:** Compreface is a heavy optional dependency; clinics may run without it.  
**Enforced by:** `api/src/server.js` health check reports `faceService: false` on failure; frontend handles missing face data gracefully.  
**Cite when:** Changing face-service startup dependencies, health checks, or Docker Compose.

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
| 2026-05-13 | INV-001..INV-020 | Initial invariant set created | feat/complete-documentation-stack |
| 2026-05-13 | INC-20260506-01, INC-20260506-02 | Incident-derived invariants added | feat/complete-documentation-stack |
