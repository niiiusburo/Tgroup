# TGroup Clinic — Contracts

> Every interface boundary frozen: API request/response schemas, event payloads, cross-module function signatures, third-party integration contracts. Versioned. Append-only.
> 
> **Rule:** If you change any contract in this file, you MUST update the version, the consumer code, the tests, and append a CHANGELOG entry in the same commit.

**Cosmetic LOB v2 Sync (2026-05-19):** Added/aligned: `Lob` ('dental'|'cosmetic'), `BusinessUnitScope`, `EarningsRow` (append-only with recipient_partner_id on partners, source enum, negative reversals), `Payout`, `CtvCommissionSummary` (cross-DB aggregate), `ConsultationCard`, `getDb(lob)` / `getQuery(req)` factory contracts, `LobScope` middleware types. partners (both DBs) is identity for all LOB/CTV/earnings. See product-map/earnings-commissions.yaml + db/index.js + commissionEngine. Per v2 §269 + migration 047 reality.



## Contract Versioning

| Version | Date | Scope |
|---|---|---|
| v1.0.0 | 2026-05-13 | Initial contract freeze covering all active API routes, shared types, and integration boundaries. |
| v1.0.1 | 2026-05-17 | Contract documentation aligned to live payment method enum, report API, and operational export registry. |
| v1.0.2 | 2026-05-18 | Reconfirmed `@tgroup/contracts` payment method enum and generated contract artifacts are limited to live methods only. |
| v1.0.3 | 2026-05-19 | Feedback attachment persistence contract clarified: file-only messages are valid, DB/file writes are transactional, and destructive file cleanup happens only after DB commit. |
| v1.0.4 | 2026-05-22 | Cosmetic LOB mirror routing and NK3 revenue recognition contract clarified for customer/employee/appointment/payment/balance/report flows. Employee and company frontend clients accept `lob?: 'dental' | 'cosmetic'`. |
| v1.0.5 | 2026-05-23 | TMV/NK3 API hotfix contract clarified: cosmetic CustomerBalance mirror, CTV-only self-dashboard reads, and normalized service catalog writes. |
| v1.0.6 | 2026-05-25 | CTV self portal adds client-journey tracking and structured booking-claim error compatibility fields. |
| v1.0.7 | 2026-05-28 | CTV portal payloads allow nullable display names so frontend i18n owns localized unknown-client/service fallbacks. |
| v1.0.8 | 2026-05-28 | SaleOrders client contract now explicitly carries `sourceid?: UUID | null` and the frontend must only submit persisted active-LOB customer-source UUIDs. |
| v1.0.9 | 2026-05-28 | `POST /api/Auth/login` accepts an email address for staff/admins or a legacy CTV phone/ref code for rows marked `legacy_ctv_import*`. |
| v1.0.10 | 2026-05-29 | CTV portal adds hierarchy and LOB-aware client phone lookup contracts; admin CTV management supports full profile edits. |
| v1.0.11 | 2026-06-01 | Partner create/update normalizes legacy zero/blank DOB parts to null; Revenue report adds source breakdown. |
| v1.0.12 | 2026-06-01 | CTV booking client behavior clarified: `date` remains required by `POST /api/ctv/bookings`; the CTV refer-client UI pre-fills it with today's Asia/Ho_Chi_Minh date. |
| v1.0.13 | 2026-06-01 | CTV booking contract corrected: phone lookup may prefill an available existing client's name; `POST /api/ctv/bookings` creates/reclaims the client and writes an appointment only, never a service card or Referral Start saleorder. |
| v1.0.14 | 2026-06-01 | CTV booking appointment service metadata clarified: if no service is selected, the appointment defaults to the configured Referral Start product on `appointments.productid`; selected services still override the default. |
| v1.0.15 | 2026-06-01 | CTV booking appointment location contract clarified: `companyId` remains optional on `/api/ctv/bookings`; the API resolves request company, CTV JWT company, then selected-LOB fallback company before any partner mutation. |
| v1.0.16 | 2026-06-01 | CTV booking selected-LOB company fallback clarified: active company rows with QA/test/verify fixture names are deprioritized behind real clinic locations. |
| v1.0.17 | 2026-06-01 | CustomerBalance outstanding-balance contract clarified: soft-deleted saleorders do not count as customer debt. |
| v1.0.18 | 2026-06-01 | Service-line reversal contract clarified: `DELETE /api/SaleOrderLines/:id` is permissioned as customer edit + payment void, blocks paid-out CTV commissions, and only auto-voids linked payments when allocations are single-invoice and still unpaid. |
| v1.0.19 | 2026-06-01 | Admin commission navigation contract clarified: earnings rows may expose `service_line_id`; frontend clients use it only for read-only drilldown links into customer Records. |
| v1.0.20 | 2026-06-02 | Public CTV landing booking contract added: no-login `/api/ctv-public/*` lookup, service catalog, and booking endpoints resolve the CTV by phone and preserve appointment-only booking semantics. |
| v1.0.21 | 2026-06-02 | Public CTV signup contract added: `/ctv/join` can create a new CTV under either a referral code or an active upline CTV phone submitted from the final signup field. |
| v1.0.22 | 2026-06-02 | CTV self account settings contract added: `/api/ctv/me` now returns the DB-backed self profile, `PATCH /api/ctv/me` updates the CTV display name, and `POST /api/ctv/me/password` verifies current password before writing a new bcrypt hash. |
| v1.0.23 | 2026-06-02 | Public CTV phone verification contract added: `/api/ctv-public/ctv-lookup` lets public booking and public signup verify typed CTV phone numbers before submit. |
| v1.0.24 | 2026-06-05 | CTV creation (admin + portal + public-join) contract clarified + unified: `email` is optional on `POST /api/ctv` (admin create) and `POST /api/ctv-public/join` (public/portal); backend accepts blank/omitted, skips duplicate-email check, and stores NULL; client types `CreateCtvInput`/`CtvJoinInput` use `email?: string`; clean payload from the SSOT omits falsy email. See `website/src/components/shared/CtvCreationForm/`, AGENTS.md §5.1, and `product-map/domains/ctv.yaml` creation subsection. |
| v1.0.25 | 2026-06-06 | Admin New Clients contract expanded: `/api/NewClients` now returns every CTV-referred customer in the selected LOB scope, including converted referrals, with service revenue, paid total, COM total, and missing-COM status fields for referral commission audit. |
| v1.0.26 | 2026-06-06 | Cosmetic mirror added for Admin New Clients: `/api/cosmetic/NewClients` is equivalent to `/api/NewClients?lob=cosmetic` and forces Cosmetic scope even if a query tries `lob=all`. |
| v1.0.27 | 2026-06-06 | Cosmetic route-prefix boundary hardened: every `/api/cosmetic/*` route ignores query/header LOB overrides such as `?lob=all` or `X-LOB: dental` and always runs with `req.lob='cosmetic'`, Cosmetic DB context, and `runWithLob('cosmetic')`. Cross-LOB admin reads must use top-level `/api/*` routes that explicitly accept `lob`. |
| v1.0.28 | 2026-06-06 | Site-wide crossref breadcrumb governance added for API route/client contract surfaces. No request or response payload shapes changed; touched API and client files now carry source-traceability breadcrumbs, and high-blast endpoints/functions carry explicit `@crossref:endpoint[...]` or `@crossref:function[...]` markers enforced by `npm run verify:crossrefs`. |
| v1.0.29 | 2026-06-07 | Face ID liveness / anti-spoofing contract added (local provider): face-service `POST /embed` returns a `liveness` object; `/api/face/recognize` and `/api/face/register` can return `SPOOF_DETECTED` (HTTP 422) when `FACE_LIVENESS_ENABLED=true` and the capture is judged a spoof. Default off + fail-open, so existing payloads are unchanged when disabled/unavailable. |
| v1.0.30 | 2026-06-07 | Restored `GET /api/cross-lob-probe` (admin-only `lob.crossview` soft phone-identity probe of the other LOB pool; dropped in the cosmetic-LOB merge, breaking the ProfileHeader cross-LOB badge). Now also powers the Face ID cross-LOB chooser: when a recognized customer exists in both LOBs, the quick-scan popover offers a choice instead of auto-navigating. |
| v1.0.41 | 2026-06-29 | Face ID recognize responses add `status`, `ambiguity`, and `recognitionVersion`; close top-two identity matches return `status: "ambiguous"` with no staff-selectable candidates, and CompreFace multi-face detections return `MULTIPLE_FACES` 422. |
| v1.0.42 | 2026-07-01 | Patient media bridge contract added: `/api/patient/media` maps authenticated live NK customers to NK Photo clients server-side, returns signed photo URLs, accepts multipart upload fields `file`/`image`/`photo`, and never exposes `MEDIA_SERVICE_API_KEY` to the mobile app. |
| v1.0.47 | 2026-07-03 | Backend branch-scope contract hardened: scoped staff reads for `GET /api/Partners`, `GET /api/Appointments`, `GET /api/Payments*`, reports cash-flow, and Investor+ visibility/client-count surfaces must constrain rows through the caller's effective locations (`partners.companyid` plus `employee_location_scope`). Plain `Admin` is branch-scoped; wildcard, `Super Admin`, and `System Administrator` keep all-location reads. Explicit out-of-scope company/customer visibility requests return 403 `LOCATION_NOT_ALLOWED`. |
| v1.0.43 | 2026-07-01 | Patient treatment detail service-line naming hardened: `GET /api/patient/treatments/:id` returns `lines[].product_name` resolved from `products.name`, then `saleorderlines.productname`, then `saleorderlines.name`, so the mobile app displays the human-readable service name instead of the service ID/code. Visit steps use the same product-name fallback. Response shape unchanged; field semantics only. |
| v1.0.46 | 2026-07-02 | Patient media per-service tagging contract: `GET /api/patient/media?saleOrderLineId=<id>` now accepts an optional query parameter to filter media items to a specific service line. Response items always include `saleOrderLineId` (camelCase, null when untagged). `POST /api/patient/media` accepts optional multipart field `saleOrderLineId`; when present, the API validates that the line belongs to the authenticated patient (INNER JOIN `saleorderlines` → `saleorders` with `partnerid` check) and persists it. Invalid/foreign line returns 400 `{ error, code: 'SOL_NOT_OWNED' }`. Untagged uploads persist NULL; existing behavior unchanged. |
| v1.0.45 | 2026-07-02 | Patient media upload hardening contract: `POST /api/patient/media` and `POST /api/media` enforce strict file size, type, and rate-limiting constraints via shared multer + rate-limit middleware. **File constraints:** 10 MB max size; allowed MIME types are `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/heic`, `image/heif`; single file per request (accepted field names: `file`, `image`, or `photo` — exactly one file across any of these fields, per the v1.0.42 patient media bridge contract). **Rate limiting:** 5 uploads per minute per authenticated patient/staff member, keyed on `patient.partnerId` (patients) or `user.id` (staff), with IPv6-safe IP fallback via express-rate-limit v8+ `ipKeyGenerator`. **Error handling:** Multer validation errors return typed error codes: `code: 'FILE_TOO_LARGE'` (HTTP 413), `code: 'MULTIPLE_FILES_NOT_ALLOWED'` (HTTP 400), `code: 'INVALID_FILE_TYPE'` (HTTP 400). Rate limit exceeded returns `code: 'RATE_LIMIT_EXCEEDED'` (HTTP 429). Service misconfiguration (missing `MEDIA_SERVICE_URL` or `MEDIA_SERVICE_API_KEY`) returns `code: 'NOT_CONFIGURED'` (HTTP 503). |
| v1.0.44 | 2026-07-02 | Staff patient media contract added: `GET|POST|DELETE /api/media` lets authenticated staff list, upload, and delete treatment photos tied to a patient and a specific `sale_order_line_id`. The route reuses the NK Photo media bridge; `MEDIA_SERVICE_API_KEY` stays server-side. Response shape: `{ success, client?, media[] }` with `saleOrderLineId` on each item. |
| v1.0.31 | 2026-06-08 | CTV discount QR contracts (NK3): public fan landing `/api/discount-codes/landing/:shortCode`, `check-existing`, and fan `POST /generate` bypass global auth; staff `/lookup`, `/client-search`, `/verify` require staff (not CTV); CTV `/mine` + `/stats` require self CTV. Frontend public fetches use `API_URL` from `core.ts` (not relative `/api` on Vite). |
| v1.0.32 | 2026-06-10 | CTV discount QR fixes (NK3, FM-20260610-01): all `/api/discount-codes/*` POST bodies are single-encoded JSON objects (clients must NOT pre-`JSON.stringify` into `apiFetch`); `POST /verify` with `markAsUsed: true` on a `checked_in` code now falls back to the `customer_partner_id`/`customer_lob` bound at check-in when `customerPartnerId` is omitted. No field shapes changed. |
| v1.0.34 | 2026-06-10 | Strict CTV commission attribution (DEC-20260610-01): `POST /api/SaleOrders` (+ `/api/cosmetic/SaleOrders`) no longer inherits the customer's `referred_by_ctv_id` when the payload omits `ctv_id` — the card stays CTV-less and creates zero earnings. Commission requires an explicit `ctv_id` in the payload. Field shapes unchanged. |
| v1.0.33 | 2026-06-10 | CTV discount QR completion hardened (FM-20260610-02): on a `checked_in` code, the bound customer takes precedence over `createIfMissing`/submitted `customerLob` — completion never creates or rebinds a different client. Explicit `customerPartnerId` still honored. No field shapes changed. |
| v1.0.35 | 2026-06-14 | Service-line reversal extended to service-card CTV earnings: `DELETE /api/SaleOrderLines/:id` (and the service-card delete path) now calls `reverseServiceCardEarnings` to clear pending service-card earnings (`payment_id IS NULL`) before soft-delete, and blocks the reversal with `B_COMMISSION_PAID_OUT` (HTTP 409) when paid-out service-card earnings exist. Response shape adds `reversedServiceCardEarningsCount: number`. Service-line delete no longer leaves orphan pending service-card earnings behind. NK3-only flag: `CTV_SERVICE_CARD_COMMISSION=true`. |
| v1.0.36 | 2026-06-24 | Patient Portal AI chat support contract added: `/api/patient/chat/*` endpoints, `chat_sessions`, `chat_messages`, `support_kb_chunks` schemas, and mobile `ChatScreen`. AI replies are generated server-side via OpenAI `gpt-4o-mini`, Google Gemini, or DeepSeek with RAG context from `support_kb_chunks` (pgvector when available; keyword fallback otherwise). Human escalation creates a `support_tickets` row. Learning loop stores resolved-chat chunks with `approved=false` pending staff review. |
| v1.0.40 | 2026-06-29 | Investor Portfolio contract added: `GET /api/investor/portfolio?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` uses Investor JWT + `investor_clients` IDOR gate to return selected-client `overview`, `calendar`, `reports.daily`, `reports.byCustomer`, `reports.appointmentStatus`, `reports.byDoctor`, `reports.byLocation`, `reports.byService`, `clients`, and `extraction` metadata. Payloads exclude phone, email, treatment notes, and non-allowlisted customers; date ranges are bounded to 366 days. |
| v1.0.39 | 2026-06-27 | Investor customer curation is Admin-only: `/customers` renders the Investor checkbox only for Admin-class/wildcard staff, and `GET /api/investor-visibility` plus `PATCH /api/Partners/:id/investor-visibility` return `403 S_ADMIN_ONLY` for non-admin callers even if `customers.set_investor_visibility` is present. |
| v1.0.38 | 2026-06-26 | Investor Portal Phase 2 contracts: `InvestorVisibilityPatchSchema`, `InvestorAdminCreateSchema`, `InvestorAdminUpdateSchema`, `InvestorPasswordResetRequestSchema`, `InvestorPasswordResetConfirmSchema`. Staff routes: `GET /api/investor-visibility`, `PATCH /api/Partners/:id/investor-visibility`, `GET|POST|PATCH /api/admin/investors`. Public: `POST /api/investor/auth/password-reset-request`, `POST /api/investor/auth/password-reset`. Permissions: `customers.set_investor_visibility`, `investors.manage`. |
| v1.0.37 | 2026-06-26 | Investor Portal contract added: `/api/investor/auth/login`, `/api/investor/auth/me`, `/api/investor/clients`, `/api/investor/clients/:partnerId`. JWT payload `{ sub, type:'investor', lob }` signed with mandatory `INVESTOR_JWT_SECRET` (never `JWT_SECRET`). `InvestorClientResponseSchema` allow-list: `id, name, gender, birth_year, appointment_count, order_count, deposit_balance, outstanding_balance, status` only. Unflagged clients return 404. |

