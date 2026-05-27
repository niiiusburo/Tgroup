# Architecture: CTV v1.2 Signup + Approval + Per-LOB Commission Tiers + OCR

**Domain:** CTV (Collaborator) onboarding and commission management  
**Researched:** 2026-05-27  
**Confidence:** HIGH (existing dual-LOB factory + commissionEngine patterns are proven)

## Executive Summary

CTV v1.2 adds signup, admin approval, per-LOB commission tier configuration, and Gemini OCR to the existing TGroup dual-LOB (dental + cosmetic) Express + React architecture. The extension respects the proven LOB isolation pattern via AsyncLocalStorage and explicit `getDb(lob)` calls. All five new tables (`ctv_registrations`, `signup_terms`, `commission_tiers`, `partners.signature_image`, `earnings.commission_type + .commission_level`) live in BOTH databases for symmetry and atomic cross-DB CTV creation on approval.

## Recommended Architecture

### Component Diagram

```
┌─ Frontend ──────────────────────────────────────┐
│  /ctv/signup (public, no auth)                  │
│  └─ SignupForm (signature pad, referrer lookup) │
│  /admin/ctv-approval (admin only)               │
│  └─ ApprovalQueue (list + modal approve/reject) │
│  /admin/commission-tiers (per-LOB editor)       │
│  └─ TierEditor (L0–L4 rates, labels, toggles)   │
└─────────────────────────────────────────────────┘
         │                      │                  │
    [api/ctv/signup]      [api/ctv/approve]  [api/ctv/tiers]
         ↓                      ↓                  ↓
┌─ API (Express) ──────────────────────────────────────────┐
│ routes/ctv.js (EXTENDED)                                 │
│  POST /api/ctv/signup              (public OCR proxy)    │
│  POST /api/ctv/register            (public, no auth)     │
│  POST /api/ctv/approve/:id         (admin, both DBs)    │
│  GET  /api/ctv/approvals           (admin list)          │
│  POST /api/ctv/tiers/dental        (admin, dental DB)   │
│  POST /api/ctv/tiers/cosmetic      (admin, cosmetic DB) │
│  GET  /api/ctv/tiers/:lob          (admin, per LOB)     │
└─────────────────────────────────────────────────────────┘
         │ (getDb + resolve LOB from req.lob or param)      │
    ┌────┴────────────────────────────────────┬─────┐      │
    ↓                                          ↓     ↓      │
[tdental_demo]                        [tcosmetic_demo]    [Gemini API]
  ├─ ctv_registrations                  ├─ ctv_registrations
  ├─ signup_terms                        ├─ signup_terms
  ├─ commission_tiers                    ├─ commission_tiers
  ├─ partners                            ├─ partners
  ├─ earnings                            ├─ earnings
  ├─ payouts                             ├─ payouts
  └─ products                            └─ products
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `SignupForm` (public) | Collect CTV contact, referrer, terms acceptance, optional signature image; optional ID card OCR. No auth. | `POST /api/ctv/register`, `POST /api/ctv/signup/ocr` |
| `ApprovalQueue` (admin) | List pending `ctv_registrations`; modal to approve/reject; creates `partners` rows in BOTH DBs (atomic or compensating). | `GET /api/ctv/approvals`, `POST /api/ctv/approve/:id` |
| `TierEditor` (admin) | Per-LOB commission tier form (L0–L4 rates, custom labels, active toggle). Separate forms for dental vs cosmetic. | `GET /api/ctv/tiers/{lob}`, `POST /api/ctv/tiers/{lob}` |
| `OCR Proxy` (`/api/ctv/signup/ocr`) | Node.js service wrapping Gemini Vision. Validates image, calls Gemini, extracts ID fields (name, DOB, ID#). Env-gated `GEMINI_API_KEY`. | Gemini API via `@google/generative-ai` SDK |
| `CommissionEngine` (extended) | Adds `commission_type` ('direct' or 'cskh') to earnings row. CSKH branching: detect repeat visit (customer visited cosmetic > 30 days ago), emit CSKH earnings. | DB writes to `earnings` + commission tier reads |
| `Api Factory` (`api/src/db/index.js`) | Unchanged; continues to expose `getDb(lob)` and LOB-aware query helpers. Requests to `/api/ctv/...` mount manually pass `req.lob` or extract from param. | getDb factory for pool selection |

## Data Flow

### Signup (Public, No Auth)
```
SignupForm
  ↓ (phone, name, email, signature pad image, optional ID scan)
POST /api/ctv/register
  ↓ (validate schema, write ctv_registrations row in BOTH DBs)
ctv_registrations row.id → confirm email, show "pending approval" screen
  ↓ (user closes signup)
