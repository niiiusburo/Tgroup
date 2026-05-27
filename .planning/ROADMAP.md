# Roadmap — TG Clinic v1.1 Bugfixes & Features + v1.2 CTVlegacy Port

## Overview

v1.1 (Phases 1–4) delivers core bug fixes, feature additions, and architectural shifts (employee multi-branch assignment, customer delete, payment allocation expansion). v1.2 (Phases 5–9) ports CTVlegacy's public CTV signup, admin approval queue, per-LOB commission tier configuration, dual-format password compatibility, referral-a-client flow, and Gemini Vision OCR into Tgrouptest, extending the existing commissionEngine and /api/ctv portal.

---

## v1.1 Phases (Complete Milestone)

- [x] **Phase 1: Bug Fixes Wave 1** - Fix save buttons, branch filtering, appointment scroll
- [x] **Phase 2: Quick Features & Validations** - Customer code visibility, duplicate phone check, assistant role, quick search, timer, quick-add, date fields
- [x] **Phase 3: Architecture Shifts** - Multi-branch employees, admin delete customers, dotkham payment allocations
- [x] **Phase 4: Polish & Walk-in Redesign** - Walk-in form redesign per card-scrolling pattern, final E2E verification

---

## v1.2 — CTVlegacy Port

**Milestone Goal:** Enable public CTV self-signup with signature pad + referrer lookup (no admin approval — direct partner creation), per-LOB commission tier configuration, dual-format password compatibility, and a Refer-A-Client flow that enforces a 6-month service-ticket eligibility gate on referred clients.

### Phase 5: Schema Foundation
**Goal**: Three additive migrations (048 `commission_tiers` per-LOB, 049 `signup_terms` vi/en, 050 `partners` augmentation with `signature_image` + `created_via`) applied to both `tdental_demo` and `tcosmetic_demo`. No `ctv_registrations`, no `earnings.commission_type` — both explicitly out of scope.
**Depends on**: Phase 4
**Requirements**: CTV-SCHEMA-01, CTV-SCHEMA-02, CTV-SCHEMA-03, CTV-SCHEMA-04
**Success Criteria** (what must be TRUE):
  1. `commission_tiers` table exists in both DBs with (lob, level) primary key; rate_percent, label, is_active columns; exactly 5 rows per LOB (L0–L4)
  2. `signup_terms` table exists in both DBs with language, version, content_html, is_active columns; exactly one row is marked active per language (vi and en)
  3. `partners.signature_image` column exists and stores compressed-PNG base64; test signature of ~30KB loads and displays in admin approval queue
  4. `partners.created_via` column exists with CHECK constraint accepting 'self_signup', 'admin_create', 'migrated'; all new partners default to self_signup or admin_create
**Plans**: 2 plans

Plans:
- [ ] 05-01: Write and apply migrations 048 (`commission_tiers` per-LOB), 049 (`signup_terms` vi/en), 050 (`partners.signature_image` + `partners.created_via`) to both `tdental_demo` and `tcosmetic_demo`; verify schema with introspection queries
- [ ] 05-02: Seed `commission_tiers` L0–L4 (default rates from CTVlegacy: 25%, 5%, 2.5%, 1.25%, 0.625%) and `signup_terms` (vi/en, v1) in both DBs; backfill existing `partners` rows with `created_via='migrated'`; verify data loads

---

### Phase 6: Commission Tier Admin
**Goal**: Admin can open `/admin/commission-tiers`, select a LOB (dental or cosmetic), and edit L0–L4 rates, custom labels, and active toggles independently per LOB. Tier labels surface in the CTV portal commission summary.
**Depends on**: Phase 5
**Requirements**: CTV-TIERS-01, CTV-TIERS-02, CTV-TIERS-03
**Success Criteria** (what must be TRUE):
  1. Admin navigates to `/admin/commission-tiers`, sees a LOB radio selector (dental | cosmetic) and form with L0–L4 rows
  2. Admin can edit rate (0.0–1.0), label (free text, e.g., "Gold"), and is_active toggle for each tier row independently; save persists to the selected LOB's DB only
  3. Changing LOB selector swaps the form data without losing unsaved changes; saves are validated to ensure both DBs stay in sync or error if either fails
  4. `GET /api/ctv/commission-summary` response includes `tierLabels: { 0: "...", 1: "...", ... }` keyed by level, and CTV portal renders custom labels in place of "L0/L1/…"
  5. Verification: Admin edits dental L0 to 6%, saves; query both tdental_demo and tcosmetic_demo confirms dental=6%, cosmetic unchanged; CTV portal shows updated label
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 06-01: Create `CommissionTierEditor` component with LOB selector, form for 5 tier rows, save handler; wire routes `/admin/commission-tiers` + GET/POST `/api/ctv/tiers/:lob`
- [ ] 06-02: Extend `GET /api/ctv/commission-summary` to include `tierLabels` object; update CTV portal components to render labels instead of L0/L1 hardcodes
- [ ] 06-03: Test tier editor (change rates, toggle active, swap LOB, verify both DBs stay in sync or error; CTV portal renders new labels; E2E screenshot verification)

