-- @crossref:domain[feedback-cms]
-- @crossref:used-in[NK3 schema migration: api/migrations/020_feedback_messages_drop_content_check]
-- @crossref:uses[product-map/domains/feedback-cms.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Allow image-only feedback messages by removing the strict non-empty content check.
-- Validation is enforced in the application layer (content or files required).

ALTER TABLE dbo.feedback_messages DROP CONSTRAINT IF EXISTS feedback_messages_content_check;
