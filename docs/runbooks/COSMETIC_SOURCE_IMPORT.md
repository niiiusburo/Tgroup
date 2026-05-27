# Cosmetic LOB Source Workbook Import

Purpose: stage and apply the cosmetic source workbook into the isolated Cosmetic LOB database with auditable dry-run, backup, confirmation, and idempotency gates.

Source workbook:

- Google Sheet: `https://docs.google.com/spreadsheets/d/1g51Z2XCjgWu_rvxBG3lzaUIHaCu-if4NOsyXwqBpBlA/edit?gid=312794834#gid=312794834`
- Local source snapshot used for the 2026-05-23 audit: `/tmp/tgroup-cosmetic-source.xlsx`
- Required tabs: exactly `Hồ sơ`, `Phiếu cọc`, and `Phiếu khám`

## Mapping

| Source tab | Target place in Cosmetic LOB | Matching rule |
|---|---|---|
| `Hồ sơ` | `tcosmetic_demo.dbo.partners` customer profiles, branch assignment, sale/referral notes | Phone is a candidate match only; `partners.id` remains the durable identity after import |
| `Phiếu cọc` | `tcosmetic_demo.dbo.payments` deposit rows with `payment_category='deposit'` and `deposit_type='deposit'` | Requires exactly one cosmetic customer match or a profile row that can create one |
| `Phiếu khám` | `tcosmetic_demo.dbo.products`, `saleorders`, `saleorderlines`, `payments`, and `payment_allocations` | Creates treatment orders from service rows and links paid amounts through canonical allocations |

Branch aliases normalize to `Thẩm mỹ Hà Nội` and `Thẩm mỹ Hồ Chí Minh`. Payment method `Chuyển khoản` normalizes to `bank_transfer`. Names and branches are normalized accent-insensitively for matching, but source text is retained in the audit plan where available.

## Dry Run

```bash
node api/scripts/cosmetic-lob-import.js \
  --workbook /tmp/tgroup-cosmetic-source.xlsx \
  --dry-run \
  --audit-dir artifacts/cosmetic-lob-import
```

The dry-run mode is read-only. It connects to the cosmetic database snapshot, validates the exact three-tab workbook contract, builds a proposed import plan, and writes:

- `*.summary.json` with tab counts, field mapping, and create/update/skip/manual-review totals.
- `*.anomalies.ndjson` with rows that need manual review.

Latest verified local dry run on 2026-05-23:

- Tabs: `Hồ sơ=12279`, `Phiếu cọc=1703`, `Phiếu khám=3922`.
- Proposed creates: 2 companies, 92 staff names, 27 products, 12278 customers, 1702 deposit rows, 3922 treatment rows, 3828 payment rows.
- Manual review: 1 deposit row from `Phiếu cọc` row 1127 for phone `0969698444`; no treatment rows required manual review.
- Latest audit files:
  - `artifacts/cosmetic-lob-import/cosmetic-lob-import-2026-05-23T09-25-00-066Z-5f9a9df7.summary.json`
  - `artifacts/cosmetic-lob-import/cosmetic-lob-import-2026-05-23T09-25-00-066Z-5f9a9df7.anomalies.ndjson`

## Apply Mode

Apply mode must only run after the dry-run summary, anomaly file, local-vs-VPS compare, source/target backups, and the two explicit confirmations required by `AGENTS.md`.

```bash
node api/scripts/cosmetic-lob-import.js \
  --workbook /tmp/tgroup-cosmetic-source.xlsx \
  --apply \
  --allow-manual-review \
  --database-url "$COSMETIC_DATABASE_URL" \
  --audit-dir artifacts/cosmetic-lob-import-vps-apply
```

The importer writes only to the selected cosmetic database connection. Idempotency is based on `COSMETIC_SHEET:*` source references in payments and sale orders, plus current cosmetic snapshot matching for companies, staff, products, and customers.

2026-05-23 local rehearsal backup and apply evidence:

- Before-rehearsal backup: `backups/db-import/tcosmetic_demo-before-cosmetic-sheet-import-20260523-171709.dump`.
- Source proof backup after local rehearsal: `backups/db-import/tcosmetic_demo-after-local-cosmetic-sheet-import-20260523-171758.dump`.
- Local apply summary: `artifacts/cosmetic-lob-import-local-apply/cosmetic-lob-import-2026-05-23T10-17-13-789Z-c5860fcc.summary.json`.
- Local apply result: 2 companies, 92 staff, 27 products, 12278 customers, 1702 deposits, 3922 treatment orders, 3828 service payments, 1 manual-review anomaly.
- Local post-apply dry run confirmed zero new creates for companies, staff, products, customers, deposits, treatments, and payments.

2026-05-23 live VPS apply evidence for `tcosmetic_smoketest`:

- Before-import VPS backup: `backups/db-import/tcosmetic_smoketest-vps-before-cosmetic-sheet-import-20260523-171758.dump`.
- Live apply summary: `artifacts/cosmetic-lob-import-vps-apply/cosmetic-lob-import-2026-05-23T10-38-41-332Z-aa64081a.summary.json`.
- Live apply result: 0 companies, 92 staff, 2 products, 12278 customers, 1702 deposits, 3922 treatment orders, 3828 service payments, 1 manual-review anomaly.
- Live post-import counts: 2 companies, 12290 active customers, 103 staff, 181 active products, 3922 imported sale orders, 5530 imported payments, 3828 imported allocations.
- Live post-apply dry run: `artifacts/cosmetic-lob-import-vps-post-apply/cosmetic-lob-import-2026-05-23T11-14-37-659Z-915b5266.summary.json`; confirmed `0` new creates, `1702` deposit skips, `3922` treatment skips, `3828` payment skips, and the same 1 manual-review anomaly.

## Safety Gates

- Do not import this workbook into dental tables.
- Do not run apply mode until the dry-run summary and anomaly file are reviewed.
- Preserve ambiguous money rows as manual-review anomalies instead of guessing a customer.
- Keep payment rows canonical: deposits go to `payments`; service collections go through `payments` plus `payment_allocations`.
- Before any future local-to-VPS or VPS-to-local database sync, compare local and VPS database state first, download a fresh source backup, show the backup path, and get the two explicit confirmations required by `AGENTS.md`.
