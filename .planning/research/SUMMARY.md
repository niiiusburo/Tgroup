# Project Research Summary

**Project:** TG Clinic — CTVlegacy Port (v1.2)
**Domain:** Multi-Level Referral / Collaborator (Cộng Tác Viên) Onboarding + Per-LOB Commission Engine
**Researched:** 2026-05-27
**Confidence:** HIGH

## Executive Summary

Milestone v1.2 brings seven new capabilities — public CTV signup, admin approval queue, per-LOB commission tier editor (L0–L4 with custom labels), CSKH commission branching, Gemini Vision ID-card OCR, signature capture, and dual-format SHA256 password compatibility — into an existing Express/Node + Vite/React 19 monorepo that already has a working `commissionEngine.js`, four `/api/ctv/*` endpoints, the `/ctv` portal page, dual-LOB Postgres pools, and JWT-with-`is_ctv` auth. The port is **extension, not rewrite**: existing scaffolding stays, the new work targets the gaps CTVlegacy had that Tgrouptest lacks.

Two design choices anchor the architecture: (1) **compensating actions** with idempotent retry for cross-DB partner creation on approval (no 2PC needed for two Postgres pools managed by Node), and (2) **single canonical `commission_tiers` table per LOB** with a `lob` column, killing the legacy `commission_settings`/`hoa_hong_config` drift footgun. Five additive migrations (`048`–`052`) apply to both `tdental_demo` and `tcosmetic_demo`. Risk is manageable but three open questions must be answered before Phase 2 ships.

## Key Findings

### Recommended Stack

Only two new npm packages required; everything else is already in `package.json`.

**Core additions:**
- `react-signature-canvas@^1.0.6` — canvas signature capture in `<SignaturePad />`, base64 string out, ~7KB gzipped
- `@google/generative-ai@^0.12.0` — Gemini Vision SDK for Vietnamese ID-card OCR; env-gated by `GEMINI_API_KEY`
- Node.js `crypto` (built-in) — legacy plain-SHA256 verification alongside existing `bcryptjs@^3.0.3` for new salted hashes

**Existing libs that cover gaps:** `bcryptjs`, `zod`, `express-rate-limit`, `react-i18next`, React `useState`/`Context`. No new state library, no React Hook Form, no ORM.

### Expected Features

**Must have (table stakes for v1.2 launch):**
- Public CTV signup form (`/ctv/signup`) — phone + name + DOB + ID number + referrer code, plus optional signature + ID image
- Admin approval queue (`/admin/ctv-registrations`) — approve → create `partners` rows with `is_ctv=true` in chosen LOB(s)
- Per-LOB commission tier editor (`/admin/commission-tiers`) — UPSERT into `commission_tiers` for L0–L4 per LOB, custom labels, active toggle
- Multi-level commission walk inside `commissionEngine.js` — recursive ancestor CTE up to 4 levels deep, per-LOB rates
- Dual-format password verify in `passwordService.js` — `:` separator → bcrypt; else plain SHA256 (read-only legacy compat)

**Differentiators (include if Phase 4 lands cleanly):**
- Gemini Vision OCR proxy `POST /api/ctv/signup/ocr` — extract `{name, dob, id_number}` from CCCD image
- Versioned `signup_terms` (vi/en) with admin editor and public `/api/signup-terms/active`
- CSKH commission branching in `commissionEngine` — second earnings row at CSKH rate for cosmetic follow-up visits >30 days after the prior visit
- Custom level labels surfaced in `/api/ctv/commission-summary` response

**Anti-features explicitly dropped:**
- ❌ Two-config-table sync (`commission_settings` + `hoa_hong_config`) — known CTVlegacy footgun
- ❌ Google Sheets sync worker — Tgrouptest DB is system of record
- ❌ Redis cache layer — premature optimization at current scale
- ❌ Flask sessions table — JWT already in place
- ❌ CTVlegacy marketing scrollytelling landing page — operator surface, not customer marketing
- ❌ `activity_logs` audit table — deferred to a later milestone

### Architecture

