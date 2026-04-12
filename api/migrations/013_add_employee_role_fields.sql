-- Migration: Add employee role fields to dbo.partners
-- These fields are needed by POST/PUT /api/Employees to persist role flags and HR data.
-- The employees VIEW was updated to pass through these real columns instead of deriving from jobtitle.

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS isdoctor       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isassistant    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isreceptionist BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS startworkdate  TIMESTAMP WITHOUT TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS wage           NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS allowance      NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS hrjobid        UUID NULL;

-- Backfill role flags from jobtitle for existing employees
UPDATE dbo.partners SET
  isdoctor = CASE
    WHEN jobtitle IS NULL OR jobtitle ILIKE '%bác sĩ%' THEN true
    ELSE false
  END,
  isassistant = CASE
    WHEN jobtitle ILIKE '%phụ tá%' OR jobtitle ILIKE '%trợ lý%' OR jobtitle ILIKE '%assistant%' THEN true
    ELSE false
  END,
  isreceptionist = CASE
    WHEN jobtitle ILIKE '%lễ tân%' OR jobtitle ILIKE '%receptionist%' THEN true
    ELSE false
  END
WHERE employee = true;

-- Recreate the employees view to pass through real columns
CREATE OR REPLACE VIEW dbo.employees AS
SELECT
  id,
  name,
  namenosign,
  ref,
  phone,
  email,
  avatar,
  isdoctor,
  isassistant,
  isreceptionist,
  active,
  jobtitle,
  companyid,
  hrjobid,
  wage,
  allowance,
  startworkdate,
  street AS address,
  NULL::text AS identitycard,
  CASE
    WHEN birthyear IS NOT NULL AND birthmonth IS NOT NULL AND birthday IS NOT NULL
    THEN make_date(birthyear, birthmonth, birthday)::timestamp without time zone
    ELSE NULL::timestamp without time zone
  END AS birthday,
  NULL::numeric AS hourlywage,
  NULL::numeric AS leavepermonth,
  NULL::numeric AS regularhour,
  NULL::numeric AS overtimerate,
  NULL::numeric AS restdayrate,
  NULL::text AS enrollnumber,
  NULL::text AS medicalprescriptioncode,
  datecreated,
  lastupdated
FROM dbo.partners
WHERE employee = true;
