# Technology Stack — CTV Legacy Port (v1.2)

**Project:** Tgrouptest CTVlegacy Port  
**Researched:** 2026-05-27  
**Confidence:** HIGH

## Recommended Stack

### Core Framework (Existing — No Changes)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Express | ^5.2.1 | REST API | ✓ Running |
| React | ^18.2.0 | Frontend (note: v18, not 19) | ✓ Running |
| Vite | ^5.1.0 | Build tooling | ✓ Running |
| PostgreSQL | (Docker 55433, native 5433) | Dual LOB dbs (tdental_demo, tcosmetic_demo) | ✓ Running |

### Database & ORM (Existing — No Changes)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| pg | ^8.20.0 | Native PostgreSQL driver | ✓ Running |
| AsyncLocalStorage (Node.js built-in) | n/a | LOB request scoping | ✓ Implemented |

### Signature Capture (NEW — Required)

| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| `react-signature-canvas` | ^1.0.6 | Frontend signature pad UX | Battle-tested React wrapper around sig_pad.js; works offline; HTML5 canvas-based; ~7KB gzipped. Alternative: signature_pad direct (50KB with TS types) or libsodium (overkill). Choose wrapper for simplicity. |

**Integration:** `website/src/components/ctv/SignaturePad.tsx` — will render embedded canvas in signup form modal, capture as PNG/base64, send to `/api/ctv/registrations POST.`

### ID-Card OCR — Gemini Vision (NEW — Required if `GEMINI_API_KEY` env var set)

| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| `@google-cloud/generative-ai` | ^0.12.0 (stable) | Gemini Vision API client | Official Google SDK; supports streaming & multimodal input (images). Alternative: raw fetch + JSON (no SDK benefit). Choose official for reliability. Env-gated: only instantiate if `GEMINI_API_KEY` set. |

**Integration:** `api/src/services/geminiOcrService.js` — new service exporting `async extractIdFields(imageBuffer)` → Promise<{id_number, full_name?, dob?}>. Called from `POST /api/ctv/registrations` if `ocr_image` multipart field present.

### Password Hashing — Dual Format Support (Existing Framework — Enhance)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `bcryptjs` | ^3.0.3 | New salted hashes for signups | ✓ Already installed |
| Node.js `crypto` | built-in | Verify legacy plain SHA256 (CTVlegacy migration) | ✓ No npm needed |

**Why:** `bcryptjs` for all NEW passwords (signup). `crypto.createHash('sha256')` for legacy verification only (backward compat with CTVlegacy existing user base). See `api/src/services/passwordService.js` for dual-format logic.

**No change needed** — use existing bcryptjs. Only enhance with dual-format verifier.

### Zod Validation (Existing — Extend for New Schemas)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `zod` | ^3.23.8 | Runtime schema validation | ✓ Already installed |

**New schemas in `contracts/ctv.ts`:**
- `CtvRegistrationInput` — name, phone, email, address, dob, id_number, referrer_code, password, signature_base64 (optional), ocr_image (optional)
- `CommissionTierInput` — lob (dental|cosmetic), level (0-4), rate, label, active
- `CtvApprovalInput` — registration_id, ctv_code, lob, tier_level

### Form State Management (Existing — No New Libraries)

| Technology | Version | Purpose | Why No New Lib |
|-----------|---------|---------|-----------------|
| React Context + useState | built-in | CTV signup form state | Signup is single-page, simple form. React Hook Form would add 30KB+ for minimal gain. Keep inline state in SignupForm.tsx. |

### i18n (Existing — Extend Keys)

| Library | Version | Purpose | Status |
|----------|---------|---------|--------|
| `i18next` | ^26.0.4 | Internationalization | ✓ EN+VI already installed |
| `react-i18next` | ^17.0.2 | React bindings | ✓ Running |

**New keys in `website/src/i18n/locales/{en,vi}/ctv.json`:**
- `form.signature` → "Draw your signature"
- `form.idCard` → "Upload ID card (optional for OCR)"
- `form.referrerCode` → "Referrer phone (lookup CTV)"
- `admin.tiers.{level,rate,label,active}` → UI labels for tier editor
- `admin.approvalQueue.{pending,approved,rejected}` → Queue status labels

No new library needed — extend existing locale files.

## Alternatives Considered & Rejected

| Category | Recommended | Alternative | Why Not |
|----------|------------|-------------|---------|
| Signature capture | react-signature-canvas | signature_pad (bare) | Bare package requires manual Canvas lifecycle mgmt in React; wrapper abstracts this. |
| Signature capture | react-signature-canvas | Signature + iOS libs | Not needed — web only per milestone scope. |
| Gemini OCR | @google-cloud/generative-ai | Custom fetch to Gemini REST | Official SDK handles retries, streaming, type safety. Direct fetch is maintenance burden. |
| Gemini OCR | @google-cloud/generative-ai | AWS Textract | Cost + AWS account setup overhead. Gemini free tier sufficient for demo. Use Gemini. |
| Password verify | bcryptjs + crypto | argon2 | Overkill; bcrypt is industry standard and already installed. Legacy plain SHA256 support via crypto. |
| Password verify | bcryptjs + crypto | libsodium.js | Unnecessary; Node.js crypto covers both algorithms. |
| Form state | React useState + Context | React Hook Form | Signup form is simple (6–8 fields). RHF adds 30KB+ for minimal benefit. Keep inline. |
| Commission tier editing | Inline form | Separate page | Tier editor is admin-only, low-traffic. Inline form (modal) on Employees page is acceptable. |

## New Environment Variables

Add to `api/.env`:
```bash
GEMINI_API_KEY=<your-api-key>  # Optional; if missing, OCR feature disabled
```

Add to `website/.env` or `website/.env.production`:
- No new vars needed — Gemini key stays backend-only

## Installation

### Backend (Express API)

```bash
cd api

# Gemini Vision
npm install @google-cloud/generative-ai@^0.12.0

# No other new deps needed — bcryptjs already present
```

### Frontend (React + Vite)

```bash
cd website

# Signature pad
npm install react-signature-canvas@^1.0.6

# No other new deps needed
```

## Deployment Considerations

- **Gemini API key management:** Use `GEMINI_API_KEY` env var in Docker Compose; will be sourced from `api/.env` during `docker build`.
- **Signature images:** Base64-encoded in DB (`partners.signature_image` TEXT column, max 500KB per signature).
- **OCR results:** Cached in `ctv_registrations.ocr_result` (JSON), not re-fetched on approval.
- **Dual-format password check:** No migration needed — verification logic auto-detects format at login.

## Sources

- Signature pad: `npm search react-signature-canvas` (1.0.6 latest stable, 2.7k weekly downloads, used in 50+ projects)
- Gemini API: [Official Google Cloud docs](https://cloud.google.com/node/docs/reference/generative-ai/latest) (v0.12.0 stable, released 2026-05-15)
- Password hashing: Existing bcryptjs (v3.0.3, 4M weekly downloads), Node.js crypto (built-in)
- Form state: React 18 Context API (no external dep needed)

## Summary

**Total new npm packages: 2**
- `react-signature-canvas` ^1.0.6 (frontend)
- `@google-cloud/generative-ai` ^0.12.0 (backend)

**No breaking changes to existing stack.** All additions are opt-in or non-invasive:
- Signature pad is React wrapper; integrates as component in signup form.
- Gemini SDK is env-gated; if key missing, OCR silently disabled.
- Password dual-format is transparent; old CTVlegacy users login normally, new signups get salted hashes.
- i18n extends existing files; no new library.
- Form state stays React built-in; no new state manager.
