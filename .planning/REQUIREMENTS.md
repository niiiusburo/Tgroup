# Requirements — TG Clinic KOL Integration

## v1 Requirements

### VietQR Payments
- **PAY-01**: User can generate a VietQR code for a service payment with amount and description
- **PAY-02**: User can upload payment proof screenshot after patient transfer
- **PAY-03**: Admin can configure clinic bank account (BIN, account number, account name) in settings
- **PAY-04**: QR description auto-generates from customer name + phone last 4 digits

### Facial Recognition
- **FACE-01**: Receptionist can enroll a new customer's face during registration (multi-angle capture)
- **FACE-02**: Receptionist can scan a customer's face to verify identity and pull up profile
- **FACE-03**: Customer list shows face-enrolled badge for customers with biometrics
- **FACE-04**: System stores 128-dim face descriptor linked to customer record

### Backend / Data
- **DATA-01**: Database migration adds `partner_biometrics` and `partner_biometric_images` tables
- **DATA-02**: Database migration adds `company_bank_settings` table for clinic bank config
- **DATA-03**: API endpoints exist for biometric enroll, match, and phone-check
- **DATA-04**: API endpoints exist for bank settings CRUD

## v1.1 / Architecture Shifts

- **REQ-06**: Two-tier customer delete with permission gating and FK-safe confirmation dialogs
- **REQ-12**: Multi-branch employee assignment via junction table and dual-selector UI
- **REQ-15**: Payment allocation expanded to dotkhams (examination vouchers) via tabbed UI

## v1.2 / CTVlegacy Port

### Schema Foundation (CTV-SCHEMA)
- [ ] **CTV-SCHEMA-01**: Admin can configure independent commission tier rates (L0–L4) per LOB via a `commission_tiers` table mirrored in `tdental_demo` and `tcosmetic_demo` with `(lob, level)` primary key, `rate NUMERIC(6,4)`, `label VARCHAR`, `is_active BOOLEAN`
- [ ] **CTV-SCHEMA-02**: System loads the active CTV signup terms by language from a versioned `signup_terms` table (`(language vi|en, version INT, title, content_html, is_active)`) with exactly one row marked active per language at a time
- [ ] **CTV-SCHEMA-03**: A CTV's drawn signature is stored as compressed-PNG base64 in `partners.signature_image TEXT` so it can be displayed back on their profile
- [ ] **CTV-SCHEMA-04**: System distinguishes self-signed-up CTVs from admin-created ones via a `partners.created_via VARCHAR(16)` column accepting values `'self_signup'`, `'admin_create'`, or `'migrated'`

### Public CTV Self-Signup (CTV-SIGNUP)
- [ ] **CTV-SIGNUP-01**: Visitor can complete a public signup form at `/ctv/signup` (phone, name, email, DOB, address, ID number, optional upline-CTV phone, password) without any existing login
- [ ] **CTV-SIGNUP-02**: CTV draws a signature on a canvas pad during signup; the canvas output is compressed to a PNG ≤ 30 KB before base64 storage
- [ ] **CTV-SIGNUP-03**: Signup page loads the currently-active terms in the user's language (vi or en) and the submission records the accepted `signup_terms_id` so the version is preserved
- [ ] **CTV-SIGNUP-04**: When the user enters an upline-CTV phone, the form runs a referrer lookup that normalizes 8 phone variants (`+84xxx`/`84xxx`/`0xxx`/etc.) across both DBs and resolves to the matching CTV partner or returns "not found"
- [ ] **CTV-SIGNUP-05**: Successful signup creates a `partners` row directly in both `tdental_demo` and `tcosmetic_demo` with `is_ctv=true`, `created_via='self_signup'`, `status='active'`, `referred_by_ctv_id` set to the resolved upline (or NULL); no admin approval gate
- [ ] **CTV-SIGNUP-06**: Signup form offers an optional ID-card image upload that, when `GEMINI_API_KEY` env var is set, posts to `/api/ctv/signup/ocr` and pre-fills name/DOB/ID-number from the Vietnamese CCCD extraction; when the env var is missing the upload control is hidden entirely

### Password Compatibility (CTV-AUTH)
- [ ] **CTV-AUTH-01**: CTV login accepts both bcrypt `salt:hash` format and the CTVlegacy plain SHA256 format (detected by absence of `:`) so existing CTVlegacy accounts continue to log in without a reset
- [ ] **CTV-AUTH-02**: When a successful login is verified against the legacy plain-SHA256 path, the system rehashes the password with bcrypt and writes it back so the legacy format drains naturally over time without a hard cutoff date

