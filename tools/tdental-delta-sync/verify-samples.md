# Sample Field Diff Report (Level 2)

- Generated: 2026-04-14T05:06:11.182959Z
- SYNC_SINCE cutoff: 2026-02-22
- Tables verified: 11

## Summary
- Rows sampled: **95**
- Perfect match: **34 (35.8%)**
- Rows with field differences: 40
- Rows 404 on live API: 0
- Errored: 21

Top 10 field-level discrepancies across all tables:
- `customerreceipts.timeExpected`: 10 rows
- `customerreceipts.companyId`: 10 rows
- `partners.date`: 5 rows
- `saleorders.amountUntaxed`: 5 rows
- `saleorders.companyId`: 5 rows
- `saleorders.invoiceStatus`: 5 rows
- `appointments.userId`: 5 rows
- `accountpayments.destinationAccountId`: 5 rows
- `accountpayments.companyId`: 5 rows
- `accountpayments.partnerId`: 5 rows

## Per-table results

### partners
- Sampled: 10 rows
- Perfect match: 5/10
- Rows with field differences: 5

Top discrepancy fields:
  - `date`: value_mismatch=5

Sample row diffs:
- `656f05e5-0fbc-4d62-b040-b417007de34e` (post): 1 field(s)
  - `date`: local=2026-03-24T14:38:20.633000 api=2026-03-24T07:37:42.29 [value_mismatch]
- `6956783e-119c-485e-8294-b41700686b1e` (post): 1 field(s)
  - `date`: local=2026-03-24T13:20:10.553000 api=2026-03-24T06:20:07.125 [value_mismatch]
- `a0978745-8cef-4c0a-8ad3-b3f900719be8` (post): 1 field(s)
  - `date`: local=2026-02-22T13:53:38.265000 api=2026-02-22T06:53:38.76 [value_mismatch]
- `601fe8a4-9eff-40cb-8c26-b425007d9994` (post): 1 field(s)
  - `date`: local=2026-04-07T14:37:17.720000 api=2026-04-07T07:32:21.155 [value_mismatch]
- `2209ae0f-19ec-4073-b52c-b3fa00aae791` (post): 1 field(s)
  - `date`: local=2026-02-23T17:22:14.667000 api=2026-02-23T10:22:22.829 [value_mismatch]

### saleorders
- Sampled: 10 rows
- Perfect match: 5/10
- Rows with field differences: 5

Top discrepancy fields:
  - `amountUntaxed`: null_local=5
  - `companyId`: null_local=5
  - `invoiceStatus`: null_local=5
  - `userId`: null_local=3

Sample row diffs:
- `19b22938-4228-4ddd-8b2d-b40e00975fc0` (post): 4 field(s)
  - `amountUntaxed`: local=null api=24437000.0 [null_local]
  - `companyId`: local=null api=6861c928-0e13-4664-c781-08dcdfa45074 [null_local]
  - `userId`: local=null api=2b860551-c401-48a3-ac11-4286e01fca87 [null_local]
  - …and 1 more
- `1364dc47-1ea1-461d-9098-b42000b72d12` (post): 4 field(s)
  - `amountUntaxed`: local=null api=200000.0 [null_local]
  - `companyId`: local=null api=6861c928-0e13-4664-c781-08dcdfa45074 [null_local]
  - `userId`: local=null api=25aac760-7e43-43c7-bcb8-5a4cd4342782 [null_local]
  - …and 1 more
- `18026b61-949b-42b8-97d8-b3fd00747887` (post): 4 field(s)
  - `amountUntaxed`: local=null api=6264000.0 [null_local]
  - `companyId`: local=null api=765f6593-2b19-4d06-cc8c-08dc4d479451 [null_local]
  - `userId`: local=null api=2b860551-c401-48a3-ac11-4286e01fca87 [null_local]
  - …and 1 more
