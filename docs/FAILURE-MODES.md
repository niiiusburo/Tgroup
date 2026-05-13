# TGroup Clinic — Failure Modes

> Known broken patterns + their fix. Append-only war stories with root cause and resolution.

## Format

Each entry:
- **FM-YYYYMMDD-NN** — Failure Mode ID
- **Symptom** — What users see
- **Root Cause** — Why it happens
- **Fix** — How to resolve
- **Prevention** — How to avoid recurrence
- **Invariant / ADR** — Related policy

---

## FM-20260506-01: Permission System Shows "No Permissions" for Active Employee

- **Symptom:** Employee logs in successfully but sees empty menus and "No permissions" toast. UI is unusable.
- **Root Cause:** `partners.tier_id` was NULL for migrated employees. `resolveEffectivePermissions()` returned empty array because there was no group to resolve.
- **Fix:** Admin opens PermissionBoard, assigns employee to a permission group (updates `tier_id`). Employee re-logs in.
- **Prevention:** Migration scripts must set a default `tier_id` for all employees. Permission resolution should handle NULL `tier_id` by falling back to a default group or employee-level overrides.
- **Related:** INC-20260506-01, ADR-0006.

## FM-20260506-02: Hosoonline Images Blocked by Mixed Content Policy

- **Symptom:** Health checkup images show broken image icon on production. Browser console shows `Mixed Content` error.
- **Root Cause:** Hosoonline API returned `http://` image URLs. Production page is `https://`. Browser blocks passive mixed content.
- **Fix:** Frontend `AuthenticatedCheckupImage` component now replaces `http://` with `https://` before rendering. Backend proxy normalizes URLs in the payload.
- **Prevention:** Always proxy external images through TGClinic backend (INV-013). Never render direct third-party image URLs on HTTPS pages without scheme normalization.
- **Related:** INC-20260506-02.

## FM-20260505-01: iPhone Modal Height Overflow

- **Symptom:** On iPhone, Add Customer modal and other dense modals overflow the viewport; bottom fields are unreachable.
- **Root Cause:** Modal content height exceeded `100dvh` on small screens; no `max-height` or internal scroll was set.
- **Fix:** Added `max-h-[85dvh] overflow-y-auto` to modal content containers. Tested on iPhone 12/13/14 viewports.
- **Prevention:** All modals with variable content must use `max-h` + internal scroll. Test on 390×844 viewport before merge.
- **Related:** BEHAVIOR.md §5 (dense lists), DESIGN.md.

## FM-20260502-01: Sticky Toolbar Search Uneven Spacing

- **Symptom:** Overview search toolbar had uneven whitespace between label and input on desktop.
- **Root Cause:** Fixed label width created a reserved column even when content was short.
- **Fix:** Switched to content-sized `shrink-0` labels with `gap-3` mobile / `lg:gap-4` desktop.
- **Prevention:** Sticky toolbars should feel like compact toolbars, not form rows with reserved label columns.
- **Related:** DEC-20260502-05.

## FM-20260420-01: Login Rate Limiter Blocks All Clinic Staff

- **Symptom:** After a few failed logins, the entire clinic network is locked out.
- **Root Cause:** Rate limiter was scoped by IP only, not by email+IP. One employee's wrong password blocked everyone behind the same NAT.
- **Fix:** Changed rate limiter to scope by normalized email + IP, with a higher IP-wide cap for brute-force protection.
- **Prevention:** Rate limiting must differentiate between per-account attacks and per-network traffic.
- **Related:** `api/tests/loginRateLimiter.test.js`.

## FM-20260415-01: Export Downloads Timeout at 60s

- **Symptom:** Large revenue/payment exports fail mid-download with nginx 504 Gateway Timeout.
- **Root Cause:** Nginx default `proxy_read_timeout` is 60s. Large date ranges generate Excel files for >60s.
- **Fix:** Raised nginx `proxy_read_timeout`, `proxy_send_timeout`, `send_timeout` to `300s` for the `/api` proxy block.
- **Prevention:** Any new export type must document expected runtime and verify nginx timeout alignment.
- **Related:** INV-019.

## FM-20260410-01: Schema NOT NULL Constraint Breaks Customer Create

- **Symptom:** Creating a new customer returns 500 with `null value in column "xxx" violates not-null constraint`.
- **Root Cause:** Migration added a NOT NULL column to `dbo.partners` without updating all INSERT paths (legacy Odoo fields, TDental import scripts, and frontend forms).
- **Fix:** Rolled back NOT NULL constraint; added default value; updated all INSERT statements to include the column.
- **Prevention:** Before adding NOT NULL without default, grep for every `INSERT INTO partners` in the codebase and scripts. Update `product-map/schema-map.md` blast radius.
- **Related:** INV-001, schema-map.md.

## FM-20260405-01: Face Registration Overwrites Without Audit

- **Symptom:** Customer's face suddenly stops matching after re-registration. No history of previous embedding.
- **Root Cause:** Face register API overwrites `face_subject_id` and embedding without keeping old versions.
- **Fix:** Added `deleted_at` soft-delete to `customer_face_embeddings` (where table exists) so old embeddings are preserved.
- **Prevention:** Face re-registration should preserve historical embeddings for audit and rollback.
- **Related:** INV-005.

## FM-20260325-01: Payment Allocation Double-Count on Concurrent Deposits

- **Symptom:** Two cashiers process deposits for the same customer simultaneously. Both allocations succeed, but residual goes negative.
- **Root Cause:** No row-level lock or serializable transaction around residual read → allocation insert → residual update.
- **Fix:** Added `validateAllocationResidual()` pre-check; `GREATEST(0, residual - amount)` prevents negative DB value, but race condition still possible.
- **Prevention:** Use `SELECT FOR UPDATE` on `saleorders` during allocation transactions. Long-term: move allocation to a queue.
- **Related:** INV-003, INV-012.

## FM-20260310-01: Mock Data Masks API Failure in Production

- **Symptom:** Features work locally but fail in production. Local dev shows mock data instead of real API responses.
- **Root Cause:** Some components still import from `website/src/data/` mock files when API is slow or returns 500.
- **Fix:** Removed mock fallbacks from production code paths; mocks restricted to test fixtures only.
- **Prevention:** Never ship `website/src/data/` imports in production components. Use feature flags or loading states instead.
- **Related:** `product-map/unknowns.md` #11.

## FM-20260228-01: i18n Key Missing in Vietnamese

- **Symptom:** UI shows English labels on Vietnamese pages after a feature update.
- **Root Cause:** Developer added English i18n key but forgot Vietnamese equivalent.
- **Fix:** Added missing Vietnamese keys; added `i18n-coverage.test.ts` to CI gate.
- **Prevention:** Every UI text change requires both `en` and `vi` keys. `website/src/i18n/__tests__/i18n-coverage.test.ts` catches missing keys.
- **Related:** INV-016.

---

## How to Add a New Failure Mode

1. Assign next `FM-YYYYMMDD-NN` ID.
2. Fill all five fields (Symptom, Root Cause, Fix, Prevention, Related).
3. Append to this file. Never delete or rewrite existing entries.
4. If the failure mode reveals a new invariant, add it to `INVARIANTS.md` (append-only).