---

### Phase 7: Public CTV Signup + Auth + OCR
**Goal**: Public `/ctv/signup` page allows visitor signup with phone, name, email, DOB, ID number, optional signature pad, optional ID-card OCR, and referrer phone lookup. Password accepts both legacy plain-SHA256 and new bcrypt formats. Login rehashes legacy passwords lazily.
**Depends on**: Phase 5
**Requirements**: CTV-SIGNUP-01, CTV-SIGNUP-02, CTV-SIGNUP-03, CTV-SIGNUP-04, CTV-SIGNUP-05, CTV-SIGNUP-06, CTV-AUTH-01, CTV-AUTH-02
**Success Criteria** (what must be TRUE):
  1. Visitor navigates to `/ctv/signup` (public, no auth required) and completes form: phone, name, email, DOB, ID number, address, password; form is responsive and accessible
  2. Signature pad canvas captures visitor's signature and compresses to PNG ≤30KB base64 before submission
  3. Signup form loads the currently-active terms in visitor's language (vi or en, detected from browser or selector); terms content displays in modal; submission records `signup_terms_id` FK to exact row viewed
  4. When visitor enters upline-CTV phone (optional), form runs async lookup that normalizes 8 phone variants (0xxx, +84xxx, 84xxx, etc.) and resolves to matching CTV across both DBs or returns "not found"; UX shows CTV name on match or "not found" message
  5. Successful signup creates `partners` row in BOTH tdental_demo and tcosmetic_demo with is_ctv=true, created_via='self_signup', status='active', referred_by_ctv_id set to resolved upline or NULL; **no admin approval gate** — the CTV can log in immediately
  6. When GEMINI_API_KEY env var is set, optional ID-card image upload shows control and calls `/api/ctv/signup/ocr` to pre-fill name/DOB/ID-number from Vietnamese CCCD; when env var unset, control is hidden and OCR is skipped
  7. Verification: Complete signup flow end-to-end (with/without referrer, with/without OCR); verify partner rows exist in both DBs with correct values; confirm signup_terms_id references correct version
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [ ] 07-01: Create `SignupForm` component and `/ctv/signup` page (no auth, public route); wire form schema (Zod) with phone, name, email, DOB, ID, address, password fields; add signature pad via react-signature-canvas
- [ ] 07-02: Implement referrer phone normalization service and async lookup endpoint GET `/api/ctv/check-referrer-phone/:phone`; integrate into form with debounce and UX feedback
- [ ] 07-03: Create `ocrService.js` (Gemini Vision wrapper, env-gated by GEMINI_API_KEY); wire POST `/api/ctv/signup/ocr` endpoint with rate limiting (5/day per IP); hide OCR control when env var unset
- [ ] 07-04: Wire signup POST `/api/ctv/register` to create partners in both DBs + ctv_registrations; test full flow (with referrer, with OCR, lazy rehash on login); E2E test signup → login with legacy password → verify rehash

---

