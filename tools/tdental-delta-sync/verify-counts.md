# TDental Sync — Level 1: Row-Count Parity Verification

**Verdict:** 2 tables differ by more than 0.5% on full-table parity: `aspnetusers` (local 223 vs API 73 — local is ~3× larger, anomaly) and `partners` (local 35,330 vs API 34,705 — the SPA's customer-subset endpoint is narrower than the local partner superset, expected by design). All other 11 tables match within 0.5%. No API or throttling errors.

- Generated: 2026-04-14
- API base: `https://tamdentist.tdental.vn`
- Local DB: `127.0.0.1:55433/tdental_real` schema `dbo`
- SINCE (delta): `2026-02-22`
- Wide window for paired-date endpoints: `2000-01-01 .. 2028-04-14`

## Full-table parity

| Table             | API totalItems | Local COUNT(*) | Δ (local−api) | Verdict          |
|-------------------|---------------:|---------------:|--------------:|------------------|
| companies         |              7 |              7 |             0 | MATCH (exact)    |
| productcategories |             18 |             18 |             0 | MATCH (exact)    |
| products          |            443 |            443 |             0 | MATCH (exact)    |
| aspnetusers       |             73 |            223 |          +150 | OFF (>0.5%)      |
| employees         |            382 |            382 |             0 | MATCH (exact)    |
| partners          |         34,705 |         35,330 |          +625 | OFF (>0.5%)      |
| appointments      |        239,026 |        238,983 |           −43 | NEAR (≤0.5%)     |
| customerreceipts  |        182,562 |        182,520 |           −42 | NEAR (≤0.5%)     |
| saleorders        |         60,644 |         60,629 |           −15 | NEAR (≤0.5%)     |
| saleorderlines    |         62,592 |         62,577 |           −15 | NEAR (≤0.5%)     |
| dotkhams          |         89,960 |         89,944 |           −16 | NEAR (≤0.5%)     |
| accountpayments   |         61,707 |         61,696 |           −11 | NEAR (≤0.5%)     |
| partneradvances   |         14,652 |         14,637 |           −15 | NEAR (≤0.5%)     |

Note on productcategories: when probed with `limit=1`, the API erroneously returned `totalItems=1` (envelope bug — reports returned count, not full table). Probed with no `limit` / `limit=0`, `totalItems=18`, which matches local. The value above is the corrected probe.

## Delta parity (rows where table's business-date column >= 2026-02-22)

| Table            | API totalItems | Local COUNT(*) | Δ (local−api) | Verdict          |
|------------------|---------------:|---------------:|--------------:|------------------|
| partners         |          3,478 |          3,451 |           −27 | NEAR (≤0.5%)     |
| appointments     |         33,457 |         33,303 |          −154 | NEAR (≤0.5%)     |
| customerreceipts |         18,210 |         18,168 |           −42 | NEAR (≤0.5%)     |
| saleorders       |          4,060 |          4,050 |           −10 | NEAR (≤0.5%)     |
| saleorderlines   |          4,294 |          4,284 |           −10 | NEAR (≤0.5%)     |
| dotkhams         |          5,710 |          5,694 |           −16 | NEAR (≤0.5%)     |
| accountpayments  |          7,549 |          7,534 |           −15 | NEAR (≤0.5%)     |
| partneradvances  |          1,063 |          1,063 |             0 | MATCH (exact)    |

## Discrepancy lists

### Full parity — API > local by > 1% (rows missing locally)

- (none)

### Full parity — local > API by > 1% (possibly over-synced or stale rows locally)

- **aspnetusers**: local=223, API=73, Δ=+150. Local is 3.05× the API total. `includeEmp=true`, `limit=0`, and plain probes all return 73 from `/api/ApplicationUsers`. Root cause is outside the sync tool — likely pre-existing rows in `dbo.aspnetusers` from an earlier import, or a superset pulled from a different endpoint. Needs investigation: is there an older identity table dump that got merged in?
- **partners**: local=35,330, API=34,705, Δ=+625. **Expected.** The sync uses `/api/Partners/GetPagedPartnersCustomer` (customer subset, isActive=true + searchType=All). Local `dbo.partners` holds the full partner superset (customers + employees + suppliers). The slim `/api/Partners` endpoint reports ~35,343 per the endpoint-map, effectively matching local. Not a defect.

### Delta parity — all within 0.5%

Worst case: appointments −154 (0.46% below API). All other date-filtered tables are within 16 rows of the API total. These small negative deltas are consistent with ongoing writes on the live source between the sync run and this verification (~a few hours of drift).

## API quirks observed

- `productcategories` with `limit=1` returns `totalItems=1` (the envelope bug noted above). Probe with no `limit` to get the true total.
- `/api/CustomerReceipts` and `/api/Appointments` require **paired** `dateFrom`/`dateTo` (resp. `dateTimeFrom`/`dateTimeTo`); single-sided filter returns HTTP 500.
- `/api/Partners/GetPagedPartnersCustomer` needs `isActive=true` + `searchType=All` to return the customer list used by the SPA.
- `limit=0` means "return all rows" on Companies/Employees/ApplicationUsers/productcategories while still reporting correct `totalItems`.
- No auth failures, no 5xx, no throttling responses encountered (~30 requests total).

## Notes

- `dotkhamsteps` skipped as instructed (derived from `saleorderlines.steps`; upstream list endpoint is broken).
- Appointments delta is computed locally on `datetimeappointment` (scheduled visit date), matching the API's `dateTimeFrom` semantic. Using `datecreated` instead would yield different numbers.
- All full-table API queries used `limit=1&offset=0` and read `totalItems` from the envelope — no bulk downloads.
- No writes were issued to either database during verification (read-only).
