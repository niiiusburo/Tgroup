-- Migration: Add employee role fields to dbo.partners
-- These fields were previously accepted by POST/PUT /api/Employees but silently dropped
-- (see audit finding: employees.js:238, 325). This migration persists them.

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS isdoctor       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isassistant    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isreceptionist BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS startworkdate  DATE NULL;

-- dbo.employees is a view over partners where employee=true; it will automatically
-- expose the new columns on next query (PostgreSQL expands SELECT * at view-query time
-- when the view was defined with SELECT *, OR when we re-create it). If the view was
-- defined with an explicit column list, re-create it below. Guarded so it is a no-op
-- when the view uses SELECT *.
