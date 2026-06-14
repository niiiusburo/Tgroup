# TGroup API Index

> Exhaustive catalog of all backend endpoints.

## Legend
- **Auth:** `Public` = no token needed; `Auth` = valid JWT required; `Perm:X` = `requirePermission('X')` required
- **Body / Query:** summarized request parameters
- **Res:** summarized response shape

---

## Source Traceability Breadcrumbs

Every API route file, frontend API client, service function, middleware file, and migration in the NK3 coverage set must carry the site-wide `@crossref` breadcrumb triad back to its product-map domain, test matrix, and TestSprite plan. High-blast CTV/earnings/payment/payout/service-card/referral paths must also carry explicit `@crossref:endpoint[...]` or `@crossref:function[...]` markers for the owned endpoint or business function.

This 2026-06-06 breadcrumb pass did not add, remove, or reshape API endpoints, payload fields, auth semantics, status codes, or database writes. It only added source-level traceability and the `npm run verify:crossrefs` governance check.

## Auth (`/api/Auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/login` | Public | `{ email, password }` where `email` is an email address or imported legacy CTV phone/ref code | `{ token, user, permissions, redirectTo }`; when `COSMETIC_LOB_ENABLED=true`, Dental identity lookup runs first and Cosmetic lookup runs only if Dental has no matching row |
| GET | `/me` | Auth | — | `{ user, permissions }`; resolves the employee from the JWT auth-source LOB when present |
| POST | `/change-password` | Auth | `{ oldPassword, newPassword }` | `{ success, message }` |

