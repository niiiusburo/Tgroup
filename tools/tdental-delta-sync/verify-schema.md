# Schema Coverage Report — TDental Delta Sync

**Date:** 2026-04-13
**Verifier:** Level 3 (schema coverage)
**Method:** Diff API sample field names (`recon/samples/*.json`) vs local Postgres columns (`dbo.<table>`) vs `src/fieldMapper.ts` explicit mappings.

---

## Verdict

**WARNING — Several business-meaningful fields are silently dropped.** Most of them fall into two buckets:

1. **Denormalised "display" data from the API** that the sync intentionally discards (e.g. `partnerName`, `doctorName`, `stateDisplay`) — these are re-derivable by JOIN in the local DB. Not a real gap.
2. **Genuine business data the API exposes that the local schema does NOT store** — the most important gap is the partner invoice/financial summary fields (`debt`, `debit`, `credit`, `balance`, `buyerTaxCode`, `sendInvoice*`, `lastAppointmentDate`). The local `partners` table has no columns for them, and the mapper does not attempt to capture them.

Additional important gaps: `saleorders.amountDiscountTotal`, `saleorderlines.totalRecognizedRevenue` / `totalRemainingRevenue` / `lastServiceUseDate`, `dotkhams.totalPaid`, `partneradvances.amountResidual`, `companies.address*`.

A follow-up PR to extend FieldMapper + schema is **warranted but not urgent** — core transactional IDs, amounts, states, and dates are all persisted correctly. The missing fields are derived / denormalised summary data that is a nice-to-have for analytics parity with the source system.

---

## Summary

| Metric | Value |
|---|---|
| Tables analyzed | 13 / 13 |
| Tables with 100 % silent-drop-free coverage | 0 |
| Tables with at least one silent drop | 13 |
| Total API fields silently dropped (raw count) | 119 |
| Of those, fields judged business-meaningful | ~30 |
| Of those, genuinely worth persisting (after discounting denormalised display names) | ~15 |

Silent-drop count is inflated because the API response contains many denormalised "convenience" fields (`*Name`, `*Display`, nested `partner:{}`) that exist purely for UI rendering. These are correctly ignored by the sync.

---

## Top 10 "business-meaningful" dropped fields (recommend adding)

| # | Table | API field | Why it matters |
|---|---|---|---|
| 1 | partners | `debt` | Current outstanding debt — key finance metric |
| 2 | partners | `balance` | Current balance — key finance metric |
| 3 | partners | `debit` / `credit` | Ledger snapshot per partner |
| 4 | partners | `lastAppointmentDate` | Used for inactive/retention filtering |
| 5 | partners | `buyerTaxCode`, `buyerLegalName`, `buyerAddress`, `buyerLegalAddress` | e-Invoice buyer legal info — required for tax export |
| 6 | partners | `sendInvoiceBy`, `sendInvoiceEmail`, `sendInvoiceZalo` | Invoice delivery channel config |
| 7 | saleorders | `amountDiscountTotal` | Total discount on order |
| 8 | saleorderlines | `totalRecognizedRevenue`, `totalRemainingRevenue` | Revenue recognition split |
| 9 | saleorderlines | `lastServiceUseDate` | Treatment progress tracking (note: local has `lastserviceuserdate` — typo column exists but is unmapped) |
| 10 | dotkhams | `totalPaid` | Payment rollup per treatment visit (complements already-mapped `totalInvoicesResidual`) |

Honourable mentions: `partneradvances.amountResidual`, `accountpayments.amountSigned`, `accountpayments.displayState`, `companies.address` / `addressV2`, `products.amountTax`.

---

## Tables with dramatically worse coverage

- **partners** — 24 of 51 API fields dropped (47 %). Largest gap by absolute count; most of the gap is financial-rollup + e-invoice buyer fields that genuinely have no local column.
- **saleorderlines** — 19 of 48 dropped (40 %). Mostly denormalised display fields, but loses `totalRecognizedRevenue`, `totalRemainingRevenue`, `lastServiceUseDate`.
- **aspnetusers** — 6 of 12 API fields dropped (50 %). Small absolute count but high percentage; dropped items (`employees`, `teamMembers`, `ref`, `avatar`, `jobId`, `jobName`) are mostly convenience data, not critical.
- **appointments** — 14 of 28 dropped, but 13 of them are denormalised `partner*` / `doctorName` / `companyName` display fields — effectively OK.

The rest (companies, productcategories, products, employees, customerreceipts, saleorders, dotkhams, accountpayments, partneradvances) drop only handful of mostly-cosmetic fields.

---

## Per-table details

