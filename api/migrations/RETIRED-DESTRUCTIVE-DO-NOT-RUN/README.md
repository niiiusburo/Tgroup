# Retired customer-source rewrites

These files are preserved only as incident evidence. Their `.sql.retired`
extension is intentional: migration runners and recursive `*.sql` scans must
not be able to execute them.

The retired sequence contains SQL that renames, merges, deletes, and partially
recreates customer-source rows. In particular, migrations 033 and 034 are
designed to rewrite both `dbo.partners.sourceid` and `dbo.saleorders.sourceid`
to `Sale Online`; running that logic can change historical reports after the
underlying visits have already happened. Production evidence proves corrupted
order-level source values and places every confirmed Q10 target in the July 7
merge audit, but it does not isolate one historical migration execution as the
sole cause of every row. The later restore migration can recreate lookup rows
but cannot recover each record's prior source assignment.

Never rename these artifacts back to `.sql` or copy them into an active
migration directory. Any source-data repair must instead use a fresh backup,
an explicit record-level manifest, a transaction with rollback, and the
production-data confirmation gate in `AGENTS.md`.