## LOB & Business Unit (`/api/me` + context) — Cosmetic LOB v2

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/me/lob-scope` | Auth | — | `{ lob_scope: string[], is_ctv: boolean, default_lob }` |
| (augmented) | `GET /api/Auth/me` | Auth | — | User payload now includes `lob_scope[]` and `is_ctv` (affects login redirect and header toggle visibility) |

Note: All existing routes are now implicitly under a selected LOB via BusinessUnitContext. Cosmetic routes live under `/api/cosmetic/*` prefix and are distinct from dental. The `/api/cosmetic/*` prefix is fixed Cosmetic scope: query/header LOB overrides are ignored there, and cross-LOB reads must use top-level routes such as `/api/NewClients?lob=all`.

## Cosmetic (`/api/cosmetic/*`) — mirrors of all dental routes (gated by requireLobScope('cosmetic') + cosmetic.access)

All dental endpoints have exact cosmetic mirrors:

- `GET/POST/PUT/PATCH/DELETE /api/cosmetic/Partners` (and /check-unique, /resolve, /:id, KPIs, etc.)
- `GET/POST/PUT /api/cosmetic/Appointments` (and /:id)
- `GET/POST/PUT/DELETE /api/cosmetic/Products` + ProductCategories
- `GET/POST/PATCH/DELETE /api/cosmetic/Payments` + refunds, proofs, monthly plans
- `GET/POST/PUT/DELETE /api/cosmetic/Employees`
- `GET /api/cosmetic/Companies`
- `GET/POST/PATCH /api/cosmetic/SaleOrders` + lines
- `GET /api/cosmetic/DotKhams` etc.
- All report/export endpoints under cosmetic prefix when LOB=cosmetic
- Auth gates: requireLobScope('cosmetic') returns 403 S_LOB_FORBIDDEN when missing; plus permission strings (cosmetic.access etc.)
- Route context: `/api/cosmetic/*` forces Cosmetic DB context and ignores `?lob=` / `X-LOB` overrides; top-level routes own explicit `lob=all|dental|cosmetic` behavior.

**CTV commission referrer on service/appointment writes:** `POST/PATCH /api/SaleOrders` and `POST/PUT /api/Appointments` (and cosmetic mirrors) accept an optional `ctv_id` (UUID). When present it assigns that CTV as the customer's `partners.referred_by_ctv_id` (D13 priority #1 for earnings attribution) via `services/customerReferrer.setCustomerReferrer`. A null/empty/invalid `ctv_id` leaves the service CTV-less (`saleorders.ctv_id` NULL) and creates NO earnings — the old create-time inheritance of the customer's recorded referrer is removed (DEC-20260610-01, strict attribution). Full-price CTV earnings fire only for an explicit valid `ctv_id` when `CTV_SERVICE_CARD_COMMISSION=true`. Existing appointment/create assign paths remain assign-only and never clear an existing referrer. The CTV must exist as an `is_ctv=true`, active, non-deleted partner in the request's LOB DB (validated server-side; cross-LOB / unknown ids are rejected to avoid later earnings FK failures). Reads (`GET /api/SaleOrders`, `/SaleOrders/lines`, `/SaleOrders/:id`, `GET/POST/PUT /api/Appointments`) return the customer's current `ctv_id` for selector pre-fill.

**CTV account creation (SSOT):** `POST /api/ctv` (admin) and `POST /api/ctv-public/join` (public/portal) now have `email` optional in the contract (client types `email?: string`; backend accepts blank/omitted, skips duplicate-email check for blank, stores NULL; clean payload from SSOT omits falsy email). All creation UIs (admin AddCtv, CtvRecruitModal, public JoinCtv) delegate to the shared `CtvCreationForm`/`useCtvCreationForm` domain (see AGENTS.md §5.1, product-map/domains/ctv.yaml creation subsection, and the three @crossref sites). This eliminates prior duplication (email requirement + generic "Vui lòng nhập đầy đủ thông tin" errors) and provides the breadcrumb effect.

When `COSMETIC_LOB_ENABLED=false` the entire family returns 503.

## CTV Dashboard & Commission API (`/api/ctv`) — CTV role only (is_ctv + ctv.* permissions)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/ctv/commission-summary` | CTV (ctv.commission.view.self) | — | Aggregated payload: { pending: {total, dental, cosmetic, count}, paid, recent_activity[], by_service[] } with LOB pills on every row |
| GET | `/api/ctv/referrals` | CTV (ctv.referrals.view.self) | — | List of referred clients across both DBs with status (earning / no visit), totals earned, LOB pills |
| GET | `/api/ctv/hierarchy` | CTV (ctv.dashboard.view) | — | `{ current, upline[], downline[], totals }` for the portal Network tab; `downline[]` is a flattened recursive tree from Dental + Cosmetic CTV partner rows |
| GET | `/api/ctv/me` | CTV (ctv.dashboard.view) | — | Self profile from canonical CTV partner row: `{ id, name, email, phone, role: 'CTV' }`; frontend masks phone/email before rendering. |
| PATCH | `/api/ctv/me` | CTV (ctv.dashboard.view) | `{ name }` | Updated self profile; trims/collapses whitespace, rejects blank or >120-char names, and mirrors the CTV `partners.name` row by UUID in Dental/Cosmetic when present. Errors: `P_NAME_REQUIRED`, `P_NAME_TOO_LONG`, `P_CTV_NOT_FOUND`. |
| POST | `/api/ctv/me/password` | CTV (ctv.dashboard.view) | `{ currentPassword, newPassword }` | `{ success: true }` after verifying the current bcrypt or gated legacy CTV password, then writing a new bcrypt `password_hash` to mirrored CTV rows. Errors: `P_PASSWORD_REQUIRED`, `P_PASSWORD_TOO_SHORT`, `P_PASSWORD_NOT_SET`, `P_CURRENT_PASSWORD_INVALID`, `P_CTV_NOT_FOUND`. |
| GET | `/api/ctv/client-lookup` | CTV (ctv.dashboard.view) | `?phone=&lob=dental\|cosmetic` | Read-only LOB-specific phone check for the refer form: `{ exists, lob, clientId?, name?, claimed?, claimedByMe?, ownerName?, expiresAt? }`; the UI may autofill `name` only when the phone exists and remains claim-available. Authoritative claim gate remains `POST /api/ctv/bookings`. |
| POST | `/api/ctv` | CTV or admin | `{ name, phone, email?, password, lob_scope?, referred_by_ctv_id? (admin) }` | 201 created CTV. Closed signup (no public). `employee=true`, instant active; referred_by = caller (CTV) or body (admin). Email is optional; blank/omitted skips duplicate-email check and stores NULL. Dups → `U_DUPLICATE_PHONE`/`U_DUPLICATE_EMAIL` only when email supplied; non-CTV/non-admin → 403 `S_CTV_CREATE_FORBIDDEN` |
| POST | `/api/ctv/clients` | CTV or admin | `{ name, phone, lob }` | 201 referred customer in one LOB DB, `referred_by_ctv_id` = caller |
| POST | `/api/ctv/bookings` | CTV or admin | `{ clientId?, name?, phone, lob, date, time?, companyId?, productId?, note? }` | 201 `{ clientId, appointmentId }`. `date` is required by the API; the CTV refer-client UI pre-fills today's Asia/Ho_Chi_Minh date. Eligibility gate: `400 B_CLIENT_CLAIMED {ownerName, expiresAt}` if actively claimed by another CTV; company gate: `400 B_COMPANY_REQUIRED` if the selected LOB has no resolvable appointment company. Creates/re-claims client + appointment only after resolving `appointments.companyid` from body, JWT, or selected-LOB fallback. Re-claiming an existing partner sets `customer=true` so admin Customers can search the accepted client. Selected `productId` is stored on `appointments.productid`; if omitted, the active configured Referral Start product is used. Booking must not create a service card/saleorder/saleorderline. |
| (augmented) | `GET /api/Partners/resolve` & `GET /api/Partners/:id` | Auth | — | responses now include `referralClaim: { ownerCtvId, ownerName, active, expiresAt } | null` |
| (internal) | commission recipient resolution | — | — | Implements D13 priority: referred_by_ctv_id > active consultation card (cosmetic) > salestaffid (dental). Current NK3 model pays the resolved CTV recipient a flat product commission percent; no upline level split is paid unless a future contract reintroduces it. |

CTV users are hard-redirected to `/ctv` on login and receive 403 on any admin route.

## Public CTV Landing API (`/api/ctv-public`) — no login

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/ctv-public/client-lookup` | Public | `?phone=&lob=dental\|cosmetic&ctvPhone?=` | Read-only LOB-specific phone check for the no-login landing sheet: `{ exists, lob, clientId?, name?, claimed?, claimedByMe?, ownerName?, expiresAt? }`. `ctvPhone` is optional and is used only to tell whether an active claim belongs to that CTV. |
| GET | `/api/ctv-public/ctv-lookup` | Public | `?phone=` | Live CTV phone verification for public booking attribution and public signup upline fields: `{ exists, name }`. Returns only active, non-deleted `partners.is_ctv=true` rows from Dental; no auth or session state. |
| GET | `/api/ctv-public/services` | Public | `?lob=dental\|cosmetic` | `{ lob, services: [{ id, name, price, category? }] }` for the landing service picker. |
| POST | `/api/ctv-public/bookings` | Public | `{ ctvPhone, clientId?, name?, phone, lob, date, time?, companyId?, productId?, note? }` | 201 `{ clientId, appointmentId }`. Resolves an active non-deleted CTV by `ctvPhone`, then creates/reclaims the client and writes one appointment in the selected LOB. Active claim conflicts return `400 B_CLIENT_CLAIMED`; an unknown CTV phone returns `404 P_CTV_NOT_FOUND`. The route must not create `saleorders` or `saleorderlines`. |
| GET | `/api/ctv-public/refcode/:code` | Public | — | `{ ok, uplineId, uplineName }` for referral-link signup. Unknown/malformed codes return `404 U_INVALID_CODE`. |
| POST | `/api/ctv-public/join` | Public | `{ code?, uplinePhone?, name, phone, email, password }` | 201 `{ ok, id, name, uplineName }`. Direct `/ctv/join` signup resolves an active non-deleted parent CTV by `uplinePhone`; referral links may use `code`. Missing parent input returns `400 U_UPLINE_REQUIRED`; unknown phone returns `404 U_INVALID_UPLINE`; duplicate identity and weak password guards still apply. |

## CTV Discount QR (`/api/discount-codes`) — NK3 KOL parity

Mounted at `/api/discount-codes`. Public fan endpoints bypass the global `/api` `requireAuth` gate via `isPublicApiPath` in `api/src/middleware/publicApiPaths.js`. Frontend public fetches use absolute `API_URL` from `website/src/lib/api/core.ts` (not Vite-relative `/api`). Fan share link: `/ctv/discount/:shortCode` where `shortCode` is `CTV-{first6 of partner UUID}`; voucher QR encodes staff `/verify-discount?code=…`.

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/discount-codes/landing/:shortCode` | Public | — | `{ success, ctv: { id, name, shortCode, isLive, discountValue, discountType, expiryDays } }`; 404 when CTV not found |
| GET | `/api/discount-codes/check-existing` | Public | `?ctvId=` | `{ success, hasCode, code?, isExisting, discountValue, discountType, ctvName?, message? }` — reuses visitor session code when present |
| POST | `/api/discount-codes/generate` | Public (fan `{ ctvId }`) or CTV portal (`forceNew: true`, JWT) | `{ ctvId?, visitorName?, visitorPhone?, forceNew? }` | `{ success, code, isExisting, discountValue, discountType, discountLabel?, expiresAt?, ctvName?, shortCode?, message? }` |
| GET | `/api/discount-codes/mine` | CTV self | `?status=&startDate=&endDate=&page=&limit=` | `{ success, codes[], pagination }` — **Mã của tôi** history |
| GET | `/api/discount-codes/stats` | CTV self | — | `{ success, stats: { totalCodes, usedCodes, claimedCodes, checkedInCodes, conversionRate } }` |
| POST | `/api/discount-codes/ensure` | CTV self | — | `{ code, discountValue, discountType, status, expiresAt? }` — legacy single-code ensure |
| GET | `/api/discount-codes/lookup` | Staff (non-CTV) | `?code=` | `{ found, valid?, code, status?, discountValue?, discountType?, discountLabel?, ctvName?, expiresAt?, message? }` |
| GET | `/api/discount-codes/client-search` | Staff | `?phone=&lob=dental\|cosmetic&code=` | `{ exists, lob, clientId?, name?, phone?, claimed?, claimedByMe?, ownerName?, expiresAt?, hasService? }` — claim ownership vs code's `ctv_partner_id` |
| POST | `/api/discount-codes/verify` | Staff | `{ code, customerPhone, customerLob, customerPartnerId?, customerName?, createIfMissing?, markAsUsed? }` | `{ valid, code, status?, discountLabel?, ctvName?, customerName?, customerLob?, message?, usedAt?, checkedInAt? }`; first verify marks `checked_in`, `markAsUsed: true` completes to `used`. On a `checked_in` code the bound customer (`row.customer_partner_id` + `row.customer_lob`) takes precedence over `createIfMissing`/submitted LOB — completion never creates or rebinds a different client (FM-20260610-02); explicit `customerPartnerId` still honored; may reclaim `referred_by_ctv_id` |

Staff routes return `403 S_STAFF_REQUIRED` when the JWT belongs to a CTV user. Data store: `dbo.ctv_discount_codes` (dental DB only; migrations 062–065). All POST bodies are single-encoded JSON objects — `express.json` (strict) rejects double-encoded top-level strings with 400 (FM-20260610-01).

## Admin CTV & Commission config

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/Ctvs`, `/api/cosmetic/Ctvs` | admin (`ctv.manage`/`*`) | `?status=active\|suspended` | `{ ctvs: [{id, name, phone, email, lob_scope, active, referred_by_ctv_id, upline_name, source, legacy_code, created_via}] }`; cosmetic mount filters to Cosmetic-scoped CTVs and exposes `source='legacy_ctv'` for legacy imports |
| GET | `/api/Ctvs/options`, `/api/cosmetic/Ctvs/options` | Auth (any staff) | `?lob=dental\|cosmetic` | `{ ctvs: [{id, name, phone, lob_scope}] }` — active CTVs for the CTV selector in the Service/Appointment forms; LOB-filtered (cosmetic mount returns only Cosmetic-scoped CTVs) |
| PATCH | `/api/Ctvs/:id`, `/api/cosmetic/Ctvs/:id` | admin | `{ active: boolean }` | Updated CTV (suspend/reactivate); mirrors to cosmetic DB if present |
| PUT | `/api/Ctvs/:id`, `/api/cosmetic/Ctvs/:id` | admin | `{ name?, phone?, email?, password? }` | Full CTV profile edit. Empty provided identity fields are rejected; non-empty password is bcrypt-hashed; duplicate phone/email returns `U_DUPLICATE_PHONE`/`U_DUPLICATE_EMAIL`; mirrors to cosmetic DB when present. |
| GET | `/api/Ctvs/:id/hierarchy`, `/api/cosmetic/Ctvs/:id/hierarchy` | admin (`ctv.manage`/`*`) | — | Upline chain + flat downline for an arbitrary CTV (`CtvHierarchyResponse`: `{ current, upline[], downline[], totals: { uplineCount, downlineCount, directDownlineCount } }`, nodes camelCase `joinedAt`/`directDownlineCount`/`lobs`). Reuses `ctvNetwork.getCtvHierarchy` (same builder as the self-portal `/api/ctv/hierarchy`); spans both LOB DBs so the result is LOB-independent. Powers the admin CTV tab's click-to-expand. `:id` is a JS filter key only (not interpolated into SQL). |
| GET | `/api/CommissionConfig`, `/api/cosmetic/CommissionConfig` | Auth | — | `{ levels: [{level,label,enabled,share_percent}], defaultReferralPercent }` |
| PUT | `/api/CommissionConfig`, `/api/cosmetic/CommissionConfig` | admin (`commission.config.manage`/`*`) | `{ levels[], defaultReferralPercent }` | Upserts config; enabled-sum > 100 → 400 `B_LEVEL_SUM_EXCEEDS_100` |
| GET | `/api/NewClients` | admin (`commissions.view.team`/`*`) | `?lob=all\|dental\|cosmetic&date_from=&date_to=&limit=&offset=` | Referral audit list across requested LOB DBs: `{ items: [{ id, name, phone, email, referred_at, referring_ctv_id, referring_ctv_name, referring_ctv_phone, lob, service_count, service_line_count, service_total, paid_total, earnings_count, commissioned_service_line_count, commission_total, service_missing_ctv_count, missing_commission, commission_status }], totalItems, limit, offset }`. Converted referrals remain visible; report is read-only. |
| GET | `/api/cosmetic/NewClients` | admin + `cosmetic.access` + Cosmetic LOB scope | `?date_from=&date_to=&limit=&offset=` | Cosmetic mirror of the referral audit. Forces `lob=cosmetic` from the `/api/cosmetic/*` route context even if a query attempts `lob=all`; same response shape as `/api/NewClients`. |

## Earnings & Payouts (`/api/Earnings`, `/api/Payouts`) — admin / `commissions.*`

Earnings (the CTV commission ledger) and Payouts (manual payout cycles that settle them) are **not** LOB-mirror routes — they live at the base path and take `lob` as a query/body field. Each payout is scoped to ONE LOB: the `dbo.payouts` row and the `dbo.earnings` it settles live in that LOB's database (no cross-DB SQL).

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/Earnings` | Auth (`commissions.view.team`/admin) | `?lob=dental\|cosmetic\|all, status, ctvId, clientId, dateFrom, dateTo, limit, offset` | `{ items[], totalItems, totals: { amount, byLob }, limit, offset }`. Reads both DBs when `lob=all`/omitted; merges in the API layer. Each item may include `service_line_id`; admin UI uses it only for read-only drilldown to `/customers/:client_id?tab=records&serviceLineId=:service_line_id&from=commission`. |
| GET | `/api/Payouts` | Auth (`commissions.payout.run`/admin) | `?lob=dental\|cosmetic, limit, offset` | `{ items: PayoutRow[], totalItems, limit, offset }`. Each `PayoutRow`: `{ id, lob, cycle_label, paid_at, total_amount, notes, receipt_url, receipt_uploaded_at, created_by_partner_id, created_by_name, earnings_count, created_at }`. Reads the LOB's `dbo.payouts`. |
| POST | `/api/Payouts` | Auth (`commissions.payout.run`/admin) | `{ lob, earningIds[], cycleLabel, notes?, receipt_url? }` | `201 PayoutRow`. In one transaction: locks the given earnings `FOR UPDATE`, requires **all** still `pending` (else `409 B_EARNINGS_NOT_PAYABLE`), inserts the payout (`paid_at=now()`), flips those earnings to `status='paid'` with `payout_id`. Bad `lob` → `400 U_INVALID_LOB`; empty `earningIds`/`cycleLabel` → `400 U_INVALID_INPUT`. |
| POST | `/api/Payouts/upload-receipt` | Auth (`commissions.payout.run`/admin) | multipart, field `receipt` (image, ≤5 MB) | `{ url }` (e.g. `/uploads/payouts/<uuid>.jpg`). Stored on disk via multer + sharp-compressed; served by `express.static` at `/uploads/payouts` (nginx proxies `/uploads/payouts`). |
| PATCH | `/api/Payouts/:id` | Auth (`commissions.payout.run`/admin) | `{ receipt_url, lob? }` | Updated `PayoutRow` with `receipt_url` + `receipt_uploaded_at=now()`. Missing payout → `404 S_NOT_FOUND`. Used to attach a receipt to an existing cycle. |

## Account (`/api/Account`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/Login` | Public | unknown | unknown (legacy?) |
| POST | `/Logout` | Auth? | — | unknown |

## Appointments (`/api/Appointments`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?partner_id, offset, limit, search, sortField, sortOrder, date_from/dateFrom, date_to/dateTo, state, company_id/companyId, doctor_id/doctorId` | `PaginatedResponse<Appointment> + aggregates` |
| GET | `/:id` | Auth | — | Appointment detail |
| POST | `/` | Perm:`appointments.add` | `{ date, time, partnerId/partnerid, doctorId/doctorid, companyId/companyid, note, timeExpected/timeexpected, color, state, productId/productid }` | Created appointment |
| PUT | `/:id` | Perm:`appointments.edit` | `{ date, doctorId/doctorid, companyId/companyid, note, state, timeExpected/timeexpected, color, time, productId/productid, assistantId/assistantid, dentalAideId/dentalaideid }` | Updated appointment, including refreshed `companyid/companyname` when clinic/location changes |

PUT handler-level validation: `companyId` (when present) must be a UUID (`400 INVALID_COMPANY_ID`) and reference an existing `companies` row (`404 COMPANY_NOT_FOUND`); persisted to `appointments.companyid`. Covered by `api/src/routes/appointments/__tests__/mutationHandlers.test.js`.

## Partners / Customers (`/api/Partners`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId` | `PaginatedResponse<Partner>` |
| GET | `/check-unique` | Auth | `?field, value` (e.g. phone, email) | `{ available: boolean }` |
| GET | `/resolve` | Perm:`customers.view` | `?key` (UUID, customer ref, or normalized phone) | `{ matchedBy, partner }`, 404 `CUSTOMER_NOT_FOUND`, or 409 `CUSTOMER_LOOKUP_AMBIGUOUS` with candidates |
| GET | `/:id` | Perm:`customers.view` | — | Partner detail |
| GET | `/:id/GetKPIs` | Perm:`customers.view` | — | KPI stats |
| POST | `/` | Perm:`customers.add` | Partner fields | Created partner |
| PUT | `/:id` | Perm:`customers.edit` | Partner fields | Updated partner |
| PATCH | `/:id/soft-delete` | Perm:`customers.delete` | — | Soft-deleted partner |
| DELETE | `/:id/hard-delete` | Perm:`customers.hard_delete` | — | Hard-deleted partner |

Partner create/update contract note: optional `birthday`, `birthmonth`, and `birthyear` accept legacy missing values as blank, `0`, or `"0"` and normalize them to `null` before validation. Valid non-null day/month values remain bounded to real calendar ranges.

## Employees (`/api/Employees`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId, active=true|false|all` | `PaginatedResponse<Employee>`; default is active-only, edit-form assignment hydration must request `active=all` |
| GET | `/:id` | Auth | — | Employee detail |
| POST | `/` | Perm:`employees.edit` | Employee fields | Created employee |
| PUT | `/:id` | Perm:`employees.edit` | Employee fields | Updated employee |
| DELETE | `/:id` | Perm:`employees.edit` | — | Deleted employee |

Cosmetic LOB mirror: Employee UI callers must pass active `lob` into `createEmployee` and `updateEmployee`; when `lob='cosmetic'`, these same contract shapes route through `POST /api/cosmetic/Employees` and `PUT /api/cosmetic/Employees/:id`.

## Products / Services Catalog (`/api/Products`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, type, categId, active, companyId, saleOK` | `PaginatedResponse<Product>` |
| GET | `/:id` | Auth | — | Product detail |
| POST | `/` | Perm:`services.edit` | `{ name, defaultcode, type, listprice, categid, uomname, companyid, canorderlab }` | Created product |
| PUT | `/:id` | Perm:`services.edit` | Product fields | Updated product |
| DELETE | `/:id` | Perm:`services.edit` | — | 204 or 409 if linked records exist |

POST/PUT must write the accent-insensitive search column as `namenosign = normalizeVietnamese(name)` in both dental `/api/Products` and cosmetic `/api/cosmetic/Products`.

## Product Categories (`/api/ProductCategories`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search` | `PaginatedResponse<Category>` |
| POST | `/` | Perm:`services.edit` | `{ name, parentid }` | Created category |
| PUT | `/:id` | Perm:`services.edit` | Category fields | Updated category |
| DELETE | `/:id` | Perm:`services.edit` | — | Deleted category |

## Sale Orders (`/api/SaleOrders`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`services.view` | `?offset, limit, search, customerId, companyId, date_from, date_to, state` | `PaginatedResponse<SaleOrder>` |
| GET | `/lines` | Perm:`services.view` | `?partner_id` required, `offset, limit, sortField, sortOrder` | Customer service lines with payment/order metadata |
| GET | `/:id` | Perm:`services.view` | — | Sale order detail |
| POST | `/` | Perm:`customers.edit` | `{ partnerid, companyid, productid, amounttotal, ctv_id? ... }` | Created sale order. If `ctv_id` is absent/null/invalid and the customer has an active recorded `referred_by_ctv_id`, the create path inherits that CTV, writes it to `saleorders.ctv_id`, and creates full-price CTV earnings when service-card commission is enabled. |
| PATCH | `/:id` | Perm:`customers.edit` | Order fields; quantity, service, tooth, and price fields also sync to the primary rendered sale-order line | Updated sale order |
| PATCH | `/:id/state` | Perm:`customers.edit` | `{ new_state }` | State updated + audit log |

## Sale Order Lines (`/api/SaleOrderLines`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, companyId, dateFrom, dateTo, state, partnerId` | `PaginatedResponse<SaleOrderLine> + aggregates` |
| DELETE | `/:id` | Perm:`customers.edit` + Perm:`payment.void` | — | `{ success, id, orderId, deletedOrder, reversedPayments[], reversedEarningsCount, reversedServiceCardEarningsCount }`; soft-deletes the line, soft-deletes the parent order if no active lines remain, and reverses eligible unpaid CTV earnings. When the NK3 service-card commission flag is on (`CTV_SERVICE_CARD_COMMISSION=true`), also calls `reverseServiceCardEarnings` to clear pending service-card earnings (`earnings.payment_id IS NULL`) for this line; blocks with `B_COMMISSION_PAID_OUT` if any service-card earnings are already paid out. Linked paid client payments are auto-voided only when the line is the last active order line, allocations belong only to that order, and the related CTV commission has not been paid out. Blocks with `B_COMMISSION_PAID_OUT`, `B_SERVICE_PAYMENT_REQUIRES_ORDER_VOID`, or `B_PAYMENT_MIXED_ALLOCATIONS` when deleting would break payment/commission traceability. |

## Dot Khams (`/api/DotKhams`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?partner_id, offset, limit, search, sortField, sortOrder` | `PaginatedResponse<DotKham> + aggregates` |
| GET | `/:id` | Auth | — | Dot kham detail with `steps[]` |

## Payments (`/api/Payments`)

Live `method` values are `cash`, `bank_transfer`, `deposit`, and `mixed`. VietQR is a UI/entry alias that posts `bank_transfer`; card and e-wallet labels are not live API values until contracts, reports, exports, allocation logic, and docs are updated together.

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`payment.view` | `?customerId, serviceId, limit, offset, type` (`payments` \| `deposits` \| `all`) | `{ items[], totalItems }` (+ legacy fallback) |
| GET | `/deposits` | Perm:`payment.view` | `?customerId, dateFrom, dateTo, receiptNumber, type, limit, offset` | `{ items[], totalItems }` |
| GET | `/deposit-usage` | Perm:`payment.view` | `?customerId, dateFrom, dateTo, limit, offset` | `{ items[], totalItems }` |
| GET | `/:id` | Perm:`payment.view` | — | Payment with allocations |
| POST | `/` | Perm:`payment.add` | `{ customer_id, service_id, amount, method: cash\|bank_transfer\|deposit\|mixed, notes, payment_date, reference_code, status, deposit_used, cash_amount, bank_amount, deposit_type, receipt_number, allocations[] }` | Created payment |
| POST | `/refund` | Perm:`payment.refund` | `{ customer_id, amount, method, notes, payment_date }` | Created refund |
| PATCH | `/:id` | Perm:`payment.add` | `{ amount, method: cash\|bank_transfer\|deposit\|mixed, notes, payment_date, reference_code, status, deposit_type, receipt_number }` | Updated payment |
| DELETE | `/:id` | Perm:`payment.void` | — | `{ success, id }` + reverses allocations |
| POST | `/:id/void` | Perm:`payment.void` | `{ reason }` | `{ success, payment }` + reverses allocations |
| POST | `/:id/proof` | Perm:`payment.add` | `{ proofImageBase64, qrDescription }` | `{ success, proofId }` |

## Monthly Plans (`/api/MonthlyPlans`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`payment.view` | `?customerId, limit, offset` | `{ items[], totalItems }` |
| GET | `/:id` | Perm:`payment.view` | — | Plan detail |
| POST | `/` | Perm:`payment.edit` | Plan fields | Created plan |
| PUT | `/:id` | Perm:`payment.edit` | Plan fields | Updated plan |
| DELETE | `/:id` | Perm:`payment.edit` | — | Deleted plan |
| PUT | `/:id/installments/:installmentId/pay` | Perm:`payment.edit` | — | Paid installment |

## Customer Balance (`/api/CustomerBalance`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/:id` | Auth | — | `{ id, name, deposit_balance, outstanding_balance, total_deposited, total_used, total_refunded }`; cosmetic mirror reads request-scoped cosmetic DB at `/api/cosmetic/CustomerBalance/:id`; `outstanding_balance` excludes cancelled and soft-deleted saleorders |

## Customer Receipts (`/api/CustomerReceipts`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, customerId, companyId` | `PaginatedResponse<Receipt>` |
| GET | `/:id` | Auth | — | Receipt detail |

## Customer Sources (`/api/CustomerSources`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search` | `PaginatedResponse<Source>` |
| GET | `/:id` | Auth | — | Source detail |
| POST | `/` | Perm:`settings.edit` | `{ name, description, is_active }` | Created source |
| PUT | `/:id` | Perm:`settings.edit` | Source fields | Updated source |
| DELETE | `/:id` | Perm:`settings.edit` | — | Deleted source |

## Companies / Locations (`/api/Companies`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search` | `PaginatedResponse<Company>` |

Cosmetic LOB mirror: LOB-aware employee and location UI surfaces must call `GET /api/cosmetic/Companies?offset=0&limit=50` when active `lob='cosmetic'`; omitted/dental LOB keeps legacy `GET /api/Companies`.

## Permissions (`/api/Permissions`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/groups` | Perm:`permissions.view` | — | Permission groups array |
| POST | `/groups` | Perm:`permissions.edit` | `{ name, color, description, permissions[] }` | Created group |
| PUT | `/groups/:groupId` | Perm:`permissions.edit` | `{ name, color, description, permissions[] }` | Updated group |
| GET | `/employees` | Perm:`permissions.view` | — | Employee permission assignments, including employee email for admin search/display |
| PUT | `/employees/:employeeId` | Perm:`permissions.edit` | `{ groupId, locScope, locationIds[], overrides{grant[],revoke[]} }` | Updated assignment |
| GET | `/resolve/:employeeId` | Perm:`permissions.view` | — | Effective permissions breakdown |

## Reports (`/api/Reports`)

Revenue paid totals count posted `payment_allocations` linked to saleorders plus direct posted `payment_category = 'payment'` service receipts with no allocation rows yet. Deposits, refunds, deposit usage, and voided rows are excluded. Source attribution uses sale-order source first, then customer source fallback.

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/dashboard` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | Dashboard KPIs |
| POST | `/revenue/summary` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { orders[], payments[] } }` |
| POST | `/revenue/trend` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ month, orderCount, invoiced, paid, outstanding }] }` |
| POST | `/revenue/by-location` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, orderCount, invoiced, paid, outstanding }] }` |
| POST | `/revenue/by-doctor` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, orderCount, invoiced, paid }] }` |
| POST | `/revenue/by-category` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, category, lineCount, revenue }] }` |
| POST | `/revenue/by-source` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, orderCount, paid }] }` |
| POST | `/revenue/payment-plans` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { plans[], installments[] } }` |
| POST | `/revenue/rules` | Perm:`reports.view` | — | Revenue recognition rule metadata |
| POST | `/cash-flow/summary` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { moneyIn, moneyOut, netCashFlow, internalDepositUsed, adjustments, categories[], trend[] } }` |
| POST | `/appointments/summary` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { total, done, cancelled, completionRate, cancellationRate, conversionRate, states[], repeatCustomers, newCustomers } }` |
| POST | `/appointments/trend` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { trend[], peakHours[] } }` |
| POST | `/doctors/performance` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, totalAppointments, done, cancelled, revenue, unassigned? }] }` |
| POST | `/customers/summary` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { total, newInPeriod, gender[], cities[], topSpenders[], outstanding[], growth[] } }` |
| POST | `/employees/overview` | Perm:`reports.view` | `{ companyId? }` | `{ success, data: { roles, byLocation[], employees[] } }` |
| POST | `/services/breakdown` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { categories[], revenueByCategory[], revenueBySource[], popularProducts[] } }` |
| POST | `/locations/comparison` | Perm:`reports.view` | `{ dateFrom?, dateTo? }` | `{ success, data: { locations[], trend[] } }` |

## Operational Exports (`/api/Exports`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/types` | Auth | — | Export types visible to the current user's effective permissions |
| POST | `/:type/preview` | Auth + registry permission | `{ filters }`; `type` is `service-catalog`, `customers`, `appointments`, `services`, `payments`, `report-sales-employees`, `revenue-flat`, or `deposit-flat` | `{ type, label, rowCount, filename, filters, summary, exceedsMax }` + best-effort `exports_audit` row |
| POST | `/:type/download` | Auth + registry permission | `{ filters }`; same type keys as preview | XLSX workbook stream + best-effort `exports_audit` row after response |

Export permissions are defined by `api/src/services/exports/exportRegistry.js`: `customers.export`, `appointments.export`, `services.export`, `payments.export`, `products.export`, and `reports.export`. `appointments` accepts `search`, `companyId`, `dateFrom`, `dateTo`, `state`, and `doctorId`; its search includes customer phone and its workbook date must prefer `appointments.date`/`time` before falling back to legacy `datetimeappointment`. `report-sales-employees` accepts `companyId`, `employeeType` (`doctor`, `assistant`, `consultant`, `sales`), optional `employeeId`, `dateFrom`, and `dateTo`; `revenue-flat` and `deposit-flat` use `payments.export` with `search`, `companyId`, `dateFrom`, and `dateTo`. `revenue-flat` includes payment note and resolves customer source from sale order first, then customer fallback; `deposit-flat` includes deposit note and splits cash vs bank-transfer amounts from explicit split columns or payment method fallback.

## Dashboard Reports (`/api/DashboardReports`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/GetSumary` | Perm:`reports.view` | `{ widget, dateFrom, dateTo, companyId }` | Widget data |

## System Preferences (`/api/SystemPreferences`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`settings.view` | `?offset, limit, search, category` | `PaginatedResponse<Pref>` |
| GET | `/:key` | Perm:`settings.view` | — | Single pref |
| POST | `/` | Perm:`settings.edit` | `{ key, value, description, is_public }` | Created pref |
| PUT | `/:key` | Perm:`settings.edit` | Pref fields | Updated pref |
| DELETE | `/:key` | Perm:`settings.edit` | — | Deleted pref |
| POST | `/bulk` | Perm:`settings.edit` | `{ prefs[] }` | Bulk updated |

## Bank Settings (`/api/settings`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/bank` | Perm:`settings.view` | — | `{ bank_bin, bank_number, bank_account_name, updated_at }` |
| PUT | `/bank` | Perm:`payment.edit` | `{ bank_bin, bank_number, bank_account_name }` | Updated settings |

## IP Access (`/api/IpAccess`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/settings` | Perm:`settings.view` | — | `{ id, mode, lastUpdated }` |
| PUT | `/settings` | Perm:`settings.edit` | `{ mode: allow_all\|block_all\|whitelist_only\|blacklist_block }` | Updated settings |
| GET | `/entries` | Perm:`settings.view` | — | `{ entries: IpAccessEntry[] }` |
| POST | `/entries` | Perm:`settings.edit` | `{ ipAddress, type: whitelist\|blacklist, description? }` | Created entry |
| PUT | `/entries/:id` | Perm:`settings.edit` | `{ description?, type?, isActive? }` | Updated entry |
| DELETE | `/entries/:id` | Perm:`settings.edit` | — | `{ success: true }` |
| GET | `/check` | Public | caller IP from request/proxy headers | `{ allowed, reason, clientIp }` |

## Website Pages (`/api/WebsitePages`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`website.view` | `?offset, limit, search` | `PaginatedResponse<Page>` |
| GET | `/:id` | Perm:`website.view` | — | Page detail |
| POST | `/` | Perm:`website.edit` | `{ slug, title, content, meta_title, meta_description, active }` | Created page |
| PUT | `/:id` | Perm:`website.edit` | Page fields | Updated page |
| DELETE | `/:id` | Perm:`website.edit` | — | Deleted page |

## Feedback (`/api/Feedback`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/unread-count` | Auth | — | `{ count, role: admin\|staff }` |
| POST | `/` | Auth | FormData (thread creation + files) | Created thread |
| GET | `/my` | Auth | — | User's threads |
| GET | `/my/:threadId` | Auth | — | Thread messages |
| POST | `/my/:threadId/reply` | Auth | FormData | Reply created |
| GET | `/all` | `feedback.view` or `permissions.view` (Super Admin via permissionService) | `?source=manual\|auto` | All threads |
| GET | `/all/:threadId` | `feedback.view` or `permissions.view` | — | Thread messages |
| POST | `/all/:threadId/reply` | `feedback.reply` or `permissions.edit` | FormData | Admin reply |
| PATCH | `/all/:threadId/status` | `feedback.edit` or `permissions.edit` | `{ status: pending\|in_progress\|resolved\|ignored }` | Thread status updated |
| DELETE | `/all/:threadId` | `feedback.delete` or `permissions.edit` | — | Thread deleted |

Attachment persistence contract: feedback create/reply routes accept file-only messages (`content = ''`), commit message rows and `feedback_attachments` rows in one explicit DB transaction, clean uploaded files on missing-thread or insert failure, and delete physical files only after `DELETE /all/:threadId` commits. Stored attachment filenames must match the generated UUID image filename allowlist before physical deletion.

## Face Recognition (`/api/face`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/recognize` | Perm:`customers.view` | FormData (`image`) | `{ match: FaceCandidate \| null, candidates: FaceCandidate[] }`; provider selected by `FACE_RECOGNITION_PROVIDER=local|compreface` |
| POST | `/register` | Perm:`customers.edit` | FormData (`partnerId`, `image`, optional `source`) | `{ success: true, partnerId, sampleId, sampleCount, faceRegisteredAt }` |
| POST | `/re-register` | Perm:`customers.edit` | FormData (`partnerId`, repeated `images`, optional `source`) | `{ success: true, partnerId, sampleIds, sampleCount, faceRegisteredAt }` |
| GET | `/status/:partnerId` | Perm:`customers.view` | — | `{ partnerId, registered, sampleCount, lastRegisteredAt }` |

## External Checkups (`/api/ExternalCheckups`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/images/:imageName` | Perm:`external_checkups.view` | — | Proxied image bytes from Hosoonline appointment media |
| GET | `/:customerCode` | Perm:`external_checkups.view` | — | External checkups list |
| POST | `/:customerCode/patient` | Perm:`external_checkups.create` | — | Creates missing Hosoonline patient from local customer name, TDental code, and phone suffix |
| POST | `/:customerCode/health-checkups` | Perm:`external_checkups.upload` | FormData (`photos` repeated, required `service`/`doctor`, optional `date`/`description`/`nextAppointmentDate`/`nextDescription`) | Created checkups |

Hosoonline uses a mixed current contract: if `HOSOONLINE_USERNAME` and `HOSOONLINE_PASSWORD` are configured, TGClinic logs in to Hosoonline, sends `Authorization: Bearer <token>` plus the returned cookie, searches appointments, and proxies `/api/appointments/image/:imageName`. Patient create/search uses the v2 API-key collection endpoints `/api/patients/_create` and `/api/patients/_search`; the bare `/api/patients` path remains reserved for the staff UI cookie-routed v1 behavior. If login credentials are absent, the route falls back to the older `HOSOONLINE_API_KEY` / `X-API-Key` patient health-checkup endpoints where still supported.

## Commissions (`/api/Commissions`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, type, companyId, dateFrom, dateTo` | `PaginatedResponse<Commission> + aggregates` |
| GET | `/SaleOrderLinePartnerCommissions` | Auth | `?offset, limit, partnerId, dateFrom, dateTo` | `PaginatedResponse<PartnerCommission> + aggregates` |
| GET | `/:id` | Auth | — | Commission detail (+ rules) |
| GET | `/:id/Histories` | Auth | `?offset, limit` | `PaginatedResponse<History>` |

## HR Payslips (`/api/HrPayslips`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, employeeId, runId` | `PaginatedResponse<Payslip>` |
| GET | `/:id` | Auth | — | Payslip detail |
| GET | `/Runs` | Auth | — | Payslip runs |
| GET | `/Structures` | Auth | — | Payroll structures |

## CashBooks (`/api/CashBooks`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/GetDetails` | Auth | `?journalId, dateFrom, dateTo` | Cashbook details |
| GET | `/GetSumary` | Auth | `?journalId, dateFrom, dateTo` | Cashbook summary |
| GET | `/:id` | Auth | — | Cashbook by id |

## Journals (`/api/AccountJournals`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId` | `PaginatedResponse<Journal>` |
| GET | `/:id` | Auth | — | Journal detail |
| GET | `/:id/GetBalance` | Auth | — | Balance data |

## CRM Tasks (`/api/CrmTasks`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/GetPagedV2` | Auth | `?offset, limit, search, assignedUserId, state, priority` | `PaginatedResponse<Task>` |
| GET | `/Categories` | Auth | — | Categories list |
| GET | `/Types` | Auth | — | Types list |
| GET | `/:id` | Auth | — | Task detail |

## Receipts (`/api/Receipts`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, customerId, companyId` | `PaginatedResponse<Receipt>` |
| GET | `/:id` | Auth | — | Receipt detail |
| GET | `/:id/GetPayments` | Auth | — | Linked payments |

## Account Payments (`/api/AccountPayments`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, customerId` | `PaginatedResponse<AccountPayment>` |
| GET | `/:id` | Auth | — | Account payment detail |

## Stock Pickings (`/api/StockPickings`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId, state` | `PaginatedResponse<StockPicking>` |
| GET | `/:id` | Auth | — | Detail |
| POST | `/` | Perm:`settings.edit` | Picking fields | Created |
| PUT | `/:id` | Perm:`settings.edit` | Picking fields | Updated |
| DELETE | `/:id` | Perm:`settings.edit` | — | Deleted |

## Config (`/api/IrConfigParameters`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/GetParam` | Auth | `?key` | Param value |
| POST | `/GetParam` | Auth | `{ key }` | Param value |

## Telemetry (`/api/telemetry`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/errors` | Public ingestion, rate-limited | Error payload from frontend ErrorBoundary/ErrorReporter | `{ ok, id?, fingerprint?, is_duplicate? }`; never blocks client on DB write failure |
| GET | `/errors` | Auth | `?status, limit, offset, type` | `{ items, total }` |
| PUT | `/errors/:id` | Auth | `{ status, fix_summary?, fix_commit? }` | `{ ok }` |
| POST | `/errors/:id/fix-attempts` | Auth | `{ attempt_number, action, status, details, files_changed, test_output, agent_session }` | `{ ok, attempt_id }` |
| GET | `/stats` | Auth | — | `{ by_type, by_status, total, last_24h }` |
| POST | `/version` | Auth | `{ event, from, to, trigger, timestamp, userAgent }` | `{ ok }` |

## Places (`/api/Places`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/autocomplete` | Auth | `?input, language=vi` | Google Places suggestions |
| GET | `/details` | Auth | `?place_id, language=vi` | Place details |

## Session (`/Web/Session`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/GetSessionInfo` | Auth? | — | Session info (legacy?) |

## Dead / Legacy Routes

| Route | Status | Notes |
|-------|--------|-------|
| `GET/POST /api/Services` | **REMOVED** | `api/src/routes/services.js` deleted 2026-06-14; file and server.js references removed; frontend uses `/api/Products` + `/api/SaleOrders` |
| `POST /api/Account/Login` | **UNMOUNTED LEGACY** | Frontend uses `/api/Auth/login`; server.js comments this route out |
| `/Web/Session/*` | **UNMOUNTED LEGACY** | Kept in source pending external-client confirmation |

---

## Cosmetic LOB Mirrors (v2, gated by COSMETIC_LOB_ENABLED + requireLobScope('cosmetic') + cosmetic.access)
All existing dental route shapes required by TMV/NK3 Cosmetic mode are mirrored at `/api/cosmetic/*` (e.g. `/api/cosmetic/Partners`, `/api/cosmetic/Appointments`, `/api/cosmetic/Employees`, `/api/cosmetic/Products`, `/api/cosmetic/ProductCategories`, `/api/cosmetic/Payments`, `/api/cosmetic/CustomerBalance`, `/api/cosmetic/CustomerReceipts`, `/api/cosmetic/SaleOrderLines`, `/api/cosmetic/SaleOrders`, `/api/cosmetic/MonthlyPlans`, `/api/cosmetic/Companies`, `/api/cosmetic/Reports/*`, `/api/cosmetic/DashboardReports/*`, `/api/cosmetic/CustomerSources`, `/api/cosmetic/Permissions`, `/api/cosmetic/DotKhams`, `/api/cosmetic/settings`, `/api/cosmetic/ExternalCheckups`, `/api/cosmetic/face`, and `/api/cosmetic/Exports`).
- Auth: same as dental equivalent + lob_scope check (hard) + permission (soft)
- Response: identical shape, but sourced exclusively from tcosmetic_demo
- Flag off or missing scope → 503 or 403 S_LOB_FORBIDDEN
- Frontend `apiFetch(..., { lob: 'cosmetic' })` prefixes requests with `/api/cosmetic`; omitted or `dental` uses legacy `/api/*`.

See cosmetic-clients.yaml, business-unit.yaml for details.

## CTV Dashboard (v2)
- GET /api/ctv/commission-summary — CTV only (is_ctv + ctv.commission.view.self); aggregates earnings from both DBs; returns { totals: { pending, paid, dental, cosmetic }, rows: [...] with lob tags }. Display names may be null; frontend owns localized unknown-client fallbacks.
- GET /api/ctv/referrals — self referred clients across LOBs + earning status
- GET/PATCH /api/ctv/me — self profile read/update
- POST /api/ctv/me/password — self password change after current-password verification
- All CTV routes return 403 for non-is_ctv; admin routes 403 for CTV

## Me / LOB Scope (v2)
- GET /api/me/lob-scope — returns current user's { lob_scope: string[], is_ctv: boolean, available_lobs: string[] }
- Augmented on login/me responses

## Common Response Patterns

### Paginated List
```json
{
  "offset": 0,
  "limit": 20,
  "totalItems": 100,
  "items": [...]
}
```

### Error Response (structured)
```json
{
  "error": {
    "code": "INVALID_DATE",
    "field": "date",
    "message": "date must be a valid ISO date"
  }
}
```

### Error Response (legacy string)
```json
{
  "error": "Failed to fetch services"
}
```