### companies
- API fields: 19 · Local columns: 36 · Mapped: 14
- **In API, not in local (5):** `hotline`, `address`, `addressV2`, `usedAddressV2`, `householdBusinesses`
- **In local, not in API (22):** `accountexpenseid`, `accountincomeid`, `createdbyid`, `currencyid`, `datecreated`, `defaulthouseholdid`, `einvoiceaccountid`, `einvoicetemplateid`, `email`, `isconnectconfigmedicalprescription`, `isuppercasepartnername`, `lastupdated`, `notallowexportinventorynegative`, `parentid`, `parentpath`, `partnerid`, `paymentsmsvalidation`, `paymentsmsvalidationtemplateid`, `reportfooter`, `reportheader`, `revenueinvisibledate`, `writebyid` (legacy / not returned by list endpoint)
- FieldMapper coverage: 14 of 19 API fields explicitly mapped (5 silent drops)
- Business-meaningful drops: `address`, `addressV2`, `usedAddressV2` (branch street address — worth capturing)

### productcategories
- API fields: 5 · Local columns: 17 · Mapped: 5
- **In API, not in local (1):** `parent` (nested object — we already keep `parentid`)
- **In local, not in API (13):** `createdbyid`, `datecreated`, `labocateg`, `lastupdated`, `medicinecateg`, `parentleft`, `parentright`, `productcateg`, `sequence`, `servicecateg`, `stepcateg`, `type` (note: local has `type` column but API sample does not return `type` — mapper writes it from `r.type` which is `null`), `writebyid`
- FieldMapper coverage: 5 of 5 API fields explicitly mapped, 1 silent drop (`parent` nested obj — OK)
- Business-meaningful drops: none

### products
- API fields: 30 · Local columns: 38 · Mapped: 25
- **In API, not in local (5):** `categName`, `amountTax`, `uompoName`, `qtyAvailable`, `appliedCompanies`
- **In local, not in API (13):** `activeelement`, `createdbyid`, `datecreated`, `declaredprice`, `dosageform`, `drugadministration`, `firm`, `importer`, `ketoanote`, `lastupdated`, `pharmacycode`, `saleprice`, `writebyid`
- FieldMapper coverage: 25 of 30 (5 silent drops)
- Business-meaningful drops: `amountTax` (per-product tax amount — worth capturing if multi-tax handling is needed). `qtyAvailable` is a runtime stock value and will be stale; OK to drop.

### aspnetusers
- API fields: 12 · Local columns: 24 · Mapped: 6
- **In API, not in local (6):** `jobId`, `jobName`, `ref`, `avatar`, `employees`, `teamMembers`
- **In local, not in API (18):** `accessfailedcount`, `companyid`, `companyisunrestricted`, `concurrencystamp`, `email`, `emailconfirmed`, `facebookpageid`, `isuserroot`, `lockoutenabled`, `lockoutend`, `normalizedemail`, `normalizedusername`, `passwordhash`, `phonenumberconfirmed`, `securitystamp`, `tenantid`, `totpsecret`, `twofactorenabled` (Identity framework internals — correctly not synced from the API)
- FieldMapper coverage: 6 of 12 (6 silent drops)
- Business-meaningful drops: none — `ref`/`avatar` mildly useful for display, but not critical.

### employees
- API fields: 25 (top-level) · Local columns: 39 · Mapped: 22 (including 2 from nested `partner.*`)
- **In API, not in local (5):** `category`, `userName`, `company`, `hrJobName`, `partner` (nested objects; `partner.id` and `partner.userId` are already extracted into local `partnerid`/`userid`)
- **In local, not in API (19):** `address`, `assistantcommissionid`, `avatar`, `birthday`, `commissionid`, `counselorcommissionid`, `createdbyid`, `datecreated`, `enrollnumber`, `groupid`, `hourlywage`, `identitycard`, `isallowsurvey`, `lastupdated`, `partnerid`, `startworkdate`, `tokenmedicalprescription`, `userid`, `writebyid` — note: local has `partnerid` + `userid` columns that ARE populated via nested `partner.*`
- FieldMapper coverage: 22 of 25 (3 silent drops; mapper reads `structureTypeId` but does not write it — local has `employees.structuretypeid` column so this is a real mapping bug: the value arrives as an API field and is not persisted)
- Business-meaningful drops: `structureTypeId` (payroll/HR structure link) — worth wiring up; column already exists in the local schema.

