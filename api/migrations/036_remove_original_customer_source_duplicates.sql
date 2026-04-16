-- Migration: Remove original pre-031 customer source duplicates
-- These were accidentally re-inserted by 035_restore_customer_sources.sql
-- Keeps only the 8 business-defined post-031 sources.

BEGIN;

DELETE FROM dbo.customersources
WHERE name IN (
  'Google',
  'Khác',
  'Bảo hiểm',
  'Facebook',
  'Giới thiệu',
  'Website',
  'Đi ngang qua'
);

COMMIT;
