-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/054_add_appointments_ctv]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 054_add_appointments_ctv.sql
-- Per-appointment CTV attribution (eligibility window v1).
--
-- An appointment can now carry the CTV it was booked under, mirroring saleorders.ctv_id
-- (migration 052). This makes "the most recent CTV-bearing appointment OR service" an honest,
-- queryable fact, which drives the 6-month customer<->CTV eligibility window.
--
-- Nullable + no hard FK on purpose (same rationale as saleorders.ctv_id): an appointment lives
-- in one LOB DB while a CTV exists in both; a dangling id simply yields no link. Idempotent.

ALTER TABLE dbo.appointments ADD COLUMN IF NOT EXISTS ctv_id uuid;

CREATE INDEX IF NOT EXISTS idx_appointments_ctv_id
  ON dbo.appointments (ctv_id)
  WHERE ctv_id IS NOT NULL;

COMMENT ON COLUMN dbo.appointments.ctv_id IS
  'CTV (partners.id, is_ctv=true) this appointment was booked under. NULL = no CTV. Drives the 6-month customer eligibility window (latest CTV-bearing appointment OR service wins).';

-- One-time launch backfill: existing referred customers have no CTV-bearing appointment yet, so
-- give each currently-referred customer a single anchor = their most-recent non-cancelled
-- appointment, stamped with their referred_by_ctv_id. Idempotent: only fires for customers who
-- have ZERO CTV-bearing appointments, so re-running is a no-op and it never stamps walk-ins
-- beyond the one anchor.
WITH anchor AS (
  SELECT DISTINCT ON (a.partnerid) a.id
    FROM dbo.appointments a
    JOIN dbo.partners p ON p.id = a.partnerid
   WHERE p.referred_by_ctv_id IS NOT NULL
     AND COALESCE(a.state, '') NOT ILIKE 'cancel%'
     AND NOT EXISTS (
       SELECT 1 FROM dbo.appointments a2
        WHERE a2.partnerid = a.partnerid AND a2.ctv_id IS NOT NULL
     )
   ORDER BY a.partnerid, COALESCE(a.date, a.datecreated) DESC NULLS LAST
)
UPDATE dbo.appointments a
   SET ctv_id = p.referred_by_ctv_id
  FROM anchor an
  JOIN dbo.appointments tgt ON tgt.id = an.id
  JOIN dbo.partners p ON p.id = tgt.partnerid
 WHERE a.id = an.id
   AND p.referred_by_ctv_id IS NOT NULL;

INSERT INTO dbo.schema_migrations (filename) VALUES ('054_add_appointments_ctv.sql')
  ON CONFLICT (filename) DO NOTHING;
