/**
 * Migration: AI chat support tables for NK Patient Portal.
 * Run after migration 066 (patient portal tables).
 *
 * pgvector is optional: if the extension is installed we use vector(1536) + HNSW
 * for fast RAG retrieval; otherwise embeddings are stored as float[] and the
 * application falls back to a compatible search strategy.
 */

-- Try to enable pgvector, but do not fail the migration if it is not installed.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension is not available; support_kb_chunks will use float[] for embeddings';
END $$;

-- Chat sessions link a patient partner to a conversation.
CREATE TABLE IF NOT EXISTS dbo.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ai',
  ticket_id UUID REFERENCES dbo.support_tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_chat_session_status CHECK (status IN ('ai', 'human', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_partner_id ON dbo.chat_sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON dbo.chat_sessions(status);

-- Messages within a session.
CREATE TABLE IF NOT EXISTS dbo.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES dbo.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_chat_message_role CHECK (role IN ('patient', 'ai', 'staff', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON dbo.chat_messages(session_id, created_at DESC);

-- Knowledge base chunks for RAG.
-- Column type depends on whether pgvector is available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS dbo.support_kb_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding vector(1536),
      source TEXT NOT NULL,
      metadata JSONB DEFAULT ''{}'',
      approved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_kb_chunks_approved_source
      ON dbo.support_kb_chunks(approved, source)';

    -- HNSW index for fast approximate nearest neighbor search.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_kb_chunks_embedding_hnsw
      ON dbo.support_kb_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)';
  ELSE
    EXECUTE 'CREATE TABLE IF NOT EXISTS dbo.support_kb_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding float[] DEFAULT NULL,
      source TEXT NOT NULL,
      metadata JSONB DEFAULT ''{}'',
      approved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_support_kb_chunks_approved_source
      ON dbo.support_kb_chunks(approved, source)';
  END IF;
END $$;