---

## 1. API Contracts

Cosmetic LOB mirror rule: when the frontend passes `lob: 'cosmetic'` to `apiFetch`, the client routes the same endpoint under `/api/cosmetic/*`. Mirrored handlers must run behind `requireLobScope('cosmetic')`, fixed `attachCosmeticDb`, `runWithLob('cosmetic')`, and `cosmetic.access`, then read/write `tcosmetic_demo` through request-scoped `getQuery(req)` or ALS-aware `query()`. `/api/cosmetic/*` ignores `?lob=` and `X-LOB` overrides by contract; cross-LOB admin reads must use a top-level `/api/*` route that explicitly accepts `lob`. Dental remains the default legacy `/api/*` path.

Source-traceability breadcrumb rule: API route files, frontend API clients, service functions, middleware, and migrations must keep a file-level `@crossref:domain[...]`, `@crossref:used-in[...]`, and `@crossref:uses[...]` triad that links the source file back to its product-map domain and test matrix. High-blast CTV/earnings/payment/payout/service-card/referral paths must also keep explicit `@crossref:endpoint[...]` or `@crossref:function[...]` markers for the owned endpoints or business functions. This is a documentation/verification contract only; v1.0.28 did not change any request fields, response fields, status codes, auth semantics, or database writes.

CTV self-dashboard rule: `GET /api/ctv/commission-summary`, `GET /api/ctv/referrals`, `GET /api/ctv/client-journeys`, `GET /api/ctv/hierarchy`, `GET /api/ctv/client-lookup`, `GET/PATCH /api/ctv/me`, and `POST /api/ctv/me/password` are mounted behind `ctv.dashboard.view` and are scoped to the authenticated CTV identity unless the route explicitly allows admin-assisted CTV creation/booking. Authenticated non-CTV staff must not receive or mutate another CTV's self data.

CTV Theo dõi / referrals contract (v0.37.18–0.37.20): `GET /api/ctv/referrals` discovers clients only from operational cards where `appointments.ctv_id` or `saleorders.ctv_id` equals the authenticated CTV, then filters each row with `computeCtvLink` so the latest winning card must also belong to that CTV. Another CTV's appointment/service cards never appear in the list or in `services[]`. Per-LOB claim windows are independent: merged rows expose `lob_links.dental` and `lob_links.cosmetic` with separate `link_active`, `eligible`, and `stage_progress`; top-level `link_*` fields are cleared when both LOBs are present. `referrals[].services` are viewer-owned commission lines only (`earnings WHERE recipient_partner_id = viewer`), not all saleorder lines on the client. `GET /api/ctv/client-journeys` delegates to the same card-based builder (legacy `{ clients }` shape). `POST /api/ctv/clients` and per-LOB booking/discount reclaim gates call `getReferralClaimStatus(clientId, lob)` for the target LOB only. Staff sale-order and appointment read responses expose authoritative `ctv_id` from `saleorders.ctv_id` / `appointments.ctv_id`, not `partners.referred_by_ctv_id`.

