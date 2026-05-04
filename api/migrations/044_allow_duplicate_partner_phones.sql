-- Migration 044: Allow duplicate partner phone values
-- Phone numbers are not durable identity for migrated TGClinic customers.
-- Customer UUIDs and refs remain the operational identifiers, and migrated
-- phone/ref overlap must not block customer profile edits.

BEGIN;

DROP INDEX IF EXISTS dbo.partners_phone_unique;

COMMIT;
