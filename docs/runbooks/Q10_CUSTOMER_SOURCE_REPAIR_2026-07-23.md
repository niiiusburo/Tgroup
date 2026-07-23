# Q10 Customer-Source Repair — 2026-07-23

**Status:** The explicitly confirmed 43-order transaction was applied to
production `tdental_demo` on 2026-07-23 at 13:04:43 UTC (20:04 Vietnam) and
verified. A stricter post-apply workbook comparison found one additional order,
`SO-2026-5176`, outside the confirmed manifest; it remains unchanged and needs
a fresh exact confirmation before any additional production write.

Prepared transaction artifacts:

- Apply: `scripts/data-repairs/20260723_q10_customer_source_apply.sql`
- Rollback: `scripts/data-repairs/20260723_q10_customer_source_rollback.sql`
- Both scripts refuse to run without their exact psql confirmation variable.
- The apply script is the immutable, already-executed forensic artifact. Its
  audit-schema preflight blocks a second production apply. It must not be
  copied for future repairs because its first-run preflight did not lock target
  order rows; future dated scripts must use `FOR UPDATE` before validation.

## Evidence and boundary

- Earlier closed-period export: `/Users/thuanle/Downloads/Quận 10_ tháng 6 2026 Hạnh gửi.xlsx`
  - SHA-256: `c83674e027d54de4d5854ff7b47b35060551ee689c5a9a7f9c39b4ba292c1e1f`
- Current export: `/Users/thuanle/Downloads/T6 Q10.xlsx`
  - SHA-256: `373e591754621a204c242fe9eb6d9602fdfe0c57bbd8c1c72dd9352afb2844a0`
- Initial non-PII comparison manifest: `/tmp/tgclinic-q10-analysis.ZDkNqi/row_source_changes.json`
  - 43 unique service/order codes across 30 customers; this was the exact confirmed and executed batch
  - SHA-256: `5c77ba1fd20762ccdc62bc3e2534872b9fcac6517e4086c3dbb1a84c66083b60`
- Production target checked read-only: `tdental_demo`, company `Tấm Dentist Quận 10`
  - all 43 order codes exist, all 43 match the earlier workbook customer reference, all 43 belong to Q10, and none is deleted
  - all 43 are present in `repair_20260707.merge_so_audit`, but zero has a recoverable row in `repair_20260707.so_plan`
  - zero currently matches the earlier export source

The earlier workbook is the source of truth for this bounded correction. It
predates the reported drift and preserves order code, customer reference,
payment date, amounts, and source on otherwise matched rows. Phone number is
not used as the mutation key.

Post-apply strict row-key comparison found a 44th workbook mismatch that the
original phone-level source-set grouping masked:

- Customer ref: `T478964`
- Order: `SO-2026-5176`
- Payment date: `2026-06-30`
- Earlier/current source: `Khách cũ` → `Sale Online`
- Amount/service: `2,050,000` / `Điều trị tủy`

The order exists in Q10 production, is not deleted, is present in the July 7
merge audit, and was not part of the 43-order transaction. Do not append it to
the executed manifest or mutate it without a separate confirmation.

## Exact proposed mutation

Create one inactive, historical-reporting-only `dbo.customersources` lookup
named `Giới thiệu` (`type='referral'`, `is_active=false`, description naming
this bounded restore) only if a case/trim-equivalent row is still absent. It
must not become a selectable current source. Then update only
`dbo.saleorders.sourceid` for the 43 order codes below:

| Desired source | Current live source | Order codes | Count |
|---|---|---|---:|
| `Giới thiệu` | `Sale Online` for 19; `Khách hàng giới thiệu` for `SO-2026-4885` and `SO-2026-5163` | `SO-2026-2941`, `SO-2026-3109`, `SO-2026-3139`, `SO-2026-3117`, `SO-2026-3258`, `SO-2026-3259`, `SO-2026-0543`, `SO-2026-3832`, `SO-2026-3833`, `SO-2026-4095`, `SO-2026-0968`, `SO-2026-2300`, `SO-2026-4275`, `SO-2026-4276`, `SO-2026-4454`, `SO-2026-4885`, `SO-2026-4892`, `SO-2026-3111`, `SO-2026-5163`, `SO-2026-5164`, `SO-2026-3119` | 21 |
| `Khách cũ` | `Sale Online` | `SO-2026-5027`, `SO-2026-5042`, `SO-2026-5051`, `SO-2026-5044`, `SO-2026-5045`, `SO-2026-4976`, `SO-2026-5082`, `SO-2026-5083`, `SO-2026-5099`, `SO-2026-5123`, `SO-2026-5096`, `SO-2026-5087`, `SO-2026-5093`, `SO-2026-5089`, `SO-2026-5184`, `SO-2026-5148` | 16 |
| `Khách hàng giới thiệu` | `Sale Online` | `SO-2026-4993`, `SO-2026-4994`, `SO-2026-4974`, `SO-2026-5094` | 4 |
| `Hotline` | `Sale Online` | `SO-2026-5152`, `SO-2026-5170` | 2 |

Explicit non-targets: zero `partners`, payments, amounts, dates, states,
customers, or non-Q10 orders. Customer/deposit exports continue to use the
unchanged customer-level source.

## Transaction and rollback requirements

Before the update:

1. Create and download a fresh PostgreSQL custom-format backup; record the VPS
   and local paths plus SHA-256 below.
2. In one transaction, create a dated repair audit table containing each target
   order ID/code, current `sourceid`, expected source name/ID, the July 7 audit
   source ID, repair time, and operator.
3. Abort unless the plan resolves exactly 43 unique, non-deleted Q10 orders,
   all 43 remain in `merge_so_audit` and absent from `so_plan`, every order
   still has its reviewed live source (41 `Sale Online`; only
   `SO-2026-4885` and `SO-2026-5163` at `Khách hàng giới thiệu`), and every
   desired lookup resolves to exactly one ID after the conditional inactive
   `Giới thiệu` insert.
4. Update by immutable order UUID joined from the reviewed order code, verify
   exactly 43 rows changed, then commit.

The prepared apply script enforces these checks in SQL, saves the reviewed
backup/workbook hashes in persistent repair metadata, and records the exact
before/after source IDs for all 43 orders. The rollback script refuses to run
if any repaired order or the inactive historical source has acquired an
unreviewed reference since apply.

Rollback uses the audit table to restore each order's exact prior `sourceid`.
Delete the newly created `Giới thiệu` lookup only if the repair created it and
no row references it after rollback. The fresh database backup is the final
recovery boundary.

Backup evidence created before execution:

- VPS backup path: `/opt/tgroup/backups/manual/q10-customer-source-repair-20260723T121748Z/tdental_demo-pre-q10-source-repair.dump`
- Local downloaded backup path: `/Users/thuanle/Documents/TamTMV/Tgrouptest/backups/manual/q10-customer-source-repair-20260723T121748Z/tdental_demo-pre-q10-source-repair.dump`
- SHA-256 (VPS and local match): `f6f41c10f7c033c07e4c70331a158b7844d80258ac58c8639039fbf0258e8dcb`
- PostgreSQL TOC verification: PASS, 483 entries with PostgreSQL 16.11 `pg_restore` in the local `tgroup-db` container. The host PostgreSQL 15.14 binary is too old for dump header 1.15 and was not treated as a pass.

## Disposable rehearsal evidence

The exact backup above was restored twice under PostgreSQL 16: one clean
baseline and one apply/rollback rehearsal. The apply and rollback scripts both
refused execution without their exact confirmation variables. With the tokens
provided, the apply committed exactly 43 order changes with the expected
distribution, and the rollback restored exactly 41 `Sale Online` plus 2
`Khách hàng giới thiệu` assignments.

After rollback, deterministic `row_to_json` output ordered by immutable row ID
matched the clean restore for every row in each protected surface:

| Surface | Rows | Clean restore SHA-256 | Rolled-back rehearsal SHA-256 |
|---|---:|---|---|
| `dbo.partners` | 39,938 | `fe57f1cb5e790bde56a0c42244a147be6412dfa1159e2f6a9845c47bbd93e567` | `fe57f1cb5e790bde56a0c42244a147be6412dfa1159e2f6a9845c47bbd93e567` |
| `dbo.payments` | 78,136 | `0d2976a85e0fb7479145bd858256b628666819090fd484a2434bb0c4ae25c07f` | `0d2976a85e0fb7479145bd858256b628666819090fd484a2434bb0c4ae25c07f` |
| `dbo.saleorders` | 68,268 | `e6b8825d9e9876c18fba87b6dc83c2b76361a058feaa7cd61a4f78889425eb0e` | `e6b8825d9e9876c18fba87b6dc83c2b76361a058feaa7cd61a4f78889425eb0e` |
| `dbo.customersources` | 11 | `4cd2b560632e5999420e87832a50a920fa9aadf4db1b6e79d081b7842bc5e525` | `4cd2b560632e5999420e87832a50a920fa9aadf4db1b6e79d081b7842bc5e525` |

The repair audit schema intentionally remains after rollback with 43 unique
order audit rows and `rolled_back_at` set. It is the durable forensic record;
all four `dbo` surfaces above returned to the exact backed-up row contents.

## Production execution evidence

- Confirmation scope: exactly the 43 orders in the checked-in manifest.
- Repair schema: `repair_20260723_q10_source`.
- PostgreSQL transaction ID: `276262`.
- Audit result: 43 distinct target orders, zero source mismatches, zero wrong-company rows, zero deleted rows, and zero customer-reference mismatches.
- Final target distribution: 21 `Giới thiệu`, 16 `Khách cũ`, 4 `Khách hàng giới thiệu`, 2 `Hotline`.
- Transaction write-set proof from row `xmin`: 43 `dbo.saleorders`, 0 `dbo.partners`, 0 `dbo.payments`, 1 `dbo.customersources`, 43 repair audit rows, and 1 repair metadata row.
- The created `Giới thiệu` lookup is `type='referral'`, `is_active=false`, and is referenced by exactly the 21 repaired orders.
- The pre-repair VPS/local backup remains byte-identical at SHA-256 `f6f41c10f7c033c07e4c70331a158b7844d80258ac58c8639039fbf0258e8dcb`.

Local recurrence hardening adds transaction-scoped source locks and migration
050 foreign keys. A fresh read-only production preflight found zero orphan
`partners.sourceid` and zero orphan `saleorders.sourceid` rows. The migration
was applied twice to a disposable restore of the verified backup; both named
constraints were validated, referenced-source deletion failed, and assigning
an unknown source ID failed. This schema/code guard is not live until the
normal PR, CI, merge, and deploy path completes.

## Expected behavior and proof

| Visit / action | Expected result |
|---|---|
| Re-export Q10 revenue for June 2026 | The 43 confirmed orders use the earlier workbook source labels; `SO-2026-5176` remains a separately disclosed mismatch until confirmed, and all other rows remain unchanged. |
| Count desired source distribution across the exact target set | Exactly 21 `Giới thiệu`, 16 `Khách cũ`, 4 `Khách hàng giới thiệu`, and 2 `Hotline`; `Giới thiệu` remains inactive for current data entry. |
| Compare row keys, dates, amounts, and order codes | No value changes except `Nguồn khách` for the 43 targets; the existing one-row duplicate difference remains a separate workbook-shape observation. |
| Open revenue-by-source or services breakdown for the same period | The 43 orders move from their reviewed current buckets into 21 `Giới thiệu`, 16 `Khách cũ`, 4 `Khách hàng giới thiệu`, and 2 `Hotline`. |
| Export customer/deposit data | No change from this repair because `partners.sourceid` is not updated. |
| Query a non-target Q10 or another-branch order | Its `sourceid` is byte-for-byte unchanged. |
| Run the rollback transaction | All 43 orders regain their captured pre-repair `sourceid`; no financial or clinical field changes. |
| Create or edit a service after the local guard is released | New data can select active sources only; an existing inactive source can remain only on the same historical order. This guard is local and is not production-active until normal PR/CI/merge/deploy. |