CTV discount QR rule (NK3): Public fan endpoints `GET /api/discount-codes/landing/:shortCode`, `GET /api/discount-codes/check-existing?ctvId=`, and unauthenticated fan `POST /api/discount-codes/generate` (body `{ ctvId }`) bypass the global `/api` `requireAuth` gate via `isPublicApiPath`. Authenticated CTV portal generation uses the same `POST /generate` with `forceNew: true` and `generationSource: 'ctv_portal'`. Staff endpoints `GET /lookup`, `GET /client-search`, and `POST /verify` require a non-CTV staff token (`S_STAFF_REQUIRED` when `is_ctv`). CTV self endpoints `GET /mine` and `GET /stats` require CTV self auth. `POST /verify` accepts `{ code, customerPhone, customerLob, customerPartnerId?, customerName?, createIfMissing? }`; when `customerPartnerId` is supplied, reclaim `referred_by_ctv_id` to the code's issuing CTV before marking `status='used'`. `GET /client-search` mirrors `GET /api/ctv/client-lookup` but compares claim ownership against the discount code's `ctv_partner_id`. Codes live in `tdental_demo.dbo.ctv_discount_codes` only. Default discount: 10% / 30 days / non-live until admin LIVE tier ships.

CTV discount QR verify-completion rule (v1.0.33): `POST /api/discount-codes/verify` transitions `claimed/active → checked_in → used`. The completion call (`markAsUsed: true` on a `checked_in` code) may omit `customerPartnerId`; the route prefers the customer bound at check-in (`row.customer_partner_id` + `row.customer_lob`) BEFORE any `createIfMissing` client resolution, so a wrong LOB selection or unmatched phone on the completion screen cannot create or rebind a different client (FM-20260610-02). Explicit `customerPartnerId` is still honored. All discount-codes POST bodies must be single-encoded JSON objects — `express.json` (strict) rejects double-encoded top-level strings with 400 (FM-20260610-01).

Admin CTV list rule: `GET /api/Ctvs` and `GET /api/cosmetic/Ctvs` return CTV identity rows with `source`, `legacy_code`, and `created_via`. Cosmetic mode filters to CTV rows whose `lob_scope` includes `cosmetic`; `source='legacy_ctv'` is derived from `created_via LIKE 'legacy_ctv_import%'`.

Admin commission navigation rule: `/commission?tab=config|ctvs|newClients|earnings|payouts&lob=<lob>` preserves the active CTV workflow step in the URL. `GET /api/Earnings` rows consumed by the admin UI may include `service_line_id?: string | null`; when present, the frontend may link to `/customers/:client_id?tab=records&serviceLineId=:service_line_id&from=commission&returnTab=earnings|payouts&lob=<lob>`. The link is read-only navigation only; it must not change earning status, payout status, payment state, or service-line data.

Admin New Clients rule: `GET /api/NewClients?lob=all|dental|cosmetic&date_from=&date_to=&limit=&offset=` and `GET /api/cosmetic/NewClients?date_from=&date_to=&limit=&offset=` are admin/`commissions.view.team` gated and return CTV-referred customers, not only unconverted leads. The top-level route may read the requested LOB scope; the Cosmetic mirror always forces `lob=cosmetic` from the route context and ignores query/header LOB overrides such as `?lob=all` or `X-LOB: dental`. The date filter applies to the customer referral timestamp (`partners.datecreated`). The response shape is:
```ts
{
  items: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    referred_at?: string;
    referring_ctv_id?: string;
    referring_ctv_name: string;
    referring_ctv_phone: string;
    lob: 'dental' | 'cosmetic';
    service_count: number;
    service_line_count: number;
    service_total: number;
    paid_total: number;
    earnings_count: number;
    commissioned_service_line_count: number;
    commission_total: number;
    service_missing_ctv_count: number;
    missing_commission: boolean;
    commission_status: 'lead' | 'missing_commission' | 'commission_recorded' | string;
  }>;
  totalItems: number;
  limit: number;
  offset: number;
}
```
The endpoint is read-only. The admin UI and `new-clients` Excel export may use these totals to flag referred clients with service revenue but missing COM; they must not mutate earnings, payouts, payments, saleorders, or partners from this report.

### 1.1 Auth

#### POST /api/Auth/login
When `COSMETIC_LOB_ENABLED=true`, login resolves identity from Dental first, then from Cosmetic only if no active Dental employee/CTV row matches the supplied identifier. The JWT records the auth-source LOB so `/api/Auth/me` can refresh the user and permissions from the same database.

**Request:**
```ts
{
  email: string;           // staff/admin email, or imported legacy CTV phone/ref code
  password: string;        // plaintext; bcrypt compared first, gated legacy CTV hash fallback second
  rememberMe?: boolean;    // default true on login UI → token expires 60d in localStorage; false → 24h in sessionStorage
}
```
**Response 200:**
```ts
{
  token: string;           // JWT signed with JWT_SECRET
  user: {
    id: string;            // partners.id (UUID)
    name: string | null;
    email: string;
	    companyId: string;     // primary branch
	    companyName: string;
	    lob_scope: Array<'dental' | 'cosmetic'>; // Admin can receive multiple; non-admin staff receive one visible LOB
	    is_ctv: boolean;
	  };
	  permissions: {
	    groupId: string | null;
	    groupName: string | null;
	    effectivePermissions: string[];  // e.g., ["customers.view", "appointments.add"]
	    locations: { id: string; name: string }[];
	  };
	  redirectTo: '/ctv' | null;
}
```
**Errors:** 400 (missing fields), 401 (invalid credentials), 429 (rate limited).

#### GET /api/Auth/me
**Headers:** `Authorization: Bearer <token>`
**Response 200:** Same shape as login `user` + `permissions`.

### 1.1A CTV Self Portal

All `/api/ctv/*` routes require `Authorization: Bearer <token>` and are self-scoped to `partners.id` from the authenticated CTV user. CTV aggregation is intentionally composed in API code with `getDb('dental')` and `getDb('cosmetic')`; no cross-database SQL join is allowed.

#### GET /api/ctv/me
**Response 200:**
```ts
{
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CTV';
}
```
The route reads the authenticated CTV partner row from Dental first, then Cosmetic. Frontend consumers mask phone/email before display.

#### PATCH /api/ctv/me
**Request:** `{ name: string }`.
**Response 200:** same shape as `GET /api/ctv/me`.
The route trims/collapses whitespace, rejects blank names and names over 120 characters, and updates only the authenticated CTV's `partners.name` row by UUID in Dental/Cosmetic when present.
**Errors:** `400 P_NAME_REQUIRED`, `400 P_NAME_TOO_LONG`, `404 P_CTV_NOT_FOUND`.

#### POST /api/ctv/me/password
**Request:**
```ts
{
  currentPassword: string;
  newPassword: string; // min 6 chars
}
```
**Response 200:** `{ success: true }`.
The route verifies the current password against bcrypt first, then the gated legacy CTV password fallback only for imported CTV rows. On success it writes a new bcrypt `password_hash` to the authenticated CTV's mirrored Dental/Cosmetic rows when present.
**Errors:** `400 P_PASSWORD_REQUIRED`, `400 P_PASSWORD_TOO_SHORT`, `401 P_PASSWORD_NOT_SET`, `401 P_CURRENT_PASSWORD_INVALID`, `404 P_CTV_NOT_FOUND`.

#### GET /api/ctv/client-journeys
**Response 200:**
```ts
{
  clients: Array<{
    id: string;
    name: string;
    phone?: string;
    lobs: Array<'dental' | 'cosmetic'>;
    referred_at: string;
    referred_via?: string;
    stage: 'referred' | 'visited' | 'serviced' | 'paid';
    stage_progress: 1 | 2 | 3 | 4;
    visit?: { date: string; time?: string; doctor?: string; location?: string };
    service?: { name: string | null; amount: number; date?: string; next_appointment?: string };
    payment?: { amount: number; date: string; method?: string; commission_earned: number; commission_rate?: string };
    total_earned: number;
    estimated_commission?: number;
  }>;
}
```

#### GET /api/ctv/hierarchy
**Response 200:**
```ts
{
  current: {
    id: string;
    name: string | null;
    phone?: string;
    email?: string | null;
    level: number;                 // 0 for the authenticated CTV
    lobs: Array<'dental' | 'cosmetic'>;
    directDownlineCount: number;
    clientCount: number;
    earnedAmount: number;
    joinedAt?: string | null;
  };
  upline: Array<CtvHierarchyNode>;  // nearest upline first
  downline: Array<CtvHierarchyNode>; // flattened recursive downline
  totals: {
    uplineCount: number;
    directDownlineCount: number;
    downlineCount: number;
  };
}
```

#### GET /api/ctv/client-lookup
**Query:** `phone` is required; `lob` defaults to `dental` unless set to `cosmetic`.
**Response 200:**
```ts
{
  exists: boolean;
  lob: 'dental' | 'cosmetic';
  clientId?: string;
  name?: string | null;
  claimed?: boolean;
  claimedByMe?: boolean;
  ownerName?: string | null;
  expiresAt?: string | null;
}
```
This route is read-only. When `exists=true`, `claimed=false`, and `name` is present, the first-party CTV sheet may prefill the name input. The authoritative referral-claim gate still runs on `POST /api/ctv/bookings`.

