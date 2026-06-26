/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai]
 * @crossref:uses[dbo.support_kb_chunks, docs/DATA-MODEL.md]
 *
 * Retrieval-Augmented Generation pipeline using pgvector.
 */

import { generateEmbedding } from './ai-service';

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  metadata?: Record<string, unknown>;
  similarity: number;
}

export interface RAGContext {
  chunks: KnowledgeChunk[];
  contextText: string;
}

/**
 * Retrieve the top-k most relevant knowledge chunks for a query.
 * Assumes `pgvector` extension is enabled and `support_kb_chunks.embedding`
 * is an HNSW-indexed `vector(1536)` column.
 */
export async function retrieveContext(
  db: (sql: string, params: unknown[]) => Promise<any[]>,
  query: string,
  k = 5
): Promise<RAGContext> {
  const embedding = await generateEmbedding(query);
  const vectorLiteral = `[${embedding.join(',')}]`;

  const rows = await db(
    `SELECT id, content, source, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM dbo.support_kb_chunks
     WHERE approved = true
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, k]
  );

  const chunks: KnowledgeChunk[] = rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    metadata: row.metadata ?? {},
    similarity: Number(row.similarity),
  }));

  const contextText = chunks
    .map((c, i) => `[${i + 1}] ${c.content} (source: ${c.source})`)
    .join('\n\n');

  return { chunks, contextText };
}

/**
 * Build the system prompt for the support bot.
 */
export function buildSupportSystemPrompt(contextText: string, clinicName = 'NK Clinic'): string {
  return [
    `Bạn là trợ lý hỗ trợ bệnh nhân của ${clinicName}. Bạn trả lờibằng tiếng Việt, ngắn gọn, lịch sự, và dễ hiểu.`,
    'Chỉ trả lờicác câu hỏi dựa trên thông tin được cung cấp bên dưới.',
    'Nếu không có đủ thông tin, hoặc câu hỏi liên quan đến chẩn đoán y khoa, thuốc men, hoặc tình trạng khẩn cấp, hãy nói rõ bạn không thể tư vấn y khoa và đề nghị bệnh nhân liên hệ nhân viên.',
    'Nếu bệnh nhân yêu cầu gặp nhân viên, xác nhận lạivà đề nghị chuyển tiếp.',
    '',
    'Thông tin tham khảo:',
    contextText || '(chưa có tài liệu tham khảo)',
  ].join('\n');
}