### partners
- API fields: 51 (list endpoint) · Local columns: 87 · Mapped: 69 (many from nested objects; mapper also handles detail endpoint)
- **In API, not in local (24):** `address`, `addressV2`, `debt`, `lastAppointmentDate`, `debit`, `credit`, `balance`, `companyName`, `categories`, `source`, `countLine`, `dateOfBirth`, `appointmnetId`, `appointmnetName`, `time`, `buyerTaxCode`, `buyerLegalName`, `buyerLegalAddress`, `buyerLegalSubName`, `buyerName`, `buyerAddress`, `sendInvoiceBy`, `sendInvoiceEmail`, `sendInvoiceZalo`
- **In local, not in API list-endpoint:** many (59) — but most ARE populated via the /detail endpoint (see `partner_detail.json`) so not truly unused.
- FieldMapper coverage: 69 API fields explicitly mapped (covers detail endpoint too), but list-endpoint still drops the 24 fields above.
- **Business-meaningful drops (high priority):** `debt`, `debit`, `credit`, `balance`, `lastAppointmentDate`, `buyerTaxCode`, `buyerLegalName`, `buyerAddress`, `buyerLegalAddress`, `buyerLegalSubName`, `buyerName`, `sendInvoiceBy`, `sendInvoiceEmail`, `sendInvoiceZalo`, `dateOfBirth`
- **Note on typo:** The source API has a typo `appointmnetId` / `appointmnetName` — safe to ignore.

### appointments
- API fields: 28 · Local columns: 36 · Mapped: 16
- **In API, not in local (14):** `userName`, `doctorName`, `stateDisplay`, `partnerName`, `partnerPhone`, `partnerGender`, `partnerAvatar`, `partnerRef`, `partnerDisplayName`, `partner`, `companyName`, `isLate`, `services`, `serviceIds` (all denormalised display data — derivable via JOIN)
- **In local, not in API (22):** `callid`, `confirmedid`, `createdbyid`, `crmtaskid`, `customercarestatus`, `customerreceiptid`, `dateappointmentreminder`, `datecreated`, `datedone`, `datetimeappointment` (mapper DOES write this from `date`), `datetimearrived`, `datetimedismissed`, `datetimeseated`, `dotkhamid`, `isnotreatment`, `lastdatereminder`, `lastupdated`, `saleorderid`, `teamid`, `time` (mapper DOES write this), `userid` (mapper DOES write this), `writebyid`
- FieldMapper coverage: 16 of 28 (12 silent drops, all denormalised UI data)
- Business-meaningful drops: none (all drops are derivable display data)

### customerreceipts
- API fields: 15 · Local columns: 18 · Mapped: 13
- **In API, not in local (4):** `doctorName`, `partnerName`, `partnerPhone`, `partnerDisplayName` (all denormalised display)
- **In local, not in API (7):** `companyid`, `createdbyid`, `datecreated`, `lastupdated`, `timeexpected` (mapper DOES write this), `userid`, `writebyid`
- FieldMapper coverage: 13 of 15 (2 real silent drops: `doctorName`, `partnerDisplayName`)
- Business-meaningful drops: none

### saleorders
- API fields: 17 · Local columns: 40 · Mapped: 12
- **In API, not in local (9):** `partnerName`, `partnerDisplayName`, `saleManName`, `partner` (nested — already flattened to `partnerid`), `productNames`, `stateDisplay`, `amountDiscountTotal`, `doctorName`, `companyName`
- **In local, not in API (32):** many odoo-internal fields — `amounttax`, `amountuntaxed`, `appointmentid`, `cardid`, `codepromoprogramid`, `discountfixed`, `discountpercent`, `discounttype`, `invoicestatus`, `isdeleted`, `isfast`, `isoldflow`, `isquotation`, `journalid`, `leadid`, `note`, `orderid`, `pricelistid`, `quotationid`, `quoteid`, `sequencenumber`, `sequenceprefix`, `type`, etc.
- FieldMapper coverage: 12 of 17 (5 silent drops)
- Business-meaningful drops: `amountDiscountTotal` (worth capturing — local has no column for it currently)

