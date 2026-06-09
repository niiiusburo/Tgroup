-- @crossref:domain[customers-partners]
-- @crossref:used-in[NK3 schema migration: api/migrations/044_allow_duplicate_partner_phones]
-- @crossref:uses[product-map/domains/customers-partners.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration 044: Allow duplicate partner phone values
-- Phone numbers are not durable identity for migrated TGClinic customers.
-- Customer UUIDs and refs remain the operational identifiers, and migrated
-- phone/ref overlap must not block customer profile edits.

BEGIN;

DROP INDEX IF EXISTS dbo.partners_phone_unique;

COMMIT;
