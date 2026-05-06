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
| POST | `/login` | Public | `{ email, password }` | `{ token, user, permissions }` |
| GET | `/me` | Auth | — | `{ user, permissions }` |
| POST | `/change-password` | Auth | `{ oldPassword, newPassword }` | `{ success, message }` |

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
| PUT | `/:id` | Perm:`appointments.edit` | `{ date, doctorId/doctorid, note, state, timeExpected/timeexpected, color, time, productId/productid }` | Updated appointment |

## Partners / Customers (`/api/Partners`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, companyId` | `PaginatedResponse<Partner>` |
| GET | `/check-unique` | Auth | `?field, value` (e.g. phone, email) | `{ available: boolean }` |
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
| GET | `/` | Auth | `?offset, limit, search, customerId, companyId, date_from, date_to, state` | `PaginatedResponse<SaleOrder>` |
| GET | `/:id` | Auth | — | Sale order detail |
| POST | `/` | Perm:`customers.edit` | `{ partner_id, company_id, ... }` | Created sale order |
| PATCH | `/:id` | Perm:`customers.edit` | Order fields | Updated sale order |
| PATCH | `/:id/state` | Perm:`customers.edit` | `{ new_state }` | State updated + audit log |

## Sale Order Lines (`/api/SaleOrderLines`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Auth | `?offset, limit, search, orderid, partnerid` | `PaginatedResponse<SaleOrderLine>` |

## Payments (`/api/Payments`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/` | Perm:`payment.view` | `?customerId, serviceId, limit, offset, type` (`payments` | `deposits` | `all`) | `{ items[], totalItems }` (+ legacy fallback) |
| GET | `/deposits` | Perm:`payment.view` | `?customerId, dateFrom, dateTo, receiptNumber, type, limit, offset` | `{ items[], totalItems }` |
| GET | `/deposit-usage` | Perm:`payment.view` | `?customerId, dateFrom, dateTo, limit, offset` | `{ items[], totalItems }` |
| GET | `/:id` | Perm:`payment.view` | — | Payment with allocations |
| POST | `/` | Perm:`payment.edit` | `{ customer_id, service_id, amount, method, notes, payment_date, reference_code, status, deposit_used, cash_amount, bank_amount, deposit_type, receipt_number, allocations[] }` | Created payment |
| POST | `/refund` | Perm:`payment.edit` | `{ customer_id, amount, method, notes, payment_date }` | Created refund |
| PATCH | `/:id` | Perm:`payment.edit` | `{ amount, method, notes, payment_date, reference_code, status, deposit_type, receipt_number }` | Updated payment |
| DELETE | `/:id` | Perm:`payment.edit` | — | `{ success, id }` + reverses allocations |
| POST | `/:id/void` | Perm:`payment.edit` | `{ reason }` | `{ success, payment }` + reverses allocations |
| POST | `/:id/proof` | Perm:`payment.edit` | `{ proofImageBase64, qrDescription }` | `{ success, proofId }` |

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
| POST | `/revenue/summary` | Perm:`reports.view` | Date range | Revenue summary |
| POST | `/revenue/trend` | Perm:`reports.view` | Date range | Revenue trend |
| POST | `/revenue/by-location` | Perm:`reports.view` | Date range | Revenue per location |
| POST | `/revenue/by-doctor` | Perm:`reports.view` | Date range | Revenue per doctor |
| POST | `/revenue/by-category` | Perm:`reports.view` | Date range | Revenue per category |
| POST | `/revenue/payment-plans` | Perm:`reports.view` | Date range | Payment plan revenue |
| POST | `/appointments/summary` | Perm:`reports.view` | Date range | Appointment stats |
| POST | `/appointments/trend` | Perm:`reports.view` | Date range | Appointment trend |
| POST | `/doctors/performance` | Perm:`reports.view` | Date range | Doctor performance |
| POST | `/customers/summary` | Perm:`reports.view` | Date range | Customer summary |
| POST | `/employees/overview` | Perm:`reports.view` | Date range | Employee overview |
| POST | `/services/breakdown` | Perm:`reports.view` | Date range | Services breakdown |
| POST | `/locations/comparison` | Perm:`reports.view` | Date range | Location comparison |

## Operational Exports (`/api/Exports`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/types` | Auth | — | Export types visible to the current user's effective permissions |
| POST | `/:type/preview` | Auth + export permission | `{ filters }`; `type` is `customers`, `appointments`, `services`, `payments`, or `service-catalog` | `{ type, label, rowCount, filename, filters, summary, exceedsMax }` + best-effort `exports_audit` row |
| POST | `/:type/download` | Auth + export permission | `{ filters }`; same type keys as preview | XLSX workbook stream + best-effort `exports_audit` row after response |

Export permissions are defined by `api/src/services/exports/exportRegistry.js`: `customers.export`, `appointments.export`, `services.export`, `payments.export`, and `products.export`.

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
| POST | `/` | Auth | FormData (thread creation + files) | Created thread |
| GET | `/my` | Auth | — | User's threads |
| GET | `/my/:threadId` | Auth | — | Thread messages |
| POST | `/my/:threadId/reply` | Auth | FormData | Reply created |
| GET | `/all` | Auth + Admin | — | All threads (admin) |
| GET | `/all/:threadId` | Auth + Admin | — | Thread messages (admin) |
| POST | `/all/:threadId/reply` | Auth + Admin | FormData | Admin reply |
| PATCH | `/all/:threadId/status` | Auth + Admin | `{ status }` | Thread status updated |
| DELETE | `/all/:threadId` | Auth + Admin | — | Thread deleted |

## Face Recognition (`/api/face`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| POST | `/recognize` | Perm:`customers.view` | FormData (`image`) | `{ match: { partnerId, name, confidence } \| null }` |
| POST | `/register` | Perm:`customers.edit` | FormData (`partnerId`, `image`) | `{ success, faceSubjectId }` |

## External Checkups (`/api/ExternalCheckups`)

| Method | Path | Auth | Body / Query | Response |
|--------|------|------|--------------|----------|
| GET | `/images/:imageName` | Perm:`external_checkups.view` | — | Proxied image bytes from Hosoonline appointment media |
| GET | `/:customerCode` | Perm:`external_checkups.view` | — | External checkups list |
| POST | `/:customerCode/patient` | Perm:`external_checkups.create` | — | Creates missing Hosoonline patient from local customer name, TDental code, and phone suffix |
| POST | `/:customerCode/health-checkups` | Perm:`external_checkups.create` | FormData (`photos` repeated, required `service`/`doctor`, optional `date`/`description`/`nextAppointmentDate`/`nextDescription`) | Created checkups |

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
