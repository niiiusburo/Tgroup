/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[api/src/services/ai]
 * @crossref:uses[docs/CONTRACTS.md, product-map/domains/patient-portal.yaml]
 *
 * LLM provider configuration. Supports Google Gemini, OpenAI, and any
 * OpenAI-compatible provider such as DeepSeek.
 *
 * Priority: GEMINI_API_KEY > OPENAI_API_KEY > DEEPSEEK_API_KEY.
 * If the active chat provider does not support embeddings, RAG falls back to
 * keyword search in ragService.js.
 */

'use strict';
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

const openaiEmbeddingModel = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
const openaiChatModel = process.env.AI_CHAT_MODEL || 'gpt-4o-mini';
const geminiEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
const geminiChatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';
const deepseekChatModel = process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

const defaultTemperature = Number(process.env.AI_TEMPERATURE || '0.5');
const defaultMaxTokens = Number(process.env.AI_MAX_TOKENS || '1024');

let openai = null;
if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
}

let deepseek = null;
if (deepseekApiKey) {
  deepseek = new OpenAI({ apiKey: deepseekApiKey, baseURL: deepseekBaseUrl });
}

let gemini = null;
if (geminiApiKey) {
  gemini = new GoogleGenerativeAI(geminiApiKey);
}

function assertProvider() {
  if (!openai && !gemini && !deepseek) {
    throw new Error(
      'No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY in api/.env.'
    );
  }
}

function getActiveProvider() {
  if (gemini) return 'gemini';
  if (openai) return 'openai';
  if (deepseek) return 'deepseek';
  return null;
}

function supportsEmbeddings() {
  const provider = getActiveProvider();
  // DeepSeek does not expose an embedding model as of this implementation.
  return provider === 'openai' || provider === 'gemini';
}

function normalizeMessages(messages, system) {
  const result = [];
  if (system) {
    result.push({ role: 'system', content: system });
  }
  for (const m of messages) {
    result.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    });
  }
  return result;
}

async function generateOpenAIChat({ messages, system, temperature, maxTokens }, client, model) {
  const fullMessages = normalizeMessages(messages, system);
  const completion = await client.chat.completions.create({
    model,
    messages: fullMessages,
    temperature: temperature ?? defaultTemperature,
    max_tokens: maxTokens ?? defaultMaxTokens,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  return {
    content,
    usage: {
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    },
  };
}

async function generateGeminiChat({ messages, system, temperature, maxTokens }) {
  const model = gemini.getGenerativeModel({
    model: geminiChatModel,
    systemInstruction: system || undefined,
  });

  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const chat = model.startChat({ history: geminiMessages.slice(0, -1) });
  const lastMessage = geminiMessages[geminiMessages.length - 1];
  const prompt = lastMessage ? lastMessage.parts[0].text : '';

  const result = await chat.sendMessage(prompt, {
    generationConfig: {
      temperature: temperature ?? defaultTemperature,
      maxOutputTokens: maxTokens ?? defaultMaxTokens,
    },
  });

  const content = result.response.text().trim();
  return {
    content,
    usage: {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    },
  };
}

async function generateChatResponse(options) {
  assertProvider();
  if (gemini) {
    return generateGeminiChat(options);
  }
  if (openai) {
    return generateOpenAIChat(options, openai, openaiChatModel);
  }
  return generateOpenAIChat(options, deepseek, deepseekChatModel);
}

async function generateOpenAIEmbedding(text, client, model) {
  const response = await client.embeddings.create({
    model,
    input: text,
  });
  return response.data[0].embedding;
}

async function generateGeminiEmbedding(text) {
  const model = gemini.getGenerativeModel({ model: geminiEmbeddingModel });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function generateEmbedding(text) {
  assertProvider();
  if (!supportsEmbeddings()) {
    throw new Error(`Active provider ${getActiveProvider()} does not support embeddings.`);
  }
  if (gemini) {
    return generateGeminiEmbedding(text);
  }
  return generateOpenAIEmbedding(text, openai, openaiEmbeddingModel);
}

module.exports = {
  openai,
  deepseek,
  gemini,
  openaiEmbeddingModel,
  openaiChatModel,
  geminiEmbeddingModel,
  geminiChatModel,
  deepseekChatModel,
  deepseekBaseUrl,
  generateChatResponse,
  generateEmbedding,
  supportsEmbeddings,
  getActiveProvider,
};