#### POST /api/ctv/bookings
**Request:** `clientId?`, `name?`, `phone`, `lob`, `date`, optional `time`, `companyId`, `productId`, `note`.
**Response 201:** `{ clientId: string; appointmentId: string }`.
`date` remains a required API field. The first-party CTV refer-client sheet supplies today's `Asia/Ho_Chi_Minh` date by default so mobile users do not submit a blank appointment date.
`companyId` is optional for CTV portal clients. The API resolves the appointment location from request `companyId`, then JWT `companyId`, then the selected LOB's active company fallback, deprioritizing QA/test/verify fixture location names behind real clinic locations; if none exists, it returns `400 B_COMPANY_REQUIRED` before changing the partner row.
When an existing partner row is accepted or reclaimed, the route updates that same row with `customer = true` before creating the appointment so the client is visible through admin customer search in the selected LOB. This route writes `dbo.appointments` only for the booking; selected `productId` is stored on the appointment and MUST NOT create `saleorders` or `saleorderlines`. If `productId` is omitted, the appointment uses the configured `commission_settings.referral_start_product_id` when that product is active in the selected LOB.
**Error 400:** active claims owned by another CTV return:
```ts
{
  error: {
    code: 'B_CLIENT_CLAIMED';
    message: string;
    ownerName?: string;
    owner_name?: string;
    expiresAt?: string;
    expires_at?: string;
  };
}
```
Both camelCase and snake_case fields are part of the compatibility contract for the refreshed CTV booking sheet.

### 1.1B Public CTV Landing Booking And Signup

The public Tâm landing route opens the CTV refer-client sheet and public CTV signup without requiring a logged-in session. These endpoints are mounted before the normal `/api` auth gate and must stay narrow: booking resolves the owning CTV by submitted phone number, runs the same active-claim gate, and creates only a partner/customer row plus an appointment; signup resolves the parent/upline CTV by referral code or submitted CTV phone before creating a CTV partner row.

#### GET /api/ctv-public/client-lookup
**Query:** `phone` required; `lob` defaults to `dental`; optional `ctvPhone` identifies the CTV context.
**Response 200:** same shape as `GET /api/ctv/client-lookup`: `{ exists, lob, clientId?, name?, claimed?, claimedByMe?, ownerName?, expiresAt? }`.

#### GET /api/ctv-public/ctv-lookup
**Query:** `phone` required.
**Response 200:** `{ exists: boolean; name: string | null }`.
This route is read-only and returns only whether the submitted phone resolves to an active, non-deleted CTV from Dental. It powers live verification for the public booking `ctvPhone` field and the public signup `uplinePhone` field before either form submits.
**Errors:** `400 VALIDATION`.

#### GET /api/ctv-public/services
**Query:** `lob` defaults to `dental`.
**Response 200:** `{ lob, services: Array<{ id: string; name: string; price: number | null; category?: { id: string; name: string | null } | null }> }`.

#### POST /api/ctv-public/bookings
**Request:** `ctvPhone`, `phone`, `lob`, `date`, optional `clientId`, `name`, `time`, `companyId`, `productId`, `note`.
**Response 201:** `{ clientId: string; appointmentId: string }`.
**Errors:** `400 VALIDATION`, `400 B_CLIENT_CLAIMED`, `404 P_CTV_NOT_FOUND`.
This public route MUST NOT create `saleorders` or `saleorderlines`; selected service metadata remains on `appointments.productid`.

#### GET /api/ctv-public/refcode/:code
**Response 200:** `{ ok: true; uplineId: string; uplineName: string | null }`.
**Errors:** `404 U_INVALID_CODE`.
This route reveals only the resolved CTV display identity for the public join page.

#### POST /api/ctv-public/join
**Request:**
```ts
{
  code?: string;        // referral-link signup, e.g. CTV-ABCDEF
  uplinePhone?: string; // direct landing signup; preferred when both fields are present
  name: string;
  phone: string;
  email: string;
  password: string;     // min 6 chars
}
```
**Response 201:** `{ ok: true; id: string; name: string; uplineName: string | null }`.
**Errors:** `400 VALIDATION`, `400 U_WEAK_PASSWORD`, `400 U_UPLINE_REQUIRED`, `400 U_DUPLICATE_PHONE`, `400 U_DUPLICATE_EMAIL`, `404 U_INVALID_CODE`, `404 U_INVALID_UPLINE`.
When `uplinePhone` is provided, the route resolves an active non-deleted `partners.is_ctv=true` row by phone and uses that CTV as `referred_by_ctv_id`. When only `code` is provided, it keeps the existing referral-code behavior. The new CTV inherits the upline's LOB scope.

### 1.1C Admin CTV Management

#### PUT /api/Ctvs/:id and PUT /api/cosmetic/Ctvs/:id
Admin-only full edit for an existing CTV.

**Request:**
```ts
{
  name?: string;
  phone?: string;
  email?: string;
  password?: string; // omitted or empty keeps the current password hash
}
```
Provided `name`, `phone`, and `email` fields must be non-empty. A provided non-empty `password` must be at least 6 characters and is stored as bcrypt, including for legacy CTV rows. Duplicate `phone`/`email` checks exclude the edited CTV's own mirrored Dental/Cosmetic row.

**Response 200:** `{ id, name, phone, email, lob_scope, active, referred_by_ctv_id, created_via }`.
**Errors:** 400 `U_INVALID_NAME`, `U_INVALID_PHONE`, `U_INVALID_EMAIL`, `U_WEAK_PASSWORD`, `U_DUPLICATE_PHONE`, `U_DUPLICATE_EMAIL`, or `VALIDATION`; 403 `S_FORBIDDEN`; 404 `S_NOT_FOUND`.

---

### 1.2 Appointments

#### GET /api/Appointments
**Query Params (snake_case on wire, camelCase accepted from frontend):**
```ts
{
  startDate?: string;      // ISO 8601 date
  endDate?: string;
  companyId?: string;      // location filter (frontend-side only; backend returns all)
  doctorId?: string;
  status?: string;         // comma-separated statuses
  offset?: number;         // pagination
  limit?: number;          // max 500 for normal lists; calendar-mode uses optimized path
  mode?: 'calendar';       // optional; skips count/aggregate for large ranges
}
```
**Response 200:**
```ts
PaginatedResponse<{
  id: string;
  name: string;            // AP000001
  date: string;            // YYYY-MM-DD
  time: string | null;
  partnerId: string;       // customer
  doctorId: string | null;
  companyId: string;
  state: AppointmentStatus;
  color: string | null;    // '0'..'7'
  timeExpected: number | null;
  productId: string | null;
  assistantId: string | null;
  dentalAideId: string | null;
  note: string | null;
}>
```

#### POST /api/Appointments
**Body:** `AppointmentCreateSchema` (from `@tgroup/contracts`)
```ts
{
  date: string;            // required, ISO 8601
  time?: string | null;
  partnerId?: string;      // customer UUID
  doctorId?: string | null;
  companyId?: string;
  note?: string | null;
  timeExpected?: number | null;  // 1..480
  color?: string | null;
  state?: AppointmentStatus | null;  // defaults 'confirmed'
  productId?: string | null;
  assistantId?: string | null;
  dentalAideId?: string | null;
}
```
**Response 201:** Created appointment row (same shape as GET item + `id`).

#### PUT /api/Appointments/:id
**Body:** `AppointmentUpdateSchema` (partial omit `id`)
```ts
{
  date?: string;
  time?: string | null;
  doctorId?: string | null;
  companyId?: string;
  note?: string | null;
  state?: AppointmentStatus | null;
  timeExpected?: number | null;
  color?: string | null;
  productId?: string | null;
  assistantId?: string | null;
  dentalAideId?: string | null;
}
```
**Response 200:** Updated row, including refreshed `companyid/companyname` when location changes.

**Validation (handler-level, in addition to Zod):**
- `companyId` (when present) must be a UUID; otherwise `400 INVALID_COMPANY_ID`.
- `companyId` (when present) must reference an existing `companies` row; otherwise `404 COMPANY_NOT_FOUND`.
- Persisted column: `appointments.companyid`. Test coverage: `api/src/routes/appointments/__tests__/mutationHandlers.test.js`.

Cosmetic mirror: `POST /api/cosmetic/Appointments` and `PUT /api/cosmetic/Appointments/:id` use the same request/response body and must validate `partnerId` / `companyId` against the cosmetic database.

---

### 1.3 Partners (Customers + Employees)

#### GET /api/Partners
**Query Params:**
```ts
{
  search?: string;         // accent-insensitive across name, phone, ref, appointment name
  companyId?: string;
  isCustomer?: boolean;
  isEmployee?: boolean;
  offset?: number;
  limit?: number;
}
```

#### POST /api/Partners
**Body (customer create):**
```ts
{
  name: string;
  phone?: string | null;
  email?: string | null;
  companyId?: string | null;
  ref?: string | null;           // customer code
  saleStaffId?: string | null;   // assigned sales employee
  sourceId?: string | null;      // hidden in UI but stored
  birthday?: number | null;      // blank, 0, or "0" normalizes to null
  birthmonth?: number | null;    // blank, 0, or "0" normalizes to null
  birthyear?: number | null;     // blank, 0, or "0" normalizes to null
  faceSubjectId?: string | null;
  // ... plus Odoo legacy fields
}
```

