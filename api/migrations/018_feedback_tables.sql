-- Feedback system tables: threads + messages

CREATE TABLE IF NOT EXISTS dbo.feedback_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
    page_url TEXT,
    page_path TEXT,
    screen_size TEXT,
    user_agent TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'ignored')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbo.feedback_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES dbo.feedback_threads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES dbo.partners(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_messages_thread_created
    ON dbo.feedback_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_threads_employee_updated
    ON dbo.feedback_threads(employee_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_threads_status_updated
    ON dbo.feedback_threads(status, updated_at DESC);