Admin review → ApprovalQueue lists rows in BOTH DBs
```

### Approval (Admin Only)
```
POST /api/ctv/approve/:id
  ↓ (admin picks LOB(s): dental, cosmetic, or both)
FOR EACH LOB:
  1. CREATE partners row (is_ctv=true, lob_scope=[lob])
  2. UPDATE ctv_registrations.approved_at, approved_by_partner_id, approved_lobs
  3. (Optional: send SMS/email to CTV with login link)
  ↓
partners.id (partner_id) = CTV's employeeId for JWT + commissionEngine attribution
```

### Per-LOB Commission Tiers (Admin Only)
```
TierEditor
  ↓ (form for dental: L0–L4 rates + labels + active)
POST /api/ctv/tiers/dental
  ↓ (write commission_tiers rows to tdental_demo)
GET /api/ctv/tiers/dental → return L0–L4 rows for form re-render
(separate form + POST for cosmetic → tcosmetic_demo)
```

### Commission Math (Enhanced)
```
Payment collected → commissionEngine.createEarningsForPayment
  ↓ (resolve recipient via D13: CTV > consultation > salestaff)
  ↓ (fetch commission_tier.rate_percent for the recipient's level)
  ↓ (create earnings row with commission_type='direct')
  ↓
IF cosmetic AND customer visited before (30d+ ago):
  ↓ (emit SECOND earnings row with commission_type='cskh' at CSKH rate)
  ↓
earnings.{client_id, recipient_partner_id, service_line_id, amount, commission_type, commission_level, source, status='pending'}
```

## Integration Points

### New Files (Create These)
| Path | Purpose | Details |
|------|---------|---------|
| `api/src/routes/ctv-extended.js` or append to `ctv.js` | Public signup + approval + tiers endpoints | 600–800 lines; modular by feature (signup, approval, tiers, ocr) |
| `api/src/services/ocrService.js` | Gemini Vision proxy | Call `@google/generative-ai` with image; parse ID fields; error handling |
| `api/src/db/migrations/048_commission_tiers.sql` | Create `commission_tiers` table in both DBs | Columns: id, lob, level, rate_percent, label, active, created_at, updated_at |
| `api/src/db/migrations/049_ctv_registrations.sql` | Create `ctv_registrations` table in both DBs | Columns: id, phone, email, name, referrer_phone (nullable), signature_image_url, approved_at, approved_by_partner_id, approved_lobs (ARRAY), created_at |
| `api/src/db/migrations/050_signup_terms.sql` | Create `signup_terms` table in both DBs | Columns: id, language, version, content (TEXT), created_at, active |
| `api/src/db/migrations/051_partners_signature_image.sql` | Add `signature_image_url` to partners table in both DBs | Nullable, referencing signup image on approval |
| `api/src/db/migrations/052_earnings_commission_type.sql` | Add `commission_type` ('direct' or 'cskh') and `commission_level` INT to earnings | Both DBs; CSKH logic triggered by repeat-visit detection |
| `website/src/pages/CtvSignup/index.tsx` | Public signup form | Route: `/ctv/signup` (no auth required) |
| `website/src/components/CtvSignupForm.tsx` | Form component (signature pad, referrer lookup, terms) | Reusable; imports signature-pad library and i18n terms |
| `website/src/pages/Admin/CtvApprovals/index.tsx` | Admin approval queue | Route: `/admin/ctv-approvals` (auth + admin perm) |
| `website/src/pages/Admin/CommissionTiers/index.tsx` | Admin tier editor | Route: `/admin/commission-tiers` (LOB selector, per-LOB form) |
| `website/src/lib/api/ctv-signup.ts` | Frontend API clients for signup + approval | POST register, GET approvals, POST approve, GET tiers, POST tiers |

### Modified Files (Extend These)
| Path | Changes | Details |
|------|---------|---------|
| `api/src/services/commissionEngine.js` | Add `commission_type` + CSKH branching | `createEarningsForPayment`: pass `commission_type` param; check repeat visit; emit 2 rows if CSKH |
| `api/src/routes/ctv.js` | Mount signup, approval, tiers endpoints | Append 3 new router.post/get blocks; or split to ctv-extended.js and mount |
| `api/src/server.js` | (No change) | `/api/ctv/signup` already public (no requireAuth); approval/tiers gated by admin perm |
| `website/src/routes.tsx` or router config | Add `/ctv/signup`, `/admin/ctv-approvals`, `/admin/commission-tiers` | Public signup; auth + permission guards for admin pages |
| `website/src/i18n/locales/en/ctv.json` + `vi` | Add signup form, approval UI, tier UI strings | Keys for form labels, error messages, tier level names |
| `api/.env.example` | Document `GEMINI_API_KEY` | Optional; if not set, OCR endpoint returns 503 or 400 Bad Request |

## Build Order (Dependency Aware)

1. **Migrations (BOTH DBs):** `048_commission_tiers`, `049_ctv_registrations`, `050_signup_terms`, `051_partners_signature_image`, `052_earnings_commission_type`. Apply in order; test schema after each.

2. **Backend Services:** `api/src/services/ocrService.js` (isolated, testable). `api/src/services/commissionEngine.js` (extend for `commission_type` + CSKH). `api/src/routes/ctv.js` (public signup, approval with dual-DB partner create, tiers CRUD).

3. **API Wiring:** Mount new endpoints in `server.js` if needed (or auto-mounted via route require).

4. **Frontend Components:** `SignupForm` (can render pre-approval testing). `TierEditor` (admin-only, pair with backend verification). `ApprovalQueue` (depends on backend GET endpoint working).

5. **E2E Verification:** Playwright test signup → approval → CTV login → verify commission UI + CSKH math.

## Mirrored Partner Creation on Approval (Key Design)

### Strategy: Compensating Actions (Best-Effort)

**When admin clicks "Approve" for a `ctv_registrations` row:**

```javascript
// Pseudo
async function approveCtvRegistration(registrationId, approvedLobs, adminPartnerId) {
  const reg = await getCtv_registration(registrationId); // from BOTH DBs
  
  // Best-effort: create partner in each approved LOB
  const createdPartners = [];
  for (const lob of approvedLobs) { // ['dental', 'cosmetic'] or one
    const db = getDb(lob);
    try {
      const partnerId = uuid();
      const partner = await db.queryRows(`
        INSERT INTO dbo.partners (
          id, name, phone, email, is_ctv, lob_scope, 
          signature_image_url, datecreated, created_by_partner_id
        ) VALUES ($1, $2, $3, $4, true, $5, $6, now(), $7)
        RETURNING id, lob_scope, is_ctv
      `, [
        partnerId, reg.name, reg.phone, reg.email, 
        [lob], reg.signature_image_url, adminPartnerId
      ]);
      createdPartners.push({ lob, partnerId, ...partner[0] });
    } catch (err) {
      console.error(`Failed to create partner in ${lob}:`, err);
      // If one fails, we have a split-brain. Options:
      // A) Compensate: DELETE from successfully created LOBs (rollback to partial state)
      // B) Flag: return { success: false, created: [...], error: { failedLob, reason } }
      //    → admin retries or manually fixes the failed LOB
      // Recommendation: Option B (alert admin to manual fix) — money not lost, just one DB missing.
    }
  }
  
  // Update ctv_registrations in both DBs (simple, no cross-DB issue since idempotent)
  await updateCtv_registration_inBoth(registrationId, {
    approved_at: new Date(),
    approved_by_partner_id: adminPartnerId,
    approved_lobs: approvedLobs,
    approved_partners: createdPartners.map(p => p.partnerId),
  });
  
  return { success: createdPartners.length === approvedLobs.length, createdPartners };
}
```

**Rationale:**
- **No distributed transaction** (2PC not available to Node.js easily). If dental succeeds and cosmetic fails, one DB is missing the CTV record.
- **Idempotent approvals** via `ctv_registrations.approved_at` check prevents double-creation on retry.
- **Compensating action on failure:** Admin sees error, re-submits (or manually creates missing partner row in failed LOB).
- **Not critical to payment processing** — CTV can still earn in the successful LOB; missing cosmetic record blocks cosmetic login only.

**Alternative: Compensate on Failure**
```javascript
// If any LOB fails, DELETE from successful LOBs and return 500.
// Only succeed if ALL LOBs succeed.
// Pro: atomic from admin perspective. Con: loses all on one failure.
// Recommend: Accept for high-stakes approvals; use in v1.2.
```

## Per-LOB Commission Tiers Design

### One Admin UI, Two DB Writes
```
UI: /admin/commission-tiers
└─ LOB selector (radio: dental | cosmetic)
└─ Form fields (L0–L4: rate_percent, label, active)
   └─ Save button

Backend:
  POST /api/ctv/tiers/dental  → writes to tdental_demo.dbo.commission_tiers (or updates existing L0–L4 rows)
  POST /api/ctv/tiers/cosmetic → writes to tcosmetic_demo.dbo.commission_tiers
  
Handler: (req.lob = 'dental' or 'cosmetic' from param or header)
  db = getDb(req.lob);
  FOR level IN 0..4:
    UPSERT commission_tiers SET rate_percent = req.body.levels[level].rate_percent ...
    
GET /api/ctv/tiers/:lob → SELECT FROM commission_tiers WHERE lob IS NULL OR lob=:lob
```

### Schema
```sql
CREATE TABLE dbo.commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lob TEXT NOT NULL CHECK (lob IN ('dental', 'cosmetic')), -- redundant, for clarity
  level INT NOT NULL CHECK (level BETWEEN 0 AND 4),
  rate_percent NUMERIC(5, 2) DEFAULT 0,
  label VARCHAR(50) DEFAULT NULL, -- e.g., 'Gold', 'Platinum'
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (lob, level) -- one row per level per LOB
);
```

## OCR Proxy Design

### Endpoint: `POST /api/ctv/signup/ocr`
**Authentication:** None (public, unguarded).  
**Rate-limiting:** Optional (add if abuse risk exists).

```typescript
// Handler signature
async function ocrHandler(req: Request, res: Response) {
  // 1. Validate image exists in body (multipart/form-data or base64 JSON)
  const { image } = req.body; // or req.files.image
  if (!image) return res.status(400).json({ error: 'No image' });

  // 2. Call ocrService.extractIdFields(image)
  const result = await ocrService.extractIdFields(image);
  // Returns: { success: bool, data: { name?, dob?, id_number? }, error?: string }

  // 3. Return result or error (never expose Gemini response directly)
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'OCR failed' });
  }
  return res.json({ success: true, data: result.data });
}
```

### Service: `api/src/services/ocrService.js`
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function extractIdFields(imageBase64OrUrl) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY not configured' };
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' }); // or gemini-2.0-flash
  
  try {
    const response = await model.generateContent([
      'Extract from this Vietnamese ID card: name (full name), date of birth (YYYY-MM-DD), ID number. Return JSON only: {name, dob, id_number}. If not found, return null for that field.',
      {
        inlineData: {
          mimeType: 'image/jpeg', // or image/png
          data: imageBase64OrUrl, // base64 string
        },
      },
    ]);

    const text = response.response.text();
    const parsed = JSON.parse(text); // {name, dob, id_number}
    return { success: true, data: parsed };
  } catch (err) {
    console.error('[OCR] Gemini call failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { extractIdFields };
```