### Refer-A-Client Flow (CTV-REFER)
- [ ] **CTV-REFER-01**: Authenticated CTV can submit a "Refer a client" form in the `/ctv` portal with client phone, name, and LOB choice (dental | cosmetic); this is the only place a CTV can claim a new referral
- [ ] **CTV-REFER-02**: System runs the eligibility gate in the chosen LOB's DB: a client is eligible iff (a) no partners row with this phone exists OR (b) the existing client has zero open/active/in-progress/unpaid service tickets AND their most recent completed/paid service ticket finished more than 6 months ago
- [ ] **CTV-REFER-03**: When eligibility passes, the endpoint atomically creates (or updates) the client's `partners` row with `referred_by_ctv_id` set to the submitting CTV, and creates a `services` row of type `'consultation'` on that client, in the chosen LOB only
- [ ] **CTV-REFER-04**: When eligibility fails, the endpoint hard-rejects with a structured error envelope (`code: B_CLIENT_NOT_REFERRABLE`, `category: business_rule`, `remediation: "Client has active or recent service in [LOB] — not eligible for new referral"`) and writes nothing
- [ ] **CTV-REFER-05**: After a successful referral, the new client appears in the CTV's `/ctv` portal Referrals tab within the same session, with the consultation ticket visible as the only line item until further services are added

### Commission Tier Admin (CTV-TIERS)
- [ ] **CTV-TIERS-01**: Admin can open `/admin/commission-tiers` and select a LOB (dental or cosmetic) to view and edit that LOB's L0–L4 commission tier rows independently from the other LOB
- [ ] **CTV-TIERS-02**: For each tier row admin can edit `rate` (0.0–1.0), `label` (free text, used by the CTV portal in place of "L0/L1/…"), and `is_active` flag (inactive tiers contribute 0% to commission calculations)
- [ ] **CTV-TIERS-03**: The existing `GET /api/ctv/commission-summary` response includes `tierLabels` keyed by level so the CTV portal renders the admin-configured labels everywhere it currently shows "L0/L1/…"

## v2 / Deferred

- Quick check-in widget on Overview dashboard with face scanner
- Face recognition confidence analytics
- Multiple bank accounts per location
- CSKH commission-type branching in `commissionEngine.js` (re-evaluate in v1.3 once eligibility-gate data shows real return-customer patterns)
- Email/notification provider integration (v1.2 uses in-app banners only)
- `activity_logs` audit table for compliance trail
- S3-compatible object storage for signature images (only if `partners.signature_image TEXT` causes observed DB bloat)
- Hard cutoff date for plain-SHA256 legacy passwords (currently lazy-rehash forever)
- Admin approval queue for CTV signups (intentionally removed — anyone can sign up; admins review post-hoc on the existing partners list page)
- Google Sheets sync worker (Tgrouptest DB is system of record)

## Out of Scope

- KOL referral tracking or commission logic *(superseded by v1.2 CTV port)*
- Mobile native app integration
- Real-time payment webhook from banks
- REQ-13, REQ-14: originally scoped but dropped/consolidated into other v1.1 items
- Marketing scrollytelling landing page from `CTVlegacy/app/src/App.tsx` — operator surface only; no customer-facing marketing in v1.2
- Two-config-table sync (`commission_settings` + `hoa_hong_config`) — replaced with single canonical `commission_tiers` per LOB
- Redis cache layer — premature optimization at current scale
- Re-porting `commissionEngine.js`, `/api/ctv` routes, CTV portal page, `ctv.yaml` domain spec, or i18n keys — already wired on `fix/feedback-reports`
- Real-time websockets for tier rate changes — admin saves write directly; CTV portal reads on next page load

## Traceability

| REQ-ID | Phase |
|--------|-------|
| PAY-01 | 1 |
| PAY-02 | 1 |
| PAY-03 | 1 |
| PAY-04 | 1 |
| FACE-01 | 2 |
| FACE-02 | 2 |
| FACE-03 | 4 |
| FACE-04 | 3 |
| DATA-01 | 3 |
| DATA-02 | 1 |
| DATA-03 | 3 |
| DATA-04 | 1 |
| REQ-06 | 3 |
| REQ-12 | 3 |
| REQ-15 | 3 |
| CTV-SCHEMA-01 | (to be assigned by roadmapper) |
| CTV-SCHEMA-02 | (to be assigned by roadmapper) |
| CTV-SCHEMA-03 | (to be assigned by roadmapper) |
| CTV-SCHEMA-04 | (to be assigned by roadmapper) |
| CTV-SIGNUP-01 | (to be assigned by roadmapper) |
| CTV-SIGNUP-02 | (to be assigned by roadmapper) |
| CTV-SIGNUP-03 | (to be assigned by roadmapper) |
| CTV-SIGNUP-04 | (to be assigned by roadmapper) |
| CTV-SIGNUP-05 | (to be assigned by roadmapper) |
| CTV-SIGNUP-06 | (to be assigned by roadmapper) |
| CTV-AUTH-01 | (to be assigned by roadmapper) |
| CTV-AUTH-02 | (to be assigned by roadmapper) |
| CTV-REFER-01 | (to be assigned by roadmapper) |
| CTV-REFER-02 | (to be assigned by roadmapper) |
| CTV-REFER-03 | (to be assigned by roadmapper) |
| CTV-REFER-04 | (to be assigned by roadmapper) |
| CTV-REFER-05 | (to be assigned by roadmapper) |
| CTV-TIERS-01 | (to be assigned by roadmapper) |
| CTV-TIERS-02 | (to be assigned by roadmapper) |
| CTV-TIERS-03 | (to be assigned by roadmapper) |
