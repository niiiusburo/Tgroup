# TDental Delta Sync — Recon Report (Phase 1)

**Target:** `https://tamdentist.tdental.vn` — Angular 4.4.6 SPA  
**Tenant:** `tamdentist`  
**Admin:** `admin / 123123@` (verified working, no 2FA, no captcha)  
**Recon date:** 2026-04-13

## 1. API base URL

All JSON endpoints live on the **same origin** as the SPA:

```
https://tamdentist.tdental.vn/api/*
```

Case-insensitive routing (ASP.NET). The SPA mixes casing — e.g. it calls `/api/dotkhams` lowercase and `/api/Partners` titlecase. Both work.

Static assets are served from a separate CDN: `https://gc-statics.tdental.vn/resources/4.4.6.prod-2/*.js`. Not needed at runtime.

## 2. Auth

- **Login:** `POST /api/Account/Login` with `{ userName, password, tenant }` (tenant likely `tamdentist`; confirm shape on first build-phase login).
- **Token:** JWT (HS256), returned as `access_token`. Lifetime **7 days** (`exp - iat = 604800`).
- **Header to use on every API call:** `Authorization: Bearer <access_token>` — that alone is sufficient for every endpoint tested.
- **Optional headers** the SPA sends but are not strictly required: `X-Session-Id`, `X-Device-Id`, `X-Tenant: tamdentist`.
- **Refresh:** `refresh_token` is present in login response — the SPA uses it to rotate the access token, but for a one-shot sync inside the 7-day window we can ignore refresh and just re-login each run.

Full details in `auth-sample.json`.

## 3. Pagination convention

Every list endpoint except one uses offset-style pagination with the envelope:

```json
{ "offset": 0, "limit": 100, "totalItems": 60631, "items": [ ... ], "aggregates": null }
```

- Query params: `limit` + `offset`, integers.
- `limit=0` is a special sentinel that returns **all rows** — SPA uses this for dropdowns but for sync we should cap at 200-500 to avoid 20 MB responses.
- Default safe page size: **100**.

**Exception:** `/api/DotKhamSteps` returns a bare JSON array with no envelope and **ignores all query params**, always streaming the full ~15 MB table. Do not call it — derive step rows from the inline `steps` array on each SaleOrderLine instead.

## 4. Delta-filter support

**Generic update-time filters (`writeDate`, `updatedAfter`, `lastUpdated`) are silently ignored** — the server accepts them, returns 200, but the count does not change. List rows also do **not** expose a `writeDate` field.

Each endpoint has its own **business-date filter**:

| Table | Delta param | Companion | Verified result |
|---|---|---|---|
| partners (GetPagedPartnersCustomer) | `dateFrom` | `dateTo` | 304 / 34,683 since Apr 10 |
| saleorders | `dateOrderFrom` | `dateOrderTo` | 315 / 60,631 |
| saleorderlines | `dateFrom` | `dateTo` | 322 / 62,580 |
| dotkhams | `dateFrom` | `dateTo` | 503 / 89,932 |
| appointments | `dateTimeFrom` | `dateTimeTo` (required) | 2,050 / 238,838 |
| accountpayments | `paymentDateFrom` | `paymentDateTo` | 560 / 61,688 |
| customerreceipts | `dateFrom` | `dateTo` (required — otherwise 500) | 182,429 total |
| partneradvances | `dateFrom` | `dateTo` | 80 / 14,651 |
| products, productcategories, companies, employees, aspnetusers, dotkhamsteps | — | — | full pull only (all < 500 rows except dotkhamsteps) |

**Date format:** `YYYY-MM-DD` (server does ISO parsing, times optional).

**Implication for the sync tool:** each row in the endpoint map needs its own `delta_param` and whether a `to` companion is required.

## 5. Target tables — found / not found

**Found with delta filter (10/14):** partners, saleorders, saleorderlines, dotkhams, appointments, accountpayments, customerreceipts, partneradvances — plus companies, products, productcategories, employees, aspnetusers via full pull (all < 500 rows).

**Found but empty in this tenant (3):**
- `accountinvoices` — endpoint live, returns 0 rows under every filter tried. This tenant computes revenue via `SaleOrderLines.amountInvoiced` and the reporting endpoint `/api/AccountInvoiceReports/SumRevenueReport`, not AccountInvoices rows.
- `accountinvoicelines` — same.
- `dotkhamstepv2s` — feature flag enabled but no V2 rows.

**Problem endpoint (1):**
- `dotkhamsteps` — `/api/DotKhamSteps` returns bare array, ignores all filters, 15.5 MB per call. **Workaround:** the inline `steps` array on each `SaleOrderLines` row contains rows of the same shape (`id`, `name`, `isDone`, `order`, `numberOfTimes`, `saleLineId`, `dateCreated`). Sync dotkhamsteps from there — no separate endpoint call.

## 6. Surprises / gotchas

