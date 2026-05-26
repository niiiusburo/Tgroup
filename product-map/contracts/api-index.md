# TGroup API Index

> Exhaustive catalog of all backend endpoints.

## Legend
- **Auth:** `Public` = no token needed; `Auth` = valid JWT required; `Perm:X` = `requirePermission('X')` required
- **Body / Query:** summarized request parameters
- **Res:** summarized response shape

---

## Auth (`/api/Auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/login` | Public | `{ email, password }` | `{ token, user: { lob_scope, auth_lob, lob_context, is_ctv, ... }, permissions }`; searches employee auth rows in dental + cosmetic and binds token to the password-matching source LOB |
| GET | `/me` | Auth | — | `{ user: { lob_scope, auth_lob, lob_context, is_ctv, ... }, permissions }`; reads the token source LOB |
| POST | `/change-password` | Auth | `{ oldPassword, newPassword }` | `{ success, message }`; reads/writes the token source LOB |

## LOB & Business Unit (`/api/me` + context) — Cosmetic LOB v2

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/me/lob-scope` | Auth | — | `{ lob_scope: string[], is_ctv: boolean, available: string[] }`; reads the token source LOB |
| (augmented) | `GET /api/Auth/me` | Auth | — | User payload now includes `lob_scope[]`, `auth_lob`, `lob_context`, and `is_ctv` (affects login redirect and header toggle visibility) |

Note: All existing routes are now implicitly under a selected LOB via BusinessUnitContext. Cosmetic routes live under `/api/cosmetic/*` prefix and are distinct from dental.

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

When `COSMETIC_LOB_ENABLED=false` the entire family returns 503.

## CTV Dashboard & Commission API (`/api/ctv`) — CTV role only (is_ctv + ctv.* permissions)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/ctv/commission-summary` | CTV (ctv.commission.view.self) | — | Aggregated payload: { pending: {total, dental, cosmetic, count}, paid, recent_activity[], by_service[] } with LOB pills on every row |
| GET | `/api/ctv/referrals` | CTV (ctv.referrals.view.self) | — | List of referred clients across both DBs with status (earning / no visit), totals earned, LOB pills |
| POST | `/api/ctv` | CTV or admin | `{ name, phone, email, password, lob_scope?, referred_by_ctv_id? (admin) }` | 201 created CTV. Closed signup (no public). `employee=true`, instant active; referred_by = caller (CTV) or body (admin). Dups → `U_DUPLICATE_PHONE`/`U_DUPLICATE_EMAIL`; non-CTV/non-admin → 403 `S_CTV_CREATE_FORBIDDEN` |
| POST | `/api/ctv/clients` | CTV or admin | `{ name, phone, lob }` | 201 referred customer in one LOB DB, `referred_by_ctv_id` = caller |
| POST | `/api/ctv/bookings` | CTV or admin | `{ clientId?, name?, phone, lob, date, time?, companyId?, productId? }` | 201 `{ clientId, appointmentId }`. Eligibility gate: `400 B_CLIENT_CLAIMED {ownerName, expiresAt}` if actively claimed by another CTV; creates/re-claims client + Referral Start card + appointment. `409 REFERRAL_PRODUCT_NOT_CONFIGURED` if referral product unset |
| (augmented) | `GET /api/Partners/resolve` & `GET /api/Partners/:id` | Auth | — | responses now include `referralClaim: { ownerCtvId, ownerName, active, expiresAt } | null` |
| (internal) | commission recipient resolution | — | — | Implements D13 priority: referred_by_ctv_id > active consultation card (cosmetic) > salestaffid (dental). For `ctv` source the pool is split up the upline per `commission_level_config` |

CTV users are hard-redirected to `/ctv` on login and receive 403 on any admin route.

## Admin CTV & Commission config

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/api/Ctvs`, `/api/cosmetic/Ctvs` | admin (`ctv.manage`/`*`) | `?status=active\|suspended` | `{ ctvs: [{id, name, phone, email, lob_scope, active, referred_by_ctv_id, upline_name}] }` |
| PATCH | `/api/Ctvs/:id`, `/api/cosmetic/Ctvs/:id` | admin | `{ active: boolean }` | Updated CTV (suspend/reactivate); mirrors to cosmetic DB if present |
| GET | `/api/CommissionConfig`, `/api/cosmetic/CommissionConfig` | Auth | — | `{ levels: [{level,label,enabled,share_percent}], defaultReferralPercent }` |
| PUT | `/api/CommissionConfig`, `/api/cosmetic/CommissionConfig` | admin (`commission.config.manage`/`*`) | `{ levels[], defaultReferralPercent }` | Upserts config; enabled-sum > 100 → 400 `B_LEVEL_SUM_EXCEEDS_100` |

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

Cosmetic LOB mirror: Appointment UI submitters must pass active `lob` into `createAppointment` and `updateAppointment`; when `lob='cosmetic'`, Calendar and customer-profile appointment forms route through `POST/PUT /api/cosmetic/Appointments` with the same payload shape and write only the Cosmetic database.

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

## Employees (`/api/Employees`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId, active=true|false|all` | `PaginatedResponse<Employee>`; default is active-only, edit-form assignment hydration must request `active=all` |
| GET | `/:id` | Auth | — | Employee detail |
| POST | `/` | Perm:`employees.edit` | Employee fields | Created employee |
| PUT | `/:id` | Perm:`employees.edit` | Employee fields | Updated employee |
| DELETE | `/:id` | Perm:`employees.edit` | — | Deleted employee |

Cosmetic LOB mirror: Employee UI callers must pass active `lob` into `createEmployee` and `updateEmployee`; when `lob='cosmetic'`, these same contract shapes route through `POST /api/cosmetic/Employees` and `PUT /api/cosmetic/Employees/:id`. Creates stamp `partners.lob_scope` to the source LOB so password-backed employee accounts authenticate from the owning physical DB.

## Products / Services Catalog (`/api/Products`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, type, categId, active, companyId, saleOK` | `PaginatedResponse<Product>` |
| GET | `/:id` | Auth | — | Product detail |
| POST | `/` | Perm:`services.edit` | `{ name, defaultcode, type, listprice, categid, uomname, companyid, canorderlab }` | Created product |
| PUT | `/:id` | Perm:`services.edit` | Product fields | Updated product |
| DELETE | `/:id` | Perm:`services.edit` | — | 204 or 409 if linked records exist |

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
| POST | `/` | Perm:`customers.edit` | `{ partner_id, company_id, ... }` | Created sale order |
| PATCH | `/:id` | Perm:`customers.edit` | Order fields; quantity, service, tooth, and price fields also sync to the primary rendered sale-order line | Updated sale order |
| PATCH | `/:id/state` | Perm:`customers.edit` | `{ new_state }` | State updated + audit log |

## Sale Order Lines (`/api/SaleOrderLines`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, companyId, dateFrom, dateTo, state, partnerId` | `PaginatedResponse<SaleOrderLine> + aggregates` |
| DELETE | `/:id` | Perm:`customers.edit` | — | `{ success, id, orderId, deletedOrder }`; soft-deletes line and parent order if no active lines remain |

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
| GET | `/:id` | Auth | — | Balance breakdown |

Cosmetic LOB mirror: `GET /api/cosmetic/CustomerBalance/:id` returns the same balance breakdown from `tcosmetic_demo` for the active Cosmetic LOB. Customer profile and deposit screens must call this mirror when `currentLOB='cosmetic'`.

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

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/dashboard` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | Dashboard KPIs |
| POST | `/revenue/summary` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: { orders[], payments[] } }` |
| POST | `/revenue/trend` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ month, orderCount, invoiced, paid, outstanding }] }` |
| POST | `/revenue/by-location` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, orderCount, invoiced, paid, outstanding }] }` |
| POST | `/revenue/by-doctor` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, name, orderCount, invoiced, paid }] }` |
| POST | `/revenue/by-category` | Perm:`reports.view` | `{ dateFrom?, dateTo?, companyId? }` | `{ success, data: [{ id, category, lineCount, revenue }] }` |
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
| GET | `/all` | Admin (`System Administrator` group or effective `permissions.view`) | `?source=manual\|auto` | All threads |
| GET | `/all/:threadId` | Admin (`System Administrator` group or effective `permissions.view`) | — | Thread messages |
| POST | `/all/:threadId/reply` | Admin (`System Administrator` group or effective `permissions.view`) | FormData | Admin reply |
| PATCH | `/all/:threadId/status` | Admin (`System Administrator` group or effective `permissions.view`) | `{ status: pending\|in_progress\|resolved\|ignored }` | Thread status updated |
| DELETE | `/all/:threadId` | Admin (`System Administrator` group or effective `permissions.view`) | — | Thread deleted |

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
| `GET/POST /api/Services` | **UNMOUNTED DEAD CODE** | `api/src/routes/services.js` queries non-existent `public.services`; server.js no longer mounts it |
| `POST /api/Account/Login` | **UNMOUNTED LEGACY** | Frontend uses `/api/Auth/login`; server.js comments this route out |
| `/Web/Session/*` | **UNMOUNTED LEGACY** | Kept in source pending external-client confirmation |

---

## Cosmetic LOB Mirrors (v2, gated by COSMETIC_LOB_ENABLED + requireLobScope('cosmetic') + cosmetic.access)
All existing dental route shapes are mirrored at `/api/cosmetic/*` (e.g. /api/cosmetic/Partners, /api/cosmetic/Appointments, /api/cosmetic/Employees, /api/cosmetic/Products, /api/cosmetic/Payments, /api/cosmetic/Reports/* etc.).
- Auth: same as dental equivalent + lob_scope check (hard) + permission (soft)
- Response: identical shape, but sourced exclusively from tcosmetic_demo
- Flag off or missing scope → 503 or 403 S_LOB_FORBIDDEN

See cosmetic-clients.yaml, business-unit.yaml for details.

## CTV Dashboard (v2)
- GET /api/ctv/commission-summary — CTV only (is_ctv + ctv.commission.view.self); aggregates earnings from both DBs; returns { totals: { pending, paid, dental, cosmetic }, rows: [...] with lob tags }
- GET /api/ctv/referrals — self referred clients across LOBs + earning status
- GET /api/ctv/me — profile
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
