#!/usr/bin/env node
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[local development / CI health check]
 * @crossref:uses[api/src/services/ai/aiConfig.js]
 *
 * Verify that the configured AI provider can generate chat responses and,
 * if supported, embeddings. Exits non-zero on failure.
 *
 * Usage:
 *   cd api && node scripts/test-ai-provider.js
 */

'use strict';
require('dotenv').config();

const {
  generateChatResponse,
  generateEmbedding,
  supportsEmbeddings,
  getActiveProvider,
} = require('../src/services/ai/aiConfig');

async function main() {
  const provider = getActiveProvider();
  if (!provider) {
    console.error('[test-ai-provider] No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY in api/.env.');
    process.exit(1);
  }

  console.log(`[test-ai-provider] Active provider: ${provider}`);
  console.log(`[test-ai-provider] Embeddings supported: ${supportsEmbeddings()}`);

  const chatResult = await generateChatResponse({
    system: 'Bạn là trợ lý hỗ trợ bệnh nhân của NK Clinic. Trả lờibằng tiếng Việt, ngắn gọn.',
    messages: [{ role: 'user', content: 'Chào bạn' }],
    temperature: 0.5,
    maxTokens: 50,
  });
  console.log('[test-ai-provider] Chat OK:', chatResult.content.slice(0, 100));

  if (supportsEmbeddings()) {
    const embedding = await generateEmbedding('phòng khám nha khoa NK Clinic');
    console.log(`[test-ai-provider] Embedding OK: length=${embedding.length}, first=${embedding[0]}`);
  } else {
    console.log('[test-ai-provider] Embedding skipped (provider does not support embeddings).');
  }
}

main().catch((err) => {
  console.error('[test-ai-provider] FAILED:', err.message);
  process.exit(1);
});