1. **No writeDate on the wire.** Every sync is anchored on a business date (visit date, order date, payment date). Rows edited after creation without a business-date change are invisible to a delta pull. For tables where the PRD cares about status transitions (e.g. saleorder draft -> sale), this will miss edits. Mitigation: the PRD default window (2026-02-22 onward) is small enough that a full re-fetch within that window is cheap — recommend always pulling the full window, not "since last run", until we confirm edit propagation is needed.
2. **Customer-Receipts date filter is strict.** `dateFrom` without `dateTo` returns **HTTP 500** `InvalidOperationException: Nullable object must have a value`. Always pair them.
3. **Appointments table is huge** (238,838 rows). Plan on paging with `limit=200`, throttling at ~2 req/s, roughly 20 minutes for a full backfill. For the Feb-22-onward window it is tractable (~15-20k rows).
4. **`/api/Partners` vs `/api/Partners/GetPagedPartnersCustomer`.** The former is a slim "all partners" list (35,343 rows including employees + branches); the latter is what the SPA uses for the customer screen (34,683 rows, supports dateFrom/dateTo). Use `GetPagedPartnersCustomer` for sync. For the ~96-field fat profile, hit `/api/Partners/{id}` per row.
5. **`/api/Quotations/GetPagedV2`** is **not** the saleorders table — it's a 75-row subset of open quotations. Use `/api/SaleOrders` for the full 60,631.
6. **Nested objects inline.** Appointments and SaleOrders embed the full `partner` object per row; SaleOrderLines embed the `steps` array per row. The build phase's `FieldMapper` must flatten or FK-extract these. Upside: fewer hydration calls.
7. **`partneradvances` found but not in original target list.** 14,651 customer-advance (deposit) rows — this is business-money data the PRD user stories 16/20 arguably want. Added to the endpoint map; confirm with user before skipping.
8. **No rate-limit observed** in 40+ probe calls, but be polite — PRD sets 2 req/s default.
9. **Route hash prefix (`/#/...`)** — this is Angular's HashLocationStrategy. The top nav has only 5 items: dashboard, partners, work, calendar, warehouse. Every business list except the above is reached via per-customer drill-down. Bulk list endpoints all work directly via HTTP without needing to navigate first.

## 7. Recommended next steps for the build phase

1. **AuthCapture module** — Playwright once per run: navigate to `https://tamdentist.tdental.vn`, fill the login form, read `localStorage.access_token` after redirect to `#/dashboard`. Return `{ bearerToken, baseUrl: "https://tamdentist.tdental.vn", tokenExpiry: jwt.exp }`. Takes ~5 seconds.
2. **EndpointMap** — copy `endpoint-map-draft.json` into the project; mark `_meta.reviewed_by_user=true` once confirmed.
3. **ApiClient** — offset paginator with page_size=100, exponential backoff on 429/5xx, 2 req/s throttle. Per-endpoint `delta_filter.param` + `companion_param` from the map.
4. **FieldMapper** — per-table pure function. For tables with nested inline objects (`partner` on saleorders/appointments, `steps` on saleorderlines, `journal` on accountpayments) extract FKs and drop the subtree. Coerce ISO 8601 dates -> Postgres timestamps.
5. **Parent -> child order** (topological): `companies -> aspnetusers -> employees -> products -> productcategories -> partners -> appointments -> customerreceipts -> saleorders -> saleorderlines -> dotkhams -> (dotkhamsteps derived from saleorderlines.steps) -> accountpayments -> partneradvances`.
6. **Appointments backfill strategy.** Because `dateTimeFrom` filters on the scheduled visit date (not creation date), do TWO passes: past-window (since = 2026-02-22, to = today) AND future-window (today, +90 days). PRD user story 22 wants reruns to be cheap — checkpoint both windows.
7. **Skip endpoints:** `accountinvoices`, `accountinvoicelines`, `dotkhamstepv2s` (all empty in source tenant), `dotkhamsteps` (derive from saleorderlines inline).

## 8. Files in this recon bundle

```
recon/
├── endpoint-map-draft.json     # Full endpoint map ready for EndpointMap module
├── auth-sample.json            # Login flow + token shape
├── RECON_REPORT.md             # This file
├── .env                        # TOKEN=... (gitignored)
├── .gitignore                  # Excludes .env
└── samples/
    ├── partners.json              (2 rows) 3 KB — GetPagedPartnersCustomer output
    ├── partners_getpaged.json     (2 rows) 4 KB — same shape, second sample
    ├── partner_detail.json        (1 row, 96 fields) 2 KB — /api/Partners/{id}
    ├── saleorders.json            (2 rows) 4 KB
    ├── saleorderlines.json        (2 rows) 4 KB — with inline steps array
    ├── dotkhams.json              (2 rows) 2 KB
    ├── dotkhamsteps.json          (3 rows) 1 KB — bare array, for shape only
    ├── dotkhamstepv2s.json        (empty) 2 B
    ├── appointments.json          (2 rows) 3 KB
    ├── accountpayments.json       (2 rows) 2 KB
    ├── accountinvoices.json       (empty envelope) 66 B
    ├── accountinvoicelines.json   (empty envelope) 66 B
    ├── customerreceipts.json      (2 rows) 1 KB
    ├── companies.json             (2 rows) 1 KB
    ├── products.json              (2 rows) 2 KB
    ├── productcategories.json     (2 rows) 437 B
    ├── employees.json             (2 rows) 3 KB
    ├── aspnetusers.json           (2 rows) 811 B
    ├── partneradvances.json       (2 rows) 650 B
    └── quotations_paged.json      (2 rows) 1 KB — for reference; do NOT use for saleorders sync
```