#### PUT /api/Partners/:id
**Body:** Partial partner fields. `ref` cannot be changed after creation (enforced by backend). Optional DOB parts (`birthday`, `birthmonth`, `birthyear`) accept blank, `0`, or `"0"` as legacy missing values and normalize them to `null` before backend validation; real out-of-range days/months still fail validation.

#### PATCH /api/Partners/:id/soft-delete
**Effect:** Sets `isdeleted = true`. Requires `customers.delete`.

#### PATCH /api/Partners/:id/investor-visibility
**Auth:** Requires `customers.set_investor_visibility`, Admin-class permission state, and backend location scope for the target customer. A non-admin employee with the permission string still receives `403 S_ADMIN_ONLY`; a branch admin targeting another branch receives `403 LOCATION_NOT_ALLOWED`.
**Body:** `{ investorId: string; isVisible: boolean }`
**Effect:** Upserts `dbo.investor_clients` for the active LOB and selected investor/customer pair. The target partner must be an active customer; the selected investor must be active and belong to the same LOB.
**Response 200:** `{ success: true, investorId: string, partnerId: string, isVisible: boolean, investorName: string }`

#### GET /api/investor-visibility
**Auth:** Same Admin-only and backend location-scope boundary as `PATCH /api/Partners/:id/investor-visibility`.
**Query:** `partnerIds=uuid,uuid&lob=dental|cosmetic` for the customer list batch column, or `partnerId=&investorId?` for one row.
**Response 200:** `{ success: true, batch: Record<string, InvestorVisibilityState[]> }` or `{ success: true, items: InvestorVisibilityState[] }`.

#### GET /api/investor/portfolio
**Auth:** Investor JWT only (`type:'investor'`, signed by `INVESTOR_JWT_SECRET`).
**Query:** `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`; omitted values default to today's Asia/Ho_Chi_Minh date, and ranges longer than 366 days or reversed ranges return `400 INVALID_DATE_RANGE`.
**Effect:** Reads only customers in `dbo.investor_clients` for the authenticated investor and LOB, then aggregates appointments, service orders, payments, deposits, and outstanding balances for the selected range.
**Response 200:** `{ success, dateFrom, dateTo, overview, clients, calendar, reports: { daily, byCustomer, appointmentStatus, byDoctor, byLocation, byService }, extraction }`.
**Privacy boundary:** `clients` uses the `InvestorClientResponseSchema` safe projection; `calendar` and report rows include operational totals and labels only, never phone, email, treatment notes, or non-allowlisted customers.

#### DELETE /api/Partners/:id/hard-delete
**Effect:** Physical row removal. Requires `customers.hard_delete`.

Cosmetic mirror: `GET/POST/PUT/PATCH/DELETE /api/cosmetic/Partners...` use the same contract and must validate `companyId` against cosmetic `dbo.companies`. Customer create/update clients must pass `lob: 'cosmetic'` when Cosmetic is selected.

#### Employee LOB client contract

The employee UI is a partners-backed workflow, but LOB routing is owned by the frontend API client. Frontend callers must pass the active `BusinessUnitContext.currentLOB` into employee and branch calls whenever the surface is LOB-aware.

```ts
type Lob = 'dental' | 'cosmetic';

fetchCompanies({ offset?: number; limit?: number; lob?: Lob })
createEmployee(data: CreateEmployeeData, lob?: Lob)
updateEmployee(id: string, data: Partial<CreateEmployeeData>, lob?: Lob)
```

Wire behavior:
- `lob: 'cosmetic'` maps `fetchCompanies` to `GET /api/cosmetic/Companies` and employee create/update to `/api/cosmetic/Employees`.
- `lob: 'dental'` or omitted `lob` keeps legacy dental routes (`/api/Companies`, `/api/Employees`).
- `EmployeeForm` and `EmployeeProfile` must use the active LOB so Cosmetic branch dropdowns and profile branch-name lookups never resolve through dental companies.

---

### 1.3A Sale Orders / Patient Service Records

`POST /api/SaleOrders` and `PATCH /api/SaleOrders/:id` create and edit patient service records. When called with `lob: 'cosmetic'`, the frontend routes these same contracts to `/api/cosmetic/SaleOrders` and the handler writes to `tcosmetic_demo`.

Frontend client payload:
```ts
{
  partnerid?: string;
  companyid?: string;
  productid?: string;
  productname?: string;
  doctorid?: string | null;
  assistantid?: string | null;
  dentalaideid?: string | null;
  quantity?: number | null;
  unit?: string | null;
  amounttotal?: number;
  datestart?: string | null;
  dateend?: string | null;
  notes?: string | null;
  tooth_numbers?: string | null;
  tooth_comment?: string | null;
  sourceid?: string | null; // UUID from current LOB customer sources only
}
```

`sourceid` is optional. The service UI must not send display-only fallback IDs such as `src-1`; invalid or stale source IDs are normalized to `null` before the client writes a sale order.

---

### 1.4 Payments

#### GET /api/Payments
**Query:** `customerId?`, `serviceId?`, `limit?`, `offset?`, `type? = payments|deposits|all`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` with allocation metadata where available.

#### GET /api/Payments/deposits
**Query:** `customerId?`, `dateFrom?`, `dateTo?`, `receiptNumber?`, `type?`, `limit?`, `offset?`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` scoped to deposit/refund rows.

