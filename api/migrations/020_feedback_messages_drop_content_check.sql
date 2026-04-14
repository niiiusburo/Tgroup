-- Allow image-only feedback messages by removing the strict non-empty content check.
-- Validation is enforced in the application layer (content or files required).

ALTER TABLE dbo.feedback_messages DROP CONSTRAINT IF EXISTS feedback_messages_content_check;
