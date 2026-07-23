# Data-repair artifacts

These files are manually invoked, confirmation-gated incident artifacts. They
are not migrations and must never be selected by automated deploy loops.

## Q10 customer-source batch, 2026-07-23

`20260723_q10_customer_source_apply.sql` is the byte-for-byte executed 43-order
artifact (SHA-256
`09ce36c72271ce0c24bb723a05ca0959ef45efaba401b1795d7ad1bd667a9070`).
It is retained for forensic reproducibility and its own preflight refuses a
second apply when the production audit schema exists. Do not reuse or modify it
for another batch.

The executed transaction was verified after commit, but the frozen script did
not lock target sale-order rows during its first-run preflight. Any future
record repair must use a new dated artifact that locks its exact targets with
`FOR UPDATE` before validation and derives audit/update state from those locked
rows. It also requires a fresh backup, rehearsal, rollback, and new explicit
production confirmation.

`20260723_q10_customer_source_rollback.sql` remains the exact rollback for only
the executed 43-order batch. It refuses drifted targets and must not be extended
to cover `SO-2026-5176` or any other unconfirmed row.