#### GET /api/Payments/deposit-usage
**Query:** `customerId?`, `dateFrom?`, `dateTo?`, `limit?`, `offset?`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` for internal deposit usage rows.

#### GET /api/Payments/:id
**Auth:** Requires `payment.view`.
**Response:** Payment detail with allocations.

#### POST /api/Payments
**Auth:** Requires `payment.add`.
**Body:** `PaymentCreateSchema` (from `@tgroup/contracts`)
```ts
{
  customer_id: string;          // UUID
  service_id?: string | null;   // saleorder or dotkham id
  amount: number;               // positive
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string | null;
  payment_date?: string | null;
  reference_code?: string | null;
  status?: 'posted' | 'voided' | null;
  deposit_used?: number | null;
  cash_amount?: number | null;
  bank_amount?: number | null;
  deposit_type?: 'deposit' | 'refund' | 'usage' | null;
  receipt_number?: string | null;
  allocations?: Array<{
    invoice_id?: string | null;
    dotkham_id?: string | null;
    allocated_amount?: number;
  }> | null;
}
```
**Behavior:** If no allocations and no serviceId, backend classifies as `deposit` (see INV-004).

#### PATCH /api/Payments/:id
**Auth:** Requires `payment.add`.
**Body:** Partial `PaymentUpdateSchema` fields:
```ts
{
  amount?: number;
  method?: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string | null;
  payment_date?: string | null;
  reference_code?: string | null;
  status?: 'posted' | 'voided' | null;
  deposit_type?: 'deposit' | 'refund' | 'usage' | null;
  receipt_number?: string | null;
}
```
**Response:** Updated payment row. Backend rejects an empty update body.

#### DELETE /api/Payments/:id
**Auth:** Requires `payment.void`.
**Effect:** Blocks with `409 B_COMMISSION_PAID_OUT` when linked CTV earnings have `status='paid'` or `payout_id IS NOT NULL`. Otherwise reverses linked payment allocations against `saleorders.residual` or `dotkhams.amountresidual`; default soft mode writes negative earnings reversals and marks the payment `deleted`, while `?hard=true` removes pending earnings and the payment row.
**Response:** `{ success: true, id: string, mode: 'soft' | 'hard' }`

#### POST /api/Payments/:id/void
**Auth:** Requires `payment.void`.
**Body:** `{ reason?: string }`
**Effect:** Blocks with `409 B_COMMISSION_PAID_OUT` when linked CTV earnings have already been paid out. Otherwise marks payment `status = 'voided'`, writes negative earnings reversals, deletes linked allocations, and restores residuals.

#### POST /api/Payments/refund
**Auth:** Requires `payment.refund`.
**Body:** `{ customer_id: string; amount: number; method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed'; notes?: string | null; payment_date?: string | null }`
**Effect:** Creates a negative deposit-category payment row with `deposit_type = 'refund'`.

#### POST /api/Payments/:id/proof
**Auth:** Requires `payment.add`.
**Body:** `{ proofImageBase64: string; qrDescription?: string | null }`
**Behavior:** `proofImageBase64` must be a `data:image/*` URI.
**Response:** `{ success: true, proofId: string }`

Cosmetic mirror: `GET/POST/PATCH/DELETE /api/cosmetic/Payments...`, `/api/cosmetic/Payments/deposits`, and `/api/cosmetic/Payments/deposit-usage` use the same contract and operate only on cosmetic `dbo.payments` / `dbo.payment_allocations`.

#### DELETE /api/SaleOrderLines/:id
**Auth:** Requires `customers.edit` and `payment.void`.
**Effect:** Soft-deletes the active service line. If it is the last active line, soft-deletes the parent saleorder. If linked payment allocations exist, the route first enforces the CTV paid-out guard, then only auto-voids linked payments when the deleted line is the last active line on the order and every affected payment is allocated solely to that saleorder. When the NK3 service-card commission flag is on (`CTV_SERVICE_CARD_COMMISSION=true`), the route also calls `reverseServiceCardEarnings` to clear any pending service-card earnings (`earnings.payment_id IS NULL`) for this line, and blocks the reversal with `B_COMMISSION_PAID_OUT` (HTTP 409) when any service-card earnings for this line are already paid out.
**Response 200:** `{ success: true, id: string, orderId: string | null, deletedOrder: boolean, voidedPayments: string[], reversedAllocationTotal: number, reversedEarningsCount: number, reversedServiceCardEarningsCount: number }`
**Error 409:** `B_COMMISSION_PAID_OUT`, `B_PAYMENT_MIXED_ALLOCATIONS`, or `B_SERVICE_PAYMENT_REQUIRES_ORDER_VOID`.
Cosmetic mirror: `DELETE /api/cosmetic/SaleOrderLines/:id` uses the same contract against the cosmetic DB.

#### GET /api/CustomerBalance/:id
**Auth:** Authenticated route mounted through the app router.
**Response 200:**
```ts
{
  id: string;
  name: string;
  deposit_balance: number;
  outstanding_balance: number;
  total_deposited: number;
  total_used: number;
  total_refunded: number;
}
```
**Behavior:** Reads `partners`, `payments`, `saleorders`, and `dotkhams` in the request-scoped LOB database. Cosmetic callers must use `GET /api/cosmetic/CustomerBalance/:id`; otherwise the deposit summary cards can read dental balances for cosmetic customers. Deposit totals are based on `payments.payment_category = 'deposit'`; unallocated service/payment receipts are not treated as customer advances. `outstanding_balance` excludes cancelled and soft-deleted saleorders so removed service cards do not remain as customer debt.

#### POST /api/Products and PUT /api/Products/:id
**Auth:** Requires the service catalog permission enforced by the product route.
**Body:** Service catalog fields accepted by the active `products.js` route, including required `name`.
**Behavior:** Dental and cosmetic mirrors (`/api/cosmetic/Products...`) must persist the accent-insensitive search column as `namenosign = normalizeVietnamese(name)` on create and update.

---

### 1.5 External Checkups (Hosoonline)

#### GET /api/ExternalCheckups/:customerCode/health-checkups
**Headers:** `Authorization: Bearer <token>`
**Response 200:**
```ts
{
  patientExists: boolean;
  checkups: Array<{
    id: string;
    date: string;
    images: Array<{
      name: string;
      url: string;       // proxied through TGClinic; NOT direct hosoonline.com URL
    }>;
  }>;
}
```
**Behavior:** If `HOSOONLINE_USERNAME`/`PASSWORD` are configured, backend logs in to Hosoonline, searches by `customerCode`, and proxies image metadata. If credentials absent, falls back to `HOSOONLINE_API_KEY` contract.

---

### 1.6 Face Recognition

#### POST /api/face/register
**Body:** `multipart/form-data`
```ts
{
  partnerId: string;     // customer UUID
  image: File;           // JPEG/PNG, captured from camera
  source?: string;       // profile_register | no_match_rescue | candidate_confirmation
}
```
**Response 201:** `{ success: true; partnerId: string; sampleId: string; sampleCount: number; faceRegisteredAt: string }`

#### POST /api/face/re-register
**Body:** `multipart/form-data`
```ts
{
  partnerId: string;     // customer UUID
  images: File[];        // repeated field, 1-7 JPEG/PNG captures
  source?: string;       // defaults to profile_reregister
}
```
**Response 201:** `{ success: true; partnerId: string; sampleIds: string[]; sampleCount: number; faceRegisteredAt: string }`

#### POST /api/face/recognize
**Body:** `multipart/form-data` with `image: File`
**Response 200:**
```ts
{
  status: 'auto_matched' | 'candidates' | 'no_match' | 'ambiguous';
  match: null | {
    partnerId: string;
    name: string;
    code: string;
    phone: string | null;
    confidence: number;
  };
  candidates: Array<{
    partnerId: string;
    name: string;
    code: string;
    phone: string | null;
    confidence: number;
  }>;
  ambiguity: null | {
    code: 'AMBIGUOUS_FACE_MATCH';
    message: string;
    margin: number;
    requiredMargin: number;
    candidates: Array<{
      partnerId: string;
      name: string;
      code: string;
      phone: string | null;
      confidence: number;
    }>;
  };
  recognitionVersion: string | null; // e.g. face-recognition-0.39.5
}
```

Provider behavior:
- `FACE_RECOGNITION_PROVIDER=local` sends captures to `FACE_SERVICE_URL` for SFace embeddings and stores vectors in `dbo.customer_face_embeddings`.
- `FACE_RECOGNITION_PROVIDER=compreface` sends captures to CompreFace, uses `partners.id` as the CompreFace subject, and keeps `partners.face_subject_id` / `face_registered_at` as TGClinic status.
- `status: "ambiguous"` is a precision guard, not a match: when the best two plausible customer identities are closer than `FACE_AMBIGUOUS_MATCH_MARGIN` (default 0.06), the response returns `match: null`, `candidates: []`, `ambiguity.candidates` for audit/debug, and a `recognitionVersion`. Frontends must show a rescan-only state and must not let staff choose between those identities.
- CompreFace recognition calls use `limit=0`, `prediction_count=2`, and `det_prob_threshold=COMPREFACE_DET_PROB_THRESHOLD` (default 0.75) so TGClinic can see close identity ties and reject extra-face frames.
- Passive liveness / anti-spoofing (MiniFASNet, source-verified Silent-Face) runs on the **local** provider only, gated by `FACE_LIVENESS_ENABLED` (default **off**) with `FACE_LIVENESS_THRESHOLD` (default 0.5). It **fails open**: when the liveness models are absent or inference errors, the capture is allowed through. The internal face-service `POST /embed` response additionally carries `liveness: { available: true; isLive: boolean; score: number; label: number; value: number; threshold: number } | { available: false; enabled: boolean }`.

Face error responses:
```ts
{
  error: 'NO_FACE' | 'MULTIPLE_FACES' | 'LOW_QUALITY' | 'SPOOF_DETECTED' | 'MODEL_NOT_READY' | 'ENGINE_ERROR' | string;
  message: string;
}
```
- `NO_FACE` is HTTP 422 when the local provider or CompreFace cannot detect a face in the submitted image.
- `MULTIPLE_FACES` is HTTP 422 when the local provider or CompreFace detects more than one face in the submitted image.
- Frontend capture callers must keep the camera modal open on `NO_FACE`, show "Không phát hiện khuôn mặt" / "Face not detected", and dismiss capture only through an explicit close/cancel action.
- `SPOOF_DETECTED` is HTTP 422 from the local provider when liveness is enabled and the capture is judged a spoof (printed/screen photo). It gates both `/api/face/recognize` and `/api/face/register` (the embedding is never computed/stored for a spoof). Frontend surfaces the localized `customers:faceRecognition.spoofDetected` message.

#### GET /api/cross-lob-probe
Admin-only (permission `lob.crossview`) soft phone-identity probe across the two physical DBs. Restored after being dropped in the cosmetic-LOB merge.
**Query:** `phone=<string>&lob=dental|cosmetic` (the caller's current LOB).
**Response 200:**
```ts
{
  matched: boolean;
  otherLob: 'dental' | 'cosmetic';   // the probed LOB (opposite of `lob`)
  otherId?: string;                  // partner id in the other LOB (when matched)
  otherName?: string;
  matchedPhone?: string;
}
```
- Reads only the **other** LOB pool via `getDb(otherLob)`; matches on the last 9 phone digits (`RIGHT(REGEXP_REPLACE(phone,'\D','','g'),9)`, normalizing VN 84/0 prefixes). `400` on missing/invalid params; `500 { error: { code: 'PROBE_FAILED' } }` on DB error.
- Cross-cutting route (passes through `dentalLobGate`); gated solely by `requirePermission('lob.crossview')`.
- Consumers: the cross-LOB profile badge (`ProfileHeader`) and the **Face ID cross-LOB chooser** — when `/api/face/recognize` matches a customer who also exists in the other LOB, the quick-scan popover shows a chooser (open in current LOB, or the other LOB via a `?lob=` deep link in a new tab) instead of auto-navigating.

---

### 1.7 Permissions

#### GET /api/Permissions/resolve/:employeeId
**Response 200:**
```ts
{
  employeeId: string;
  effectivePermissions: string[];
  tierId: string | null;
  groupName: string | null;
}
```

---

### 1.8 Reports

All current `/api/Reports` endpoints use `POST`, require `reports.view`, and return:
```ts
{
  success: boolean;
  data?: unknown;
  error?: string;
}
```
Date-scoped endpoints accept `{ dateFrom?: 'YYYY-MM-DD'; dateTo?: 'YYYY-MM-DD'; companyId?: string }` unless noted.

Revenue recognition rule: paid revenue counts posted payment allocations linked to saleorders plus direct posted `payments.payment_category = 'payment'` receipts with no `payment_allocations` row, including imported receipts whose `service_id` is still blank. Deposits, refunds, deposit usage, and voided payments are excluded. The by-location report includes a synthetic unassigned row for paid receipts that cannot yet be attributed to a company. The by-source report attributes paid revenue by `COALESCE(saleorders.sourceid, partners.sourceid)` and includes an unassigned source row when no source is present.

| Endpoint | Body | `data` shape |
|---|---|---|
| `/api/Reports/revenue/summary` | Date scope | `{ orders: { state, cnt, total, paid, outstanding }[]; payments: { method, status, cnt, total }[] }` |
| `/api/Reports/revenue/trend` | Date scope | `{ month, orderCount, invoiced, paid, outstanding }[]` |
| `/api/Reports/revenue/by-location` | Date scope | `{ id, name, orderCount, invoiced, paid, outstanding }[]` |
| `/api/Reports/revenue/by-doctor` | Date scope | `{ id, name, orderCount, invoiced, paid }[]` |
| `/api/Reports/revenue/by-category` | Date scope | `{ id, category, lineCount, revenue }[]` |
| `/api/Reports/revenue/by-source` | Date scope | `{ id, name, orderCount, paid }[]` |
| `/api/Reports/revenue/payment-plans` | Date scope | `{ plans: { status, count, total, downPayment }[]; installments: { status, count, total, paid }[] }` |
| `/api/Reports/cash-flow/summary` | Date scope | `{ moneyIn, moneyOut, netCashFlow, internalDepositUsed, adjustments, categories[], trend[] }` |
| `/api/Reports/appointments/summary` | Date scope | `{ total, done, cancelled, completionRate, cancellationRate, conversionRate, states[], repeatCustomers, newCustomers }` |
| `/api/Reports/services/breakdown` | Date scope | `{ categories[], revenueByCategory[], revenueBySource[], popularProducts[] }` |
| `/api/Reports/employees/overview` | `{ companyId?: string }` | `{ roles, byLocation[], employees[] }` |
| `/api/Reports/customers/summary` | Date scope | `{ total, newInPeriod, gender[], cities[], topSpenders[], outstanding[], growth[] }` |
| `/api/Reports/locations/comparison` | `{ dateFrom?: string; dateTo?: string }` | `{ locations[], trend[] }` |
| `/api/Reports/doctors/performance` | Date scope | `{ id, name, totalAppointments, done, cancelled, revenue, unassigned? }[]` |

### 1.9 Exports

Operational exports are registry-driven (`api/src/services/exports/exportRegistry.js`), require a valid JWT, and filter visible/exportable types by the current employee's effective permissions.

#### GET /api/Exports/types
**Response 200:**
```ts
Array<{
  key: 'service-catalog' | 'customers' | 'appointments' | 'services' | 'payments' | 'report-sales-employees' | 'revenue-flat' | 'deposit-flat';
  label: string;
  permission: 'products.export' | 'customers.export' | 'appointments.export' | 'services.export' | 'payments.export' | 'reports.export';
}>
```

#### POST /api/Exports/:type/preview
**Body:**
```ts
{
  filters?: Record<string, string | number | boolean | null | undefined>;
}
```
**Response 200:**
```ts
{
  type: string;
  label: string;
  rowCount: number;
  filename: string;
  filters: Record<string, unknown>;  // original request filters
  summary: Array<{ label: string; value: string | number }>;
  exceedsMax: boolean;
}
```

#### POST /api/Exports/:type/download
**Body:** Same `{ filters }` wrapper as preview.
**Response 200:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` stream with `Content-Disposition` filename.
**Errors:** 400 unknown type or row-limit exceeded, 403 missing registry permission, 500 internal error.
**Timeout Requirement:** Nginx proxy read timeout >=300s (INV-019).

Supported registry types:

| Type | Permission | Filters |
|---|---|---|
| `service-catalog` | `products.export` | `search`, `companyId`, `categId`, `active` |
| `customers` | `customers.export` | `search`, `companyId`, `status` |
| `appointments` | `appointments.export` | `search` (appointment/customer fields including phone), `companyId`, `dateFrom`, `dateTo`, `state`, `doctorId`; workbook date prefers `appointments.date` + `time` before legacy `datetimeappointment` |
| `services` | `services.export` | `search`, `companyId`, `dateFrom`, `dateTo`, `state` |
| `payments` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo`, `status` |
| `report-sales-employees` | `reports.export` | `companyId`, `employeeType`, `employeeId`, `dateFrom`, `dateTo` |
| `revenue-flat` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo` |
| `deposit-flat` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo` |

---

### 1.10 Feedback

#### POST /api/Feedback
**Auth:** Any authenticated employee.
**Body:** `multipart/form-data` with `content?: string`, `pagePath?: string`, `screenSize?: string`, and repeated `files` image fields.
**Response 201:** Created feedback thread row.

#### POST /api/Feedback/my/:threadId/reply
**Auth:** Thread owner.
**Body:** `multipart/form-data` with `content?: string` and repeated `files` image fields.
**Response 201:** Created message with `attachments[]`.

#### POST /api/Feedback/all/:threadId/reply
**Auth:** Admin.
**Body:** `multipart/form-data` with `content?: string` and repeated `files` image fields.
**Response 201:** Created message with `attachments[]`.

Feedback attachment behavior:
- A request is valid when it has either non-empty `content` or at least one image file. File-only messages store `content = ''`.
- Message rows and `feedback_attachments` rows are committed in the same explicit database transaction.
- If the target thread is missing or a DB/attachment insert fails after upload, uploaded physical files are removed and no attachment row should remain committed.
- `DELETE /api/Feedback/all/:threadId` deletes DB rows inside one transaction, then removes physical files only after the DB commit succeeds.
- Stored attachment filenames must match the generated UUID image filename allowlist before any physical file deletion.

---

### 1.11 Telemetry (Public)

#### POST /api/telemetry/errors
**Auth:** None (public ingestion)
**Body:**
```ts
{
  errorMessage: string;
  stackTrace?: string;
  browserInfo?: string;
  url?: string;
  version?: string;
}
```
**Response 201:** `{ id: string }` (error_event row id)

---

### 1.12 Patient Portal Chat Support (AI + Human Escalation)

All endpoints require a valid patient JWT (`Authorization: Bearer <patient token>`) and are scoped to `req.patient.partnerId`. Inference and API keys remain server-side.

#### GET /api/patient/chat/sessions
**Response 200:**
```ts
{
  success: true;
  sessions: Array<{
    id: string;
    status: 'ai' | 'human' | 'closed';
    ticket_id?: string | null;
    created_at: string;
    updated_at: string;
  }>;
}
```

#### POST /api/patient/chat/sessions
**Response 201:** `{ success: true; session: ChatSession }`

#### GET /api/patient/chat/sessions/:id/messages
**Response 200:**
```ts
{
  success: true;
  messages: Array<{
    id: string;
    role: 'patient' | 'ai' | 'staff' | 'system';
    content: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  }>;
}
```

#### POST /api/patient/chat/sessions/:id/messages
**Body:** `{ content: string }`
**Response 200:**
```ts
{
  success: true;
  reply: string;
  escalated: boolean;
  reason?: string;
  ticketId?: string | null;
}
```
The route persists the patient message, retrieves top-5 KB chunks via pgvector, calls the LLM, persists the AI reply, and auto-escalates to a `support_tickets` row when escalation rules fire.

#### POST /api/patient/chat/sessions/:id/escalate
**Body:** `{ reason?: string }` (defaults to `'patient_requested'`)
**Response 200:** `{ success: true; ticketId: string }`

#### POST /api/patient/chat/sessions/:id/learn
**MVP only — patient-facing trigger.** Chunks the resolved conversation, redacts phone numbers, embeds it, and inserts into `support_kb_chunks` with `approved=false` pending staff review. In production this should move to a staff-only admin route.
**Response 200:** `{ success: true; chunksStored: number; chunkIds?: string[] }`

---

### 1.13 Patient Portal Media Bridge

All endpoints require a valid patient JWT and are scoped to `req.patient.partnerId`.
The mobile app calls only TGClinic `/api/patient/media`; NK Photo API keys remain
server-side in `MEDIA_SERVICE_URL` and `MEDIA_SERVICE_API_KEY`.

#### GET /api/patient/media
**Response 200:**
```ts
{
  success: true;
  client?: { id: string };
  media: Array<{
    id: string | number;
    media_service_id?: string;
    media_url?: string;
    signedUrl?: string;
    signedUrlExpiresAt?: string;
    category: string;
    type: string;
    label?: string;
    created_at?: string;
    mime_type?: string;
    file_size?: number;
    client_id?: string;
  }>;
}
```
When NK Photo is configured, the route searches media clients by the live partner
`id`, `ref`, and `phone`, then lists `/api/clients/:id/media`. Local
`dbo.patient_media` rows are still returned and signed when possible.

#### POST /api/patient/media
**Body:** multipart `file` or `image` or `photo`, optional `type`/`category`, `label`.
**Response 201:** `{ success: true; client: { id: string }; media: MediaItem }`

The backend creates the NK Photo client from the live `dbo.partners` row when no
matching client exists, uploads to `/api/clients/:id/media`, and best-effort caches
metadata in `dbo.patient_media`.

---

### 1.14 Patient Portal Treatments

All endpoints require a valid patient JWT and are scoped to `req.patient.partnerId`.

#### GET /api/patient/treatments
**Response 200:**
```ts
{
  success: true;
  treatments: Array<{
    id: string;
    name?: string;
    code?: string;
    state: 'draft' | 'pending' | 'sale' | 'completed' | 'done' | 'cancel';
    amounttotal: number;
    totalpaid: number;
    residual: number;
    datestart?: string;
    dateend?: string;
    notes?: string;
    datecreated?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    doctor_name?: string;
  }>;
}
```

#### GET /api/patient/treatments/:id
**Response 200:**
```ts
{
  success: true;
  treatment: {
    id: string;
    name?: string;
    code?: string;
    state: 'draft' | 'pending' | 'sale' | 'completed' | 'done' | 'cancel';
    amounttotal: number;
    totalpaid: number;
    residual: number;
    datestart?: string;
    dateend?: string;
    notes?: string;
    datecreated?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    doctor_name?: string;
    lines: Array<{
      id: string;
      product_name: string;
      price_unit: number;
      quantity: number;
      price_total: number;
    }>;
    visits: Array<{
      id: string;
      name?: string;
      date?: string;
      reason?: string;
      state?: string;
      note?: string;
      totalamount?: number;
      amountresidual?: number;
      doctor_name?: string;
      steps: Array<{
        id: string;
        dotkham_id: string;
        product_name: string;
        isdone: boolean;
        order: number;
      }>;
    }>;
  };
}
```

**Naming resolution:** `lines[].product_name` is resolved from `products.name`, then `saleorderlines.productname`, then `saleorderlines.name`, falling back to `"Dịch vụ"`. Visit step `product_name` uses the same precedence with fallback `"Bước"`. No field names or response shape changed; only the data resolution logic was hardened.

---

## 2. Cross-Module Function Signatures

### 2.1 apiFetch (Frontend → Backend Bridge)

**File:** `website/src/lib/api/core.ts`

```ts
async function apiFetch<T>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
    lob?: 'dental' | 'cosmetic';
  }
): Promise<T>
```
**Invariants:**
- `lob: 'cosmetic'` prefixes requests with `/cosmetic`; omitted or `dental` uses legacy `/api/*`.
- CamelCase keys in `params` are converted to snake_case on the wire (except `CAMEL_CASE_PASSTHROUGH` set).
- 401 responses clear `localStorage` token and dispatch `AUTH_UNAUTHORIZED_EVENT`.
- Structured errors are thrown as `ApiError` with `status`, `code`, `field`, `message`.

### 2.2 resolveEffectivePermissions (Backend Auth)

**File:** `api/src/services/permissionService.js`

```ts
async function resolveEffectivePermissions(employeeId: string): Promise<{
  effectivePermissions: string[];
  tierId: string | null;
  groupName: string | null;
}>
```
**Algorithm:**
1. Read `partners.tier_id`.
2. Read `group_permissions.permission_string` WHERE `group_id = tier_id`.
3. Read `permission_overrides` for employee; apply grants/revokes.
4. Return deduplicated array.

### 2.3 query (Database Access)

**File:** `api/src/db.js`

```ts
async function query(text: string, params?: any[]): Promise<any[]>
```
**Invariants:**
- Uses shared `pg.Pool`.
- `search_path=dbo` is set at connection level.
- DATE columns (OID 1082) return plain `YYYY-MM-DD` strings (no TZ shift).
- API process must run with `TZ=Asia/Ho_Chi_Minh` for consistent timestamp parsing.

---

## 3. Event Payloads

### 3.1 AUTH_UNAUTHORIZED_EVENT
**Type:** `CustomEvent` dispatched on `window`
**Payload:** None (event name is the signal)
**Consumers:** `AuthContext.tsx` (triggers logout redirect), `apiFetch` (dispatches on 401).

### 3.2 tgclinic:version-update
**Type:** `CustomEvent`
**Payload:** `{ current: string; latest: string }`
**Source:** `useVersionCheck.ts` polling `/version.json`.
**Consumer:** In-app update prompt banner.

---

## 4. Third-Party Integration Contracts

### 4.1 Compreface Face ID Provider

**Base URL:** `COMPREFACE_URL` env (default `http://compreface-api`)
**Provider switch:** `FACE_RECOGNITION_PROVIDER=compreface`
**Endpoints:**
- `GET /api/v1/recognition/subjects` — service health/key check
- `POST /api/v1/recognition/subjects` — create subject using `partners.id`
- `POST /api/v1/recognition/faces` — register face
- `POST /api/v1/recognition/recognize` — recognize face
- `DELETE /api/v1/recognition/subjects/:subjectId` — reset subject during re-registration
**Headers:** `x-api-key: COMPREFACE_API_KEY`
**Version:** 1.2.0 (Docker image `exadel/compreface:1.2.0`)
**Recognize query:** TGClinic sends `limit=0`, `prediction_count=2`, and `det_prob_threshold=COMPREFACE_DET_PROB_THRESHOLD` (default 0.75). More than one returned face is normalized to `MULTIPLE_FACES` 422; two close subject predictions are handled by the shared Face ID ambiguity gate.

### 4.2 Hosoonline

**Base URL:** `HOSOONLINE_BASE_URL` (default `https://hosoonline.com`)
**Auth Methods:**
1. Session-based: `POST /api/auth/login` → cookie jar → `GET /api/appointments/search` → `GET /api/appointments/image/:imageName`
2. API-key fallback: `X-API-Key: HOSOONLINE_API_KEY`
**Version:** v2 patient management uses underscore-prefixed paths (`/_create`, `/_search`) to avoid Caddy routing collision with staff UI `/patients`.

### 4.3 Google Places

**API Key:** `GOOGLE_PLACES_API_KEY` (server-side only; never exposed to browser)
**Usage:** `api/src/routes/places.js` proxies autocomplete requests to `https://maps.googleapis.com/maps/api/place/autocomplete/json`.

---

## 5. Shared TypeScript Contracts (`@tgroup/contracts`)

### 5.1 Appointments
```ts
// contracts/appointment.ts
export const AppointmentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().min(1),
  time: z.string().optional().nullable(),
  partnerid: z.string().uuid().optional(),
  doctorid: z.string().uuid().optional().nullable(),
  companyid: z.string().uuid().optional(),
  note: z.string().optional().nullable(),
  timeexpected: z.coerce.number().int().min(1).max(480).optional().nullable(),
  color: z.string().optional().nullable(),
  state: z.enum(["draft","scheduled","confirmed","arrived","in Examination","in-progress","done","cancelled"]).optional().nullable(),
  productid: z.string().uuid().optional().nullable(),
  assistantid: z.string().uuid().optional().nullable(),
  dentalaideid: z.string().uuid().optional().nullable(),
});
export const AppointmentCreateSchema = AppointmentBaseSchema.omit({ id: true });
export const AppointmentUpdateSchema = AppointmentBaseSchema.partial().omit({ id: true });
```

### 5.2 Payments
Live payment methods are `cash`, `bank_transfer`, `deposit`, and `mixed`. Do not add `card`, `momo`, `vnpay`, `zalopay`, or wallet aliases to the shared contract until backend storage, frontend forms, reports, exports, allocation math, and TestSprite coverage are promoted together.

```ts
// contracts/payment.ts
export const PaymentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash","bank_transfer","deposit","mixed"]),
  notes: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  reference_code: z.string().optional().nullable(),
  status: z.enum(["posted","voided"]).optional().nullable(),
  deposit_used: z.coerce.number().optional().nullable(),
  cash_amount: z.coerce.number().optional().nullable(),
  bank_amount: z.coerce.number().optional().nullable(),
  deposit_type: z.enum(["deposit","refund","usage"]).optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  allocations: z.array(z.object({
    invoice_id: z.string().uuid().optional(),
    dotkham_id: z.string().uuid().optional(),
    allocated_amount: z.coerce.number().optional(),
  })).optional().nullable(),
});
```

---

## 6. Deprecated / Frozen Contracts

| Contract | Status | Replacement | Removal Blocker |
|---|---|---|---|
| `/api/Account/Login` (`account.js`) | Frozen | `/api/Auth/login` | Unknown external clients (see `product-map/unknowns.md` #4) |
| `/api/Web/Session` (`session.js`) | Frozen | JWT auth | Unknown external clients |
| `/api/Services` (`services.js`) | Removed | `/api/Products` | File and mount deleted from NK3 (2026-06-14); was already unmounted and returned 500 due to missing `public.services` table |
| `APPOINTMENT_STATUS_LABELS_VI` | Deprecated | `APPOINTMENT_STATUS_I18N_KEYS` | Verify no active imports before removal |

---

## Contract Change Log

| Date | Version | Change | Commit |
|---|---|---|---|
| 2026-06-29 | v1.0.41 | Face ID recognize now carries `status`, `ambiguity`, and `recognitionVersion`; close two-identity matches are rescan-only and CompreFace multi-face detections normalize to `MULTIPLE_FACES`. | pending |
| 2026-06-06 | v1.0.28 | Added source-traceability breadcrumb contract markers for API/client/service surfaces; no payload shape changes. | pending |
| 2026-06-14 | v1.0.30 | `/api/Services` contract removed: dead route file and mount references deleted from NK3; endpoint was already unmounted. | pending |
| 2026-06-07 | v1.0.29 | Added Face ID liveness gate contract: `liveness` field on face-service `/embed`, new `SPOOF_DETECTED` 422 error code on recognize/register (local provider, default off, fail-open). | pending |
| 2026-06-07 | v1.0.30 | Restored `GET /api/cross-lob-probe` contract + documented the Face ID cross-LOB chooser consumer. | pending |
| 2026-05-17 | v1.0.1 | Aligned API contracts with live payment enum, reports endpoints, and export registry routes. | pending |
| 2026-05-13 | v1.0.0 | Initial contract freeze | feat/complete-documentation-stack |
| 2026-07-01 | v1.0.31 | Dead code cleanup: 8 dead route files deleted (account, session, receipts, journals, stockPickings, crmTasks, commissions, hrPayslips) + commented mount lines removed from server.js. Duplicate db/index.js deleted (db.js is SSOT with env-driven pool config + pool.on('error') handler). Dead API client services.ts removed. Superseded migrations 008 v1+v2 deleted (v3 canonical). No contract surface changes — all removed routes were already unmounted/non-functional. | pending |
| 2026-07-01 | v1.0.32 | JWT auth middleware factory: createJwtAuth shared boilerplate for investor + patient auth. CTV routes split into sub-modules (ctv/index.js, commission, clients, bookings, network, profile). No contract surface changes — same exported function names, same route paths. | pending |
| 2026-07-01 | v1.0.33 | API client: investorFetch merged into apiFetch with authTokenSource. Blob responseType added. Pagination constants centralized. i18n: 56 lines of duplicate keys removed (fallbackNS). Constants: STATUS_STYLE_MAP unified. Test helpers: shared routeTestHelpers.js. No API contract surface changes. | pending |