**New files to create:**
- `api/src/db/migrations/048_commission_tiers.sql` — `(lob, level, rate, label, is_active)` per DB; primary key `(lob, level)`
- `api/src/db/migrations/049_ctv_registrations.sql` — pending queue with `status`, `signature_image`, `reviewed_by/at`, `admin_notes`
- `api/src/db/migrations/050_signup_terms.sql` — `(language, version, title, content_html, is_active)`
- `api/src/db/migrations/051_partners_signature_image.sql` — add `signature_image TEXT` column on `partners`
- `api/src/db/migrations/052_earnings_commission_type_and_level.sql` — add `commission_type VARCHAR(16)` enum + `commission_level INT` columns on `earnings`
- `api/src/services/ocrService.js` — Gemini Vision wrapper; returns 503 when `GEMINI_API_KEY` unset
- `api/src/services/passwordService.js` (or extend existing) — dual-format verify, new hashes always bcrypt salted
- `api/src/routes/ctv-extended.js` OR append to `api/src/routes/ctv.js` — `POST /api/ctv/signup`, `GET /api/signup-terms/active`, `GET /api/ctv/check-referrer-phone`, `POST /api/ctv/signup/ocr`
- `api/src/routes/admin/ctv-registrations.js` — list / approve / reject (cross-DB partner creation on approve)
- `api/src/routes/admin/commission-tiers.js` — UPSERT tiers per LOB
- `api/src/routes/admin/signup-terms.js` — CRUD with version bump on activation
- `website/src/pages/CtvSignup/index.tsx` — public signup page (no admin shell)
- `website/src/components/ctv/SignaturePad.tsx` — react-signature-canvas wrapper
- `website/src/pages/Admin/CtvRegistrations/index.tsx` — approval queue
- `website/src/pages/Admin/CommissionTiers/index.tsx` — per-LOB editor with `<LobSelector />`
- `website/src/pages/Admin/SignupTerms/index.tsx` — versioned editor
- `website/src/lib/api/ctv-signup.ts` + extensions to `lib/api/ctv.ts`

**Existing files to extend:**
- `api/src/services/commissionEngine.js` — accept `commission_type` param; emit recursive 0–4 level earnings using per-LOB `commission_tiers`; second `cskh` row when cosmetic + repeat-visit window
- `api/src/server.js` — mount new routes
- `api/src/routes/ctv.js` — surface tier labels in `/commission-summary` response
- `website/src/i18n/locales/{en,vi}/ctv.json` + new `signup.json` keys
- `website/src/App.tsx` (or router) — public `/ctv/signup` route outside auth shell; admin routes inside

**Build order (dependency-aware):**
1. Migrations 048–052 applied to both DBs
2. Backend services: `ocrService.js`, `passwordService.js` extension, `commissionEngine.js` CSKH branch
3. Admin tier editor (data must exist before signup approvals can write earnings correctly)
4. Public signup + referrer lookup + OCR proxy
5. Approval queue (depends on `ctv_registrations` + dual-LOB partner write)
6. CSKH math wired into payments path
7. E2E verification: signup → approve → login → first payment → earnings rows appear cross-DB

### Critical Pitfalls (and prevention)

1. **Two-DB partner approval atomicity** — admin approves CTV for both LOBs, dental write succeeds, cosmetic write fails, status shows "approved" but cosmetic mirror is missing. *Mitigation:* idempotent retry loop; approve transaction is `(begin → write dental → write cosmetic → mark registration approved)`; partial failure surfaces a remediation action on the admin queue, not a silent half-success. Phase 2.

2. **Commission tier drift between LOBs** — admin updates dental rate, cosmetic write times out, earnings calculations diverge invisibly. *Mitigation:* single API endpoint validates both writes in a sequenced try/catch; rollback dental if cosmetic fails; nightly audit endpoint compares tier rows across both DBs. Phase 3.

3. **Gemini OCR cost runaway on public endpoint** — bots hit `/api/ctv/signup/ocr` 1000×/hr → real $/day. *Mitigation:* `express-rate-limit` 5 OCR calls per IP per day, 2MB image cap, `GEMINI_API_KEY` env-gate so the endpoint 503s when unset, hard GCP quota cap. Phase 1 (service) + Phase 4 (limits hardened).

4. **Recursive CSKH walk N+1 across two DBs** — naive ancestor loop = 10+ queries per earning. *Mitigation:* single `WITH RECURSIVE` CTE per DB, materialize ancestors in one round trip, cache tier rates in memory for the request. Phase 3.

5. **`signup_terms` version race** — CTV signs page-load v3, admin activates v4 mid-submit, registration ends up referencing the wrong version. *Mitigation:* signup payload includes `signup_terms_id` FK to the exact row the user saw; server validates that row was active at sign time. Phase 4.

