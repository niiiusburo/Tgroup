-- @crossref:domain[feedback-cms]
-- @crossref:used-in[NK3 schema migration: api/migrations/019_feedback_attachments]
-- @crossref:uses[product-map/domains/feedback-cms.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Feedback message attachments

CREATE TABLE IF NOT EXISTS dbo.feedback_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES dbo.feedback_messages(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_message_id
    ON dbo.feedback_attachments(message_id);
