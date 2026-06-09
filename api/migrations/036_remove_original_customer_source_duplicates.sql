-- @crossref:domain[customers-partners]
-- @crossref:used-in[NK3 schema migration: api/migrations/036_remove_original_customer_source_duplicates]
-- @crossref:uses[product-map/domains/customers-partners.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
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