6. **Signature image bloat** — 1000 CTVs × 200KB base64 = 200MB DB bloat per DB; 2× because mirrored. *Mitigation:* compress canvas to PNG ≤ 30KB before base64; column type `TEXT`; consider S3 in a follow-up if storage cost grows. Phase 5.

7. **Dual-format password indefinite legacy** — plain SHA256 stays acceptable forever = downgrade attack surface. *Mitigation:* lazy rehash on next successful login; set hard cutoff (recommend 90 days) after which legacy hashes are rejected with a forced-reset flow. Phase 2 with deadline TBD.

8. **CSKH classification false positives** — heuristic "repeat customer >30d" misses edge cases (refunds, transfers). *Mitigation:* explicit `previous_payment_id` link on the new payment; only emit cskh earnings when an actual prior paid invoice exists for the same client+LOB. Phase 3.

9. **Referrer phone-variant collisions** — `+84901xxx` and `0901xxx` and `84901xxx` should resolve to same partner. *Mitigation:* normalize-on-write canonical column `phone_normalized` indexed; signup lookup uses normalized form. Phase 2.

10. **`is_ctv` flag drift between dental and cosmetic mirrors** — approval sets flag in dental but cosmetic write fails. *Mitigation:* covered by Pitfall 1's idempotent retry; plus a nightly audit job comparing `is_ctv` between mirrors. Phase 2 + Phase 5.

## Suggested Phase Structure

| Phase | Name | Deliverable | Pitfalls addressed |
|---|---|---|---|
| 5 | Schema foundation + OCR scaffold | Migrations 048–052 on both DBs; `ocrService.js` stub with env gate + rate limit | 3, 6 |
| 6 | Per-LOB commission tier admin | `/admin/commission-tiers` editor; tier consistency endpoint; surface labels in commission summary | 2 |
| 7 | Public signup + referrer lookup + OCR | `/ctv/signup` page, signature pad, `POST /api/ctv/signup`, terms loader, Gemini OCR endpoint | 5, 9, 3 |
| 8 | Approval queue + dual-LOB partner creation | `/admin/ctv-registrations`, idempotent approve mutation, dual-format password verify, sync audit endpoint | 1, 7, 10 |
| 9 | Commission math extension | CSKH branching + recursive ancestor CTE in `commissionEngine.js`, `earnings.commission_type`, recalc helper | 4, 8 |
| 10 | E2E hardening + verification | Playwright: signup → approve → login → first payment → earnings across DBs; signature bloat audit | 6, 10 |

Phase numbering continues from v1.1's last phase (4). The v1.1 Phase 4 (Polish & Walk-in Redesign) stays orthogonal and is sequenced by the user separately.

## Open Questions (block planning)

1. **CSKH repeat-visit threshold** — proposed 30 days; needs clinic operator to confirm against actual cosmetic service cadence (microblading touch-ups vs facial follow-ups have different windows).
2. **Email/notification service** — who sends signup confirmation + admin approval notification? Options: existing channel (if any), Brevo, Sendgrid, in-house SMTP. Blocks Phase 8 polish.
3. **Signature image storage** — base64 in DB (simpler, but 200MB+ bloat across mirrors at scale) vs S3/local FS (extra infra). Affects migration 051 column type and ops cost.
4. **Legacy password phase-out deadline** — 90 days recommended; needs business sign-off so we can communicate to existing CTVlegacy users.
5. **OCR failure policy** — if Gemini call fails mid-signup, do we (a) block signup, (b) accept manual entry, or (c) flag for admin review? Recommend (b).

## Confidence Assessment

| Area | Level | Rationale |
|---|---|---|
| Stack | HIGH | Two packages, both stable; no breaking changes to existing setup |
| Features | HIGH | Source-of-truth is CTVlegacy + ctv.yaml + the existing portal already in production |
| Architecture | HIGH | Dual-LOB factory + `runWithLob()` proven daily; compensating actions standard at this scale |
| Pitfalls | HIGH | Top 3 are documented in CTVlegacy GOTCHAS/COMMISSION_SETTINGS_AUDIT; rest derive from the dual-DB topology directly |
| Open questions | MEDIUM | Five questions; three are policy (not technical), two have safe defaults |

## Ready for Requirements

All four research files committed; SUMMARY.md complete. Roadmapper can proceed with the six-phase structure above as a starting point. Recommend the three policy open questions (CSKH window, email provider, signature storage) be surfaced to the user during requirements scoping so they don't ambush Phase 7/8 planning.