### Phase 8: Refer-A-Client Flow
**Goal**: Authenticated CTV can submit "Refer a client" form in the `/ctv` portal with client phone, name, and LOB choice (dental | cosmetic). System runs eligibility gate (6-month rule) against the chosen LOB's DB only, creates client's `partners` row with referred_by_ctv_id set to submitting CTV, and creates a consultation service ticket in the chosen LOB. Hard-rejects ineligible clients with structured error envelope. Note: client rows live in ONE LOB only (the chosen one) — only the *CTV's own* partner row is mirrored across both DBs (handled in Phase 7).
**Depends on**: Phase 7
**Requirements**: CTV-REFER-01, CTV-REFER-02, CTV-REFER-03, CTV-REFER-04, CTV-REFER-05
**Success Criteria** (what must be TRUE):
  1. Authenticated CTV can access "Refer a client" form in `/ctv` portal; form accepts client phone, name, and LOB radio selector (dental | cosmetic); submit button triggers POST `/api/ctv/refer-client`
  2. Eligibility gate runs: client is eligible iff (a) no partners row exists for this phone in chosen LOB, OR (b) existing row has zero open/active/in-progress/unpaid tickets AND last completed/paid ticket finished >6 months ago; query runs against chosen LOB's DB only
  3. When eligible, endpoint atomically creates/updates client's `partners` row with referred_by_ctv_id = submitting CTV's id, then creates a `services` row (type='consultation') for that client in chosen LOB; returns success with new client ID and consultation ticket ID
  4. When ineligible, endpoint hard-rejects with structured error (code: B_CLIENT_NOT_REFERRABLE, category: business_rule, remediation: "Client has active/recent service — not eligible"); no data is written; CTV sees error modal with remediation text
  5. After successful referral, new client appears in CTV's `/ctv` portal Referrals tab within same session, with consultation ticket visible as first line item; Referrals tab re-fetches and renders updated list
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 08-01: Create "Refer Client" UI in CTV portal: form with phone, name, LOB selector, submit button; wire POST `/api/ctv/refer-client` with error handling and success modal
- [ ] 08-02: Implement `referralEligibilityService.js` with 6-month gate logic; wire POST `/api/ctv/refer-client` backend to check eligibility, create partners row, create consultation ticket; test both eligible and ineligible paths
- [ ] 08-03: E2E test: Create test CTV, submit referral for new/ineligible client; verify error; then submit for eligible client; verify partners row + consultation appear in CTV portal Referrals tab; test dual-LOB scenario (refer to both DBs)

---

### Phase 9: E2E Verification & Polish
**Goal**: Full Playwright test coverage for signup → login → refer-client → tier admin → commission math; verify all happy-path and reject-path scenarios; signature image bloat audit; password rehash verification.
**Depends on**: Phase 8
**Requirements**: (Verification phase — covers all CTV-* requirements via integrated tests)
**Success Criteria** (what must be TRUE):
  1. End-to-end Playwright test: Public signup (with referrer, with OCR when key present) → newly-created CTV logs in immediately (no approval step) → views `/ctv` portal with correct commission labels → submits Refer-A-Client (eligible and ineligible paths) → referrals appear in tab
  2. After self-signup, partners rows are present in BOTH `tdental_demo` and `tcosmetic_demo` with `is_ctv=true`, `created_via='self_signup'`, and matching `referred_by_ctv_id`
  3. Admin edits cosmetic L0 rate 25%→27% in `/admin/commission-tiers`; verify cosmetic DB updated, dental untouched; CTV portal commission summary renders the cosmetic L0 custom label (per-LOB tiers honored)
  4. Legacy password login test: insert a partners row with plain SHA256 password directly into DB; log in with the plaintext; verify successful login AND that the row's password column now contains a bcrypt `salt:hash` (lazy rehash worked)
  5. Refer-A-Client eligibility audit: create three test client phone records — one not in DB (eligible), one with an active consultation ticket (ineligible), one with last paid ticket 7 months ago (eligible) — exercise the endpoint for each and verify expected accept/reject + error envelope shape
  6. Signature image audit: 10 test signups, verify each `signature_image` is ≤30KB base64; aggregate < 350KB across the test set
  7. All 20 v1.2 requirements traced to a phase in REQUIREMENTS.md; CHANGELOG.json updated; `website/package.json` version bumped
**Plans**: 2 plans

Plans:
- [ ] 09-01: Write comprehensive Playwright test suite: signup happy-path + referrer variants + OCR (with/without GEMINI_KEY) + admin approval + commission tier edit + CTV login + refer-client eligible/ineligible; run full suite and verify green
- [ ] 09-02: Audit verification (signature bloat, password format, both-DB sync, tier consistency); update CHANGELOG.json; bump version; prepare for release

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bug Fixes Wave 1 | v1.1 | 3/3 | Complete | — |
| 2. Quick Features & Validations | v1.1 | 8/8 | Complete | — |
| 3. Architecture Shifts | v1.1 | 4/4 | Complete | — |
| 4. Polish & Walk-in Redesign | v1.1 | — | Not started | — |
| 5. Schema Foundation | v1.2 | 0/2 | Not started | — |
| 6. Commission Tier Admin | v1.2 | 0/3 | Not started | — |
| 7. Public CTV Signup + Auth + OCR | v1.2 | 0/4 | Not started | — |
| 8. Refer-A-Client Flow | v1.2 | 0/3 | Not started | — |
| 9. E2E Verification & Polish | v1.2 | 0/2 | Not started | — |
