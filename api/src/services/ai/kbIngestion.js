/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/scripts/seed-support-kb.js, api/src/services/ai/learningService.js]
 * @crossref:uses[dbo.support_kb_chunks, api/src/services/ai/ragService.js]
 *
 * Knowledge-base ingestion utilities. Provides idempotent chunk writes,
 * batch ingestion, and CRUD helpers for support content curators.
 */

'use strict';
const { storeChunk } = require('./ragService');

/**
 * Ingest a single KB chunk.
 * @param {Function} db - Query executor (text, params) => Promise<rows>
 * @param {Object} chunk
 * @param {string} chunk.content
 * @param {string} chunk.source
 * @param {Object} [chunk.metadata={}]
 * @param {boolean} [chunk.approved=true]
 * @returns {Promise<string>} inserted chunk id
 */
async function ingestChunk(db, { content, source, metadata = {}, approved = true }) {
  if (!content || !content.trim()) {
    throw new Error('KB chunk content is required');
  }
  if (!source || !source.trim()) {
    throw new Error('KB chunk source is required');
  }
  return storeChunk(db, {
    content: content.trim(),
    source: source.trim(),
    metadata,
    approved,
  });
}

/**
 * Ingest multiple chunks in sequence. Stops on first failure.
 * @param {Function} db
 * @param {Array<Object>} chunks
 * @returns {Promise<string[]>} inserted chunk ids
 */
async function ingestChunks(db, chunks) {
  const ids = [];
  for (const chunk of chunks) {
    const id = await ingestChunk(db, chunk);
    ids.push(id);
  }
  return ids;
}

/**
 * List chunks with optional filters.
 * @param {Function} db
 * @param {Object} [filters={}]
 * @param {string} [filters.source]
 * @param {boolean} [filters.approved]
 * @param {number} [filters.limit=100]
 * @param {number} [filters.offset=0]
 * @returns {Promise<Array<Object>>}
 */
async function listChunks(db, { source, approved, limit = 100, offset = 0 } = {}) {
  const conditions = ['1=1'];
  const params = [];
  let paramIdx = 1;

  if (source) {
    conditions.push(`source = $${paramIdx++}`);
    params.push(source);
  }
  if (typeof approved === 'boolean') {
    conditions.push(`approved = $${paramIdx++}`);
    params.push(approved);
  }

  params.push(limit, offset);
  const sql = `
    SELECT id, content, source, metadata, approved, created_at, updated_at
    FROM dbo.support_kb_chunks
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  return db(sql, params);
}

/**
 * Update a chunk's content, source, metadata, and/or approved flag.
 * Re-generates the embedding when content changes.
 * @param {Function} db
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<void>}
 */
async function updateChunk(db, id, { content, source, metadata, approved }) {
  const setClauses = [];
  const params = [];
  let paramIdx = 1;

  if (content !== undefined) {
    const { generateEmbedding, supportsEmbeddings } = require('./aiConfig');
    const embeddingsAvailable = supportsEmbeddings();

    if (embeddingsAvailable) {
      const embedding = await generateEmbedding(content.trim());
      const literal = '[' + embedding.join(',') + ']';

      const extRows = await db(
        'SELECT 1 FROM pg_extension WHERE extname = $1',
        ['vector']
      );
      const hasVector = extRows.length > 0;

      setClauses.push(`content = $${paramIdx++}, embedding = $${paramIdx++}::${hasVector ? 'vector' : 'float[]'}`);
      params.push(content.trim(), literal);
    } else {
      setClauses.push(`content = $${paramIdx++}, embedding = NULL`);
      params.push(content.trim());
    }
  }
  if (source !== undefined) {
    setClauses.push(`source = $${paramIdx++}`);
    params.push(source.trim());
  }
  if (metadata !== undefined) {
    setClauses.push(`metadata = $${paramIdx++}`);
    params.push(JSON.stringify(metadata));
  }
  if (approved !== undefined) {
    setClauses.push(`approved = $${paramIdx++}`);
    params.push(approved);
  }

  if (setClauses.length === 0) {
    return;
  }

  params.push(id);
  const sql = `UPDATE dbo.support_kb_chunks SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx++}`;
  await db(sql, params);
}

/**
 * Delete a chunk by id.
 * @param {Function} db
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteChunk(db, id) {
  await db('DELETE FROM dbo.support_kb_chunks WHERE id = $1', [id]);
}

module.exports = {
  ingestChunk,
  ingestChunks,
  listChunks,
  updateChunk,
  deleteChunk,
};