### Gemini Integration Notes
- **Model:** `gemini-1.5-flash` or `gemini-2.0-flash` (fast, cheap); avoid ultra for ID extraction.
- **Image input:** Base64 string in request body; frontend encodes Canvas blob from camera/upload.
- **Env-gated:** `GEMINI_API_KEY` required; if missing, endpoint returns 503 or 400.
- **No PII storage:** OCR response is transient; don't log to DB unless user confirms signup.
- **Cost:** ~$0.002–0.01 per request; budget for production scaling.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Dual-LOB factory pattern | HIGH | `getDb(lob)` proven in existing code; cosmetic routes use it daily |
| Mirrored table schema | HIGH | `commission_tiers`, `ctv_registrations` symmetry tested in Phase 0 |
| Approval compensating action | MEDIUM | Best-effort is pragmatic; consider transactional wrapper for v1.2+ |
| Gemini OCR integration | MEDIUM | SDK is stable; extraction accuracy depends on ID card quality (VN-specific) |
| CSKH branching in commissionEngine | MEDIUM-HIGH | Logic is simple (repeat visit check + second row); schema is clean |

## Gaps to Address

1. **Signup email confirmation:** Currently no email queue/service. v1.2 should add `brevo` or similar for CTV sign-up confirmation + admin approval notifications.
2. **Duplicate CTV detection:** No check for duplicate phone/email in signup. v1.2 should validate uniqueness before insert.
3. **Signature image storage:** Currently plan is `signature_image_url` VARCHAR. Recommend S3 or local `/uploads/ctv-signatures/` directory + signed URLs.
4. **Gemini fallback:** If `GEMINI_API_KEY` not set, OCR endpoint is unavailable. Consider graceful degradation (skip OCR if user prefers manual entry).
5. **CTV onboarding SMS:** Currently not in scope. Plan to add Twilio/brevo SMS for CTV login link + account activation.

## Sources

- `api/src/db/index.js` — LOB factory pattern (dual-pool, ALS context, AsyncLocalStorage)
- `api/src/middleware/lob.js` — attachCosmeticDb middleware (runWithLob context)
- `api/src/routes/ctv.js` — Existing CTV commission-summary cross-DB aggregation (proven)
- `api/src/services/commissionEngine.js` — D13 recipient resolution (append-only earnings)
- `product-map/domains/ctv.yaml` — CTV role/permissions spec
- `product-map/domains/earnings-commissions.yaml` — Earnings table design + D13 priority