### saleorderlines
- API fields: 48 · Local columns: 65 · Mapped: 29
- **In API, not in local (19):** `orderPartnerName`, `orderPartnerDisplayName`, `orderPartnerPhone`, `orderPartnerAddress`, `orderName`, `productName`, `employee` (nested — already flattened via `employeeId`), `employeeName`, `assistant`, `counselor`, `productCode`, `productUOMName`, `steps`, `totalRecognizedRevenue`, `totalRemainingRevenue`, `stateDisplay`, `teethDisplay`, `lastServiceUseDate`, `tax` (nested)
- **In local, not in API (36):** many Odoo-internal fields; notable: `amountdiscount`, `amountpaid`, `amounttoinvoice`, `note`, `promotionid`, `toothcategoryid`, `treatmentplan`, `lastserviceuserdate` (typo column — the API sends `lastServiceUseDate` which does not match due to spelling `USE` vs local `USER`)
- FieldMapper coverage: 29 of 48 (19 silent drops)
- **Business-meaningful drops:** `totalRecognizedRevenue`, `totalRemainingRevenue`, `lastServiceUseDate` (also hits the column-name typo issue), `orderPartnerPhone`, `orderPartnerAddress`
- **Schema bug flag:** local column `lastserviceuserdate` (5 letters `USER`) appears to be a misspelling of `lastserviceusedate` (`USE`). Either rename the column or map with string fix.

### dotkhams
- API fields: 31 · Local columns: 26 · Mapped: 16
- **In API, not in local (17):** `partnerRef`, `partnerName`, `partner`, `doctorName`, `doctor`, `assistantName`, `assistant`, `assistantSecondaryName`, `assistantSecondary`, `saleOrderName`, `services`, `doctorUserId` (mapper DOES write this into `userid`), `doctorAvatar`, `lineIds`, `totalInvoicesResidual` (mapper DOES write this into `amountresidual`), `totalPaid`, `isOldFlow`
- **In local, not in API (12):** `accountinvoiceid`, `activitystatus`, `amountresidual`, `appointmentid`, `companyid`, `createdbyid`, `datecreated`, `isdeleted`, `lastupdated`, `sequence`, `userid` (populated from `doctorUserId`), `writebyid`
- FieldMapper coverage: 16 of 31 (15 silent drops, mostly denormalised)
- Business-meaningful drops: `totalPaid` (worth capturing as companion to `amountresidual` for fast queries)

### accountpayments
- API fields: 15 · Local columns: 35 · Mapped: 12 (incl. nested `journal.id`)
- **In API, not in local (7):** `partnerName`, `journalName`, `journal` (nested — flattened to `journalid`), `journalType`, `displayPaymentType`, `amountSigned`, `displayState`
- **In local, not in API (27):** many Odoo-internal — `destinationaccountid`, `destinationjournalid`, `householdbusinessid`, `insuranceid`, `isintercompany`, `isinternaltransfer`, `isprepayment`, `moveid`, `pairedintercompanypaymentid`, etc.
- FieldMapper coverage: 12 of 15 (3 silent drops)
- Business-meaningful drops: `amountSigned` (signed version of amount — useful for outgoing/incoming distinction; can be derived from `paymentType` though)

### partneradvances
- API fields: 8 · Local columns: 17 · Mapped: 10
- **In API, not in local (2):** `journalName`, `amountResidual`
- **In local, not in API (11):** `accountpaymentid`, `companyid`, `createdbyid`, `datecreated`, `destinationaccountid`, `journalid` (mapper does write this), `lastupdated`, `moveid`, `note` (mapper does write this), `partnerid` (mapper does write this), `writebyid`
- FieldMapper coverage: 10 of 8 API fields (mapper reads more than the list endpoint returns — some fields come from detail)
- Business-meaningful drops: `amountResidual` — worth adding; pairs with `amount` for balance tracking.

---

## Recommendations

1. **Priority-1 follow-up PR** — extend schema and FieldMapper to persist these eight fields (single migration + single PR):
   - `partners.debt`, `partners.debit`, `partners.credit`, `partners.balance`, `partners.lastappointmentdate`
   - `saleorders.amountdiscounttotal` (column doesn't yet exist)
   - `saleorderlines.totalrecognizedrevenue`, `saleorderlines.totalremainingrevenue`
   - `dotkhams.totalpaid`
   - `partneradvances.amountresidual`

2. **Priority-2** — e-invoice fields on `partners` (8 columns): `buyerTaxCode`, `buyerLegalName`, `buyerLegalAddress`, `buyerLegalSubName`, `buyerName`, `buyerAddress`, `sendInvoiceBy`, `sendInvoiceEmail`, `sendInvoiceZalo`. Only needed if e-invoicing is in scope for the local app.

3. **Schema bug** — rename or alias `dbo.saleorderlines.lastserviceuserdate` -> `lastserviceusedate` and wire it into the mapper.

4. **Mapper bug** — `employees.structureTypeId` arrives in the API but is never written to the existing `dbo.employees.structuretypeid` column. Trivial one-line fix.

5. **No action needed** for the denormalised `*Name`, `*Display`, `*DisplayName`, nested entity fields — these are UI conveniences from the source; we correctly derive them from JOIN locally.

---

_Generated by Level-3 schema-coverage verifier._
