# Retired destructive migrations — DO NOT RUN

These files are preserved only as incident / one-shot import evidence. Their
`.sql.retired` extension is intentional: migration runners and recursive
`*.sql` scans must not be able to execute them.

## Customer-source rewrite artifacts (031, 033–036)

The retired sequence contains SQL that renames, merges, deletes, and partially
recreates customer-source rows. In particular, migrations 033 and 034 are
designed to rewrite both `dbo.partners.sourceid` and `dbo.saleorders.sourceid`
to `Sale Online`; running that logic can change historical reports after the
underlying visits have already happened. Production evidence proves corrupted
order-level source values and places every confirmed Q10 target in the July 7
merge audit, but it does not isolate one historical migration execution as the
sole cause of every row. The later restore migration can recreate lookup rows
but cannot recover each record's prior source assignment.

Any source-data repair must instead use a fresh backup, an explicit
record-level manifest, a transaction with rollback, and the production-data
confirmation gate in `AGENTS.md`.

## TDental bulk-import TRUNCATE artifacts (008 v1/v2/v3) — AUD-001

`008_data_migration_from_tdental*.sql.retired` are historical one-shot data
pulls from an old TDental database. Each file issues `TRUNCATE TABLE ...
CASCADE` against core clinic tables (`partners`, `payments`, `saleorders`,
`employees`, `appointments`, `products`, `companies`, and related children)
before re-inserting imported rows.

Re-running any of these on a live or shared database is catastrophic data loss.
They are **forbidden** from the default deploy/runbook path
(`api/migrations/*.sql`). There is no safe blind re-apply.

### Opt-in only (explicit, never automated)

1. Deployment captain written approval naming the exact target database.
2. Verified full backup + restore drill of that database.
3. Disposable or intentionally empty target only — never production, staging
   with real data, or any DB that still holds clinic history.
4. Manual single-file invocation by the exact `.sql.retired` path (for example,
   `psql --file=...sql.retired`) — never rename or copy the artifact, and never
   use the deploy loop or a directory glob.
5. Confirm the artifact remains quarantined as `.sql.retired` after the run.

Never rename these artifacts back to `.sql` or copy them into the active
migration directory. Guards:
`api/tests/customerSourceMigrationArchiveGuard.test.js` and
`api/tests/destructiveTruncateMigrationArchiveGuard.test.js`.
