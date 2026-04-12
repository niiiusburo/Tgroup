-- Migration 011: Fix payment_proofs column types to match payments.id (uuid)
-- payment_proofs.id and payment_proofs.payment_id must be uuid to match payments.id

ALTER TABLE payment_proofs ALTER COLUMN id TYPE uuid USING gen_random_uuid();
ALTER TABLE payment_proofs ALTER COLUMN payment_id TYPE uuid USING NULL;