- `2bad3a58-caf7-4172-b77e-b3ff00c07e02` (post): 3 field(s)
  - `amountUntaxed`: local=null api=2300000.0 [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - `invoiceStatus`: local=null api=no [null_local]
- `230e55da-d1fd-4818-980d-b407009bb306` (post): 3 field(s)
  - `amountUntaxed`: local=null api=2500000.0 [null_local]
  - `companyId`: local=null api=cad65000-6ff3-47c7-cc8d-08dc4d479451 [null_local]
  - `invoiceStatus`: local=null api=no [null_local]

### saleorderlines
- Sampled: 10 rows
- Perfect match: 0/10
- Rows errored: 10

### dotkhams
- Sampled: 10 rows
- Perfect match: 0/10
- Rows errored: 10

### appointments
- Sampled: 10 rows
- Perfect match: 5/10
- Rows with field differences: 5

Top discrepancy fields:
  - `userId`: null_local=5
  - `dateCreated`: null_local=4

Sample row diffs:
- `8d312b88-355b-4c43-baec-b41300adb730` (post): 2 field(s)
  - `userId`: local=null api=b4ce78f5-c73f-4f36-888a-914287165026 [null_local]
  - `dateCreated`: local=null api=2026-03-20T17:32:28.7446757 [null_local]
- `ee506d6f-308d-4d2b-b117-b4270093ea9b` (post): 2 field(s)
  - `userId`: local=null api=fc3fea54-5fdd-4c20-9319-d35293d46090 [null_local]
  - `dateCreated`: local=null api=2026-04-09T15:58:32.8336796 [null_local]
- `1edb7fad-78c8-44ca-b5d6-b3d5009e6480` (post): 1 field(s)
  - `userId`: local=null api=de5ceb25-27e1-44cd-8529-19cacbbdec40 [null_local]
- `3c535426-8f66-49d8-9f8e-b40100ace9e3` (post): 2 field(s)
  - `userId`: local=null api=b4ce78f5-c73f-4f36-888a-914287165026 [null_local]
  - `dateCreated`: local=null api=2026-03-02T17:29:33.5534251 [null_local]
- `67546387-181f-484a-8ef5-b4120032bf29` (post): 2 field(s)
  - `userId`: local=null api=b5ebc1bc-f9a0-4923-9253-71a7e688428e [null_local]
  - `dateCreated`: local=null api=2026-03-19T10:04:45.7908801 [null_local]

### accountpayments
- Sampled: 10 rows
- Perfect match: 5/10
- Rows with field differences: 5

Top discrepancy fields:
  - `destinationAccountId`: null_local=5
  - `companyId`: null_local=5
  - `partnerId`: null_local=5

Sample row diffs:
- `8810c3e0-0ee1-405f-8184-b40a00bbe453` (post): 3 field(s)
  - `destinationAccountId`: local=null api=8bad3928-ff90-401b-93d9-afe30052aac3 [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - `partnerId`: local=null api=0f2ff762-208a-4c4e-aa0a-b21e00725670 [null_local]
- `6c2e5b24-8a2e-4ed9-a084-b40d005aa6b6` (post): 3 field(s)
  - `destinationAccountId`: local=null api=4327c9ea-0d63-4560-a990-b13f003eb7d2 [null_local]
  - `companyId`: local=null api=765f6593-2b19-4d06-cc8c-08dc4d479451 [null_local]
  - `partnerId`: local=null api=35a90cb1-8950-43ad-b6f7-b3d000699f64 [null_local]
- `88ee85b1-ecc0-4245-9c58-b40000c50b87` (post): 3 field(s)
  - `destinationAccountId`: local=null api=8bad3928-ff90-401b-93d9-afe30052aac3 [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - `partnerId`: local=null api=d6a1d417-6c0f-4b4d-a0d0-b3fc00a881a1 [null_local]
- `f3ca9eff-2167-45e6-ba79-b3fc00c314ed` (post): 3 field(s)
  - `destinationAccountId`: local=null api=a2eeeb9d-60bf-40c2-b019-b1f900a4cba2 [null_local]
  - `companyId`: local=null api=6861c928-0e13-4664-c781-08dcdfa45074 [null_local]
  - `partnerId`: local=null api=8d79201d-9a62-4d4e-9751-b20800646dbc [null_local]
- `e9e7998c-203a-4714-acc8-b40400c52b02` (post): 3 field(s)
  - `destinationAccountId`: local=null api=8bad3928-ff90-401b-93d9-afe30052aac3 [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - `partnerId`: local=null api=dd6cead0-031e-4152-bdbb-b40400c51150 [null_local]

### customerreceipts
- Sampled: 10 rows
- Perfect match: 0/10
- Rows with field differences: 10

Top discrepancy fields:
  - `timeExpected`: null_local=10
  - `companyId`: null_local=10

Sample row diffs:
- `75b4917a-73bc-4474-a572-b3c80090c8df` (pre): 2 field(s)
  - `timeExpected`: local=null api=10 [null_local]
  - `companyId`: local=null api=b178d5ee-d9ac-477e-088e-08db9a4c4cf4 [null_local]
- `0c787629-8f08-4e78-80c9-b25c007a4015` (pre): 2 field(s)
  - `timeExpected`: local=null api=30 [null_local]
  - `companyId`: local=null api=6861c928-0e13-4664-c781-08dcdfa45074 [null_local]
- `6da46536-0b5c-4faf-8ca6-b2150072c938` (pre): 2 field(s)
  - `timeExpected`: local=null api=30 [null_local]
  - `companyId`: local=null api=765f6593-2b19-4d06-cc8c-08dc4d479451 [null_local]
- `02b9c428-b81b-4c7f-9291-b37600a58e96` (pre): 2 field(s)
  - `timeExpected`: local=null api=20 [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
- `dc013c9c-de0c-4f85-8136-b2db00384490` (pre): 2 field(s)
  - `timeExpected`: local=null api=30 [null_local]
  - `companyId`: local=null api=765f6593-2b19-4d06-cc8c-08dc4d479451 [null_local]

### partneradvances
- Sampled: 10 rows
- Perfect match: 5/10
- Rows with field differences: 5

Top discrepancy fields:
  - `journalId`: null_local=5
  - `partnerId`: null_local=5
  - `companyId`: null_local=5
  - `note`: null_local=5

Sample row diffs:
- `9d0cfedf-b62b-4a0f-ae7e-b415009c2f67` (post): 4 field(s)
  - `journalId`: local=null api=0e3a1e86-94dc-41e4-86a3-b2c70050e781 [null_local]
  - `partnerId`: local=null api=08ab0364-d90f-46cd-a496-b20a004b5c22 [null_local]
  - `companyId`: local=null api=f0f6361e-b99d-4ac7-4108-08dd8159c64a [null_local]
  - …and 1 more
- `46f2030b-11c4-4c6d-b1d8-b41100559a97` (post): 4 field(s)
  - `journalId`: local=null api=4c8522d1-8577-4e1b-a010-b05b009a21a2 [null_local]
  - `partnerId`: local=null api=1e554e00-8572-4a89-b01a-b40f0096371d [null_local]
  - `companyId`: local=null api=b178d5ee-d9ac-477e-088e-08db9a4c4cf4 [null_local]
  - …and 1 more
- `3be27447-84fb-4762-a256-b40f003cda19` (post): 4 field(s)
  - `journalId`: local=null api=b79b56b0-3dd8-44d6-a90a-b1f900a4cbc2 [null_local]
  - `partnerId`: local=null api=cc980748-f3b8-42a7-bc13-b40900cb6acf [null_local]
  - `companyId`: local=null api=6861c928-0e13-4664-c781-08dcdfa45074 [null_local]
  - …and 1 more
- `b1a133a7-107b-4ac9-b0f9-b3fd00e76653` (post): 4 field(s)
  - `journalId`: local=null api=600fd353-473a-4cd8-9067-afe30052aac3 [null_local]
  - `partnerId`: local=null api=8cd993fa-a5e2-47c7-ab65-b3fd006600ef [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - …and 1 more
- `27445f9e-479b-4c50-b93a-b4250082183d` (post): 4 field(s)
  - `journalId`: local=null api=600fd353-473a-4cd8-9067-afe30052aac3 [null_local]
  - `partnerId`: local=null api=6c01af5d-31df-4eb9-81a0-b423004e224c [null_local]
  - `companyId`: local=null api=c6b4b453-d260-46d4-4fd9-08db24f7ae8e [null_local]
  - …and 1 more

### products
- Sampled: 5 rows
- Perfect match: 4/5
- Rows errored: 1

### companies
- Sampled: 5 rows
- Perfect match: 4/5
- Rows with field differences: 1

Top discrepancy fields:
  - `email`: value_mismatch=1

Sample row diffs:
- `c6b4b453-d260-46d4-4fd9-08db24f7ae8e` (pre): 1 field(s)
  - `email`: local=tamdentist.vn@gmail.com api=trungkien150495@gmail.com [value_mismatch]

### employees
- Sampled: 5 rows
- Perfect match: 1/5
- Rows with field differences: 4

Top discrepancy fields:
  - `userId`: null_local=4
  - `hrJobId`: null_local=3

Sample row diffs:
- `494dd94b-0f5c-4037-a183-b2d5004495bc` (pre): 2 field(s)
  - `userId`: local=null api=f766fa18-ced7-425a-80ad-5a28b81974f4 [null_local]
  - `hrJobId`: local=null api=fa5743f2-d34c-4748-b20d-b2c7006495fa [null_local]
- `9255f9a0-a21c-4804-8e1d-b1a1004a917e` (pre): 2 field(s)
  - `userId`: local=null api=103b375f-236c-4b62-896d-0a1879e8e65e [null_local]
  - `hrJobId`: local=null api=e14f5e2c-2962-421e-9148-b14a009e0050 [null_local]
- `7f9f1030-20ea-4c23-84e6-b16000c1e144` (pre): 2 field(s)
  - `userId`: local=null api=ae4c70cb-6213-4c0d-82a3-7ad1ae222129 [null_local]
  - `hrJobId`: local=null api=345803d5-23a9-489c-b664-b05b009c8276 [null_local]
- `bd74f07e-88a4-4731-83f1-b0e3003e4d85` (pre): 1 field(s)
  - `userId`: local=null api=3ae625bf-61c9-480a-91b2-065549d65322 [null_local]

## Diagnosis — Systematic FK-Dropping Bug

Cross-checking the sample diffs against full-table counts in local PG confirms several
**systematic mapping gaps** that are specific to the delta-synced window (rows created
on or after `2026-02-22`). The pattern is the same across multiple tables: certain
scalar FK / metadata columns are populated on the pre-cutoff baseline rows but are
`NULL` for **every** row written by the delta-sync pass. The live API returns these
fields non-null, so the data is available — the sync-time field mapper is dropping
them.

| Table              | Column               | Pre-cutoff NOT NULL | Post-cutoff NOT NULL | Verdict |
|--------------------|----------------------|---------------------|----------------------|---------|
| appointments       | `userid`             | 174 794 / 214 665   | **7 / 235**          | synced rows lose `userId` |
| saleorders         | `companyid`          | 56 579 / 56 580     | **0 / 42**           | 100% dropped |
| saleorders         | `userid` / `amountuntaxed` / `invoicestatus` | populated | NULL in all sampled rows | dropped |
| accountpayments    | `companyid` / `partnerid` / `destinationaccountid` | populated | NULL in 160 / 161 | dropped |
| partneradvances    | `companyid` / `partnerid` / `journalid` / `note` | -- | NULL in all sampled post rows | dropped |
| customerreceipts   | `companyid`          | **0 / 164 352**     | 0 / 117              | **never synced — 100% NULL across the whole table** |
| customerreceipts   | `timeexpected`       | **0 / 164 352**     | 0 / 117              | same — never mapped |
| employees          | `userid` / `hrjobid` | **0 / 382**         | —                    | **never synced — 100% NULL** |
| partners           | `date` (post rows)   | matches             | ~7h offset (timezone?) | value drift, investigate |
| companies          | `email` (1 row)      | —                   | —                    | pre-existing stale value: `tamdentist.vn@gmail.com` vs live `trungkien150495@gmail.com` |

The `partners.date` mismatch shows a consistent ~7-hour offset between local and API
values for post-cutoff rows, which is exactly the Vietnam-ICT (UTC+7) boundary. The
sync is likely writing a timezone-converted value while the API returns another
representation; worth confirming but lower severity than the FK drop.

The `saleorderlines` and `dotkhams` detail endpoints return HTTP 500 (AutoMapper
`Product.Tax → AccountTaxDto.Ta...` upstream bug), so field-level Level-2 fidelity
can't be measured for those two tables via the detail API. Rely on Level 1
(row-count) and Level 3 (list-row spot-checks) results for them.

## Verdict

❌ **Concerning — systematic mapping bug** — ~36% of sampled rows match perfectly, but
the remaining mismatches are not random: they are the same FK columns (`companyId`,
`userId`, `partnerId`, `journalId`, `destinationAccountId`, `hrJobId`) and business
columns (`amountUntaxed`, `invoiceStatus`, `timeExpected`, `note`) dropping to NULL
in post-cutoff inserts. Two columns (`customerreceipts.companyid/timeexpected`,
`employees.userid/hrjobid`) are **100% NULL across the entire local table**, meaning
the mapping has never populated them. The sync is not "stale" — it is losing
well-defined fields every time it writes. Fix the field mapper (likely missing
case-sensitive keys or missing column in `fieldMapper.ts`) before relying on the
local DB for analytics or business logic that depends on these columns.
