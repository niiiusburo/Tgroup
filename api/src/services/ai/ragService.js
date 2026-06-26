/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai/chatService.js]
 * @crossref:uses[dbo.support_kb_chunks, docs/DATA-MODEL.md]
 *
 * Retrieval-Augmented Generation: embed queries and retrieve relevant KB chunks.
 * Gracefully degrades when pgvector is not installed or the active AI provider
 * does not support embeddings. In those cases it falls back to keyword search.
 */

'use strict';
const { generateEmbedding, supportsEmbeddings } = require('./aiConfig');
const { getQuery } = require('../../db');

const DEFAULT_TOP_K = Number(process.env.AI_RAG_TOP_K || '5');

let pgvectorAvailable = null;

async function checkPgvector() {
  if (pgvectorAvailable !== null) return pgvectorAvailable;
  try {
    const rows = await getQuery('dental')(
      'SELECT 1 FROM pg_extension WHERE extname = $1',
      ['vector']
    );
    pgvectorAvailable = rows.length > 0;
  } catch (err) {
    console.error('[ragService] pgvector check failed:', err);
    pgvectorAvailable = false;
  }
  return pgvectorAvailable;
}

function vectorLiteral(embedding) {
  return '[' + embedding.join(',') + ']';
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2);
  // Deduplicate while preserving order.
  return [...new Set(words)];
}

async function retrieveByKeywords(db, query, k = DEFAULT_TOP_K) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    return { chunks: [], contextText: '' };
  }

  const rows = await db(
    `SELECT id, content, source, metadata,
            (SELECT COUNT(*) FROM unnest($1::text[]) kw WHERE content ILIKE '%' || kw || '%') AS score
     FROM dbo.support_kb_chunks
     WHERE approved = true
       AND EXISTS (SELECT 1 FROM unnest($1::text[]) kw WHERE content ILIKE '%' || kw || '%')
     ORDER BY score DESC, updated_at DESC
     LIMIT $2`,
    [keywords, k]
  );

  const chunks = rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: row.metadata || {},
    similarity: Number(row.score),
  }));

  const contextText = chunks
    .map((c, i) => `[${i + 1}] ${c.content}\n(Nguồn: ${c.source})`)
    .join('\n\n');

  return { chunks, contextText };
}

async function retrieveByVector(db, query, k = DEFAULT_TOP_K) {
  const hasVector = await checkPgvector();
  if (!hasVector) {
    console.warn('[ragService] pgvector not available; falling back to keyword search');
    return retrieveByKeywords(db, query, k);
  }

  const embedding = await generateEmbedding(query);
  const rows = await db(
    `SELECT id, content, source, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM dbo.support_kb_chunks
     WHERE approved = true
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral(embedding), k]
  );

  const chunks = rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: row.metadata || {},
    similarity: Number(row.similarity),
  }));

  const contextText = chunks
    .map((c, i) => `[${i + 1}] ${c.content}\n(Nguồn: ${c.source})`)
    .join('\n\n');

  return { chunks, contextText };
}

async function retrieveContext(db, query, k = DEFAULT_TOP_K) {
  if (!supportsEmbeddings()) {
    console.warn('[ragService] active provider does not support embeddings; using keyword search');
    return retrieveByKeywords(db, query, k);
  }
  return retrieveByVector(db, query, k);
}

async function storeChunk(db, { content, source, metadata = {}, approved = true }) {
  const hasVector = await checkPgvector();
  const embeddingsAvailable = supportsEmbeddings();

  let literal = null;
  if (embeddingsAvailable) {
    const embedding = await generateEmbedding(content);
    literal = vectorLiteral(embedding);
  }

  if (hasVector && literal) {
    const result = await db(
      `INSERT INTO dbo.support_kb_chunks (content, embedding, source, metadata, approved)
       VALUES ($1, $2::vector, $3, $4, $5)
       RETURNING id`,
      [content, literal, source, JSON.stringify(metadata), approved]
    );
    return result[0].id;
  }

  if (literal) {
    const result = await db(
      `INSERT INTO dbo.support_kb_chunks (content, embedding, source, metadata, approved)
       VALUES ($1, $2::float[], $3, $4, $5)
       RETURNING id`,
      [content, literal, source, JSON.stringify(metadata), approved]
    );
    return result[0].id;
  }

  const result = await db(
    `INSERT INTO dbo.support_kb_chunks (content, source, metadata, approved)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [content, source, JSON.stringify(metadata), approved]
  );
  return result[0].id;
}

function buildSupportSystemPrompt(contextText, clinicName = 'NK Clinic') {
  const hasContext = contextText && contextText.trim().length > 0;
  const lines = [];
  lines.push('Bạn là trợ lý hỗ trợ bệnh nhân của ' + clinicName + '. Hãy trả lờib bằng tiếng Việt, ngắn gọn, lịch sự và dễ hiểu.');
  lines.push('Mục tiêu của bạn là trả lờib càng nhiều câu hỏi của bệnh nhân càng tốt.');

  if (hasContext) {
    lines.push('Dưới đây là thông tin tham khảo từ cơ sở kiến thức của phòng khám. Ưu tiên dùng nó để trả lờib và ghi rõ nguồn khi cần.');
  } else {
    lines.push('Hiện chưa có tài liệu tham khảo cụ thể trong cơ sở kiến thức. Hãy trả lờib dựa trên kiến thức chung một cách hữu ích và thận trọng.');
  }

  lines.push('Bạn KHÔNG được chẩn đoán bệnh, kê đơn thuốc, hoặc tư vấn điều trị y khoa cụ thể. Nếu bệnh nhân hỏi về triệu chứng, chẩn đoán, thuốc men, hoặc tình trạng khẩn cấp, hãy nói rõ bạn không phải bác sĩ và đề nghị họ liên hệ nhân viên y tế.');
  lines.push('Nếu bệnh nhân yêu cầu gặp nhân viên, hãy xác nhận lạib và đề nghị chuyển tiếp.');
  lines.push('');
  lines.push('Thông tin tham khảo:');
  lines.push(hasContext ? contextText : '(chưa có tài liệu tham khảo)');

  return lines.join('\n');
}

module.exports = {
  retrieveContext,
  storeChunk,
  buildSupportSystemPrompt,
  retrieveByKeywords,
};
